import { FirebaseError } from 'firebase/app';

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
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && messages[error.code]) {
    return messages[error.code];
  }
  if (__DEV__) {
    console.warn('Unhandled auth error', error);
  }
  return 'Something went wrong. Please try again.';
}
