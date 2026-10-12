import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.violet,
        tabBarInactiveTintColor: Colors.midGrey,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="frank-intro"
        options={{
          href: null,
          tabBarStyle: styles.hiddenTabBar,
        }}
      />
      <Tabs.Screen
        name="onboarding"
        options={{
          href: null,
          tabBarStyle: styles.hiddenTabBar,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.xs,
  },
  hiddenTabBar: {
    display: 'none',
  },
});
