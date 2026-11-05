import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { storage } from '../lib/storage';

const PIN_KEY = 'app_pin_hash';
const BIO_KEY = 'lock_biometric';
/** Dopo 60 s in background l'app si blocca di nuovo. */
const RELOCK_AFTER_MS = 60000;

const hash = (pin: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `lmc-vault:${pin}`);

type LockValue = {
  ready: boolean;
  locked: boolean;
  pinSet: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  verifyPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  setBiometric: (on: boolean) => Promise<void>;
  tryBiometric: () => Promise<boolean>;
};

const LockContext = createContext<LockValue | null>(null);

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock outside provider');
  return ctx;
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const backgroundAt = useRef<number | null>(null);
  const pinRef = useRef<string | null>(null);
  /** true mentre è aperto il prompt biometrico (che manda l'app in background) */
  const authInProgress = useRef(false);

  useEffect(() => {
    (async () => {
      const stored = await storage.secureGet<string | null>(PIN_KEY, null);
      const bio = await storage.getItem<boolean>(BIO_KEY, false);
      let available = false;
      try {
        available = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      } catch {
        available = false;
      }
      pinRef.current = stored;
      setPinHash(stored);
      setLocked(!!stored);
      setBiometricEnabled(!!bio);
      setBiometricAvailable(available);
      setReady(true);
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (authInProgress.current) return;
      if (state === 'background') backgroundAt.current = Date.now();
      if (state === 'active') {
        if (backgroundAt.current && pinRef.current && Date.now() - backgroundAt.current > RELOCK_AFTER_MS) {
          setLocked(true);
        }
        backgroundAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const ok = (await hash(pin)) === pinRef.current;
    if (ok) setLocked(false);
    return ok;
  }, []);

  const setPin = useCallback(async (pin: string) => {
    const h = await hash(pin);
    await storage.secureSet(PIN_KEY, h);
    pinRef.current = h;
    setPinHash(h);
  }, []);

  const removePin = useCallback(async () => {
    await storage.secureRemove(PIN_KEY);
    await storage.setItem(BIO_KEY, false);
    pinRef.current = null;
    setPinHash(null);
    setBiometricEnabled(false);
  }, []);

  const setBiometric = useCallback(async (on: boolean) => {
    await storage.setItem(BIO_KEY, on);
    setBiometricEnabled(on);
  }, []);

  const tryBiometric = useCallback(async () => {
    if (!biometricAvailable) return false;
    authInProgress.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sblocca Le mie carte',
        cancelLabel: 'Usa PIN',
        disableDeviceFallback: true,
      });
      if (res.success) setLocked(false);
      return res.success;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        authInProgress.current = false;
      }, 1000);
    }
  }, [biometricAvailable]);

  const value = useMemo<LockValue>(
    () => ({
      ready,
      locked,
      pinSet: !!pinHash,
      biometricEnabled,
      biometricAvailable,
      verifyPin,
      setPin,
      removePin,
      setBiometric,
      tryBiometric,
    }),
    [ready, locked, pinHash, biometricEnabled, biometricAvailable, verifyPin, setPin, removePin, setBiometric, tryBiometric],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}
