import Svg, { Circle, Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface PiqueMarkProps {
  size?: number;
}

// The Pique logo: a white Poppins SemiBold "P" centred on a violet circle,
// with Frank's amber sparkle on the circle's top-right edge. Matches the app
// icon and the splash lock-up.
export function PiqueMark({ size = 72 }: PiqueMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Pique">
      <Circle cx={50} cy={50} r={50} fill={Colors.violet} />
      {/* The P glyph from Poppins SemiBold, ink centred at (50, 50). */}
      <Path
        d="M67.54 47.85 Q65.5 51.62 61.15 53.92 Q56.81 56.23 50.19 56.23 L41.19 56.23 L41.19 76.85 L30.42 76.85 L30.42 23.15 L50.19 23.15 Q56.42 23.15 60.81 25.31 Q65.19 27.46 67.38 31.23 Q69.58 35 69.58 39.77 Q69.58 44.08 67.54 47.85 Z M56.35 45.5 Q58.5 43.46 58.5 39.77 Q58.5 31.92 49.73 31.92 L41.19 31.92 L41.19 47.54 L49.73 47.54 Q54.19 47.54 56.35 45.5 Z"
        fill={Colors.white}
      />
      {/* Four-point sparkle centred on the circle's edge at 45°. */}
      <Path
        d="M85.36 2.62 Q87.5 12.5 97.38 14.64 Q87.5 16.78 85.36 26.66 Q83.22 16.78 73.34 14.64 Q83.22 12.5 85.36 2.62 Z"
        fill={Colors.amber}
      />
    </Svg>
  );
}
