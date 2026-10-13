import { Stack } from 'expo-router';

// Signed-in area: the tab navigator plus full-screen stack screens
// (settings, onboarding, Frank intro) that are pushed over it.
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
