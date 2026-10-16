import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';

// Shared styles for the login, register and forgot-password screens.
export const useAuthStyles = makeStyles((c) => ({
  heading: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
    textAlign: 'center',
  },
  subheading: {
    color: c.textSecondary,
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
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  link: {
    color: c.accentText,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
}));
