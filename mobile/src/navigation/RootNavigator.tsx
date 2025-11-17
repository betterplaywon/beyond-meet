/**
 * 루트 네비게이터
 */

import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import * as pushService from '../services/pushService';
import * as socketService from '../services/socketService';
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

  // Socket 연결 관리 (로그인 시 연결, 로그아웃 시 해제)
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[SOCKET] Connecting on app level (authenticated)');
      // 즉시 연결 (동기 실행)
      socketService.connect();
    } else {
      console.log('[SOCKET] Disconnecting on app level (not authenticated)');
      socketService.disconnect();
    }

    // ⚠️ Cleanup 없음: Socket은 isAuthenticated 변경 시에만 해제
    // 화면 전환 시 유지되어야 함
  }, [isAuthenticated]);

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
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    // pushService에 navigation ref 설정 (Deep Link 처리용)
    pushService.setNavigationRef(navigationRef.current);

    return () => {
      pushService.setNavigationRef(null);
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <AppContent />
    </NavigationContainer>
  );
};

export default RootNavigator;
