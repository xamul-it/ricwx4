import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { usePhotoPicker } from '../src/components/usePhotoPicker';
import { useLock } from '../src/context/LockContext';
import { useToast } from '../src/context/ToastContext';
import { DEFAULT_LOGO, useVault } from '../src/context/VaultContext';
import { persistPicked } from '../src/lib/images';
import { fonts, makeStyles, useTheme } from '../src/theme';

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  testID?: string;
};

function Row({ icon, title, sub, onPress, right, danger, testID }: RowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTertiary }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={danger ? colors.onError : colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.onError }]}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export default function Settings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { account, syncState, lastSync, cards, logo, signOut, syncNow, setLogo } = useVault();
  const { pinSet, biometricAvailable, biometricEnabled, removePin, setBiometric, tryBiometric } = useLock();
  const [syncing, setSyncing] = useState(false);
  const [logoSheet, setLogoSheet] = useState(false);

  const picker = usePhotoPicker(async (asset) => {
    try {
      const uri = await persistPicked(asset.uri, 'logo');
      await setLogo(uri);
      toast('Logo aggiornato', 'success');
    } catch {
      toast("Impossibile salvare l'immagine", 'error');
    }
  });

  const pickLogo = (source: 'camera' | 'gallery') => {
    setLogoSheet(false);
    // lascio chiudere il foglio prima di aprire fotocamera/galleria
    setTimeout(() => (source === 'camera' ? picker.openCamera() : picker.openGallery()), 300);
  };

  const lastSyncLabel = lastSync
    ? `Ultima sincronizzazione: ${new Date(lastSync).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}`
    : 'Mai sincronizzato';
  const trackColor = { false: colors.surfaceTertiary, true: colors.brandTertiary };

  const doSync = async () => {
    setSyncing(true);
    const ok = await syncNow();
    setSyncing(false);
    toast(ok ? 'Carte sincronizzate' : 'Nessuna connessione: le carte restano salvate sul telefono', ok ? 'success' : 'error');
  };

  return (
    <View style={styles.root} testID="settings-screen">
      <ScreenHeader title="Impostazioni" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.section}>ACCOUNT E CLOUD</Text>
        <View style={styles.group}>
          {!account ? (
            <Row
              icon="cloud-outline"
              title="Accedi o crea un account"
              sub="Salva le carte nel cloud e ritrovale su un altro telefono"
              onPress={() => router.push('/account')}
              testID="open-account-button"
            />
          ) : (
            <>
              <Row
                icon="person-circle-outline"
                title={account.email}
                sub={`${cards.length} ${cards.length === 1 ? 'carta' : 'carte'} nel caveau`}
                testID="account-email"
              />
              <Row
                icon="cloud-upload-outline"
                title={syncing || syncState === 'syncing' ? 'Sincronizzazione…' : 'Sincronizza ora'}
                sub={lastSyncLabel}
                onPress={syncing ? undefined : doSync}
                testID="sync-now-button"
              />
              <Row
                icon="log-out-outline"
                title="Esci dall'account"
                sub="Le carte restano su questo telefono"
                onPress={async () => {
                  await signOut();
                  toast('Disconnesso', 'info');
                }}
                testID="logout-button"
                danger
              />
            </>
          )}
        </View>

        <Text style={styles.section}>PERSONALIZZA</Text>
        <View style={styles.group}>
          <Pressable
            testID="logo-row"
            onPress={() => setLogoSheet(true)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTertiary }]}
          >
            <Image source={logo ? { uri: logo } : DEFAULT_LOGO} style={styles.logoThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Logo della homepage</Text>
              <Text style={styles.rowSub}>{logo ? 'Immagine personalizzata' : 'Logo predefinito'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.section}>SICUREZZA</Text>
        <View style={styles.group}>
          <Row
            icon="wallet-outline"
            title="Saldo"
            sub="Vedi le carte e modifica il saldo di ognuna"
            onPress={() => router.push('/balances')}
            testID="open-balances-button"
          />
          <Row
            icon="keypad-outline"
            title="Blocco con PIN"
            sub={pinSet ? "Attivo · richiesto all'apertura" : "Proteggi l'app con 4 cifre"}
            testID="pin-row"
            right={
              <Switch
                testID="pin-switch"
                value={pinSet}
                trackColor={trackColor}
                thumbColor={pinSet ? colors.brandPrimary : colors.muted}
                onValueChange={async (on) => {
                  if (on) {
                    router.push('/pin-setup');
                    return;
                  }
                  await removePin();
                  toast('Blocco disattivato', 'info');
                }}
              />
            }
          />
          {pinSet ? (
            <Row
              icon="refresh-outline"
              title="Cambia PIN"
              onPress={() => router.push('/pin-setup')}
              testID="change-pin-button"
            />
          ) : null}
          <Row
            icon="finger-print-outline"
            title="Impronta / Face ID"
            sub={
              !biometricAvailable
                ? 'Non disponibile su questo dispositivo'
                : !pinSet
                  ? 'Attiva prima il PIN'
                  : 'Sblocca con la biometria'
            }
            testID="biometric-row"
            right={
              <Switch
                testID="biometric-switch"
                value={biometricEnabled}
                disabled={!biometricAvailable || !pinSet}
                trackColor={trackColor}
                thumbColor={biometricEnabled ? colors.brandPrimary : colors.muted}
                onValueChange={async (on) => {
                  if (!on) {
                    await setBiometric(false);
                    toast('Biometria disattivata', 'info');
                    return;
                  }
                  const ok = await tryBiometric();
                  if (!ok) {
                    toast('Verifica non riuscita', 'error');
                    return;
                  }
                  await setBiometric(true);
                  toast('Biometria attivata', 'success');
                }}
              />
            }
          />
        </View>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.brandPrimary} />
          <Text style={styles.noteText}>
            Le carte sono salvate in modo privato su questo telefono e funzionano anche senza connessione. Non salviamo
            mai il numero completo né il CVV.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={logoSheet} transparent animationType="fade" onRequestClose={() => setLogoSheet(false)}>
        <Pressable style={styles.scrim} onPress={() => setLogoSheet(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} testID="logo-sheet">
            <Text style={styles.sheetTitle}>Logo della homepage</Text>
            <Text style={styles.rowSub}>Scatta una foto o scegline una dalla galleria</Text>
            <Button
              testID="logo-camera-button"
              label="Fotocamera"
              icon="camera-outline"
              onPress={() => pickLogo('camera')}
              style={{ marginTop: 24 }}
            />
            <Button
              testID="logo-gallery-button"
              label="Galleria"
              icon="images-outline"
              variant="ghost"
              onPress={() => pickLogo('gallery')}
              style={{ marginTop: 12 }}
            />
            {logo ? (
              <Button
                testID="logo-reset-button"
                label="Ripristina logo predefinito"
                variant="ghost"
                icon="refresh-outline"
                onPress={async () => {
                  setLogoSheet(false);
                  await setLogo(null);
                  toast('Logo predefinito ripristinato', 'info');
                }}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
      {picker.permissionSheet}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  section: {
    color: c.brandPrimary,
    fontFamily: fonts.textBold,
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: 24,
    marginBottom: 12,
  },
  group: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: c.onSurface, fontFamily: fonts.textMedium, fontSize: 15 },
  rowSub: { color: c.muted, fontFamily: fonts.text, fontSize: 12, marginTop: 2 },
  note: { flexDirection: 'row', gap: 12, marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  noteText: { flex: 1, color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 13, lineHeight: 19 },
  logoThumb: { width: 36, height: 36, borderRadius: 10 },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surfaceSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
  },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.display, fontSize: 28, marginBottom: 4 },
}));
