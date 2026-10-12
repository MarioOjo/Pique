import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { CardComponent } from '@/components/cards/CardComponent';
import { SessionComplete } from '@/components/feed/SessionComplete';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/LogoMark';
import { WelcomeBanner } from '@/components/ui/WelcomeBanner';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCards } from '@/hooks/useCards';
import { useStats } from '@/hooks/useStats';

const ENTRANCE_OFFSET = 300;
const ENTRANCE_MS = 250;

export default function FeedScreen() {
  const { user, piqueUser } = useAuth();
  const {
    currentCard,
    sessionCards,
    currentIndex,
    totalCards,
    engagedCount,
    isSessionComplete,
    loadCards,
    submitResponse,
    skipCard,
    isLoading,
    error,
    usingFallbackCards,
  } = useCards();
  // Live, so the header and session summary update as soon as updateStats runs.
  const { stats } = useStats(user?.uid);
  const streak = stats.currentStreak;
  const router = useRouter();
  const [translateX] = useState(() => new Animated.Value(ENTRANCE_OFFSET));
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Slide each new card in from the right.
  useEffect(() => {
    if (!currentCard) return;
    translateX.setValue(ENTRANCE_OFFSET);
    Animated.timing(translateX, {
      toValue: 0,
      duration: ENTRANCE_MS,
      useNativeDriver: true,
    }).start();
  }, [currentCard, translateX]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: totalCards > 0 ? currentIndex / totalCards : 0,
      duration: ENTRANCE_MS,
      // Width can't be animated on the native driver.
      useNativeDriver: false,
    }).start();
  }, [currentIndex, totalCards, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.violet} />
          <Text style={styles.message}>Frank is writing your cards…</Text>
        </View>
      );
    }

    if (error || totalCards === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>{error ?? 'No cards available right now.'}</Text>
          <View style={styles.action}>
            <Button title="Try again" onPress={loadCards} />
          </View>
        </View>
      );
    }

    if (isSessionComplete || !currentCard) {
      return (
        <SessionComplete
          cardsCompleted={engagedCount}
          topicsExplored={new Set(sessionCards.map((card) => card.interestId)).size}
          bestStreak={stats.longestStreak}
          onStartNewSession={loadCards}
          onViewProfile={() => router.navigate('/profile')}
        />
      );
    }

    return (
      <>
        <View style={styles.progress}>
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: totalCards, now: currentIndex }}
          >
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>
            Card {currentIndex + 1} of {totalCards}
            {usingFallbackCards ? ' · sample cards' : ''}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.cardArea}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ transform: [{ translateX }] }}>
              <CardComponent
                key={currentCard.id}
                card={currentCard}
                onSubmit={submitResponse}
                onSkip={skipCard}
                cardNumber={currentIndex + 1}
                totalCards={totalCards}
              />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <LogoMark size="small" />
            <Text style={styles.brandText}>Pique</Text>
          </View>
          <View style={styles.streak} accessibilityLabel={`${streak} day streak`}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.flex}>
        {renderBody()}
        {piqueUser?.name && <WelcomeBanner message={`Welcome back, ${piqueUser.name}!`} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.lightGrey,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.navy,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  brandText: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  streakIcon: {
    fontSize: Theme.fontSize.md,
  },
  streakText: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
  progress: {
    gap: Theme.spacing.xs,
    paddingBottom: Theme.spacing.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.borderGrey,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.violet,
  },
  progressText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  cardArea: {
    padding: Theme.spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  message: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: Theme.spacing.md,
  },
});
