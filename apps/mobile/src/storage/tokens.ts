/**
 * Token storage.
 *
 * expo-secure-store puts these in the Android Keystore rather than in
 * AsyncStorage, which is a plain file readable on a rooted or debug device.
 * A refresh token is a 30-day session for a factory's whole carbon inventory,
 * so it belongs in the keystore.
 *
 * SecureStore is unavailable on web; there it degrades to in-memory storage,
 * which means a web reload signs the user out rather than leaving a token in
 * localStorage where any script on the page can read it.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'prangara.access_token';
const REFRESH_KEY = 'prangara.refresh_token';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const memory: Partial<Record<string, string>> = {};
const useMemory = Platform.OS === 'web';

async function put(key: string, value: string): Promise<void> {
  if (useMemory) {
    memory[key] = value;
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function take(key: string): Promise<string | null> {
  if (useMemory) return memory[key] ?? null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // A corrupt keystore entry must not brick the app; treat it as signed out.
    return null;
  }
}

async function drop(key: string): Promise<void> {
  if (useMemory) {
    delete memory[key];
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Nothing to delete is not an error.
  }
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await Promise.all([
    put(ACCESS_KEY, tokens.accessToken),
    put(REFRESH_KEY, tokens.refreshToken),
  ]);
}

export async function loadTokens(): Promise<Tokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    take(ACCESS_KEY),
    take(REFRESH_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([drop(ACCESS_KEY), drop(REFRESH_KEY)]);
}
