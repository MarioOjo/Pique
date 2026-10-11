import { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, piqueUser, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = pathname === '/onboarding';
    const inMainApp = segments[0] === '(app)' && !onOnboarding;

    if (!user) {
      if (!inAuthGroup) router.replace('/login');
    } else if (!piqueUser?.onboardingComplete) {
      if (!onOnboarding) router.replace('/onboarding');
    } else if (!inMainApp) {
      router.replace('/feed');
    }

    SplashScreen.hideAsync();
  }, [user, piqueUser, loading, segments, pathname, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_600SemiBold });

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
