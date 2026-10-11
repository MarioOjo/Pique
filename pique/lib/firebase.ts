import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth may only run once per app; on fast refresh it throws, so
// fall back to the already-initialized instance.
function createAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const functions = getFunctions(app);
export default app;

// --- Local emulators (development only) ---

// In dev builds, talk to the Firebase emulators started with
// `npx firebase-tools emulators:start` from pique/. Set
// EXPO_PUBLIC_USE_EMULATORS=false in .env to use the real project instead.
const useEmulators = __DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS !== 'false';

// On a phone, "localhost" is the phone itself. Expo's hostUri is the dev
// machine's address as seen by the device (e.g. 192.168.1.20:8081), so
// reuse its host. Falls back to localhost for simulators and web.
function emulatorHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri?.split(':')[0] || 'localhost';
}

// Module state resets on fast refresh, but the Firebase instances don't,
// and connecting an instance twice throws. Keep the flag on globalThis.
const emulatorState = globalThis as typeof globalThis & {
  __piqueEmulatorsConnected?: boolean;
};

if (useEmulators && !emulatorState.__piqueEmulatorsConnected) {
  emulatorState.__piqueEmulatorsConnected = true;
  const host = emulatorHost();
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
  console.log(`[firebase] Using local emulators at ${host}`);
}
