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
import { ONBOARDING_ROUTES } from '@/lib/onboarding';

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
    // Any of the question screens between the intro and the feed. Each one
    // moves on to the next itself.
    const onOnboarding = (ONBOARDING_ROUTES as readonly string[]).includes(pathname);
    const inMainApp = segments[0] === '(app)' && !onOnboarding && !onFrankIntro;
    // Opened from login and from Settings, so it's allowed signed in or out.
    const onForgotPassword = pathname === '/forgot-password';

    // Redirects use replace, so back never returns to a finished stage. Within
    // onboarding the question screens push, so answers can be changed with
    // back until the summary completes it.
    // The intro only applies before onboarding: users who onboarded before
    // it existed (no frankIntroSeen field) go straight to the feed.
    if (onForgotPassword) {
      // Leave the user where they are.
    } else if (!user) {
      if (!inAuthGroup) router.replace('/login');
    } else if (!piqueUser?.onboardingComplete && !piqueUser?.frankIntroSeen) {
      if (!onFrankIntro) router.replace('/frank-intro');
    } else if (!piqueUser?.onboardingComplete) {
      if (!onOnboarding) router.replace(ONBOARDING_ROUTES[0]);
    } else if (!inMainApp) {
      router.replace('/feed');
    }
  }, [user, piqueUser, loading, segments, pathname, router]);

  return (
    <>
      <StatusBar style={showSplash ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      {showSplash && (
        <SplashAnimation appReady={!loading} onDone={() => setShowSplash(false)} />
      )}
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
