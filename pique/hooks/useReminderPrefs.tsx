import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const REMINDER_TIMES = ['08:00', '12:30', '20:00'] as const;
export type ReminderTime = (typeof REMINDER_TIMES)[number];

const ENABLED_KEY = 'pique_reminder_enabled';
const TIME_KEY = 'pique_reminder_time';
const DEFAULT_TIME: ReminderTime = '20:00';

function isReminderTime(value: string | null): value is ReminderTime {
  return REMINDER_TIMES.includes(value as ReminderTime);
}

// Daily reminder preferences, stored on this device only. Nothing is
// scheduled yet: notifications will read these once they're built.
export function useReminderPrefs() {
  const [enabled, setEnabledState] = useState(false);
  const [time, setTimeState] = useState<ReminderTime>(DEFAULT_TIME);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedEnabled, storedTime] = await AsyncStorage.multiGet([ENABLED_KEY, TIME_KEY]);
        if (cancelled) return;
        setEnabledState(storedEnabled[1] === 'true');
        if (isReminderTime(storedTime[1])) setTimeState(storedTime[1]);
      } catch (e) {
        console.warn('Failed to load reminder preferences', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The UI updates straight away; a failed save only logs, since it's a
  // local preference with nothing depending on it yet.
  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    AsyncStorage.setItem(ENABLED_KEY, String(value)).catch((e) =>
      console.warn('Failed to save reminder setting', e),
    );
  };

  const setTime = (value: ReminderTime) => {
    setTimeState(value);
    AsyncStorage.setItem(TIME_KEY, value).catch((e) =>
      console.warn('Failed to save reminder time', e),
    );
  };

  return { enabled, setEnabled, time, setTime };
}
