/**
 * 루트 네비게이터
 */

import React, { useRef, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, NavigationContainerRef, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import { useSocketEvent } from '../hooks/useSocket';
import * as pushService from '../services/pushService';
import * as socketService from '../services/socketService'; // call accept/reject에서 사용
import { IncomingCallModal } from '../components/call/IncomingCallModal';
import { RootStackParamList } from '../@types';
import { colors } from '../styles/theme';

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
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * 푸시 알림 초기화를 위한 래퍼 컴포넌트
 * NavigationContainer 내부에서 호출해야 useNavigation이 동작함
 */
const AppContent: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Auth Store - 상태만 구독
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const emailVerified = useAuthStore((state) => state.emailVerified);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Call Store - 상태만 구독
  const incomingCall = useCallStore((state) => state.incomingCall);
  const showIncomingCallModal = useCallStore((state) => state.showIncomingCallModal);

  // ⚠️ 주의: React Hooks 규칙에 따라 모든 훅은 조건부 return 이전에 호출해야 함

  // 푸시 알림 초기화 (로그인 시에만 실행됨)
  useNotificationSetup();

  // 통화 수신 이벤트 (앱 전역)
  useSocketEvent('call:incoming', (data: any) => {
    console.log('[ROOT] Incoming call:', data);
    useCallStore.getState().setIncomingCall({
      session: data.session,
      caller: data.caller,
    });
    useCallStore.getState().setShowIncomingCallModal(true);
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
      useCallStore.getState().setIncomingCall(null);
    }
  });

  // AsyncStorage 리하이드레이션 완료될 때까지 로딩 화면 표시
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ⚠️ Socket 관련 useEffect 제거!
  // Socket 연결: useLogin/useRegister에서 명령형으로 처리
  // Socket 해제: useLogout에서 명령형으로 처리
  // 이로써 useEffect 의존성 복잡도 제거 및 무한 루프 방지

  // 통화 수락 핸들러
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    useCallStore.getState().setShowIncomingCallModal(false);
    socketService.acceptCall(incomingCall.session.id);
  };

  // 통화 거절 핸들러
  const handleRejectCall = () => {
    if (!incomingCall) return;
    useCallStore.getState().setShowIncomingCallModal(false);
    socketService.rejectCall(incomingCall.session.id);
    useCallStore.getState().setIncomingCall(null);
  };

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // 미로그인 → 인증 플로우 (Splash → Welcome → Login/Register)
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !emailVerified ? (
          // 로그인됨 but 이메일 미인증 → 이메일 인증 화면
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        ) : (
          // 로그인됨 + 이메일 인증됨 → 메인 앱
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

      {/* 전역 통화 수신 모달 - 인증 완료된 상태에서만 표시 */}
      {isAuthenticated && emailVerified && (
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
