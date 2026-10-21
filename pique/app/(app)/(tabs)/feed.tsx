import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CardComponent } from '@/components/cards/CardComponent';
import { DoneForToday } from '@/components/feed/DoneForToday';
import { SessionComplete } from '@/components/feed/SessionComplete';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/LogoMark';
import { WelcomeBanner } from '@/components/ui/WelcomeBanner';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useCards } from '@/hooks/useCards';
import { useStats } from '@/hooks/useStats';

const ENTRANCE_OFFSET = 300;
const ENTRANCE_MS = 250;
const MIN_TOUCH_TARGET = 44;
// Long enough to read the slow-down nudge.
const SLOW_DOWN_MS = 4000;

export default function FeedScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
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
    isLoadingMore,
    error,
    usingFallbackCards,
    outOfCardsToday,
    moreCardsToday,
    slowDownNudges,
    sessionAnswers,
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
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.message, styles.loadingMessage]}>Frank is writing your cards…</Text>
          <Text style={styles.hint}>This usually takes a few seconds.</Text>
        </View>
      );
    }

    if (!error && outOfCardsToday) {
      return (
        <DoneForToday
          onCheckAgain={loadCards}
          onViewProfile={() => router.navigate('/profile')}
        />
      );
    }

    if (error || totalCards === 0) {
      return (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.title} accessibilityRole="header">
            Frank couldn’t load your cards
          </Text>
          <Text style={styles.message}>{error ?? 'There are no cards right now.'}</Text>
          <View style={styles.action}>
            <Button title="Try again" onPress={loadCards} />
          </View>
        </View>
      );
    }

    // Answered every card that's arrived; the rest are still being written.
    if (!currentCard && isLoadingMore) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.message, styles.loadingMessage]}>Frank is finishing your next card…</Text>
        </View>
      );
    }

    if (isSessionComplete || !currentCard) {
      return (
        <SessionComplete
          cardsCompleted={engagedCount}
          topicsExplored={new Set(sessionCards.map((card) => card.interestId)).size}
          bestStreak={stats.longestStreak}
          answers={sessionAnswers}
          points={stats.points}
          moreToday={moreCardsToday}
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
            {usingFallbackCards ? ' · sample cards while Frank is offline' : ''}
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
          <View style={styles.headerActions}>
            <View style={styles.streak} accessibilityLabel={`${streak} day streak`}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{streak}</Text>
            </View>
            <Pressable
              style={styles.iconButton}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color={colors.onHeader} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.flex}>
        {renderBody()}
        {piqueUser?.name && <WelcomeBanner message={`Welcome back, ${piqueUser.name}!`} />}
        {/* Keyed by count, so each nudge remounts and plays again. */}
        {slowDownNudges > 0 && (
          <WelcomeBanner
            key={slowDownNudges}
            message="You’re flying through these. Frank’s cards land better when you read them."
            durationMs={SLOW_DOWN_MS}
          />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: c.header,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Theme.spacing.md,
    paddingRight: Theme.spacing.xs,
    paddingVertical: Theme.spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  brandText: {
    color: c.onHeader,
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
    backgroundColor: c.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.accent,
  },
  progressText: {
    color: c.textSecondary,
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
  loadingMessage: {
    fontStyle: 'italic',
  },
  title: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg,
    textAlign: 'center',
  },
  hint: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
  },
  message: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: Theme.spacing.md,
  },
}));
