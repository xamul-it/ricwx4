import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { CardFace } from '../../src/components/CardFace';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useToast } from '../../src/context/ToastContext';
import { useVault } from '../../src/context/VaultContext';
import { formatEUR } from '../../src/lib/format';
import { haptic } from '../../src/lib/haptics';
import { goBack } from '../../src/lib/nav';
import { fonts, makeStyles, useTheme } from '../../src/theme';

export default function CardDetail() {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const { getCard, deleteCard } = useVault();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [confirm, setConfirm] = useState(false);

  const card = getCard(id);
  const heroW = Math.min(width, 520) - 40;

  if (!card) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Carta" />
        <View style={styles.missing}>
          <Text style={styles.label}>Carta non trovata</Text>
        </View>
      </View>
    );
  }

  const rows: [string, string][] = [
    ['Tipo', card.type],
    ['Saldo', card.balance != null ? formatEUR(card.balance) : '—'],
    ['Ultime 4 cifre', card.last4 ? `•••• ${card.last4}` : '—'],
    ['Scadenza', card.exp || '—'],
    ['Nota', card.note || '—'],
  ];

  const openEditor = () => router.push({ pathname: '/editor', params: { id: card.id } });
  const openViewer = () => {
    haptic('medium');
    router.push({ pathname: '/viewer', params: { id: card.id } });
  };

  return (
    <View style={styles.root} testID="card-detail-screen">
      <ScreenHeader
        title={card.name || 'Carta'}
        right={
          <Pressable testID="edit-card-button" onPress={openEditor} style={styles.icon} hitSlop={6}>
            <Ionicons name="create-outline" size={20} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignSelf: 'center' }}>
          <Pressable testID="card-hero" onPress={openViewer}>
            <CardFace card={card} width={heroW} />
          </Pressable>
        </Animated.View>

        <Button
          testID="show-fullscreen-button"
          label="Mostra a schermo intero"
          icon="expand-outline"
          onPress={openViewer}
          style={{ marginTop: 24 }}
        />

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.panel} testID="card-details-panel">
          {rows.map(([label, value], i) => (
            <View key={label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value} testID={`detail-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                {value}
              </Text>
            </View>
          ))}
        </Animated.View>

        <View style={styles.actions}>
          <Button
            testID="edit-card-bottom-button"
            label="Modifica"
            variant="ghost"
            icon="create-outline"
            onPress={openEditor}
            style={{ flex: 1 }}
          />
          <Button
            testID="delete-card-button"
            label="Elimina"
            variant="danger"
            icon="trash-outline"
            onPress={() => setConfirm(true)}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>

      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <Pressable style={styles.scrim} onPress={() => setConfirm(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} testID="delete-confirm-sheet">
            <Text style={styles.sheetTitle}>Eliminare la carta?</Text>
            <Text style={styles.sheetText}>
              “{card.name}” verrà rimossa da questo telefono e dal cloud, se sincronizzato.
            </Text>
            <Button
              testID="confirm-delete-button"
              label="Elimina definitivamente"
              variant="danger"
              onPress={async () => {
                setConfirm(false);
                await deleteCard(card.id);
                haptic('success');
                toast('Carta eliminata', 'success');
                goBack(router);
              }}
              style={{ marginTop: 24 }}
            />
            <Button
              testID="cancel-delete-button"
              label="Annulla"
              variant="ghost"
              onPress={() => setConfirm(false)}
              style={{ marginTop: 12 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    paddingHorizontal: 20,
  },
  row: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  label: { color: c.muted, fontFamily: fonts.textMedium, fontSize: 13, letterSpacing: 0.5 },
  value: { color: c.onSurface, fontFamily: fonts.textMedium, fontSize: 15, flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surfaceSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
  },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.display, fontSize: 28 },
  sheetText: { color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 14, marginTop: 8, lineHeight: 20 },
}));
