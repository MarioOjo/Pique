import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
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
  'Good answer.',
  'Frank’s listening.',
] as const;

const PULSE_MS = 200; // Submit button 1 → 0.95 → 1
const FLASH_MS = 150; // card border grey → violet → grey
const ACK_DELAY_MS = 400; // after the counterpoint appears
const ACK_FADE_MS = 300;

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
  // Guards against a double tap reporting the same card twice.
  const isDone = useRef(false);

  // Frank's reaction fades in shortly after the post-submit content shows.
  useEffect(() => {
    if (!hasSubmitted) return;
    Animated.timing(ackOpacity, {
      toValue: 1,
      delay: ACK_DELAY_MS,
      duration: ACK_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [hasSubmitted, ackOpacity]);

  const isPerspective = card.type === 'perspective';
  const trimmedLength = responseText.trim().length;
  const canSubmit = isPerspective ? selectedChoice !== null : trimmedLength >= MIN_RECALL_LENGTH;
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

  const handleSkip = () => finish(onSkip);

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

  // Animated values have to be passed as style objects.
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
                <Text style={styles.topicText}>{capitalise(card.interestId)}</Text>
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
                      <Pressable
                        key={choice}
                        style={[styles.choice, selected && styles.choiceSelected]}
                        onPress={() => setSelectedChoice(choice)}
                        disabled={hasSubmitted}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: hasSubmitted }}
                      >
                        <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                          {capitalise(choice)}
                        </Text>
                      </Pressable>
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
                    editable={!hasSubmitted}
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
                    <View style={styles.counterpoint}>
                      <Text style={styles.counterpointLabel}>{counterpointLabel}</Text>
                      <Text style={styles.counterpointText}>{card.counterpoint}</Text>
                    </View>
                  )}
                  <Animated.Text
                    style={[styles.acknowledgement, { opacity: ackOpacity }]}
                    accessibilityLiveRegion="polite"
                  >
                    {acknowledgement}
                  </Animated.Text>
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

      {!hasSubmitted && (
        <Pressable style={styles.skip} onPress={handleSkip} accessibilityRole="button">
          <Text style={styles.skipText}>Skip this card</Text>
        </Pressable>
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
  choice: {
    flex: 1,
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
  skip: {
    alignSelf: 'center',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    padding: Theme.spacing.sm + Theme.spacing.xs, // 12
    marginTop: Theme.spacing.xs,
  },
  skipText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
});
