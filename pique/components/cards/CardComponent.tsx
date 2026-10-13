import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { INTERESTS } from '@/lib/seedInterests';
import { Theme } from '@/constants/theme';
import type { Card } from '@/types';

interface CardComponentProps {
  card: Card;
  onSubmit: (responseText: string, timeOnCard: number) => void;
  onSkip: (timeOnCard: number) => void;
  cardNumber: number;
  totalCards: number;
}

type Choice = 'agree' | 'disagree';
type ViewShift = 'yes' | 'no';

const MIN_RECALL_LENGTH = 20;
const MIN_TOUCH_TARGET = 44;

// Frank's lead-in to the counterpoint, varied per card.
const COUNTERPOINT_LABELS = [
  'Here’s what you might be missing:',
  'Frank sees it differently:',
  'The other side of this:',
  'Worth considering:',
] as const;

// Frank's one-line reaction after a response. The real score is worked
// out in the background, so these acknowledge rather than grade.
const ACKNOWLEDGEMENTS = [
  'Frank noted your response.',
  'Interesting take.',
  'Frank’s listening.',
] as const;

// Optional follow-up on perspective cards, after the counterpoint.
const VIEW_SHIFT_OPTIONS = [
  { value: 'yes', label: 'Yes, a little' },
  { value: 'no', label: 'Not really' },
] as const;

const VIEW_SHIFT_FEEDBACK: Record<ViewShift, string> = {
  yes: 'Noted — Frank will keep the angles coming.',
  no: 'Fair enough — Frank will mix it up next time.',
};

const PULSE_MS = 200; // Submit button 1 → 0.95 → 1
const FLASH_MS = 150; // card border grey → violet → grey
const ACK_DELAY_MS = 500; // once the counterpoint has settled
const ACK_FADE_MS = 300;
const SKIP_NOTE_MS = 2000;
const SKIP_FADE_MS = 300;
const PRESS_IN_MS = 120; // Agree/Disagree shrink to 0.96 on press-in
const COUNTERPOINT_DELAY_MS = 200;
const COUNTERPOINT_REVEAL_MS = 300;
const COUNTERPOINT_OFFSET = 8; // slides up this far as it fades in
const VIEW_SHIFT_DELAY_MS = ACK_DELAY_MS + ACK_FADE_MS; // after Frank's line
const VIEW_SHIFT_FADE_MS = 200;

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Render with key={card.id} so each card mounts fresh: that resets the
// response state and restarts the time-on-card clock.
export function CardComponent({
  card,
  onSubmit,
  onSkip,
  cardNumber,
  totalCards,
}: CardComponentProps) {
  // Lazy initial state runs once, when the card mounts.
  const [startTime] = useState(() => Date.now());
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [responseText, setResponseText] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  // Picked once on mount, so they stay the same for this card.
  const [counterpointLabel] = useState(() => pickRandom(COUNTERPOINT_LABELS));
  const [acknowledgement] = useState(() => pickRandom(ACKNOWLEDGEMENTS));
  const [submitScale] = useState(() => new Animated.Value(1));
  const [borderFlash] = useState(() => new Animated.Value(0));
  const [ackOpacity] = useState(() => new Animated.Value(0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipNoteOpacity] = useState(() => new Animated.Value(1));
  // One scale per choice, so only the pressed button reacts.
  const [choiceScales] = useState(() => ({
    agree: new Animated.Value(1),
    disagree: new Animated.Value(1),
  }));
  const [counterpointReveal] = useState(() => new Animated.Value(0));
  const [viewShift, setViewShift] = useState<ViewShift | null>(null);
  const [viewShiftOpacity] = useState(() => new Animated.Value(0));
  // Guards against a double tap reporting the same card twice.
  const isDone = useRef(false);
  const skipAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Don't leave the skip timer running if the card unmounts mid-way.
  useEffect(() => () => skipAnimation.current?.stop(), []);

  // After submitting: the counterpoint slides up after a short pause, then
  // Frank's reaction fades in, then the "shift your view?" follow-up.
  useEffect(() => {
    if (!hasSubmitted) return;
    Animated.timing(counterpointReveal, {
      toValue: 1,
      delay: COUNTERPOINT_DELAY_MS,
      duration: COUNTERPOINT_REVEAL_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    Animated.timing(ackOpacity, {
      toValue: 1,
      delay: ACK_DELAY_MS,
      duration: ACK_FADE_MS,
      useNativeDriver: true,
    }).start();
    Animated.timing(viewShiftOpacity, {
      toValue: 1,
      delay: VIEW_SHIFT_DELAY_MS,
      duration: VIEW_SHIFT_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [hasSubmitted, ackOpacity, counterpointReveal, viewShiftOpacity]);

  const isPerspective = card.type === 'perspective';
  const topicName =
    INTERESTS.find((interest) => interest.id === card.interestId)?.name ??
    capitalise(card.interestId);
  const trimmedLength = responseText.trim().length;
  const hasResponse = isPerspective ? selectedChoice !== null : trimmedLength >= MIN_RECALL_LENGTH;
  const canSubmit = hasResponse && !isSkipping;
  // Responses are locked once submitted or while a skip plays out.
  const isLocked = hasSubmitted || isSkipping;
  const showImage = Boolean(card.imageUrl) && !imageFailed;

  const finish = (report: (elapsed: number) => void) => {
    if (isDone.current) return;
    isDone.current = true;
    report(Date.now() - startTime);
  };

  const handleNext = () => {
    const text = isPerspective ? (selectedChoice ?? '') : responseText.trim();
    finish((elapsed) => onSubmit(text, elapsed));
  };

  // Shows "Skipped — Frank noticed." for 2s, fades it, then advances. Time
  // on card is measured at the tap, so the pause doesn't inflate it.
  const handleSkip = () => {
    if (isDone.current || isSubmitting) return;
    isDone.current = true;
    const elapsed = Date.now() - startTime;
    setIsSkipping(true);
    skipAnimation.current = Animated.sequence([
      Animated.delay(SKIP_NOTE_MS),
      Animated.timing(skipNoteOpacity, {
        toValue: 0,
        duration: SKIP_FADE_MS,
        useNativeDriver: true,
      }),
    ]);
    skipAnimation.current.start(({ finished }) => {
      if (finished) onSkip(elapsed);
    });
  };

  // Pulse the button and flash the card border, then reveal what comes
  // after submitting.
  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(submitScale, { toValue: 0.95, duration: PULSE_MS / 2, useNativeDriver: true }),
        Animated.timing(submitScale, { toValue: 1, duration: PULSE_MS / 2, useNativeDriver: true }),
      ]),
      Animated.sequence([
        // Colours can't animate on the native driver.
        Animated.timing(borderFlash, { toValue: 1, duration: FLASH_MS / 2, useNativeDriver: false }),
        Animated.timing(borderFlash, { toValue: 0, duration: FLASH_MS / 2, useNativeDriver: false }),
      ]),
    ]).start(() => setHasSubmitted(true));
  };

  const handleChoicePressIn = (choice: Choice) => {
    Animated.timing(choiceScales[choice], {
      toValue: 0.96,
      duration: PRESS_IN_MS,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handleChoicePressOut = (choice: Choice) => {
    Animated.spring(choiceScales[choice], {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  // Animated values have to be passed as style objects.
  const counterpointMotion = {
    opacity: counterpointReveal,
    transform: [
      {
        translateY: counterpointReveal.interpolate({
          inputRange: [0, 1],
          outputRange: [COUNTERPOINT_OFFSET, 0],
        }),
      },
    ],
  };
  const surfaceBorder = {
    borderColor: borderFlash.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.borderGrey, Colors.violet],
    }),
  };

  return (
    <View>
      <Animated.View
        style={[styles.surface, surfaceBorder]}
        accessibilityLabel={`Card ${cardNumber} of ${totalCards}`}
      >
        <View style={styles.clip}>
          {showImage && (
            <View>
              <Image
                source={{ uri: card.imageUrl }}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
                accessibilityIgnoresInvertColors
              />
              <View style={styles.topicBadge}>
                <Text style={styles.topicText}>{topicName}</Text>
              </View>
              <View style={styles.credit}>
                <Text style={styles.creditText}>📷 {card.imageCredit ?? 'Unsplash'}</Text>
              </View>
            </View>
          )}

          <View style={styles.content}>
            <Text style={styles.typeLabel}>{card.type.toUpperCase()}</Text>
            <Text style={styles.body}>{card.body}</Text>
            <Text style={styles.prompt}>{card.prompt}</Text>

            <View style={styles.response}>
              {isPerspective ? (
                <View style={styles.choices} accessibilityRole="radiogroup">
                  {(['agree', 'disagree'] as const).map((choice) => {
                    const selected = selectedChoice === choice;
                    return (
                      <Animated.View
                        key={choice}
                        style={[styles.choiceWrap, { transform: [{ scale: choiceScales[choice] }] }]}
                      >
                        <Pressable
                          style={[styles.choice, selected && styles.choiceSelected]}
                          onPress={() => setSelectedChoice(choice)}
                          onPressIn={() => handleChoicePressIn(choice)}
                          onPressOut={() => handleChoicePressOut(choice)}
                          disabled={isLocked}
                          accessibilityRole="radio"
                          accessibilityState={{ selected, disabled: isLocked }}
                        >
                          <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                            {capitalise(choice)}
                          </Text>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.recall}>
                  <TextInput
                    style={[styles.input, isFocused && styles.inputFocused]}
                    value={responseText}
                    onChangeText={setResponseText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Write your response..."
                    placeholderTextColor={Colors.midGrey}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                    editable={!isLocked}
                    accessibilityLabel="Your response"
                  />
                  <Text
                    style={[
                      styles.counter,
                      trimmedLength >= MIN_RECALL_LENGTH && styles.counterMet,
                    ]}
                  >
                    {trimmedLength} / {MIN_RECALL_LENGTH} minimum
                  </Text>
                </View>
              )}

              {hasSubmitted ? (
                <>
                  {isPerspective && card.counterpoint && (
                    <Animated.View style={[styles.counterpoint, counterpointMotion]}>
                      <Text style={styles.counterpointLabel}>{counterpointLabel}</Text>
                      <Text style={styles.counterpointText}>{card.counterpoint}</Text>
                    </Animated.View>
                  )}
                  <Animated.Text
                    style={[styles.acknowledgement, { opacity: ackOpacity }]}
                    accessibilityLiveRegion="polite"
                  >
                    {acknowledgement}
                  </Animated.Text>
                  {isPerspective && card.counterpoint && (
                    <Animated.View style={[styles.viewShift, { opacity: viewShiftOpacity }]}>
                      <Text style={styles.viewShiftQuestion}>Did that shift your view?</Text>
                      <View style={styles.viewShiftOptions} accessibilityRole="radiogroup">
                        {VIEW_SHIFT_OPTIONS.map((option) => {
                          const selected = viewShift === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              style={[styles.pill, selected && styles.pillSelected]}
                              onPress={() => setViewShift(option.value)}
                              accessibilityRole="radio"
                              accessibilityState={{ selected }}
                            >
                              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {viewShift && (
                        <Text style={styles.viewShiftFeedback} accessibilityLiveRegion="polite">
                          {VIEW_SHIFT_FEEDBACK[viewShift]}
                        </Text>
                      )}
                    </Animated.View>
                  )}
                  <Button title="Next card →" onPress={handleNext} />
                </>
              ) : (
                <Animated.View style={{ transform: [{ scale: submitScale }] }}>
                  <Button title="Submit" onPress={handleSubmit} disabled={!canSubmit} />
                </Animated.View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>

      {!hasSubmitted && !isSubmitting && (
        <Pressable
          style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
          onPress={handleSkip}
          disabled={isSkipping}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSkipping }}
        >
          <Text style={styles.skipText}>Skip this card</Text>
        </Pressable>
      )}
      {isSkipping && (
        <Animated.Text
          style={[styles.skipNote, { opacity: skipNoteOpacity }]}
          accessibilityLiveRegion="polite"
        >
          Skipped — Frank noticed.
        </Animated.Text>
      )}
    </View>
  );
}

const CONTENT_PADDING = Theme.spacing.md + Theme.spacing.xs; // 20

const styles = StyleSheet.create({
  surface: {
    backgroundColor: Colors.white,
    // Colour is animated: it flashes violet on submit.
    borderWidth: 1,
    borderRadius: Theme.borderRadius.lg,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Separate from the surface: overflow hidden would clip the iOS shadow.
  clip: {
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.borderGrey,
  },
  topicBadge: {
    position: 'absolute',
    top: Theme.spacing.md,
    left: Theme.spacing.md,
    backgroundColor: Colors.violet,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: Theme.spacing.sm + Theme.spacing.xs,
    paddingVertical: Theme.spacing.xs,
  },
  topicText: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 12,
  },
  credit: {
    position: 'absolute',
    right: Theme.spacing.sm,
    bottom: Theme.spacing.sm,
    backgroundColor: Colors.scrim,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs / 2,
  },
  creditText: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.xs,
  },
  content: {
    padding: CONTENT_PADDING,
  },
  typeLabel: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
    letterSpacing: 2,
    marginBottom: Theme.spacing.sm,
  },
  body: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 26,
  },
  prompt: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    marginTop: Theme.spacing.sm,
  },
  response: {
    marginTop: CONTENT_PADDING,
    gap: Theme.spacing.md,
  },
  choices: {
    flexDirection: 'row',
    gap: Theme.spacing.sm + Theme.spacing.xs / 2, // 10
  },
  choiceWrap: {
    flex: 1,
  },
  choice: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderColor: Colors.borderGrey,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
  },
  choiceSelected: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  choiceText: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
  choiceTextSelected: {
    color: Colors.white,
  },
  recall: {
    gap: Theme.spacing.xs,
  },
  input: {
    minHeight: 80,
    // Scrolls inside rather than pushing the card down as the answer grows.
    maxHeight: 120,
    borderColor: Colors.borderGrey,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm + Theme.spacing.xs,
    color: Colors.navy,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: Colors.violet,
  },
  counter: {
    alignSelf: 'flex-end',
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 12,
  },
  counterMet: {
    color: Colors.violet,
  },
  counterpoint: {
    backgroundColor: Colors.lightViolet,
    borderLeftColor: Colors.violet,
    borderLeftWidth: 3,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  counterpointLabel: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
  },
  counterpointText: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  acknowledgement: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Theme.spacing.sm - Theme.spacing.md, // 8 below the box; parent gap is 16
  },
  // Matches the card's width, which already sits 16 in from each screen edge.
  viewShift: {
    marginTop: Theme.spacing.xs, // 20 below Frank's line; parent gap is 16
  },
  viewShiftQuestion: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 15,
    marginBottom: Theme.spacing.sm + Theme.spacing.xs,
  },
  viewShiftOptions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm + Theme.spacing.xs / 2, // 10
  },
  pill: {
    flex: 1,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: Colors.borderGrey,
    borderWidth: 1.5,
    borderRadius: Theme.borderRadius.full,
  },
  pillSelected: {
    backgroundColor: Colors.navy,
  },
  pillText: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
  },
  pillTextSelected: {
    color: Colors.white,
  },
  viewShiftFeedback: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
    marginTop: Theme.spacing.sm,
  },
  skip: {
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: Colors.borderGrey,
    borderWidth: 1.5,
    borderRadius: 14,
    marginTop: Theme.spacing.sm + Theme.spacing.xs, // 12
  },
  skipPressed: {
    opacity: 0.6,
  },
  skipNote: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  skipText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
  },
});
