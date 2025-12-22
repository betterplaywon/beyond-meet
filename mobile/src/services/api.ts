/**
 * Axios API 클라이언트
 * 모든 HTTP 요청의 기본 설정 및 인터셉터 관리
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';
import { ApiResponse } from '../@types';

/**
 * Axios 인스턴스 생성
 */
const api: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request 인터셉터
 * 모든 요청에 JWT 토큰 자동 추가
 */
api.interceptors.request.use(
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

/**
 * Response 인터셉터
 * 에러 처리 및 토큰 갱신 로직
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 Unauthorized - 토큰 만료
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // 토큰 갱신 요청
        const response = await axios.post<ApiResponse<{
          accessToken: string;
          refreshToken: string;
          user: { id: string; email: string; role: 'USER' | 'ADMIN' };
        }>>(
          `${ENV.API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data!;

        // 새 토큰 저장 (emailVerified 및 기타 상태는 유지)
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패 - 로그아웃 (중복 호출 방지)
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(refreshError);
      }
    }

    // 기타 에러
    return Promise.reject(error);
  }
);

/**
 * API 에러 파싱 헬퍼 함수
 */
export const parseApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiResponse>;

    if (apiError.response?.data?.error) {
      return apiError.response.data.error.message;
    }

    if (apiError.message) {
      return apiError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
};

export default api;
