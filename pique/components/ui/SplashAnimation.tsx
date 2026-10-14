import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

// Timing (ms). Full run is about 9.6s:
// 600 + 800 + 3 × 450 + 4 × (450 + 200) + 400 + 400 + 300 + 200 + 1400 + 1500
const INTRO_DELAY_MS = 600; // empty navy beat before the P arrives
const P_ENTER_MS = 800; // P drifts in over the i
const SCAN_MOVE_MS = 450; // P moving from one letter to the next
const SCAN_PAUSE_MS = 450; // letter held in view inside the P's counter
const LETTER_HIDE_MS = 200; // letter fades out before the P moves on
const SETTLE_MS = 400; // P slides back left, shrinks and firms up into place
const TILE_MS = 400; // violet tile blooms in behind the P
const STAR_MS = 300; // amber star twirls in
const TAGLINE_DELAY_MS = 200; // beat between the star and the tagline
const TAGLINE_MS = 1400; // tagline breathes in, last of all
const HOLD_MS = 1500; // final lock-up before moving on
// Returning users (and reduced motion) get the finished lock-up only.
const SHORT_HOLD_MS = 1200;
const EXIT_MS = 300; // fade out to the app

// Set once the full intro has been seen, so it only plays on first launch.
const INTRO_SEEN_KEY = 'pique.splashIntroSeen';

// Shape.
const LETTERS = ['i', 'q', 'u', 'e'] as const;
const LETTER_SIZE = 52;
const P_HEIGHT_RATIO = 1.6; // final P size relative to "ique"
// Big enough that the P's counter frames one letter with room to spare.
const P_SCAN_SCALE = 3.0;
const P_START_OFFSET = 70; // how far left of its resting spot the P starts
const TILE_SIZE = LETTER_SIZE * P_HEIGHT_RATIO * 1.3;
const TILE_START_SCALE = 0.85;
const STAR_SIZE = 26;

// Poppins glyph metrics as fractions of the font size, read from the font
// files. They place each letter in the middle of the P's counter (the hole in
// its bowl) and centre the tile on the P's ink rather than its text box.
// Points are x from the glyph's left edge, y above the baseline.
const ASCENT = 1.05; // baseline's distance below the top of a text box
const P_ADVANCE = 0.608; // SemiBold P width
const P_THIN_ADVANCE = 0.564; // Light P width
const P_THIN_COUNTER = { x: 0.3025, y: 0.499 }; // Light P hole centre
const P_INK_CENTER = { x: 0.3235, y: 0.349 }; // SemiBold P ink centre
const X_HEIGHT_CENTER = 0.277; // middle of "ique"'s lowercase height

const P_SIZE = LETTER_SIZE * P_HEIGHT_RATIO;
const TILE_GAP = 12; // space between the circle and "ique"

type Box = { x: number; width: number; height: number };
type Layout = { mark: Box; p: Box; letters: Box[] };

interface SplashAnimationProps {
  // False while the app underneath is still loading; the splash stays up
  // until it's true so the user never sees a blank screen.
  appReady: boolean;
  onDone: () => void;
}

// Cold-start intro: on first launch the P reads "ique" letter by letter,
// settles home, and the logo builds around it. Later launches show just the
// lock-up. Tap anywhere to skip.
export function SplashAnimation({ appReady, onDone }: SplashAnimationProps) {
  const [values] = useState(() => ({
    pX: new Animated.Value(-P_START_OFFSET),
    pY: new Animated.Value(0),
    // 0 = thin scanning P, 1 = the lock-up's SemiBold P.
    pWeight: new Animated.Value(0),
    pScale: new Animated.Value(P_SCAN_SCALE),
    pOpacity: new Animated.Value(0),
    // Letters are hidden except while inside the P's counter.
    letterOpacity: LETTERS.map(() => new Animated.Value(0)),
    tile: new Animated.Value(0),
    star: new Animated.Value(0),
    tagline: new Animated.Value(0),
    exit: new Animated.Value(1),
  }));
  // 'full' plays the scan; 'short' shows the lock-up. Null until known.
  const [mode, setMode] = useState<'full' | 'short' | null>(null);
  const [measured, setMeasured] = useState<Layout | null>(null);
  // True once the intro has finished or been skipped.
  const [played, setPlayed] = useState(false);
  const layout = useRef<{ mark?: Box; p?: Box; letters: (Box | undefined)[] }>({ letters: [] });
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  // Kept in a ref so a new onDone from a parent re-render doesn't matter.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AsyncStorage.getItem(INTRO_SEEN_KEY).catch(() => null),
    ]).then(([reduceMotion, seen]) => {
      if (!cancelled) setMode(reduceMotion || seen ? 'short' : 'full');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Jumps to the finished lock-up (used for the short version and on skip).
  const showLockUp = useCallback(() => {
    const { pX, pY, pWeight, pScale, pOpacity, letterOpacity, tile, star, tagline } = values;
    pX.setValue(0);
    pY.setValue(0);
    pWeight.setValue(1);
    pScale.setValue(1);
    pOpacity.setValue(1);
    letterOpacity.forEach((v) => v.setValue(1));
    tile.setValue(1);
    star.setValue(1);
    tagline.setValue(1);
  }, [values]);

  const skip = () => {
    if (played) return;
    animation.current?.stop();
    showLockUp();
    setPlayed(true);
  };

  // Leave once the intro is over and the app underneath is ready.
  useEffect(() => {
    if (!played || !appReady) return;
    if (mode === 'full') {
      AsyncStorage.setItem(INTRO_SEEN_KEY, 'true').catch(() => {});
    }
    const fade = Animated.timing(values.exit, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    fade.start(({ finished }) => {
      if (finished) onDoneRef.current();
    });
    return () => fade.stop();
  }, [played, appReady, mode, values]);

  const checkMeasured = () => {
    const { mark, p, letters } = layout.current;
    if (mark && p && LETTERS.every((_, k) => letters[k])) {
      setMeasured({ mark, p, letters: letters as Box[] });
    }
  };
  const onMarkLayout = (e: LayoutChangeEvent) => {
    layout.current.mark = e.nativeEvent.layout;
    checkMeasured();
  };
  const onPLayout = (e: LayoutChangeEvent) => {
    layout.current.p = e.nativeEvent.layout;
    checkMeasured();
  };
  const onLetterLayout = (k: number) => (e: LayoutChangeEvent) => {
    layout.current.letters[k] = e.nativeEvent.layout;
    checkMeasured();
  };

  const ready = measured !== null && mode !== null;
  const exiting = played && appReady;

  useEffect(() => {
    // Also stops a running intro once it is skipped.
    if (!measured || !mode || played) return;
    const { pX, pY, pWeight, pScale, pOpacity, letterOpacity, tile, star, tagline } = values;

    if (mode === 'short') {
      showLockUp();
      const hold = Animated.delay(SHORT_HOLD_MS);
      animation.current = hold;
      hold.start(({ finished }) => {
        if (finished) setPlayed(true);
      });
      return () => hold.stop();
    }

    // Where the P sits (translateX/Y) so its counter, at scan scale, is centred
    // on letter k. The mark scales about its own centre, so the counter's
    // offset from that centre grows by P_SCAN_SCALE.
    const { mark, p, letters } = measured;
    const markCenterX = mark.x + mark.width / 2;
    // The thin P is centred over the SemiBold P's box.
    const counterX = mark.x + p.x + (p.width - P_THIN_ADVANCE * P_SIZE) / 2 + P_THIN_COUNTER.x * P_SIZE;
    const scanX = (k: number) => {
      const target = letters[k].x + letters[k].width / 2;
      return target - markCenterX - (counterX - markCenterX) * P_SCAN_SCALE;
    };
    // Vertically, relative to the shared baseline (down is positive).
    const markCenterY = -ASCENT * P_SIZE + p.height / 2;
    const counterFromCenter = (ASCENT - P_THIN_COUNTER.y) * P_SIZE - p.height / 2;
    const scanY = -X_HEIGHT_CENTER * LETTER_SIZE - markCenterY - counterFromCenter * P_SCAN_SCALE;
    pY.setValue(scanY);

    const timing = (
      value: Animated.Value,
      toValue: number,
      duration: number,
      easing: (t: number) => number = Easing.inOut(Easing.cubic),
    ) => Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });

    // Magnifying glass: each letter appears as the counter reaches it and is
    // gone again before the P moves on, so only one is ever visible.
    const scan = LETTERS.map((_, k) => {
      const moveMs = k === 0 ? P_ENTER_MS : SCAN_MOVE_MS;
      return Animated.sequence([
        Animated.parallel([
          timing(pX, scanX(k), moveMs),
          ...(k === 0 ? [timing(pOpacity, 1, moveMs, Easing.out(Easing.quad))] : []),
          timing(letterOpacity[k], 1, moveMs, Easing.in(Easing.quad)),
        ]),
        Animated.delay(SCAN_PAUSE_MS),
        timing(letterOpacity[k], 0, LETTER_HIDE_MS, Easing.out(Easing.quad)),
      ]);
    });

    const intro = Animated.sequence([
      Animated.delay(INTRO_DELAY_MS),
      ...scan,
      // Home: the P slides back beside the i and every letter lights up.
      Animated.parallel([
        timing(pX, 0, SETTLE_MS, Easing.out(Easing.cubic)),
        timing(pY, 0, SETTLE_MS, Easing.out(Easing.cubic)),
        timing(pScale, 1, SETTLE_MS, Easing.out(Easing.cubic)),
        timing(pWeight, 1, SETTLE_MS, Easing.out(Easing.cubic)),
        ...letterOpacity.map((v) => timing(v, 1, SETTLE_MS, Easing.out(Easing.cubic))),
      ]),
      timing(tile, 1, TILE_MS, Easing.out(Easing.cubic)),
      timing(star, 1, STAR_MS, Easing.out(Easing.quad)),
      Animated.delay(TAGLINE_DELAY_MS),
      timing(tagline, 1, TAGLINE_MS, Easing.in(Easing.quad)),
      Animated.delay(HOLD_MS),
    ]);
    // Wait one frame after measuring so every layout has settled.
    animation.current = intro;
    const frame = requestAnimationFrame(() => {
      intro.start(({ finished }) => {
        if (finished) setPlayed(true);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      intro.stop();
    };
  }, [measured, mode, played, values, showLockUp]);

  // Shift the tile and star from the P's text box centre to its ink centre.
  const inkShift = measured
    ? {
        // Both Ps are centred in their box, so only the glyph's own offset counts.
        x: (P_INK_CENTER.x - P_ADVANCE / 2) * P_SIZE,
        y: (ASCENT - P_INK_CENTER.y) * P_SIZE - measured.p.height / 2,
      }
    : { x: 0, y: 0 };

  const tileScale = values.tile.interpolate({
    inputRange: [0, 1],
    outputRange: [TILE_START_SCALE, 1],
  });
  const thinPOpacity = values.pWeight.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const starRotate = values.star.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: values.exit }]}
      // Let taps reach the app while fading out.
      pointerEvents={exiting ? 'none' : 'auto'}
    >
      <Pressable
        style={styles.pressable}
        onPress={skip}
        onLayout={() => SplashScreen.hideAsync()}
        accessibilityRole="button"
        accessibilityLabel="Pique. Think before you scroll."
        accessibilityHint="Skips the intro"
      >
        <View style={[styles.content, !ready && styles.hidden]}>
          <View style={styles.wordmark}>
            <Animated.View
              onLayout={onMarkLayout}
              style={[
                styles.mark,
                {
                  opacity: values.pOpacity,
                  transform: [
                    { translateX: values.pX },
                    { translateY: values.pY },
                    { scale: values.pScale },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.tile,
                  {
                    opacity: values.tile,
                    transform: [
                      { translateX: inkShift.x },
                      { translateY: inkShift.y },
                      { scale: tileScale },
                    ],
                  },
                ]}
              />
              {/* The SemiBold P sets the layout; a Light P sits on top while
                  scanning so letters read clearly through its counter. Font
                  scaling is off so the logo's geometry matches the metrics. */}
              <View onLayout={onPLayout}>
                <Animated.Text
                  allowFontScaling={false}
                  style={[styles.p, { opacity: values.pWeight }]}
                >
                  P
                </Animated.Text>
                <Animated.Text
                  allowFontScaling={false}
                  style={[styles.p, styles.pThin, { opacity: thinPOpacity }]}
                >
                  P
                </Animated.Text>
              </View>
              <Animated.View
                style={[
                  styles.star,
                  {
                    opacity: values.star,
                    transform: [
                      { translateX: inkShift.x },
                      { translateY: inkShift.y },
                      { rotate: starRotate },
                      { scale: values.star },
                    ],
                  },
                ]}
              >
                <Svg width={STAR_SIZE} height={STAR_SIZE} viewBox="48 6 18 18">
                  <Path
                    d="M57 6 Q58.6 13.4 66 15 Q58.6 16.6 57 24 Q55.4 16.6 48 15 Q55.4 13.4 57 6 Z"
                    fill={Colors.amber}
                  />
                </Svg>
              </Animated.View>
            </Animated.View>
            {LETTERS.map((letter, k) => (
              <Animated.Text
                key={letter}
                onLayout={onLetterLayout(k)}
                allowFontScaling={false}
                style={[styles.letter, { opacity: values.letterOpacity[k] }]}
              >
                {letter}
              </Animated.Text>
            ))}
          </View>
          <Animated.Text style={[styles.tagline, { opacity: values.tagline }]}>
            Think before you scroll.
          </Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.navy,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  hidden: {
    opacity: 0,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mark: {
    // Drawn above the letters it passes over while scanning.
    zIndex: 1,
    // A square the circle's size: the circle fills it and the P is centred
    // in it by layout, so the two can't drift apart.
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: TILE_GAP,
  },
  tile: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginTop: -TILE_SIZE / 2,
    marginLeft: -TILE_SIZE / 2,
    borderRadius: TILE_SIZE / 2,
    backgroundColor: Colors.violet,
  },
  p: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: P_SIZE,
    textAlign: 'center',
    includeFontPadding: false,
  },
  pThin: {
    position: 'absolute',
    // Spans the SemiBold P's box so textAlign centres it on the same point.
    top: 0,
    left: 0,
    right: 0,
    fontFamily: Theme.fontFamily.light,
  },
  star: {
    // Centred on the circle's edge, top right (45°).
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -(TILE_SIZE / 2) * Math.SQRT1_2 - STAR_SIZE / 2,
    marginLeft: (TILE_SIZE / 2) * Math.SQRT1_2 - STAR_SIZE / 2,
  },
  letter: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: LETTER_SIZE,
    includeFontPadding: false,
  },
  tagline: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    marginTop: Theme.spacing.lg,
  },
});
