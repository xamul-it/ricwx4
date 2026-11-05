import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { CardFace } from '../src/components/CardFace';
import { haptic } from '../src/components/PinPad';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useToast } from '../src/context/ToastContext';
import { useVault } from '../src/context/VaultContext';
import { formatEUR, parseEUR } from '../src/lib/format';
import { fonts, makeStyles, useTheme } from '../src/theme';
import type { Card } from '../src/types';

export default function Balances() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const { cards, setBalance } = useVault();
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState<Card | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const openedFromParam = useRef(false);

  const open = (card: Card) => {
    setEditing(card);
    setValue(card.balance != null ? card.balance.toFixed(2).replace('.', ',') : '');
    setError('');
  };

  // Se arrivo dalla home con l'id di una carta, apro subito il suo saldo
  useEffect(() => {
    if (!id || openedFromParam.current) return;
    const card = cards.find((c) => c.id === id);
    if (card) {
      openedFromParam.current = true;
      open(card);
    }
  }, [id, cards]);

  const total = cards.reduce((sum, c) => sum + (c.balance ?? 0), 0);

  const save = async () => {
    if (!editing) return;
    const v = parseEUR(value);
    if (v === null) {
      setError('Inserisci un importo, es. 1.250,00');
      return;
    }
    await setBalance(editing.id, v);
    haptic('success');
    toast('Saldo aggiornato', 'success');
    setEditing(null);
  };

  const clear = async () => {
    if (!editing) return;
    await setBalance(editing.id, null);
    toast('Saldo rimosso', 'info');
    setEditing(null);
  };

  return (
    <View style={styles.root} testID="balances-screen">
      <ScreenHeader title="Saldo" />
      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          <View style={styles.totalBox} testID="balances-total">
            <Text style={styles.totalLabel}>SALDO TOTALE</Text>
            <Text style={styles.total}>{formatEUR(total)}</Text>
            <Text style={styles.totalSub}>Tocca una carta per modificarne il saldo</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Aggiungi prima una carta dalla home.</Text>}
        renderItem={({ item, index }) => (
          <Pressable
            testID={`balance-row-${index}`}
            onPress={() => open(item)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceTertiary }]}
          >
            <CardFace card={item} width={88} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.amount} testID={`balance-row-value-${index}`}>
                {item.balance != null ? formatEUR(item.balance) : 'Nessun saldo'}
              </Text>
            </View>
            <Ionicons name="create-outline" size={20} color={colors.accent} />
          </Pressable>
        )}
      />

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={[styles.scrim, { paddingTop: insets.top + 64 }]} onPress={() => setEditing(null)}>
          {editing ? (
            <Pressable style={styles.dialog} testID="balance-edit-dialog">
              <Text style={styles.dialogTitle} numberOfLines={1}>
                {editing.name}
              </Text>
              <Text style={styles.dialogSub}>Saldo sul conto in euro</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.euro}>€</Text>
                <TextInput
                  testID="balance-input"
                  value={value}
                  onChangeText={(t) => {
                    setValue(t.replace(/[^\d.,-]/g, ''));
                    setError('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={colors.muted}
                  autoFocus
                  maxLength={13}
                  style={styles.input}
                  onSubmitEditing={save}
                />
              </View>
              {error ? (
                <Text style={styles.err} testID="balance-error">
                  {error}
                </Text>
              ) : null}
              <Pressable
                testID="balance-save-button"
                onPress={save}
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.saveText}>Salva saldo</Text>
              </Pressable>
              <View style={styles.dialogRow}>
                {editing.balance != null ? (
                  <Button testID="balance-clear-button" label="Rimuovi" variant="ghost" onPress={clear} style={{ flex: 1 }} />
                ) : null}
                <Button
                  testID="balance-cancel-button"
                  label="Annulla"
                  variant="ghost"
                  onPress={() => setEditing(null)}
                  style={{ flex: 1 }}
                />
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  totalBox: { borderRadius: 20, padding: 20, backgroundColor: c.accent, marginBottom: 12 },
  totalLabel: { color: c.onAccent, fontFamily: fonts.textBold, fontSize: 11, letterSpacing: 2.5, opacity: 0.85 },
  total: { color: c.onAccent, fontFamily: fonts.textBold, fontSize: 32, marginTop: 4 },
  totalSub: { color: c.onAccent, fontFamily: fonts.text, fontSize: 12, marginTop: 4, opacity: 0.85 },
  empty: { color: c.muted, fontFamily: fonts.text, fontSize: 14, textAlign: 'center', marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  name: { color: c.onSurface, fontFamily: fonts.display, fontSize: 20 },
  amount: { color: c.onSurfaceSecondary, fontFamily: fonts.textBold, fontSize: 16, marginTop: 2 },
  scrim: { flex: 1, backgroundColor: c.scrim, paddingHorizontal: 20 },
  dialog: { backgroundColor: c.surfaceSecondary, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: c.border },
  dialogTitle: { color: c.onSurface, fontFamily: fonts.display, fontSize: 28 },
  dialogSub: { color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 13, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    gap: 8,
  },
  euro: { color: c.onSurfaceTertiary, fontFamily: fonts.textBold, fontSize: 22 },
  input: { flex: 1, minWidth: 0, color: c.onSurface, fontFamily: fonts.textBold, fontSize: 24, minHeight: 56 },
  err: { color: c.onError, fontFamily: fonts.textMedium, fontSize: 13, marginTop: 8 },
  saveBtn: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: c.onAccent, fontFamily: fonts.textBold, fontSize: 15 },
  dialogRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
}));
