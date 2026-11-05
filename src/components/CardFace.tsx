import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Card } from '../types';
import { fonts, makeStyles } from '../theme';

/** Proporzione standard di una carta (85,6 × 54 mm) */
export const CARD_RATIO = 1.586;

const TEXTURE = require('../../assets/images/card-texture.jpg');
const CREAM = '#F5EFE0';
const GOLD = '#E3C46A';

type Props = { card: Partial<Card>; width: number; testID?: string };

export function CardFace({ card, width, testID }: Props) {
  const styles = useStyles();
  const s = width / 340; // scala rispetto alla carta di riferimento larga 340

  // Carta con foto
  if (card.localImage) {
    return (
      <View testID={testID} style={[styles.card, { width, height: width / CARD_RATIO }]}>
        <Image source={{ uri: card.localImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(255,255,255,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {card.name ? (
          <Text style={[styles.photoName, { fontSize: 18 * s, left: 16 * s, top: 12 * s }]} numberOfLines={1}>
            {card.name}
          </Text>
        ) : null}
      </View>
    );
  }

  // Carta disegnata
  return (
    <View testID={testID} style={[styles.card, { width, height: width / CARD_RATIO }]}>
      <Image source={TEXTURE} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: card.color, opacity: 0.8 }]} />
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.inner, { padding: 20 * s }]}>
        <View style={styles.row}>
          <Text style={[styles.type, { fontSize: 10 * s, letterSpacing: 3 * s }]} numberOfLines={1}>
            {(card.type || 'Altro').toUpperCase()}
          </Text>
          <Text style={[styles.mono, { fontSize: 20 * s }]}>Privé</Text>
        </View>
        <LinearGradient
          colors={['#F2D98A', '#B8912F', '#E8CC78']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.chip, { width: 40 * s, height: 30 * s, borderRadius: 6 * s, marginTop: 14 * s }]}
        >
          <View style={styles.chipLine} />
        </LinearGradient>
        <View style={{ flex: 1 }} />
        <Text style={[styles.name, { fontSize: 24 * s }]} numberOfLines={1}>
          {card.name || 'La tua carta'}
        </Text>
        <View style={[styles.row, { marginTop: 6 * s }]}>
          <Text style={[styles.digits, { fontSize: 14 * s, letterSpacing: 2 * s }]}>
            {'••••  '}
            {card.last4 || '····'}
          </Text>
          {card.exp ? (
            <Text style={[styles.exp, { fontSize: 11 * s }]}>
              {'SCAD '}
              <Text style={styles.expVal}>{card.exp}</Text>
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(227,196,106,0.28)',
    backgroundColor: c.surfaceTertiary,
  },
  inner: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { color: GOLD, fontFamily: fonts.textBold, flexShrink: 1 },
  mono: { color: GOLD, fontFamily: fonts.displayItalic },
  chip: { overflow: 'hidden', justifyContent: 'center' },
  chipLine: { height: 1, backgroundColor: 'rgba(90,65,10,0.5)', marginHorizontal: 4 },
  name: { color: CREAM, fontFamily: fonts.display },
  photoName: { position: 'absolute', right: 16, color: CREAM, fontFamily: fonts.display },
  digits: { color: CREAM, fontFamily: fonts.textMedium },
  exp: { color: 'rgba(245,239,224,0.7)', fontFamily: fonts.text, letterSpacing: 1 },
  expVal: { color: CREAM, fontFamily: fonts.textMedium },
}));
