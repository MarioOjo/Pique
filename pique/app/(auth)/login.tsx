import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FormScreen } from '@/components/ui/FormScreen';
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';
import { LogoMark } from '@/components/ui/LogoMark';
import { OrDivider } from '@/components/ui/OrDivider';
import { TextField } from '@/components/ui/TextField';
import { useAuthStyles } from '@/components/ui/authStyles';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';

export default function LoginScreen() {
  const styles = useStyles();
  const authStyles = useAuthStyles();
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

      <ErrorMessage message={error} />

      <Button title="Sign in" onPress={handleSignIn} loading={submitting} />

      <OrDivider />

      <GoogleSignInButton onError={setError} disabled={submitting} />

      <Button
        title="Create account"
        variant="outline"
        onPress={() => router.replace('/register')}
      />
    </FormScreen>
  );
}

// The text is about 20pt tall; this extends its touch area to 44pt.
const FORGOT_HIT_SLOP = 12;

const useStyles = makeStyles((c) => ({
  forgot: {
    alignSelf: 'flex-end',
    marginTop: Theme.spacing.sm - Theme.spacing.md, // 8 below the field
  },
  forgotPressed: {
    opacity: 0.6,
  },
  forgotText: {
    color: c.accentText,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
}));
