import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface PlaceholderScreenProps {
  title: string;
  children?: ReactNode;
}

export function PlaceholderScreen({ title, children }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.lg,
    padding: Theme.spacing.lg,
    backgroundColor: Colors.lightGrey,
  },
  title: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg,
  },
});
