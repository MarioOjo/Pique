import { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { SplashAnimation } from '@/components/ui/SplashAnimation';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, piqueUser, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  // The intro plays over the app on cold start while auth resolves underneath.
  const [showSplash, setShowSplash] = useState(true);

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
  }, [user, piqueUser, loading, segments, pathname, router]);

  return (
    <>
      <StatusBar style={showSplash ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      {showSplash && <SplashAnimation onDone={() => setShowSplash(false)} />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
