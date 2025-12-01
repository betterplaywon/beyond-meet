/**
 * 메인 탭 네비게이터
 */

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from '../@types';
import { colors } from '../styles/theme';
import { useAuthStore } from '../store/authStore';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminNavigator from './AdminNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isAdmin = useAuthStore((state) => state.isAdmin());

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.textSecondary + '20',
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarLabel: '친구',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '프로필',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
      {/* 관리자에게만 Admin 탭 표시 */}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminNavigator}
          options={{
            tabBarLabel: '관리자',
            tabBarIcon: () => <Text style={{ fontSize: 24 }}>⚙️</Text>,
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default MainNavigator;
