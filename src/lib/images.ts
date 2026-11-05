import { Directory, File, Paths } from 'expo-file-system';
import { API } from './api';

/** Cartella privata dell'app dove vengono copiate le foto delle carte. */
export function cardsDir(): Directory {
  const dir = new Directory(Paths.document, 'cards');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Copia la foto scelta (fotocamera/galleria) nella cartella dell'app. */
export async function persistPicked(uri: string, prefix = 'card'): Promise<string> {
  const dest = new File(cardsDir(), `${prefix}-${Date.now()}.jpg`);
  new File(uri).copy(dest);
  return dest.uri;
}

/** Scarica dal server la foto di una carta sincronizzata. */
export async function downloadImage(path: string, token: string, id: string): Promise<string | null> {
  try {
    const dest = new File(cardsDir(), `${id}-${Date.now()}.jpg`);
    if (dest.exists) dest.delete();
    const out = await File.downloadFileAsync(`${API}/files/${path}`, dest, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
    });
    return out.uri;
  } catch (e) {
    console.warn(`download ${path}`, e);
    return null;
  }
}

export function deleteLocalImage(uri?: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // file già rimosso
  }
}
