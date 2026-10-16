import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { doc, updateDoc } from 'firebase/firestore';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { REMINDER_TIMES, useReminderPrefs } from '@/hooks/useReminderPrefs';
import { useStats } from '@/hooks/useStats';
import { useTopInterests } from '@/hooks/useTopInterests';
import { AVATAR_PRESETS } from '@/lib/avatars';
import { DEFAULT_SESSION_SIZE } from '@/lib/onboarding';
import { deleteAccount } from '@/lib/claude';
import { db } from '@/lib/firebase';

const MIN_TOUCH_TARGET = 44;
const MAX_NAME_LENGTH = 50;
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
// No limit: every interest the user follows.
const ALL_INTERESTS = Number.POSITIVE_INFINITY;

export default function SettingsScreen() {
  const router = useRouter();
  const { user, piqueUser, signOut } = useAuth();
  const { stats, loading: statsLoading } = useStats(user?.uid);
  const { interests, loading: interestsLoading } = useTopInterests(user?.uid, ALL_INTERESTS);

  const reminder = useReminderPrefs();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingAvatarId, setSavingAvatarId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = piqueUser?.name?.trim() || 'Pique user';
  const email = piqueUser?.email ?? user?.email ?? '';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const chooseAvatar = async (avatarId: string) => {
    if (!user || savingAvatarId) return;
    setError(null);
    setSavingAvatarId(avatarId);
    try {
      // The profile listener in useAuth picks the change up everywhere.
      await updateDoc(doc(db, 'users', user.uid), { avatarId });
    } catch (e) {
      console.warn('Failed to save avatar', e);
      setError('We couldn’t save your avatar. Please try again.');
    } finally {
      setSavingAvatarId(null);
    }
  };

  const startEditingName = () => {
    setError(null);
    setNameDraft(piqueUser?.name ?? '');
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    if (!user) return;
    if (trimmed === piqueUser?.name) {
      setEditingName(false);
      return;
    }
    setError(null);
    setSavingName(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: trimmed });
      setEditingName(false);
    } catch (e) {
      console.warn('Failed to save name', e);
      setError('We couldn’t save your name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const toggleReminder = (value: boolean) => {
    // Animates the time row in or out.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reminder.setEnabled(value);
  };

  const runDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      // The sign-in no longer exists on the server; clearing the local
      // session lets the root layout move on to login.
      await signOut();
    } catch (e) {
      console.warn('Account deletion failed', e);
      setError('We couldn’t delete your account. Check your connection and try again.');
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, topics, answers and streaks. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDelete },
      ],
    );
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // The root layout redirects to login once auth state clears.
      await signOut();
    } catch (e) {
      console.warn('Sign out failed', e);
      setError('We couldn’t sign you out. Please try again.');
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={Theme.spacing.sm}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.navy} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ErrorMessage message={error} />

          {/* PROFILE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PROFILE</Text>

            <Pressable
              style={styles.avatarRow}
              onPress={() => setPickerOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: pickerOpen }}
              accessibilityLabel="Choose an avatar"
            >
              <Avatar name={name} avatarId={piqueUser?.avatarId} size="large" />
              <Text style={styles.avatarHint}>
                {pickerOpen ? 'Hide avatars' : 'Choose an avatar'}
              </Text>
            </Pressable>

            {pickerOpen && (
              <View style={styles.avatarGrid} accessibilityRole="radiogroup">
                {AVATAR_PRESETS.map((preset) => {
                  const selected = piqueUser?.avatarId === preset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      style={styles.avatarOption}
                      onPress={() => chooseAvatar(preset.id)}
                      disabled={savingAvatarId !== null}
                      accessibilityRole="radio"
                      accessibilityLabel={`${preset.label} avatar`}
                      accessibilityState={{ selected, disabled: savingAvatarId !== null }}
                    >
                      <View
                        style={[
                          styles.avatarSwatch,
                          selected && styles.avatarSwatchSelected,
                          // Each preset's colour is data, not a fixed style.
                          { backgroundColor: preset.color },
                        ]}
                      >
                        {savingAvatarId === preset.id ? (
                          <ActivityIndicator color={Colors.white} />
                        ) : (
                          <Text style={styles.avatarEmoji}>{preset.emoji}</Text>
                        )}
                      </View>
                      {selected && (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={12} color={Colors.white} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.divider} />

            {editingName ? (
              <View style={styles.nameEdit}>
                <Text style={styles.rowLabel}>Name</Text>
                <TextInput
                  style={styles.nameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  autoCapitalize="words"
                  autoComplete="name"
                  maxLength={MAX_NAME_LENGTH}
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  editable={!savingName}
                  accessibilityLabel="Name"
                />
                <View style={styles.nameActions}>
                  <Pressable
                    style={styles.textButton}
                    onPress={() => setEditingName(false)}
                    disabled={savingName}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.saveButton, savingName && styles.saveButtonBusy]}
                    onPress={saveName}
                    disabled={savingName}
                    accessibilityRole="button"
                    accessibilityState={{ busy: savingName, disabled: savingName }}
                  >
                    {savingName ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.saveText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.row}
                onPress={startEditingName}
                accessibilityRole="button"
                accessibilityLabel={`Name, ${name}. Edit`}
              >
                <Text style={styles.rowLabel}>Name</Text>
                <View style={styles.rowValueGroup}>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {name}
                  </Text>
                  <Ionicons name="pencil" size={16} color={Colors.midGrey} />
                </View>
              </Pressable>
            )}

            <View style={styles.divider} />

            <View style={styles.row} accessibilityLabel={`Email, ${email}`}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={[styles.rowValue, styles.rowValueMuted]} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {/* FEED */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FEED</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Topics following</Text>
              <Text style={[styles.rowValue, styles.rowValueMuted]}>
                {interestsLoading ? '–' : interests.length}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Cards per session</Text>
              <Text style={[styles.rowValue, styles.rowValueMuted]}>{piqueUser?.sessionSize ?? DEFAULT_SESSION_SIZE}</Text>
            </View>
          </View>

          {/* REMINDERS */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REMINDERS</Text>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Daily reminder</Text>
                <Text style={styles.rowSubtitle}>Keeps your streak alive · coming soon</Text>
              </View>
              <Switch
                value={reminder.enabled}
                onValueChange={toggleReminder}
                trackColor={{ false: Colors.borderGrey, true: Colors.violet }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.borderGrey}
                accessibilityLabel="Daily reminder"
              />
            </View>
            {reminder.enabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Time</Text>
                  <View style={styles.timeOptions} accessibilityRole="radiogroup">
                    {REMINDER_TIMES.map((time) => {
                      const selected = reminder.time === time;
                      return (
                        <Pressable
                          key={time}
                          style={[styles.timePill, selected && styles.timePillSelected]}
                          onPress={() => reminder.setTime(time)}
                          hitSlop={TIME_PILL_HIT_SLOP}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                        >
                          <Text style={[styles.timeText, selected && styles.timeTextSelected]}>
                            {time}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* ACCOUNT */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <Pressable
              style={styles.row}
              onPress={() => router.push('/forgot-password')}
              accessibilityRole="button"
            >
              <Text style={styles.rowLabel}>Reset password</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.midGrey} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.row}
              onPress={handleSignOut}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityState={{ busy: signingOut, disabled: signingOut }}
            >
              <Text style={styles.dangerText}>Sign out</Text>
              {signingOut && <ActivityIndicator color={Colors.danger} />}
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.row}
              onPress={confirmDelete}
              disabled={deleting || signingOut}
              accessibilityRole="button"
              accessibilityHint="Asks for confirmation first"
              accessibilityState={{ busy: deleting, disabled: deleting || signingOut }}
            >
              <Text style={styles.dangerText}>Delete account</Text>
              {deleting && <ActivityIndicator color={Colors.danger} />}
            </Pressable>
          </View>

          {/* PRIVACY */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRIVACY</Text>
            <View style={styles.privacy}>
              <Text style={styles.privacyText}>
                Pique stores your name, email, age band, onboarding answers, topics, and each
                response with its score, in Google Firebase.
              </Text>
              <Text style={styles.privacyText}>
                Your written answers are sent to Claude, Anthropic’s AI, to score them, and
                Claude writes your cards from the topics and answers you chose.
              </Text>
              <Text style={styles.privacyText}>
                Delete account (above) permanently removes all of it.
              </Text>
            </View>
          </View>

          {/* APP */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>APP</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>{APP_VERSION}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Cards completed</Text>
              <Text style={styles.rowValue}>{statsLoading ? '–' : stats.totalResponses}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SWATCH = 56;
// Pills are 32pt tall; this extends their touch area to 44pt.
const TIME_PILL_HIT_SLOP = { top: 6, bottom: 6 };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lightGrey,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg,
  },
  content: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  privacy: {
    gap: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
  },
  privacyText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
    lineHeight: 19,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  sectionLabel: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
    letterSpacing: 2,
    marginBottom: Theme.spacing.xs,
  },
  avatarRow: {
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.sm,
  },
  avatarHint: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  avatarOption: {
    width: '25%',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  avatarSwatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarSwatchSelected: {
    borderColor: Colors.amber,
  },
  avatarEmoji: {
    fontSize: Theme.fontSize.xl,
  },
  checkBadge: {
    position: 'absolute',
    top: 0,
    right: Theme.spacing.sm,
    width: Theme.spacing.lg - Theme.spacing.xs, // 20
    height: Theme.spacing.lg - Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.violet,
    borderColor: Colors.white,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderGrey,
  },
  row: {
    minHeight: MIN_TOUCH_TARGET + Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
  },
  rowLabel: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 15,
  },
  rowText: {
    flexShrink: 1,
    gap: Theme.spacing.xs / 2,
  },
  rowSubtitle: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 12,
  },
  timeOptions: {
    flexDirection: 'row',
    gap: Theme.spacing.xs + Theme.spacing.xs / 2, // 6
  },
  timePill: {
    height: Theme.spacing.xl, // 32
    paddingHorizontal: Theme.spacing.sm + Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.lightGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePillSelected: {
    backgroundColor: Colors.violet,
  },
  timeText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  timeTextSelected: {
    color: Colors.white,
  },
  rowValueGroup: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  rowValue: {
    flexShrink: 1,
    color: Colors.navy,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 15,
  },
  rowValueMuted: {
    color: Colors.midGrey,
  },
  nameEdit: {
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
  nameInput: {
    borderColor: Colors.violet,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    color: Colors.navy,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
  },
  nameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Theme.spacing.sm,
  },
  textButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: Theme.spacing.md,
    justifyContent: 'center',
  },
  cancelText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  saveButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 88,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonBusy: {
    opacity: 0.8,
  },
  saveText: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  dangerText: {
    color: Colors.danger,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 15,
  },
});
