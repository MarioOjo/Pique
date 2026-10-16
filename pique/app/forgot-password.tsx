import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FormScreen } from '@/components/ui/FormScreen';
import { TextField } from '@/components/ui/TextField';
import { useAuthStyles } from '@/components/ui/authStyles';
import { Theme } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { auth, useEmulators } from '@/lib/firebase';

const MIN_TOUCH_TARGET = 44;

// Outside both route groups, so it opens from login (signed out) and from
// Settings (signed in). The root layout leaves it alone in either state.
export default function ForgotPasswordScreen() {
  const styles = useStyles();
  const authStyles = useAuthStyles();
  const { colors } = useTheme();
  const router = useRouter();
  // Signed in (from Settings): start with their email so they can just send.
  const [email, setEmail] = useState(() => auth.currentUser?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email first.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSentTo(trimmed);
    } catch (e) {
      // Don't reveal whether an account exists: an unknown email gets the
      // same confirmation, as it does in production with Firebase's email
      // enumeration protection on.
      if (e instanceof FirebaseError && e.code === 'auth/user-not-found') {
        setSentTo(trimmed);
      } else {
        console.warn('Password reset failed', e);
        setError(getAuthErrorMessage(e));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <FormScreen>
      <Pressable
        style={styles.back}
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>

      <Text style={authStyles.heading} accessibilityRole="header">
        Reset your password
      </Text>
      <Text style={styles.subtitle}>Enter your email and we’ll send you a link.</Text>

      <View style={styles.field}>
        <TextField
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!sentTo && !sending}
        />
        <ErrorMessage message={error} />
      </View>

      {sentTo ? (
        <View style={styles.field}>
          <Text style={styles.success} accessibilityLiveRegion="polite">
            If an account exists for {sentTo}, we’ve sent a reset link. Check your inbox.
          </Text>
          {useEmulators && (
            <Text style={styles.devNote}>
              Dev: the emulator doesn’t send email. The reset link is printed in the emulator
              terminal.
            </Text>
          )}
        </View>
      ) : (
        <Button title="Send reset link" onPress={handleSend} loading={sending} />
      )}
    </FormScreen>
  );
}

const useStyles = makeStyles((c) => ({
  // FormScreen centres its content, so the back button is pinned to the
  // top-left corner instead of sitting in the flow.
  back: {
    position: 'absolute',
    top: Theme.spacing.sm,
    left: Theme.spacing.sm,
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  field: {
    gap: Theme.spacing.sm,
  },
  success: {
    color: c.success,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  devNote: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.xs,
    textAlign: 'center',
  },
}));
