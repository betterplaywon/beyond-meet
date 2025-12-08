/**
 * 인증 관련 API
 */

import { apiClient } from './client';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ApiResponse,
} from '../@types';

export const authApi = {
  /**
   * 로그인
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    return response.data.data!;
  },

  /**
   * 회원가입
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      data
    );
    return response.data.data!;
  },

  /**
   * 토큰 갱신
   */
  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<
      ApiResponse<{ accessToken: string }>
    >('/auth/refresh', { refreshToken });
    return response.data.data!;
  },

  /**
   * 로그아웃
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  /**
   * 비밀번호 변경
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/change-password',
      { currentPassword, newPassword }
    );
    return response.data.data!;
  },

  /**
   * 회원 탈퇴
   */
  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      '/auth/account',
      { data: { password } }
    );
    return response.data.data!;
  },
};
