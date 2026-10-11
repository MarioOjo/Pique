import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <PlaceholderScreen title="Profile coming soon">
      <View style={styles.action}>
        <Button title="Sign out" onPress={handleSignOut} loading={signingOut} />
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignSelf: 'stretch',
  },
});
