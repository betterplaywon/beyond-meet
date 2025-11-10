/**
 * 푸시 알림 초기화 및 설정 Hook
 */

import { useEffect, useState } from 'react';
import { pushService } from '../services/pushService';
import { useRegisterDevice } from './usePushNotifications';
import { useAuthStore } from '../store/authStore';

/**
 * 푸시 알림 초기화 Hook
 *
 * 사용법:
 * - RootNavigator에서 호출
 * - 로그인 후 자동으로 디바이스 토큰 등록
 * - 포그라운드/백그라운드 알림 수신 처리
 */
export const useNotificationSetup = () => {
  const registerDeviceMutation = useRegisterDevice();
  const userId = useAuthStore((state) => state.userId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 로그인하지 않은 경우 초기화하지 않음
    if (!isAuthenticated || !userId) {
      return;
    }

    // 이미 초기화된 경우 중복 실행 방지
    if (isInitialized) {
      return;
    }

    let isMounted = true;

    const setupNotifications = async () => {
      try {
        // 1. pushService 초기화 (권한 요청, 리스너 등록)
        await pushService.initialize();

        // 2. FCM 토큰 가져오기
        const token = await pushService.getDeviceToken();
        if (!token) {
          console.warn('[useNotificationSetup] Failed to get FCM token');
          return;
        }

        // 3. 서버에 디바이스 토큰 등록
        if (isMounted && userId) {
          registerDeviceMutation.mutate({
            userId,
            deviceToken: token,
            platform: pushService.getPlatform(),
          });
        }

        // 4. 초기화 완료 표시
        if (isMounted) {
          setIsInitialized(true);
          console.log('[useNotificationSetup] Notification setup completed');
        }
      } catch (error) {
        console.error('[useNotificationSetup] Failed to setup notifications:', error);
      }
    };

    setupNotifications();

    // 5. 토큰 갱신 리스너
    const unsubscribeTokenRefresh = pushService.onTokenRefresh((newToken) => {
      if (isMounted && userId) {
        registerDeviceMutation.mutate({
          userId,
          deviceToken: newToken,
          platform: pushService.getPlatform(),
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribeTokenRefresh();
    };
  }, [userId, isAuthenticated, isInitialized, registerDeviceMutation]);
};
