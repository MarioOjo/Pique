// Google sign-in on Android, via @react-native-google-signin/google-signin.
// The library is native code, so it isn't in Expo Go: the button only shows
// in development and release builds, and the module is loaded lazily so
// importing this file never crashes Expo Go.

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// The Web client ID from Firebase (Authentication → Sign-in method → Google
// → Web SDK configuration). Not a secret: Google uses it to issue an ID
// token Firebase will accept.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Android only for now: iOS would also need its own OAuth client.
export const googleSignInAvailable =
  Platform.OS === 'android' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  !!WEB_CLIENT_ID;

export interface GoogleAccount {
  idToken: string;
  name: string | null;
  email: string;
}

// Error codes the sign-in screens turn into friendly messages.
export const GOOGLE_PLAY_SERVICES_MISSING = 'google/play-services-unavailable';
export const GOOGLE_NOT_CONFIGURED = 'google/not-configured';

export class GoogleSignInError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

let configured = false;

async function loadModule() {
  const module = await import('@react-native-google-signin/google-signin');
  if (!configured) {
    module.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
  return module;
}

// Shows Google's account picker. Resolves null if the user backs out.
export async function pickGoogleAccount(): Promise<GoogleAccount | null> {
  if (!googleSignInAvailable) throw new GoogleSignInError(GOOGLE_NOT_CONFIGURED);
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await loadModule();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const { idToken, user } = response.data;
    // No ID token means the Web client ID or the app's SHA-1 doesn't match
    // what's registered in Firebase.
    if (!idToken) throw new GoogleSignInError(GOOGLE_NOT_CONFIGURED);
    return { idToken, name: user.name, email: user.email };
  } catch (e) {
    if (e instanceof GoogleSignInError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError(GOOGLE_PLAY_SERVICES_MISSING);
      }
      // DEVELOPER_ERROR: a SHA-1 or client ID mismatch.
      if (e.code === '10' || e.code === 'DEVELOPER_ERROR') {
        if (__DEV__) console.warn('Google sign-in DEVELOPER_ERROR: check the SHA-1 and Web client ID');
        throw new GoogleSignInError(GOOGLE_NOT_CONFIGURED);
      }
    }
    throw e;
  }
}

// Clears Google's remembered account, so the next sign-in shows the picker.
export async function signOutOfGoogle(): Promise<void> {
  if (!googleSignInAvailable) return;
  try {
    const { GoogleSignin } = await loadModule();
    await GoogleSignin.signOut();
  } catch (e) {
    console.warn('Google sign-out failed', e);
  }
}
