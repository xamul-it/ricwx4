import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Linking, Modal, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, makeStyles, useTheme } from '../theme';
import { Button } from './Button';

type Sheet = 'ask' | 'blocked' | null;

/** Fotocamera/galleria con gestione dei permessi. Ritorna anche il foglio da montare nella schermata. */
export function usePhotoPicker(
  onPicked: (asset: ImagePicker.ImagePickerAsset) => void,
  aspect: [number, number] = [1, 1],
) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<Sheet>(null);

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect,
    base64: false,
  };

  const handle = (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (asset) onPicked(asset);
  };

  const launchCamera = async () => handle(await ImagePicker.launchCameraAsync(options));
  const openGallery = async () => handle(await ImagePicker.launchImageLibraryAsync(options));

  const openCamera = async () => {
    const perm = await ImagePicker.getCameraPermissionsAsync();
    if (perm.granted) return launchCamera();
    setSheet(perm.canAskAgain ? 'ask' : 'blocked');
  };

  const request = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) {
      setSheet(null);
      return launchCamera();
    }
    if (!perm.canAskAgain) setSheet('blocked');
  };

  const permissionSheet = (
    <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
      <Pressable style={styles.scrim} onPress={() => setSheet(null)}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} testID="photo-permission-sheet">
          <Ionicons name="camera-outline" size={32} color={colors.brandPrimary} />
          <Text style={styles.title}>Usa la fotocamera</Text>
          <Text style={styles.text}>
            {sheet === 'blocked'
              ? "L'accesso alla fotocamera è disattivato. Attivalo nelle impostazioni del telefono oppure scegli una foto dalla galleria."
              : "Consenti l'accesso alla fotocamera per scattare la foto. Resta salvata solo sul tuo telefono."}
          </Text>
          {sheet === 'blocked' ? (
            <Button
              testID="photo-open-settings-button"
              label="Apri impostazioni"
              onPress={() => Linking.openSettings()}
              style={{ marginTop: 24 }}
            />
          ) : (
            <Button testID="photo-allow-camera-button" label="Consenti fotocamera" onPress={request} style={{ marginTop: 24 }} />
          )}
          <Button
            testID="photo-close-sheet-button"
            label="Non ora"
            variant="ghost"
            onPress={() => setSheet(null)}
            style={{ marginTop: 12 }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { openCamera, openGallery, permissionSheet };
}

const useStyles = makeStyles((c) => ({
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surfaceSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
  },
  title: { color: c.onSurface, fontFamily: fonts.display, fontSize: 28, marginTop: 12 },
  text: { color: c.onSurfaceTertiary, fontFamily: fonts.text, fontSize: 14, marginTop: 8, lineHeight: 20 },
}));
