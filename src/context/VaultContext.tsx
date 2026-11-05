import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API, ApiError, apiFetch } from '../lib/api';
import { CARD_COLORS, CARD_TYPES } from '../lib/cardMeta';
import { deleteLocalImage, downloadImage } from '../lib/images';
import { storage } from '../lib/storage';
import { uploadForm } from '../lib/upload';
import type { Card, CardInput } from '../types';

const CARDS_KEY = 'vault_cards_v1';
const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'auth_email';
const LAST_SYNC_KEY = 'last_sync';
const PREV_EMAIL_KEY = 'prev_account_email';
const LOGO_KEY = 'home_logo';

const SYNC_DEBOUNCE_MS = 1200;
const SYNC_RETRY_MS = 500;

export const DEFAULT_LOGO = require('../../assets/images/user-logo.png');

export type SyncState = 'local' | 'syncing' | 'ok' | 'offline' | 'error';
export type Account = { token: string; email: string };

type VaultValue = {
  ready: boolean;
  cards: Card[];
  getCard: (id?: string | null) => Card | undefined;
  saveCard: (id: string | undefined, input: CardInput) => Promise<string>;
  deleteCard: (id: string) => Promise<void>;
  account: Account | null;
  signIn: (token: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<boolean>;
  syncState: SyncState;
  lastSync: string | null;
  setBalance: (id: string, balance: number | null) => Promise<void>;
  logo: string | null;
  setLogo: (uri: string | null) => Promise<void>;
};

const VaultContext = createContext<VaultValue | null>(null);

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault outside provider');
  return ctx;
}

const nowIso = () => new Date().toISOString();

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [all, setAll] = useState<Card[]>([]);
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [logo, setLogoState] = useState<string | null>(null);

  const cardsRef = useRef<Card[]>([]);
  const accountRef = useRef<Account | null>(null);
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncNowRef = useRef<() => Promise<boolean>>(async () => false);

  const persist = useCallback(async (list: Card[]) => {
    cardsRef.current = list;
    setAll(list);
    // come l'originale: la lista viene salvata come stringa JSON
    await storage.setItem(CARDS_KEY, JSON.stringify(list));
  }, []);

  const signOut = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    await storage.removeItem(EMAIL_KEY);
    accountRef.current = null;
    setAccount(null);
    setSyncState('local');
  }, []);

  const syncNow = useCallback(async (): Promise<boolean> => {
    const acc = accountRef.current;
    if (!acc) return false;
    if (syncingRef.current) {
      pendingRef.current = true;
      return false;
    }
    syncingRef.current = true;
    setSyncState('syncing');
    try {
      // 1) carica le foto non ancora presenti sul server
      for (const card of cardsRef.current) {
        if (card.deleted || !card.localImage || card.image_path) continue;
        const res = await uploadForm(`${API}/upload`, {
          headers: { Authorization: `Bearer ${acc.token}` },
          files: { file: { uri: card.localImage, name: 'card.jpg', mimeType: 'image/jpeg' } },
        });
        if (res.status === 401) throw new ApiError(401, 'auth');
        if (res.status >= 500) throw new ApiError(res.status, 'upload');
        if (!res.ok) continue;
        const { path } = (await res.json()) as { path: string };
        await persist(cardsRef.current.map((c) => (c.id === card.id ? { ...c, image_path: path } : c)));
      }

      // 2) invia tutte le carte (senza il percorso locale) e ricevi la versione unificata
      const payload = cardsRef.current.map(({ localImage, ...rest }) => rest);
      const res = await apiFetch<{ cards: Card[] }>('/cards/sync', {
        method: 'POST',
        body: { cards: payload },
        token: acc.token,
      });

      const local = new Map(cardsRef.current.map((c) => [c.id, c] as const));
      const merged: Card[] = [];
      for (const remote of res.cards ?? []) {
        const existing = local.get(remote.id);
        let localImage = existing && existing.image_path === remote.image_path ? existing.localImage : null;
        if (existing?.localImage && localImage !== existing.localImage) deleteLocalImage(existing.localImage);
        if (!localImage && remote.image_path && !remote.deleted) {
          localImage = await downloadImage(remote.image_path, acc.token, remote.id);
        }
        merged.push({ ...remote, localImage });
        local.delete(remote.id);
      }
      local.forEach((c) => merged.push(c));
      await persist(merged);

      const ts = nowIso();
      setLastSync(ts);
      await storage.setItem(LAST_SYNC_KEY, ts);
      setSyncState('ok');
      return true;
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) await signOut();
        else setSyncState('error');
      } else {
        setSyncState('offline');
      }
      return false;
    } finally {
      syncingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        setTimeout(() => void syncNowRef.current(), SYNC_RETRY_MS);
      }
    }
  }, [persist, signOut]);
  syncNowRef.current = syncNow;

  const scheduleSync = useCallback(() => {
    if (!accountRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void syncNowRef.current(), SYNC_DEBOUNCE_MS);
  }, []);

  // caricamento iniziale
  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string | null>(CARDS_KEY, null);
      let list: Card[] = [];
      try {
        const parsed = JSON.parse(String(raw ?? '[]'));
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
      cardsRef.current = list;
      setAll(list);

      const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
      const email = await storage.getItem<string | null>(EMAIL_KEY, null);
      const last = await storage.getItem<string | null>(LAST_SYNC_KEY, null);
      const savedLogo = await storage.getItem<string | null>(LOGO_KEY, null);

      if (token) {
        accountRef.current = { token: String(token), email: String(email ?? '') };
        setAccount(accountRef.current);
        setSyncState('ok');
      }
      setLastSync(last);
      setLogoState(savedLogo);
      setReady(true);
      if (token) void syncNowRef.current();
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleSync();
    });
    return () => sub.remove();
  }, [scheduleSync]);

  const saveCard = useCallback(
    async (id: string | undefined, input: CardInput) => {
      const ts = nowIso();
      const existing = id ? cardsRef.current.find((c) => c.id === id) : undefined;

      if (!existing) {
        const card: Card = {
          name: '',
          type: CARD_TYPES[0],
          last4: '',
          exp: '',
          note: '',
          color: CARD_COLORS[0].value,
          localImage: null,
          ...input,
          id: id ?? Crypto.randomUUID(),
          image_path: null,
          balance: null,
          created_at: ts,
          updated_at: ts,
          deleted: false,
        };
        await persist([...cardsRef.current, card]);
        scheduleSync();
        return card.id;
      }

      const imageChanged = input.localImage !== undefined && input.localImage !== existing.localImage;
      if (imageChanged) deleteLocalImage(existing.localImage);
      const updated: Card = {
        ...existing,
        ...input,
        image_path: imageChanged ? null : existing.image_path,
        updated_at: ts,
      };
      await persist(cardsRef.current.map((c) => (c.id === existing.id ? updated : c)));
      scheduleSync();
      return existing.id;
    },
    [persist, scheduleSync],
  );

  const setBalance = useCallback(
    async (id: string, balance: number | null) => {
      const ts = nowIso();
      await persist(cardsRef.current.map((c) => (c.id === id ? { ...c, balance, updated_at: ts } : c)));
      scheduleSync();
    },
    [persist, scheduleSync],
  );

  const deleteCard = useCallback(
    async (id: string) => {
      const ts = nowIso();
      deleteLocalImage(cardsRef.current.find((c) => c.id === id)?.localImage);
      await persist(
        cardsRef.current.map((c) => (c.id === id ? { ...c, deleted: true, localImage: null, updated_at: ts } : c)),
      );
      scheduleSync();
    },
    [persist, scheduleSync],
  );

  const setLogo = useCallback(async (uri: string | null) => {
    const prev = await storage.getItem<string | null>(LOGO_KEY, null);
    if (prev && prev !== uri) deleteLocalImage(prev);
    if (uri) await storage.setItem(LOGO_KEY, uri);
    else await storage.removeItem(LOGO_KEY);
    setLogoState(uri);
  }, []);

  const signIn = useCallback(
    async (token: string, email: string) => {
      const prev = await storage.getItem<string>(PREV_EMAIL_KEY, '');
      if (prev && prev.toLowerCase() !== email.toLowerCase()) {
        // Cambio account: tengo solo le carte modificate dopo l'ultima sincronizzazione
        const last = await storage.getItem<string>(LAST_SYNC_KEY, '');
        const keep = cardsRef.current.filter((c) => !last || c.updated_at > last);
        cardsRef.current.filter((c) => !keep.includes(c)).forEach((c) => deleteLocalImage(c.localImage));
        await persist(keep.map((c) => ({ ...c, image_path: null })));
      }
      await storage.setItem(PREV_EMAIL_KEY, email);
      await storage.secureSet(TOKEN_KEY, token);
      await storage.setItem(EMAIL_KEY, email);
      accountRef.current = { token, email };
      setAccount(accountRef.current);
      await syncNowRef.current();
    },
    [persist],
  );

  const cards = useMemo(
    () => all.filter((c) => !c.deleted).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [all],
  );
  const getCard = useCallback((id?: string | null) => cards.find((c) => c.id === id), [cards]);

  const value = useMemo<VaultValue>(
    () => ({
      ready,
      cards,
      getCard,
      saveCard,
      deleteCard,
      account,
      signIn,
      signOut,
      syncNow,
      syncState,
      lastSync,
      setBalance,
      logo,
      setLogo,
    }),
    [ready, cards, getCard, saveCard, deleteCard, account, signIn, signOut, syncNow, syncState, lastSync, setBalance, logo, setLogo],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
