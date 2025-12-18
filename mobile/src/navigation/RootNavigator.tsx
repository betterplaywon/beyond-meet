/**
 * 루트 네비게이터
 */

import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import { useSocketEvent } from '../hooks/useSocket';
import * as pushService from '../services/pushService';
import * as socketService from '../services/socketService';
import { IncomingCallModal } from '../components/call/IncomingCallModal';
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
import LegalContentScreen from '../screens/profile/LegalContentScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * 푸시 알림 초기화를 위한 래퍼 컴포넌트
 * NavigationContainer 내부에서 호출해야 useNavigation이 동작함
 */
const AppContent: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Call Store
  const incomingCall = useCallStore((state) => state.incomingCall);
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const showIncomingCallModal = useCallStore((state) => state.showIncomingCallModal);
  const setShowIncomingCallModal = useCallStore((state) => state.setShowIncomingCallModal);

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

  // 통화 수신 이벤트 (앱 전역)
  useSocketEvent('call:incoming', (data: any) => {
    console.log('[ROOT] Incoming call:', data);
    setIncomingCall({
      session: data.session,
      caller: data.caller,
    });
    setShowIncomingCallModal(true);
  });

  // 통화 수락 완료 이벤트 (토큰 및 UID 받기)
  useSocketEvent('call:accepted', (data: any) => {
    if (data.token && data.uid) {
      console.log('[ROOT] Call accepted, received token and UID:', data.uid);
      navigation.navigate('VideoCall', {
        sessionId: data.session.id,
        channelName: data.session.channelName,
        token: data.token,
        uid: data.uid,
      });
      setIncomingCall(null);
    }
  });

  // 통화 수락 핸들러
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    setShowIncomingCallModal(false);
    socketService.acceptCall(incomingCall.session.id);
  };

  // 통화 거절 핸들러
  const handleRejectCall = () => {
    if (!incomingCall) return;
    setShowIncomingCallModal(false);
    socketService.rejectCall(incomingCall.session.id);
    setIncomingCall(null);
  };

  return (
    <>
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
            <Stack.Screen name="LegalContent" component={LegalContentScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          </>
        )}
      </Stack.Navigator>

      {/* 전역 통화 수신 모달 - 인증된 상태에서만 표시 */}
      {isAuthenticated && (
        <IncomingCallModal
          visible={showIncomingCallModal}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </>
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
