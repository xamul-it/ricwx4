import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic, PinPad } from '../src/components/PinPad';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useLock } from '../src/context/LockContext';
import { useToast } from '../src/context/ToastContext';
import { goBack } from '../src/lib/nav';
import { fonts, makeStyles } from '../src/theme';

export default function PinSetup() {
  const router = useRouter();
  const toast = useToast();
  const { setPin } = useLock();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [resetKey, setResetKey] = useState(0);

  const onComplete = async (pin: string) => {
    if (!first) {
      setFirst(pin);
      setError('');
      setResetKey((k) => k + 1);
      return true;
    }
    if (pin === first) {
      await setPin(pin);
      haptic('success');
      goBack(router);
      toast('PIN impostato', 'success');
      return true;
    }
    setFirst(null);
    setError('I PIN non coincidono, riprova');
    return false;
  };

  return (
    <View style={styles.root} testID="pin-setup-screen">
      <ScreenHeader title="PIN" />
      <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.top}>
          <Text style={styles.title} testID="pin-setup-title">
            {first ? 'Conferma il PIN' : 'Scegli un PIN'}
          </Text>
          <Text style={styles.sub}>4 cifre per aprire il tuo caveau</Text>
          <Text style={styles.err} testID="pin-setup-error">
            {error}
          </Text>
        </View>
        <PinPad onComplete={onComplete} resetKey={resetKey} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 32 },
  top: { alignItems: 'center' },
  title: { color: c.onSurface, fontFamily: fonts.display, fontSize: 36 },
  sub: { color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 14, marginTop: 8 },
  err: { color: c.onError, fontFamily: fonts.textMedium, fontSize: 13, marginTop: 16, minHeight: 18 },
}));
