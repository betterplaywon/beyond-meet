/**
 * 루트 네비게이터
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import { RootStackParamList } from '../@types';

// Navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Screens
import MatchingScreen from '../screens/match/MatchingScreen';
import VideoCallScreen from '../screens/call/VideoCallScreen';
import CallEndScreen from '../screens/call/CallEndScreen';
import CallHistoryScreen from '../screens/call/CallHistoryScreen';
import ProfileEditScreen from '../screens/profile/ProfileEditScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * 푸시 알림 초기화를 위한 래퍼 컴포넌트
 * NavigationContainer 내부에서 호출해야 useNavigation이 동작함
 */
const AppContent: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 푸시 알림 초기화 (로그인 시에만 실행됨)
  useNotificationSetup();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen name="Matching" component={MatchingScreen} />
          <Stack.Screen name="VideoCall" component={VideoCallScreen} />
          <Stack.Screen name="CallEnd" component={CallEndScreen} />
          <Stack.Screen name="CallHistory" component={CallHistoryScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <AppContent />
    </NavigationContainer>
  );
};

export default RootNavigator;
