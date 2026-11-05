import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { formatEUR } from '../lib/format';
import { haptic } from '../lib/haptics';
import { fonts, makeStyles, useTheme } from '../theme';
import type { Card } from '../types';
import { CARD_RATIO, CardFace } from './CardFace';

/** Distanza verticale tra le carte impilate */
const STEP = 30;
/** Numero massimo di carte visibili dietro quella attiva */
const MAX_DEPTH = 3;
const SPRING = { damping: 28, stiffness: 220, overshootClamping: true };

type StackCardProps = {
  card: Card;
  index: number;
  progress: SharedValue<number>;
  cardW: number;
  cardH: number;
  depth: number;
  hidden: boolean;
  onPress: () => void;
};

function StackCard({ card, index, progress, cardW, cardH, depth, hidden, onPress }: StackCardProps) {
  const style = useAnimatedStyle(() => {
    const rel = index - progress.value;
    if (rel < 0) {
      return {
        zIndex: 200,
        opacity: Math.max(0, 1 + rel * 1.4),
        transform: [{ translateY: rel * cardH * 0.7 }, { scale: 1 }],
      };
    }
    const r = Math.min(rel, depth);
    return {
      zIndex: 100 - Math.round(rel * 10),
      opacity: rel > depth ? Math.max(0, depth + 1 - rel) : 1,
      transform: [{ translateY: -r * STEP - r * cardH * 0.025 }, { scale: 1 - r * 0.05 }],
    };
  });

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      style={[{ position: 'absolute', top: depth * STEP, width: cardW }, style]}
    >
      <Pressable testID={`card-item-${index}`} onPress={onPress}>
        <CardFace card={card} width={cardW} />
      </Pressable>
    </Animated.View>
  );
}

type Props = {
  cards: Card[];
  cardW: number;
  onOpen: (card: Card) => void;
  onBalance: (card: Card) => void;
};

/** Pila di carte sfogliabile con uno swipe verticale */
export function CardStack({ cards, cardW, onOpen, onBalance }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const cardH = cardW / CARD_RATIO;
  const n = cards.length;
  const depth = Math.min(MAX_DEPTH, Math.max(0, n - 1));

  const [active, setActive] = useState(0);
  const progress = useSharedValue(0);
  const start = useSharedValue(0);
  const lastDrag = useRef(0);

  const markDrag = () => {
    lastDrag.current = Date.now();
  };

  useEffect(() => {
    if (active > n - 1) {
      const t = Math.max(0, n - 1);
      setActive(t);
      progress.value = withSpring(t, SPRING);
    }
  }, [n, active, progress]);

  const select = (i: number) => {
    const t = Math.max(0, Math.min(n - 1, i));
    if (t === active) return;
    haptic('light');
    setActive(t);
    progress.value = withSpring(t, SPRING);
  };

  const onSettled = (t: number) => {
    setActive((prev) => {
      if (t !== prev) haptic('light');
      return t;
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      start.value = progress.value;
      runOnJS(markDrag)();
    })
    .onUpdate((e) => {
      const p = start.value - e.translationY / (cardH * 0.7);
      progress.value = Math.max(-0.3, Math.min(n - 1 + 0.3, p));
    })
    .onEnd((e) => {
      let t = Math.round(progress.value - e.velocityY / 2500);
      t = Math.max(0, Math.min(n - 1, t));
      progress.value = withSpring(t, SPRING);
      runOnJS(onSettled)(t);
      runOnJS(markDrag)();
    });

  const current = cards[Math.min(active, n - 1)];

  return (
    <View style={styles.wrap} testID="card-stack">
      <GestureDetector gesture={pan}>
        <View style={[styles.stage, { width: cardW, height: cardH + depth * STEP + 8 }]}>
          {cards.map((card, i) => (
            <StackCard
              key={card.id}
              card={card}
              index={i}
              progress={progress}
              cardW={cardW}
              cardH={cardH}
              depth={depth}
              hidden={i < active}
              onPress={() => {
                if (Date.now() - lastDrag.current < 400) return;
                if (i !== active) select(i);
                else onOpen(card);
              }}
            />
          ))}
        </View>
      </GestureDetector>

      {n > 1 ? (
        <View style={styles.dots}>
          {cards.map((card, i) => (
            <Pressable
              key={card.id}
              testID={`stack-dot-${i}`}
              onPress={() => select(i)}
              hitSlop={{ top: 15, bottom: 15, left: 4, right: 4 }}
              style={styles.dotHit}
            >
              <View style={[styles.dot, i === active && styles.dotOn]} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {n > 1 ? <Text style={styles.hint}>Scorri su o giù sulle carte per cambiarle</Text> : null}

      {current ? (
        <View style={[styles.info, { width: cardW }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1} testID="active-card-name">
              {current.name}
            </Text>
            <Text style={styles.meta}>
              {current.type}
              {n > 1 ? `  ·  ${active + 1} di ${n}` : ''}
            </Text>
          </View>
          <Pressable testID="open-active-card-button" onPress={() => onOpen(current)} style={styles.openBtn} hitSlop={6}>
            <Ionicons name="arrow-forward" size={18} color={colors.onSurface} />
          </Pressable>
        </View>
      ) : null}

      {current ? (
        <Pressable
          testID="balance-button"
          onPress={() => onBalance(current)}
          style={({ pressed }) => [
            styles.balance,
            { width: cardW },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet-outline" size={18} color={colors.onAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>Saldo sul conto</Text>
            <Text style={styles.balanceValue} testID="balance-value">
              {current.balance != null ? formatEUR(current.balance) : 'Tocca per impostare'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { alignItems: 'center' },
  stage: { alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' },
  dotHit: { padding: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderStrong },
  dotOn: { backgroundColor: c.brandPrimary, width: 18 },
  info: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  name: { color: c.onSurface, fontFamily: fonts.display, fontSize: 26 },
  meta: { color: c.muted, fontFamily: fonts.textMedium, fontSize: 12, letterSpacing: 1, marginTop: 2 },
  openBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: c.accent,
  },
  balanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { color: c.onAccent, fontFamily: fonts.textMedium, fontSize: 12, letterSpacing: 0.5, opacity: 0.85 },
  balanceValue: { color: c.onAccent, fontFamily: fonts.textBold, fontSize: 20, marginTop: 1 },
  hint: { color: c.muted, fontFamily: fonts.text, fontSize: 11, marginTop: 4, textAlign: 'center' },
}));
