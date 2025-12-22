/**
 * 메인 탭 네비게이터
 * Figma: Cupid Arrow - Bottom Navigation 디자인 적용
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MainTabParamList } from '../@types';
import { colors } from '../styles/theme';
import { useAuthStore } from '../store/authStore';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminNavigator from './AdminNavigator';

// Tab Icon Component
interface TabIconProps {
  name: string;
  color: string;
  focused: boolean;
}

const TabIcon = ({ name, color, focused }: TabIconProps) => (
  <View style={focused ? styles.activeIconContainer : undefined}>
    <Icon name={name} size={24} color={color} />
  </View>
);

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const userRole = useAuthStore((state) => state.userRole);
  const isAdmin = userRole === 'ADMIN';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 12,
          height: 70 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarLabel: '친구',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="people" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '프로필',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
      {/* 관리자에게만 Admin 탭 표시 */}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminNavigator}
          options={{
            tabBarLabel: '관리자',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="settings" color={color} focused={focused} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default MainNavigator;
