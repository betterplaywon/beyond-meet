/**
 * 푸시 알림 초기화 및 설정 Hook
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import {
  requestNotificationPermission,
  getFCMToken,
  onForegroundMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  onTokenRefresh,
  getPlatform,
} from '../services/notificationService';
import { useRegisterDevice } from './usePushNotifications';
import { useAuthStore } from '../store/authStore';

/**
 * 푸시 알림 초기화 Hook
 *
 * 사용법:
 * - App.tsx에서 호출
 * - 로그인 후 자동으로 디바이스 토큰 등록
 * - 포그라운드/백그라운드 알림 수신 처리
 */
export const useNotificationSetup = () => {
  const navigation = useNavigation<any>();
  const registerDeviceMutation = useRegisterDevice();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // 로그인하지 않은 경우 초기화하지 않음
    if (!user) {
      return;
    }

    let isMounted = true;

    const setupNotifications = async () => {
      try {
        // 1. 알림 권한 요청
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
          console.warn('Notification permission denied');
          return;
        }

        // 2. FCM 토큰 가져오기
        const token = await getFCMToken();
        if (!token) {
          console.warn('Failed to get FCM token');
          return;
        }

        // 3. 서버에 디바이스 토큰 등록
        if (isMounted && user) {
          registerDeviceMutation.mutate({
            userId: user.id,
            deviceToken: token,
            platform: getPlatform(),
          });
        }

        // 4. 앱이 종료 상태에서 알림으로 열렸는지 확인
        const initialNotification = await getInitialNotification();
        if (initialNotification && isMounted) {
          handleNotificationNavigation(initialNotification);
        }
      } catch (error) {
        console.error('Failed to setup notifications:', error);
      }
    };

    setupNotifications();

    // 5. 포그라운드 메시지 리스너
    const unsubscribeForeground = onForegroundMessage((message) => {
      console.log('Foreground notification:', message);
      handleNotificationNavigation(message);
    });

    // 6. 백그라운드에서 알림 탭 리스너
    const unsubscribeBackground = onNotificationOpenedApp((message) => {
      console.log('Background notification opened:', message);
      handleNotificationNavigation(message);
    });

    // 7. 토큰 갱신 리스너
    const unsubscribeTokenRefresh = onTokenRefresh((newToken) => {
      if (isMounted && user) {
        registerDeviceMutation.mutate({
          userId: user.id,
          deviceToken: newToken,
          platform: getPlatform(),
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribeForeground();
      unsubscribeBackground();
      unsubscribeTokenRefresh();
    };
  }, [user]);

  /**
   * 알림 타입에 따라 화면 이동
   */
  const handleNotificationNavigation = (
    message: FirebaseMessagingTypes.RemoteMessage
  ) => {
    const { data } = message;

    if (!data) {
      return;
    }

    // 통화 요청 알림
    if (data.type === 'call_incoming') {
      navigation.navigate('VideoCall', {
        sessionId: data.sessionId,
        channelName: data.channelName,
        token: data.token,
      });
    }

    // 매칭 성공 알림
    if (data.type === 'match_found') {
      navigation.navigate('VideoCall', {
        sessionId: data.sessionId,
        channelName: data.channelName,
        token: data.token,
      });
    }

    // 친구 요청 알림
    if (data.type === 'friend_request') {
      navigation.navigate('Friends');
    }

    // 통화 기록 알림
    if (data.type === 'call_ended') {
      navigation.navigate('CallHistory');
    }
  };
};
