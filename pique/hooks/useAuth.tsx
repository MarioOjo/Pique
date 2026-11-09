import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { pickGoogleAccount, signOutOfGoogle } from '@/lib/googleSignIn';
import { isAgeBand, isFrankStyle, isSessionSize, isWhyHere } from '@/lib/onboarding';
import type { User as PiqueUser } from '@/types';

interface AuthContextType {
  user: User | null;
  piqueUser: PiqueUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  // Resolves false if the user closed Google's account picker.
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const MAX_NAME_LENGTH = 50;

// A new profile, as the Security Rules require it to start.
function newProfile(name: string, email: string) {
  return {
    name: name.trim().slice(0, MAX_NAME_LENGTH),
    email,
    role: 'standard',
    frankIntroSeen: false,
    onboardingComplete: false,
    dailyCardCount: 0,
    createdAt: serverTimestamp(),
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

function toPiqueUser(snapshot: DocumentSnapshot): PiqueUser | null {
  // 'estimate' fills a pending serverTimestamp with local time instead of null.
  const data = snapshot.data({ serverTimestamps: 'estimate' });
  if (!data) return null;
  return {
    id: snapshot.id,
    name: data.name,
    email: data.email,
    role: data.role,
    // Missing on accounts created before the intro screen existed.
    frankIntroSeen: data.frankIntroSeen === true,
    avatarId: typeof data.avatarId === 'string' ? data.avatarId : undefined,
    onboardingComplete: data.onboardingComplete === true,
    ageBand: isAgeBand(data.ageBand) ? data.ageBand : undefined,
    whyHere: isWhyHere(data.whyHere) ? data.whyHere : undefined,
    frankStyle: isFrankStyle(data.frankStyle) ? data.frankStyle : undefined,
    sessionSize: isSessionSize(data.sessionSize) ? data.sessionSize : undefined,
    sessionsCompleted: typeof data.sessionsCompleted === 'number' ? data.sessionsCompleted : 0,
    dailyCardCount: data.dailyCardCount,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [piqueUser, setPiqueUser] = useState<PiqueUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setProfileLoading(firebaseUser !== null);
      if (!firebaseUser) setPiqueUser(null);
      setAuthLoading(false);
    });
  }, []);

  // Subscribe to the profile doc so changes (e.g. finishing onboarding, or
  // the doc being created right after sign-up) flow through automatically.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        setPiqueUser(toPiqueUser(snapshot));
        setProfileLoading(false);
      },
      (error) => {
        console.warn('Failed to load user profile', error);
        setPiqueUser(null);
        setProfileLoading(false);
      },
    );
  }, [user]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(
      doc(db, 'users', newUser.uid),
      newProfile(name, newUser.email ?? email.trim()),
    );
  };

  // Signs in, or signs up on first use: a Google account with no Pique
  // profile yet gets one, and then goes through the intro and onboarding
  // like anyone who registered.
  const signInWithGoogle = async () => {
    const account = await pickGoogleAccount();
    if (!account) return false;
    const credential = GoogleAuthProvider.credential(account.idToken);
    const { user: googleUser } = await signInWithCredential(auth, credential);
    const ref = doc(db, 'users', googleUser.uid);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const email = googleUser.email ?? account.email;
      const name = googleUser.displayName || account.name || email.split('@')[0];
      await setDoc(ref, newProfile(name, email));
    }
    return true;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await signOutOfGoogle();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        piqueUser,
        loading: authLoading || profileLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
