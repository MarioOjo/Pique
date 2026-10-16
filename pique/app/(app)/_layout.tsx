import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

// Signed-in area: the tab navigator plus full-screen stack screens
// (settings, onboarding, Frank intro) that are pushed over it.
export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
