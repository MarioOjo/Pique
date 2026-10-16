import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { isAgeBand, isFrankStyle, isSessionSize, isWhyHere } from '@/lib/onboarding';
import type { User as PiqueUser } from '@/types';

interface AuthContextType {
  user: User | null;
  piqueUser: PiqueUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
    await setDoc(doc(db, 'users', newUser.uid), {
      name: name.trim(),
      email: newUser.email ?? email.trim(),
      role: 'standard',
      frankIntroSeen: false,
      onboardingComplete: false,
      dailyCardCount: 0,
      createdAt: serverTimestamp(),
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        piqueUser,
        loading: authLoading || profileLoading,
        signIn,
        signUp,
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
