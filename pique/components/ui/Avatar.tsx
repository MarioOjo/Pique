import { Text, View } from 'react-native';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';
import { findAvatar } from '@/lib/avatars';

interface AvatarProps {
  name: string;
  avatarId?: string;
  // 'medium' is 56px (profile), 'large' is 64px (settings).
  size?: 'medium' | 'large';
}

// The chosen preset (emoji on its colour), or the name's initial on navy.
export function Avatar({ name, avatarId, size = 'medium' }: AvatarProps) {
  const styles = useStyles();
  const preset = findAvatar(avatarId);
  const large = size === 'large';

  return (
    <View
      style={[
        styles.circle,
        large && styles.circleLarge,
        // Preset colours are data, so this one value can't live in the StyleSheet.
        preset && { backgroundColor: preset.color },
      ]}
      accessibilityLabel={preset ? `${preset.label} avatar` : `${name}'s avatar`}
    >
      {preset ? (
        <Text style={[styles.emoji, large && styles.emojiLarge]}>{preset.emoji}</Text>
      ) : (
        <Text style={[styles.initial, large && styles.initialLarge]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const MEDIUM = 56;
const LARGE = 64;

const useStyles = makeStyles((c) => ({
  circle: {
    width: MEDIUM,
    height: MEDIUM,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLarge: {
    width: LARGE,
    height: LARGE,
  },
  initial: {
    color: c.onPrimary,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg + Theme.spacing.xs,
  },
  initialLarge: {
    fontSize: Theme.fontSize.xl,
  },
  emoji: {
    fontSize: Theme.fontSize.xl,
  },
  emojiLarge: {
    fontSize: Theme.fontSize.xl + Theme.spacing.xs,
  },
}));
