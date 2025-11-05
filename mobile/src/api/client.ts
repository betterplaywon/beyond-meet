/**
 * Axios API 클라이언트 설정
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';
import Toast from 'react-native-toast-message';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 인터셉터
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response 인터셉터
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 에러이고 재시도하지 않은 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token으로 새 access token 발급
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${ENV.API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken } = response.data.data;

        // 새 토큰 저장
        useAuthStore.getState().setTokens(accessToken, refreshToken);

        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh 실패 시 로그아웃
        useAuthStore.getState().logout();
        Toast.show({
          type: 'error',
          text1: '세션 만료',
          text2: '다시 로그인해주세요',
        });
        return Promise.reject(refreshError);
      }
    }

    // 에러 토스트 표시
    if (error.response) {
      const errorMessage =
        error.response.data?.error?.message || '요청 처리 중 오류가 발생했습니다';

      Toast.show({
        type: 'error',
        text1: '오류',
        text2: errorMessage,
      });
    } else if (error.request) {
      Toast.show({
        type: 'error',
        text1: '네트워크 오류',
        text2: '인터넷 연결을 확인해주세요',
      });
    }

    return Promise.reject(error);
  }
);
