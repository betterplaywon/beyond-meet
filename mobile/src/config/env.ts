/**
 * 환경 변수 설정
 */

import { Platform } from 'react-native';
import Config from 'react-native-config';

export const ENV = {
  // API Base URL
  // 개발 환경: iOS는 localhost, Android는 Mac의 LAN IP
  // 프로덕션: .env 파일의 API_BASE_URL 사용
  API_BASE_URL: __DEV__
    ? Platform.select({
        ios: 'http://localhost:3000/api',
        android: 'http://192.168.219.101:3000/api', // Mac의 LAN IP
      })!
    : Config.API_BASE_URL
    ? `${Config.API_BASE_URL}/api`
    : 'https://beyond-meet-api.onrender.com/api',

  // Agora WebRTC App ID
  // ⚠️ 반드시 .env 파일에 AGORA_APP_ID 설정 필요
  // 설정하지 않으면 앱 실행 시 에러 발생
  AGORA_APP_ID: (() => {
    if (!Config.AGORA_APP_ID) {
      if (__DEV__) {
        // 개발 환경에서는 경고만 출력하고 진행 (빌드는 성공하도록)
        console.warn(
          '⚠️  Using empty AGORA_APP_ID - Video calls will not work!',
        );
        return '';
      }

      throw new Error(
        'AGORA_APP_ID is required. Please check mobile/.env file.',
      );
    }
    return Config.AGORA_APP_ID;
  })(),

  // 기타 설정
  TIMEOUT: 10000, // API 요청 타임아웃 (10초)
  MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 최대 사진 크기: 5MB
  MAX_PHOTOS: 5, // 최대 업로드 사진 수
};
