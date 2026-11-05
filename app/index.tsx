import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { CardStack } from '../src/components/CardStack';
import { DEFAULT_LOGO, useVault } from '../src/context/VaultContext';
import { haptic } from '../src/lib/haptics';
import { fonts, makeStyles, useTheme } from '../src/theme';

function SyncPill() {
  const { account, syncState } = useVault();
  const styles = useStyles();
  const { colors } = useTheme();

  let icon: keyof typeof Ionicons.glyphMap = 'phone-portrait-outline';
  let label = 'Solo su questo telefono';
  if (account) {
    if (syncState === 'syncing') {
      icon = 'sync-outline';
      label = 'Sincronizzazione…';
    } else if (syncState === 'ok') {
      icon = 'cloud-done-outline';
      label = 'Sincronizzato';
    } else {
      icon = 'cloud-offline-outline';
      label = 'Offline · salvato sul telefono';
    }
  }

  return (
    <View style={styles.pill} testID="sync-status">
      <Ionicons name={icon} size={13} color={colors.brandPrimary} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { ready, cards, logo } = useVault();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 440) - 48;

  const add = () => {
    haptic('medium');
    router.push('/editor');
  };

  return (
    <View style={styles.root} testID="home-screen">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image source={logo ? { uri: logo } : DEFAULT_LOGO} style={styles.logo} contentFit="cover" testID="home-logo" />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>IL TUO CAVEAU PRIVATO</Text>
          <Text style={styles.title} testID="home-title">
            Le mie carte
          </Text>
          <SyncPill />
        </View>
        <Pressable testID="open-settings-button" onPress={() => router.push('/settings')} style={styles.iconBtn} hitSlop={6}>
          <Ionicons name="options-outline" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      {!ready ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : cards.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(450)} style={[styles.list, { paddingBottom: insets.bottom + 88 }]}>
          <CardStack
            cards={cards}
            cardW={cardW}
            onOpen={(card) => {
              haptic('light');
              router.push({ pathname: '/card/[id]', params: { id: card.id } });
            }}
            onBalance={(card) => router.push({ pathname: '/balances', params: { id: card.id } })}
          />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(500)} style={styles.empty} testID="empty-state">
          <View style={styles.vault}>
            <Ionicons name="card-outline" size={40} color={colors.brandPrimary} />
          </View>
          <Text style={styles.emptyTitle}>Il caveau è vuoto</Text>
          <Text style={styles.emptyText}>
            Aggiungi la tua prima carta. Resta salvata sul telefono e la apri anche senza connessione.
          </Text>
          <Button
            testID="empty-add-card-button"
            label="Aggiungi carta"
            icon="add"
            onPress={add}
            style={{ marginTop: 24, alignSelf: 'stretch' }}
          />
        </Animated.View>
      )}

      {cards.length > 0 ? (
        <Pressable testID="add-card-fab" onPress={add} style={[styles.fab, { bottom: insets.bottom + 16 }]}>
          <BlurView intensity={40} tint="dark" style={styles.fabBlur} experimentalBlurMethod="dimezisBlurView">
            <Ionicons name="add" size={22} color={colors.brandPrimary} />
            <Text style={styles.fabText}>Aggiungi</Text>
          </BlurView>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: c.surface,
  },
  logo: { width: 52, height: 52, borderRadius: 14, marginTop: 6, borderWidth: 1, borderColor: c.border },
  kicker: { color: c.brandPrimary, fontFamily: fonts.textBold, fontSize: 10, letterSpacing: 3 },
  title: { color: c.onSurface, fontFamily: fonts.display, fontSize: 42, marginTop: 2, lineHeight: 48 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  pillText: { color: c.onSurfaceTertiary, fontFamily: fonts.textMedium, fontSize: 11 },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, paddingHorizontal: 20, paddingTop: 4, alignItems: 'center' },
  empty: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  vault: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: c.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { color: c.onSurface, fontFamily: fonts.display, fontSize: 30 },
  emptyText: {
    color: c.onSurfaceTertiary,
    fontFamily: fonts.text,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.brandTertiary,
  },
  fabBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    height: 56,
    backgroundColor: c.glass,
  },
  fabText: { color: c.onSurface, fontFamily: fonts.textBold, fontSize: 15 },
}));
