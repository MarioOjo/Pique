import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

// Shared styles for the login and register screens.
export const authStyles = StyleSheet.create({
  heading: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
    textAlign: 'center',
  },
  subheading: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
  },
  footerText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  link: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
});
