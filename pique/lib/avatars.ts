import { Colors } from '@/constants/colors';

export interface AvatarPreset {
  id: string;
  emoji: string;
  color: string;
  label: string;
}

// Keep the IDs in sync with the avatarId list in firestore.rules.
export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { id: 'philosophy', emoji: '🧠', color: Colors.violet, label: 'Philosophy' },
  { id: 'science', emoji: '🔬', color: Colors.avatarTeal, label: 'Science' },
  { id: 'technology', emoji: '💻', color: Colors.navy, label: 'Technology' },
  { id: 'culture', emoji: '🎭', color: Colors.avatarCoral, label: 'Culture' },
  { id: 'psychology', emoji: '💭', color: Colors.avatarPurple, label: 'Psychology' },
  { id: 'economics', emoji: '📊', color: Colors.avatarGreen, label: 'Economics' },
  { id: 'art', emoji: '🎨', color: Colors.avatarOrange, label: 'Art' },
  { id: 'politics', emoji: '🏛️', color: Colors.avatarGrey, label: 'Politics' },
];

export function findAvatar(avatarId: string | undefined): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((preset) => preset.id === avatarId);
}
