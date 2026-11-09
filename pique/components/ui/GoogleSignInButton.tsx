import { useState } from 'react';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { googleSignInAvailable } from '@/lib/googleSignIn';

interface GoogleSignInButtonProps {
  // Called with a friendly message, or null to clear the screen's error.
  onError: (message: string | null) => void;
  disabled?: boolean;
}

// "Continue with Google" for the login and register screens. Renders
// nothing where Google sign-in isn't available (Expo Go, iOS).
export function GoogleSignInButton({ onError, disabled }: GoogleSignInButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!googleSignInAvailable) return null;

  const handlePress = async () => {
    onError(null);
    setLoading(true);
    try {
      // On success the root layout redirects, which unmounts this screen.
      const signedIn = await signInWithGoogle();
      if (!signedIn) setLoading(false);
    } catch (e) {
      onError(getAuthErrorMessage(e));
      setLoading(false);
    }
  };

  return <GoogleButton onPress={handlePress} loading={loading} disabled={disabled} />;
}
