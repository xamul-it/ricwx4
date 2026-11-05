import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { fonts, makeStyles, useTheme } from '../theme';

export { haptic };

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

type Props = {
  /** Ritorna true se il PIN è accettato, false per l'animazione di errore */
  onComplete: (pin: string) => Promise<boolean> | boolean;
  showBiometric?: boolean;
  onBiometric?: () => void;
  disabled?: boolean;
  resetKey?: number;
};

export function PinPad({ onComplete, showBiometric, onBiometric, disabled, resetKey }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const keySize = height < 720 ? 64 : 80;
  const [pin, setPin] = useState('');
  const shake = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => setPin(''), [resetKey]);

  const press = async (key: string) => {
    if (disabled) return;
    if (key === 'bio') {
      onBiometric?.();
      return;
    }
    haptic('light');
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length !== PIN_LENGTH) return;

    const ok = await onComplete(next);
    if (ok === false) {
      haptic('error');
      shake.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      setTimeout(() => setPin(''), 300);
    } else if (ok === true) {
      setTimeout(() => setPin(''), 150);
    }
  };

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.dots, { marginBottom: keySize / 2 }, shakeStyle]} testID="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
        ))}
      </Animated.View>

      <View style={[styles.grid, { width: keySize * 3 + 48, rowGap: keySize / 5 }]}>
        {KEYS.map((k) => {
          const size = { width: keySize, height: keySize, borderRadius: keySize / 2 };
          if (k === 'bio' && !showBiometric) return <View key={k} style={[styles.key, size]} />;
          return (
            <Pressable
              key={k}
              testID={`pin-key-${k}`}
              onPress={() => press(k)}
              style={({ pressed }) => [
                styles.key,
                size,
                k !== 'bio' && k !== 'del' && styles.keyNum,
                pressed && styles.keyPressed,
              ]}
            >
              {k === 'del' ? (
                <Ionicons name="backspace-outline" size={26} color={colors.onSurfaceSecondary} />
              ) : k === 'bio' ? (
                <Ionicons name="finger-print-outline" size={28} color={colors.brandPrimary} />
              ) : (
                <Text style={styles.keyText}>{k}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { alignItems: 'center', width: '100%' },
  dots: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: c.brandTertiary },
  dotOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 288, justifyContent: 'space-between', rowGap: 16 },
  key: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  keyNum: { borderWidth: 1, borderColor: c.border, backgroundColor: c.glass },
  keyPressed: { backgroundColor: c.surfaceTertiary, borderColor: c.brandTertiary },
  keyText: { color: c.onSurface, fontFamily: fonts.displayMedium, fontSize: 32 },
}));
