import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLock } from '../context/LockContext';
import { DEFAULT_LOGO, useVault } from '../context/VaultContext';
import { haptic } from '../lib/haptics';
import { fonts, makeStyles } from '../theme';
import { PinPad } from './PinPad';

const LOCK_BG = require('../../assets/images/lock-bg.jpg');
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

/** Schermata di sblocco sovrapposta a tutta l'app quando il PIN è attivo. */
export function LockGate() {
  const { ready, locked, verifyPin, biometricEnabled, biometricAvailable, tryBiometric } = useLock();
  const { logo } = useVault();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [, setTick] = useState(0);
  const triedBio = useRef(false);

  // Prova subito la biometria all'apertura
  useEffect(() => {
    if (locked && biometricEnabled && !triedBio.current) {
      triedBio.current = true;
      const t = setTimeout(() => {
        tryBiometric().then((ok) => ok && haptic('success'));
      }, 400);
      return () => clearTimeout(t);
    }
    if (!locked) {
      triedBio.current = false;
      setError('');
    }
  }, [locked, biometricEnabled, tryBiometric]);

  // Conto alla rovescia dopo troppi tentativi
  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => {
      if (Date.now() >= lockUntil) {
        setLockUntil(0);
        setError('');
      }
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [lockUntil]);

  if (ready && !locked) return null;

  if (!ready) {
    return (
      <Modal visible transparent={false} animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
        <View style={styles.root} testID="lock-cover" />
      </Modal>
    );
  }

  const lockedOut = lockUntil > Date.now();
  const compact = height < 720;
  const message = lockedOut ? `Troppi tentativi. Riprova tra ${Math.ceil((lockUntil - Date.now()) / 1000)}s` : error;

  const onComplete = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      haptic('success');
      setAttempts(0);
      setError('');
      return true;
    }
    const n = attempts + 1;
    if (n >= MAX_ATTEMPTS) {
      setLockUntil(Date.now() + LOCKOUT_MS);
      setAttempts(0);
      setError('Troppi tentativi. Riprova tra 30 secondi.');
    } else {
      setAttempts(n);
      setError('PIN non corretto');
    }
    return false;
  };

  return (
    <Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
      <View style={styles.root} testID="lock-screen">
        <Image source={LOCK_BG} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        <View style={[styles.content, { paddingTop: insets.top + (compact ? 24 : 64), paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.top}>
            <Image source={logo ? { uri: logo } : DEFAULT_LOGO} style={styles.seal} contentFit="cover" testID="lock-logo" />
            <Text style={styles.title}>Bentornato</Text>
            <Text style={styles.sub}>Inserisci il tuo PIN per aprire il caveau</Text>
            <Text style={styles.error} testID="lock-error">
              {message}
            </Text>
          </View>
          <PinPad
            onComplete={onComplete}
            disabled={lockedOut}
            showBiometric={biometricEnabled && biometricAvailable}
            onBiometric={() => tryBiometric().then((ok) => ok && haptic('success'))}
          />
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  scrim: { backgroundColor: c.scrim },
  content: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  top: { alignItems: 'center', paddingHorizontal: 24 },
  seal: { width: 72, height: 72, borderRadius: 18, borderWidth: 1, borderColor: c.brandTertiary, marginBottom: 24 },
  title: { color: c.onSurface, fontFamily: fonts.display, fontSize: 40 },
  sub: { color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 14, marginTop: 8, textAlign: 'center' },
  error: { color: c.onError, fontFamily: fonts.textMedium, fontSize: 13, marginTop: 16, minHeight: 18 },
}));
