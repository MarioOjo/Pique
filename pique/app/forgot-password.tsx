import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/Button';
import { FormScreen } from '@/components/ui/FormScreen';
import { TextField } from '@/components/ui/TextField';
import { authStyles } from '@/components/ui/authStyles';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { auth } from '@/lib/firebase';

const MIN_TOUCH_TARGET = 44;

// Outside both route groups, so it opens from login (signed out) and from
// Settings (signed in). The root layout leaves it alone in either state.
export default function ForgotPasswordScreen() {
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
      console.warn('Password reset failed', e);
      setError('Couldn’t send a reset link. Check the address and try again.');
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
        <Ionicons name="chevron-back" size={24} color={Colors.navy} />
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
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>

      {sentTo ? (
        <Text style={styles.success} accessibilityLiveRegion="polite">
          Check your inbox — we sent a reset link to {sentTo}.
        </Text>
      ) : (
        <Button title="Send reset link" onPress={handleSend} loading={sending} />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
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
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  field: {
    gap: Theme.spacing.sm,
  },
  error: {
    color: Colors.danger,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  success: {
    color: Colors.success,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
  },
});
