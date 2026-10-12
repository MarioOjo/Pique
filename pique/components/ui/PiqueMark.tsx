import Svg, { Path, Rect } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface PiqueMarkProps {
  size?: number;
}

// The Pique logo: a white "P" on a violet tile, with Frank's amber sparkle.
export function PiqueMark({ size = 72 }: PiqueMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityLabel="Pique">
      <Rect x={0} y={0} width={72} height={72} rx={18} fill={Colors.violet} />
      {/* The P: stem plus bowl, with the counter cut out (evenodd). */}
      <Path
        d="M22 16 H39 a14 14 0 0 1 0 28 H31 V56 H22 Z M31 24 V36 H39 a6 6 0 0 0 0 -12 Z"
        fill={Colors.white}
        fillRule="evenodd"
      />
      {/* Four-point sparkle, top right. */}
      <Path
        d="M57 6 Q58.6 13.4 66 15 Q58.6 16.6 57 24 Q55.4 16.6 48 15 Q55.4 13.4 57 6 Z"
        fill={Colors.amber}
      />
    </Svg>
  );
}
