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
    const onFrankIntro = pathname === '/frank-intro';
    const onOnboarding = pathname === '/onboarding';
    const inMainApp = segments[0] === '(app)' && !onOnboarding && !onFrankIntro;
    // Opened from login and from Settings, so it's allowed signed in or out.
    const onForgotPassword = pathname === '/forgot-password';

    // Every step uses replace, so back never returns to a finished step.
    // The intro only applies before onboarding: users who onboarded before
    // it existed (no frankIntroSeen field) go straight to the feed.
    if (onForgotPassword) {
      // Leave the user where they are.
    } else if (!user) {
      if (!inAuthGroup) router.replace('/login');
    } else if (!piqueUser?.onboardingComplete && !piqueUser?.frankIntroSeen) {
      if (!onFrankIntro) router.replace('/frank-intro');
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
