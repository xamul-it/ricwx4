import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

class StorageBase {
  warn(op: string, key: string, err: unknown) {
    console.warn(`[storage] ${op}(${key}) failed`, err);
  }

  retrieve<T>(raw: string | null, fallback: T): T {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      this.warn('retrieve', 'parse error', e);
      return fallback;
    }
  }
}

/** I valori sono sempre salvati come JSON (come nell'app originale). */
export class Storage extends StorageBase {
  async getItem<T>(key: string, fallback: T): Promise<T> {
    try {
      return this.retrieve(await AsyncStorage.getItem(key), fallback);
    } catch (e) {
      this.warn('getItem', key, e);
      return fallback;
    }
  }

  async setItem(key: string, value: unknown): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      this.warn('setItem', key, e);
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      this.warn('removeItem', key, e);
      return false;
    }
  }

  async secureGet<T>(key: string, fallback: T): Promise<T> {
    try {
      return this.retrieve(await SecureStore.getItemAsync(key), fallback);
    } catch (e) {
      this.warn('secureGet', key, e);
      return fallback;
    }
  }

  async secureSet(key: string, value: unknown): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
      return true;
    } catch (e) {
      this.warn('secureSet', key, e);
      return false;
    }
  }

  async secureRemove(key: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (e) {
      this.warn('secureRemove', key, e);
      return false;
    }
  }
}

export const storage = new Storage();
