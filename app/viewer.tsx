import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CARD_RATIO, CardFace } from '../src/components/CardFace';
import { useVault } from '../src/context/VaultContext';
import { haptic } from '../src/lib/haptics';
import { goBack } from '../src/lib/nav';
import { fonts, makeStyles, useTheme } from '../src/theme';

/** Carta a schermo intero, ruotata e con luminosità al massimo (da mostrare alla cassa). */
export default function Viewer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCard } = useVault();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [rotated, setRotated] = useState(true);
  const card = getCard(id);

  // Luminosità al massimo finché la schermata è aperta
  useEffect(() => {
    let previous: number | null = null;
    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch {
        // non supportato
      }
    })();
    return () => {
      if (previous !== null) Brightness.setBrightnessAsync(previous).catch(() => {});
      if (Brightness.restoreSystemBrightnessAsync != null) Brightness.restoreSystemBrightnessAsync().catch(() => {});
    };
  }, []);

  const availW = width - 32;
  const availH = height - insets.top - insets.bottom - 120;
  const cardW = rotated ? Math.min(availH, availW * CARD_RATIO) : Math.min(availW, availH * CARD_RATIO);

  const angle = useSharedValue(90);
  useEffect(() => {
    angle.value = withTiming(rotated ? 90 : 0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [rotated, angle]);
  const rotateStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  return (
    <View style={styles.root} testID="viewer-screen">
      <View style={[styles.stage, { paddingTop: insets.top }]}>
        {card ? (
          <Animated.View style={rotateStyle}>
            <CardFace card={card} width={cardW} testID="viewer-card" />
          </Animated.View>
        ) : (
          <Text style={styles.btnText}>Carta non trovata</Text>
        )}
      </View>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          testID="viewer-rotate-button"
          onPress={() => {
            haptic('medium');
            setRotated((r) => !r);
          }}
          style={styles.btn}
        >
          <Ionicons name="sync-outline" size={20} color={colors.brandPrimary} />
          <Text style={styles.btnText}>Ruota</Text>
        </Pressable>
        <Pressable testID="viewer-close-button" onPress={() => goBack(router)} style={styles.btn}>
          <Ionicons name="close" size={20} color={colors.onSurface} />
          <Text style={styles.btnText}>Chiudi</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: '#000000' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingHorizontal: 24 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.glass,
  },
  btnText: { color: c.onSurface, fontFamily: fonts.textBold, fontSize: 15 },
}));
