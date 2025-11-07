/**
 * Firebase Cloud Messaging (FCM) 푸시 알림 서비스
 *
 * 주의사항:
 * - @react-native-firebase/messaging 패키지가 설치되어 있어야 합니다
 * - iOS: APNs 인증서 설정 필요
 * - Android: google-services.json 파일 추가 필요
 */

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';

/**
 * FCM 권한 요청
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');
    } else {
      console.log('Notification permission denied');
    }

    return enabled;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
};

/**
 * FCM 디바이스 토큰 가져오기
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
};

/**
 * 포그라운드 푸시 알림 수신 리스너 등록
 */
export const onForegroundMessage = (
  callback: (message: FirebaseMessagingTypes.RemoteMessage) => void
): (() => void) => {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground message received:', remoteMessage);

    // 포그라운드에서도 알림 표시
    if (remoteMessage.notification) {
      Alert.alert(
        remoteMessage.notification.title || '새 알림',
        remoteMessage.notification.body || '',
        [{ text: '확인', onPress: () => callback(remoteMessage) }]
      );
    }
  });

  return unsubscribe;
};

/**
 * 백그라운드 푸시 알림 핸들러 설정
 *
 * 주의: App.tsx가 아닌 index.js에서 호출해야 합니다
 */
export const setBackgroundMessageHandler = (): void => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message received:', remoteMessage);
  });
};

/**
 * 앱이 백그라운드/종료 상태에서 알림을 통해 열렸을 때의 메시지 가져오기
 */
export const getInitialNotification = async (): Promise<FirebaseMessagingTypes.RemoteMessage | null> => {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('App opened from notification:', remoteMessage);
    }
    return remoteMessage;
  } catch (error) {
    console.error('Failed to get initial notification:', error);
    return null;
  }
};

/**
 * 알림 탭 이벤트 리스너 등록
 * 앱이 백그라운드에 있을 때 알림을 탭한 경우
 */
export const onNotificationOpenedApp = (
  callback: (message: FirebaseMessagingTypes.RemoteMessage) => void
): (() => void) => {
  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Notification opened app from background:', remoteMessage);
    callback(remoteMessage);
  });

  return unsubscribe;
};

/**
 * 토큰 갱신 리스너 등록
 */
export const onTokenRefresh = (
  callback: (token: string) => void
): (() => void) => {
  const unsubscribe = messaging().onTokenRefresh((token) => {
    console.log('FCM Token refreshed:', token);
    callback(token);
  });

  return unsubscribe;
};

/**
 * 플랫폼 타입 가져오기
 */
export const getPlatform = (): 'IOS' | 'ANDROID' => {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
};
