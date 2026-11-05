import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useToast } from '../src/context/ToastContext';
import { useVault } from '../src/context/VaultContext';
import { ApiError, apiFetch } from '../src/lib/api';
import { haptic } from '../src/lib/haptics';
import { goBack } from '../src/lib/nav';
import { fonts, makeStyles, useTheme } from '../src/theme';

type Mode = 'login' | 'register';
type AuthResponse = { access_token: string; user: { email: string } };

export default function Account() {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useVault();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Inserisci un'email valida");
      return;
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<AuthResponse>(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      await signIn(res.access_token, res.user.email);
      haptic('success');
      toast(mode === 'login' ? 'Accesso effettuato' : 'Account creato', 'success');
      goBack(router);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Nessuna connessione. Riprova quando sei online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root} testID="account-screen">
      <ScreenHeader title="Account" />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>MEMBERSHIP</Text>
        <Text style={styles.title}>{mode === 'login' ? 'Bentornato' : 'Entra nel club'}</Text>
        <Text style={styles.sub}>
          Le tue carte, al sicuro nel cloud e su ogni tuo telefono. L'app continua a funzionare anche offline.
        </Text>

        <View style={styles.seg}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              testID={`auth-mode-${m}`}
              onPress={() => {
                setMode(m);
                setError('');
              }}
              style={[styles.segBtn, mode === m && styles.segOn]}
            >
              <Text style={[styles.segText, mode === m && styles.segTextOn]}>{m === 'login' ? 'Accedi' : 'Registrati'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          testID="auth-email-input"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="nome@email.it"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          testID="auth-password-input"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Almeno 6 caratteri"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={submit}
        />
        {error ? (
          <Text style={styles.err} testID="auth-error">
            {error}
          </Text>
        ) : null}
        <Button
          testID="auth-submit-button"
          label={mode === 'login' ? 'Accedi' : 'Crea account'}
          onPress={submit}
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  kicker: { color: c.brandPrimary, fontFamily: fonts.textBold, fontSize: 10, letterSpacing: 3 },
  title: { color: c.onSurface, fontFamily: fonts.display, fontSize: 40, marginTop: 4 },
  sub: { color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 14, lineHeight: 21, marginTop: 8 },
  seg: {
    flexDirection: 'row',
    marginTop: 32,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  segBtn: { flex: 1, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: c.brandPrimary },
  segText: { color: c.onSurfaceTertiary, fontFamily: fonts.textBold, fontSize: 14 },
  segTextOn: { color: c.onBrandPrimary },
  label: {
    color: c.onSurfaceTertiary,
    fontFamily: fonts.textMedium,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    paddingHorizontal: 16,
    color: c.onSurface,
    fontFamily: fonts.text,
    fontSize: 16,
  },
  err: { color: c.onError, fontFamily: fonts.textMedium, fontSize: 13, marginTop: 12 },
}));
