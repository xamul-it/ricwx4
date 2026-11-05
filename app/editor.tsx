import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { CardFace } from '../src/components/CardFace';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useToast } from '../src/context/ToastContext';
import { useVault } from '../src/context/VaultContext';
import { CARD_COLORS, CARD_TYPES } from '../src/lib/cardMeta';
import { haptic } from '../src/lib/haptics';
import { persistPicked } from '../src/lib/images';
import { goBack } from '../src/lib/nav';
import { fonts, makeStyles, useTheme } from '../src/theme';

type Form = {
  name: string;
  type: string;
  last4: string;
  exp: string;
  note: string;
  color: string;
  localImage: string | null;
};
type Errors = Partial<Record<keyof Form, string>>;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: true,
  aspect: [16, 10],
  base64: false,
};

export default function Editor() {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const { saveCard, getCard } = useVault();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const existing = id ? getCard(id) : undefined;
  const [form, setForm] = useState<Form>({
    name: existing?.name ?? '',
    type: existing?.type ?? CARD_TYPES[0],
    last4: existing?.last4 ?? '',
    exp: existing?.exp ?? '',
    note: existing?.note ?? '',
    color: existing?.color ?? CARD_COLORS[0].value,
    localImage: existing?.localImage ?? null,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [permSheet, setPermSheet] = useState<'ask' | 'blocked' | null>(null);

  const previewW = Math.min(width, 520) - 40;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handlePicked = async (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset) return;
    try {
      const uri = await persistPicked(asset.uri, existing?.id ?? 'new');
      set('localImage', uri);
      haptic('light');
    } catch {
      toast("Impossibile salvare l'immagine", 'error');
    }
  };

  const launchCamera = async () => handlePicked(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  const openGallery = async () => handlePicked(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));

  const openCamera = async () => {
    const perm = await ImagePicker.getCameraPermissionsAsync();
    if (perm.granted) return launchCamera();
    setPermSheet(perm.canAskAgain ? 'ask' : 'blocked');
  };

  const requestCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) {
      setPermSheet(null);
      return launchCamera();
    }
    if (!perm.canAskAgain) setPermSheet('blocked');
  };

  const validate = () => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = 'Dai un nome alla carta';
    if (form.last4 && !/^\d{4}$/.test(form.last4)) e.last4 = 'Servono 4 cifre';
    if (form.exp) {
      const m = /^(\d{2})\/(\d{2})$/.exec(form.exp);
      const month = m ? Number(m[1]) : 0;
      if (!m || month < 1 || month > 12) e.exp = 'Formato MM/AA';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      haptic('error');
      return;
    }
    setSaving(true);
    try {
      await saveCard(existing?.id, { ...form, name: form.name.trim(), note: form.note.trim() });
      haptic('success');
      toast(existing ? 'Carta aggiornata' : 'Carta aggiunta al caveau', 'success');
      goBack(router);
    } finally {
      setSaving(false);
    }
  };

  const onExpChange = (t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, 4);
    set('exp', digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };

  return (
    <View style={styles.root} testID="editor-screen">
      <ScreenHeader title={existing ? 'Modifica carta' : 'Nuova carta'} leftIcon="close" />

      <KeyboardAwareScrollView
        bottomOffset={100}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignSelf: 'center' }} testID="editor-preview">
          <CardFace card={form} width={previewW} />
        </View>
        <Text style={styles.hint}>Non inserire il numero completo né il CVV: bastano le ultime 4 cifre.</Text>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          testID="input-name"
          value={form.name}
          onChangeText={(t) => set('name', t)}
          maxLength={40}
          placeholder="Es. Platinum Club"
          placeholderTextColor={colors.muted}
          style={[styles.input, errors.name && styles.inputErr]}
        />
        {errors.name ? (
          <Text style={styles.err} testID="error-name">
            {errors.name}
          </Text>
        ) : null}

        <Text style={styles.label}>Tipo</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipRow}
        >
          {CARD_TYPES.map((t) => (
            <Pressable
              key={t}
              testID={`type-chip-${t}`}
              onPress={() => set('type', t)}
              style={[styles.chip, form.type === t && styles.chipOn]}
            >
              <Text style={[styles.chipText, form.type === t && styles.chipTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Ultime 4 cifre</Text>
            <TextInput
              testID="input-last4"
              value={form.last4}
              onChangeText={(t) => set('last4', t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="1234"
              placeholderTextColor={colors.muted}
              style={[styles.input, errors.last4 && styles.inputErr]}
            />
            {errors.last4 ? (
              <Text style={styles.err} testID="error-last4">
                {errors.last4}
              </Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Scadenza (MM/AA)</Text>
            <TextInput
              testID="input-exp"
              value={form.exp}
              onChangeText={onExpChange}
              keyboardType="number-pad"
              maxLength={5}
              placeholder="08/28"
              placeholderTextColor={colors.muted}
              style={[styles.input, errors.exp && styles.inputErr]}
            />
            {errors.exp ? (
              <Text style={styles.err} testID="error-exp">
                {errors.exp}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.label}>Nota</Text>
        <TextInput
          testID="input-note"
          value={form.note}
          onChangeText={(t) => set('note', t)}
          maxLength={120}
          multiline
          placeholder="Es. tessera socio, codice cliente…"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textarea]}
        />

        <Text style={styles.label}>Immagine della carta</Text>
        <View style={styles.row}>
          <Button
            testID="pick-camera-button"
            label="Fotocamera"
            icon="camera-outline"
            variant="ghost"
            onPress={openCamera}
            style={{ flex: 1 }}
          />
          <Button
            testID="pick-gallery-button"
            label="Galleria"
            icon="images-outline"
            variant="ghost"
            onPress={openGallery}
            style={{ flex: 1 }}
          />
        </View>
        {form.localImage ? (
          <Pressable testID="remove-image-button" onPress={() => set('localImage', null)} style={styles.remove}>
            <Ionicons name="trash-outline" size={16} color={colors.onError} />
            <Text style={styles.removeText}>Rimuovi immagine</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.label}>Colore della carta</Text>
            <View style={styles.swatches}>
              {CARD_COLORS.map((c) => (
                <Pressable
                  key={c.value}
                  testID={`color-swatch-${c.name}`}
                  onPress={() => set('color', c.value)}
                  style={[styles.swatchRing, form.color === c.value && styles.swatchOn]}
                  accessibilityLabel={c.name}
                >
                  <View style={[styles.swatch, { backgroundColor: c.value }]} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Button testID="save-card-button" label="Salva carta" onPress={save} loading={saving} />
        </View>
      </KeyboardStickyView>

      <Modal visible={!!permSheet} transparent animationType="fade" onRequestClose={() => setPermSheet(null)}>
        <Pressable style={styles.scrim} onPress={() => setPermSheet(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} testID="camera-permission-sheet">
            <Ionicons name="camera-outline" size={32} color={colors.brandPrimary} />
            <Text style={styles.sheetTitle}>Fotografa la tua carta</Text>
            <Text style={styles.sheetText}>
              {permSheet === 'blocked'
                ? "L'accesso alla fotocamera è disattivato. Puoi attivarlo nelle impostazioni del telefono, oppure scegliere una foto dalla galleria."
                : "Consenti l'accesso alla fotocamera per scattare una foto della carta. La foto resta salvata sul tuo telefono."}
            </Text>
            {permSheet === 'blocked' ? (
              <Button
                testID="open-settings-permission-button"
                label="Apri impostazioni"
                onPress={() => Linking.openSettings()}
                style={{ marginTop: 24 }}
              />
            ) : (
              <Button testID="allow-camera-button" label="Consenti fotocamera" onPress={requestCamera} style={{ marginTop: 24 }} />
            )}
            <Button
              testID="close-permission-sheet-button"
              label="Non ora"
              variant="ghost"
              onPress={() => setPermSheet(null)}
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
  content: { paddingHorizontal: 20, paddingTop: 12 },
  hint: { color: c.muted, fontFamily: fonts.text, fontSize: 12, marginTop: 16, lineHeight: 18 },
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
  inputErr: { borderColor: c.onError },
  textarea: { minHeight: 80, paddingTop: 14, textAlignVertical: 'top' },
  err: { color: c.onError, fontFamily: fonts.text, fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', gap: 12 },
  chipRow: { height: 56, flexGrow: 0, marginHorizontal: -20 },
  chips: { gap: 8, paddingHorizontal: 20, alignItems: 'center' },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    justifyContent: 'center',
  },
  chipOn: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  chipText: { color: c.onSurfaceTertiary, fontFamily: fonts.textMedium, fontSize: 14 },
  chipTextOn: { color: c.onBrandTertiary },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, minHeight: 44 },
  removeText: { color: c.onError, fontFamily: fonts.textMedium, fontSize: 14 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOn: { borderColor: c.brandPrimary },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.borderStrong },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surfaceSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
  },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.display, fontSize: 28, marginTop: 12 },
  sheetText: { color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 14, marginTop: 8, lineHeight: 20 },
}));
