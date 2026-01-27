/**
 * 푸시 알림 통합 서비스
 *
 * 모든 푸시 알림 관련 기능을 통합하여 제공합니다.
 * - 포그라운드 알림 처리
 * - 백그라운드 알림 처리
 * - Deep Link 처리
 * - 권한 요청
 */

import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../@types';

/**
 * 알림 타입 정의
 */
export enum NotificationType {
  CALL_INCOMING = 'call_incoming',
  MATCH_FOUND = 'match_found',
  FRIEND_REQUEST = 'friend_request',
  CALL_ENDED = 'call_ended',
  MESSAGE = 'message',
}

/**
 * 알림 데이터 인터페이스
 */
interface NotificationData {
  type: NotificationType;
  sessionId?: string;
  channelName?: string;
  token?: string;
  userId?: string;
  nickname?: string;
  [key: string]: any;
}

// Private 상태 변수
let navigationRef: NavigationContainerRef<RootStackParamList> | null = null;
let isInitialized = false;

/**
 * Navigation 참조 설정
 */
export const setNavigationRef = (
  ref: NavigationContainerRef<RootStackParamList> | null,
): void => {
  navigationRef = ref;
};

/**
 * 포그라운드 메시지 리스너 설정
 */
const setupForegroundListener = (): void => {
  try {
    messaging().onMessage(async remoteMessage => {
      console.log('[PushService] Foreground message received:', remoteMessage);
      handleForegroundMessage(remoteMessage);
    });
  } catch (error) {
    console.error('[PushService] Failed to setup foreground listener:', error);
    throw error;
  }
};

/**
 * 백그라운드 메시지 리스너 설정
 */
const setupBackgroundListener = (): void => {
  try {
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        '[PushService] Notification opened app from background:',
        remoteMessage,
      );
      handleNotificationNavigation(remoteMessage);
    });
  } catch (error) {
    console.error('[PushService] Failed to setup background listener:', error);
    throw error;
  }
};

/**
 * 초기 알림 처리 (앱이 종료 상태에서 알림으로 열린 경우)
 */
const handleInitialNotification = async (): Promise<void> => {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log(
        '[PushService] App opened from notification:',
        remoteMessage,
      );

      // navigationRef가 설정될 때까지 최대 5초 대기
      const maxRetries = 10;
      for (let i = 0; i < maxRetries; i++) {
        if (navigationRef) {
          handleNotificationNavigation(remoteMessage);
          break;
        }
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        console.log(`[PushService] Waiting for navigation ref (${i + 1}/${maxRetries})...`);
      }

      if (!navigationRef) {
        console.warn('[PushService] Navigation ref not available after 5s, skipping deep link');
      }
    }
  } catch (error) {
    console.error('[PushService] Failed to get initial notification:', error);
  }
};

/**
 * 포그라운드 메시지 처리
 * 앱이 활성 상태일 때 알림 표시
 */
const handleForegroundMessage = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): void => {
  const { notification } = remoteMessage;

  if (!notification) {
    return;
  }

  // Toast 알림으로 표시 (더 네이티브한 느낌)
  Toast.show({
    type: 'info',
    text1: notification.title || '새 알림',
    text2: notification.body || '',
    visibilityTime: 4000,
    autoHide: true,
    onPress: () => {
      // Toast를 탭하면 해당 화면으로 이동
      handleNotificationNavigation(remoteMessage);
    },
  });

  // iOS에서는 Alert도 함께 표시 (선택사항)
  if (Platform.OS === 'ios') {
    Alert.alert(notification.title || '새 알림', notification.body || '', [
      { text: '닫기', style: 'cancel' },
      {
        text: '확인',
        onPress: () => handleNotificationNavigation(remoteMessage),
      },
    ]);
  }
};

/**
 * 알림 타입에 따라 화면 이동 (Deep Link 처리)
 */
const handleNotificationNavigation = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): void => {
  if (!navigationRef) {
    console.warn('[PushService] Navigation ref not set');
    return;
  }

  const { data } = remoteMessage;

  if (!data) {
    console.warn('[PushService] No data in notification');
    return;
  }

  const notificationData = data as unknown as NotificationData;

  console.log(
    '[PushService] Handling notification navigation:',
    notificationData,
  );

  switch (notificationData.type) {
    case NotificationType.CALL_INCOMING:
      // 통화 요청 알림 -> VideoCallScreen
      if (
        notificationData.sessionId &&
        notificationData.channelName &&
        notificationData.token &&
        notificationData.uid !== undefined &&
        notificationData.uid !== null
      ) {
        const uid = Number(notificationData.uid);
        if (isNaN(uid)) {
          console.error('[PushService] Invalid UID for CALL_INCOMING:', notificationData.uid);
          return;
        }

        navigationRef.navigate('VideoCall', {
          sessionId: notificationData.sessionId,
          channelName: notificationData.channelName,
          token: notificationData.token,
          uid,
          partnerId: notificationData.partnerId || '',
        });
      }
      break;

    case NotificationType.MATCH_FOUND:
      // 매칭 성공 알림 -> VideoCallScreen
      if (
        notificationData.sessionId &&
        notificationData.channelName &&
        notificationData.token &&
        notificationData.uid !== undefined &&
        notificationData.uid !== null
      ) {
        const uid = Number(notificationData.uid);
        if (isNaN(uid)) {
          console.error('[PushService] Invalid UID for MATCH_FOUND:', notificationData.uid);
          return;
        }

        navigationRef.navigate('VideoCall', {
          sessionId: notificationData.sessionId,
          channelName: notificationData.channelName,
          token: notificationData.token,
          uid,
          partnerId: notificationData.partnerId || '',
        });
      }
      break;

    case NotificationType.FRIEND_REQUEST:
      // 친구 요청 알림 -> FriendsScreen
      navigationRef.navigate('Main', {
        screen: 'Friends',
      });
      break;

    case NotificationType.CALL_ENDED:
      // 통화 종료 알림 -> CallHistoryScreen
      navigationRef.navigate('CallHistory');
      break;

    default:
      console.warn(
        '[PushService] Unknown notification type:',
        notificationData.type,
      );
  }
};

/**
 * 백그라운드 메시지 핸들러 설정
 * IMPORTANT: index.js에서 호출하면 안 됨 (네이티브 모듈 초기화 전)
 */
const setupBackgroundMessageHandler = (): void => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[PushService] Background message received:', remoteMessage);
    // 백그라운드 메시지 처리 로직
  });
};

/**
 * 푸시 알림 초기화
 */
export const initialize = async (): Promise<void> => {
  // 이미 초기화된 경우 중복 실행 방지
  if (isInitialized) {
    console.log('[PushService] Already initialized, skipping');
    return;
  }

  try {
    // 0. 백그라운드 메시지 핸들러 등록 (먼저 설정)
    setupBackgroundMessageHandler();

    // 1. 권한 요청
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      console.warn('[PushService] Notification permission denied');
      return;
    }

    // 2. 포그라운드 메시지 리스너 등록
    setupForegroundListener();

    // 3. 백그라운드 메시지 리스너 등록
    setupBackgroundListener();

    // 4. 초기 알림 확인 (앱이 종료 상태에서 알림으로 열린 경우)
    await handleInitialNotification();

    isInitialized = true;
    console.log('[PushService] Initialized successfully');
  } catch (error) {
    console.error('[PushService] Initialization failed:', error);
    // 에러를 throw하여 상위 호출자(useNotificationSetup)가 처리하도록 함
    throw error;
  }
};

/**
 * 푸시 알림 권한 요청
 */
export const requestPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('[PushService] Notification permission granted');
    } else {
      console.log('[PushService] Notification permission denied');
    }

    return enabled;
  } catch (error) {
    console.error('[PushService] Failed to request permission:', error);
    return false;
  }
};

/**
 * FCM 디바이스 토큰 가져오기
 */
export const getDeviceToken = async (): Promise<string | null> => {
  try {
    // iOS는 원격 메시지를 위해 디바이스 등록이 필요
    if (Platform.OS === 'ios') {
      const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
      if (!isRegistered) {
        await messaging().registerDeviceForRemoteMessages();
        console.log('[PushService] iOS device registered for remote messages');
      }
    }

    const token = await messaging().getToken();
    console.log('[PushService] FCM Token:', token);
    return token;
  } catch (error: any) {
    // iOS APNs 설정 관련 에러 처리 (시뮬레이터 포함)
    if (Platform.OS === 'ios') {
      const errorCode = error?.code || '';
      if (
        errorCode === 'messaging/unregistered' ||
        errorCode === 'messaging/unknown' ||
        error?.message?.includes('aps-environment')
      ) {
        // 시뮬레이터에서는 경고만 출력 (에러가 아님)
        console.warn(
          '[PushService] iOS APNs not available.',
          'This is expected on simulators. Push notifications require a real device.',
        );
        return null;
      }
    }

    console.error('[PushService] Failed to get FCM token:', error);
    return null;
  }
};

/**
 * 플랫폼 타입 가져오기
 */
export const getPlatform = (): 'IOS' | 'ANDROID' => {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
};

/**
 * 토큰 갱신 리스너 등록
 */
export const onTokenRefresh = (callback: (token: string) => void): (() => void) => {
  const unsubscribe = messaging().onTokenRefresh(token => {
    console.log('[PushService] FCM Token refreshed:', token);
    callback(token);
  });

  return unsubscribe;
};

/**
 * 권한 상태 확인
 */
export const checkPermission = async (): Promise<boolean> => {
  const authStatus = await messaging().hasPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

/**
 * 특정 토픽 구독
 * 에러 발생 시 호출자가 처리해야 합니다.
 */
export const subscribeToTopic = async (topic: string): Promise<void> => {
  await messaging().subscribeToTopic(topic);
  console.log(`[PushService] Subscribed to topic: ${topic}`);
};

/**
 * 특정 토픽 구독 해제
 * 에러 발생 시 호출자가 처리해야 합니다.
 */
export const unsubscribeFromTopic = async (topic: string): Promise<void> => {
  await messaging().unsubscribeFromTopic(topic);
  console.log(`[PushService] Unsubscribed from topic: ${topic}`);
};
