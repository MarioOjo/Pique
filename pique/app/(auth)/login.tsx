import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { FormScreen } from '@/components/ui/FormScreen';
import { LogoMark } from '@/components/ui/LogoMark';
import { TextField } from '@/components/ui/TextField';
import { authStyles } from '@/components/ui/authStyles';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // On success the root layout redirects based on the new auth state.
      await signIn(email, password);
    } catch (e) {
      setError(getAuthErrorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <FormScreen>
      <LogoMark />
      <Text style={authStyles.heading}>Welcome back</Text>
      <Text style={authStyles.subheading}>Sign in to keep your streak going.</Text>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSignIn}
      />

      <Pressable
        style={({ pressed }) => [styles.forgot, pressed && styles.forgotPressed]}
        onPress={() => router.push('/forgot-password')}
        hitSlop={FORGOT_HIT_SLOP}
        accessibilityRole="link"
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      {error && <Text style={authStyles.error}>{error}</Text>}

      <Button title="Sign in" onPress={handleSignIn} loading={submitting} />

      <View style={authStyles.footer}>
        <Text style={authStyles.footerText}>New to Pique? </Text>
        <Link href="/register" replace>
          <Text style={authStyles.link}>Create an account</Text>
        </Link>
      </View>
    </FormScreen>
  );
}

// The text is about 20pt tall; this extends its touch area to 44pt.
const FORGOT_HIT_SLOP = 12;

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    marginTop: Theme.spacing.sm - Theme.spacing.md, // 8 below the field
  },
  forgotPressed: {
    opacity: 0.6,
  },
  forgotText: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
});
