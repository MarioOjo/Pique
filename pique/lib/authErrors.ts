import { FirebaseError } from 'firebase/app';
import {
  GOOGLE_NOT_CONFIGURED,
  GOOGLE_PLAY_SERVICES_MISSING,
  GoogleSignInError,
} from '@/lib/googleSignIn';

const messages: Record<string, string> = {
  'auth/invalid-credential': 'That email and password don’t match. Please try again.',
  'auth/wrong-password': 'That email and password don’t match. Please try again.',
  'auth/user-not-found': 'That email and password don’t match. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Please choose a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Can’t reach the server. Check your connection and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  // Google sign-in for an email that already has a password account.
  'auth/account-exists-with-different-credential':
    'This email already has a Pique account. Sign in with your password.',
  'auth/operation-not-allowed': 'Google sign-in isn’t available right now.',
  [GOOGLE_PLAY_SERVICES_MISSING]: 'Google sign-in needs Google Play services on this phone.',
  [GOOGLE_NOT_CONFIGURED]: 'Google sign-in isn’t available right now. Use your email instead.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof GoogleSignInError && messages[error.code]) {
    return messages[error.code];
  }
  if (error instanceof FirebaseError && messages[error.code]) {
    return messages[error.code];
  }
  if (__DEV__) {
    console.warn('Unhandled auth error', error);
  }
  return 'Something went wrong. Please try again.';
}
