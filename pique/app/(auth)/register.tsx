import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FormScreen } from '@/components/ui/FormScreen';
import { LogoMark } from '@/components/ui/LogoMark';
import { TextField } from '@/components/ui/TextField';
import { authStyles } from '@/components/ui/authStyles';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter your name.';
    if (!email.trim()) return 'Please enter your email address.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Please choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirmPassword) return 'Passwords don’t match.';
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // On success the root layout redirects to the Frank intro, which
      // opens by confirming the account was created.
      await signUp(name, email, password);
    } catch (e) {
      setError(getAuthErrorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <FormScreen>
      <LogoMark />
      <Text style={authStyles.heading}>Create account</Text>
      <Text style={authStyles.subheading}>Swap scrolling for thinking.</Text>

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
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
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />
      <TextField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter your password"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSignUp}
      />

      <ErrorMessage message={error} />

      <Button title="Create account" onPress={handleSignUp} loading={submitting} />

      <Text style={styles.notice}>
        By creating an account, you agree that Pique stores your answers and sends them to
        Claude, Anthropic’s AI, to write and score your cards. Pique is for adults aged 18 and
        over.
      </Text>

      <View style={authStyles.footer}>
        <Text style={authStyles.footerText}>Already have an account? </Text>
        <Link href="/login" replace>
          <Text style={authStyles.link}>Sign in</Text>
        </Link>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
