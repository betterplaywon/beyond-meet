/**
 * 푸시 알림 통합 서비스
 *
 * 모든 푸시 알림 관련 기능을 통합하여 제공합니다.
 * - 포그라운드 알림 처리
 * - 백그라운드 알림 처리
 * - Deep Link 처리
 * - 권한 요청
 */

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
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

class PushService {
  private navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

  /**
   * Navigation 참조 설정
   */
  setNavigationRef(ref: NavigationContainerRef<RootStackParamList> | null): void {
    this.navigationRef = ref;
  }

  /**
   * 푸시 알림 초기화
   */
  async initialize(): Promise<void> {
    try {
      // 1. 권한 요청
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('[PushService] Notification permission denied');
        return;
      }

      // 2. 포그라운드 메시지 리스너 등록
      this.setupForegroundListener();

      // 3. 백그라운드 메시지 리스너 등록
      this.setupBackgroundListener();

      // 4. 초기 알림 확인 (앱이 종료 상태에서 알림으로 열린 경우)
      await this.handleInitialNotification();

      console.log('[PushService] Initialized successfully');
    } catch (error) {
      console.error('[PushService] Initialization failed:', error);
    }
  }

  /**
   * 푸시 알림 권한 요청
   */
  async requestPermission(): Promise<boolean> {
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
  }

  /**
   * FCM 디바이스 토큰 가져오기
   */
  async getDeviceToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('[PushService] FCM Token:', token);
      return token;
    } catch (error) {
      console.error('[PushService] Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * 플랫폼 타입 가져오기
   */
  getPlatform(): 'IOS' | 'ANDROID' {
    return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  }

  /**
   * 포그라운드 메시지 리스너 설정
   */
  private setupForegroundListener(): void {
    messaging().onMessage(async (remoteMessage) => {
      console.log('[PushService] Foreground message received:', remoteMessage);
      this.handleForegroundMessage(remoteMessage);
    });
  }

  /**
   * 백그라운드 메시지 리스너 설정
   */
  private setupBackgroundListener(): void {
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('[PushService] Notification opened app from background:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage);
    });
  }

  /**
   * 초기 알림 처리 (앱이 종료 상태에서 알림으로 열린 경우)
   */
  private async handleInitialNotification(): Promise<void> {
    try {
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage) {
        console.log('[PushService] App opened from notification:', remoteMessage);
        // 약간의 딜레이를 주어 Navigation이 준비될 때까지 대기
        setTimeout(() => {
          this.handleNotificationNavigation(remoteMessage);
        }, 1000);
      }
    } catch (error) {
      console.error('[PushService] Failed to get initial notification:', error);
    }
  }

  /**
   * 포그라운드 메시지 처리
   * 앱이 활성 상태일 때 알림 표시
   */
  private handleForegroundMessage(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    const { notification, data } = remoteMessage;

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
        this.handleNotificationNavigation(remoteMessage);
      },
    });

    // iOS에서는 Alert도 함께 표시 (선택사항)
    if (Platform.OS === 'ios') {
      Alert.alert(
        notification.title || '새 알림',
        notification.body || '',
        [
          { text: '닫기', style: 'cancel' },
          {
            text: '확인',
            onPress: () => this.handleNotificationNavigation(remoteMessage),
          },
        ]
      );
    }
  }

  /**
   * 알림 타입에 따라 화면 이동 (Deep Link 처리)
   */
  private handleNotificationNavigation(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    if (!this.navigationRef) {
      console.warn('[PushService] Navigation ref not set');
      return;
    }

    const { data } = remoteMessage;

    if (!data) {
      console.warn('[PushService] No data in notification');
      return;
    }

    const notificationData = data as unknown as NotificationData;

    console.log('[PushService] Handling notification navigation:', notificationData);

    switch (notificationData.type) {
      case NotificationType.CALL_INCOMING:
        // 통화 요청 알림 -> VideoCallScreen
        if (notificationData.sessionId && notificationData.channelName && notificationData.token) {
          this.navigationRef.navigate('VideoCall', {
            sessionId: notificationData.sessionId,
            channelName: notificationData.channelName,
            token: notificationData.token,
          });
        }
        break;

      case NotificationType.MATCH_FOUND:
        // 매칭 성공 알림 -> VideoCallScreen
        if (notificationData.sessionId && notificationData.channelName && notificationData.token) {
          this.navigationRef.navigate('VideoCall', {
            sessionId: notificationData.sessionId,
            channelName: notificationData.channelName,
            token: notificationData.token,
          });
        }
        break;

      case NotificationType.FRIEND_REQUEST:
        // 친구 요청 알림 -> FriendsScreen
        this.navigationRef.navigate('Main', {
          screen: 'Friends',
        });
        break;

      case NotificationType.CALL_ENDED:
        // 통화 종료 알림 -> CallHistoryScreen
        this.navigationRef.navigate('CallHistory');
        break;

      default:
        console.warn('[PushService] Unknown notification type:', notificationData.type);
    }
  }

  /**
   * 토큰 갱신 리스너 등록
   */
  onTokenRefresh(callback: (token: string) => void): () => void {
    const unsubscribe = messaging().onTokenRefresh((token) => {
      console.log('[PushService] FCM Token refreshed:', token);
      callback(token);
    });

    return unsubscribe;
  }

  /**
   * 권한 상태 확인
   */
  async checkPermission(): Promise<boolean> {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  /**
   * 앱 배지 숫자 설정 (iOS만 지원)
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        await messaging().setAPNSBadgeCount(count);
      } catch (error) {
        console.error('[PushService] Failed to set badge count:', error);
      }
    }
  }

  /**
   * 특정 토픽 구독
   */
  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`[PushService] Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`[PushService] Failed to subscribe to topic ${topic}:`, error);
    }
  }

  /**
   * 특정 토픽 구독 해제
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`[PushService] Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`[PushService] Failed to unsubscribe from topic ${topic}:`, error);
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
export const pushService = new PushService();
