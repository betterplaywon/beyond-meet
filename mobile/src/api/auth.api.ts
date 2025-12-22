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

  /**
   * 회원가입 전 이메일 인증 코드 발송 (비인증)
   */
  sendVerificationCode: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/send-verification-code',
      { email }
    );
    return response.data.data!;
  },

  /**
   * 회원가입 전 이메일 인증 코드 확인 (비인증)
   */
  verifyCode: async (email: string, code: string): Promise<{ message: string; emailVerified: boolean }> => {
    const response = await apiClient.post<ApiResponse<{ message: string; emailVerified: boolean }>>(
      '/auth/verify-code',
      { email, code }
    );
    return response.data.data!;
  },

  /**
   * 이메일 인증 코드 확인 (로그인된 사용자)
   */
  verifyEmail: async (code: string): Promise<{ message: string; emailVerified: boolean }> => {
    const response = await apiClient.post<ApiResponse<{ message: string; emailVerified: boolean }>>(
      '/auth/verify-email',
      { code }
    );
    return response.data.data!;
  },

  /**
   * 이메일 인증 코드 재발송 (로그인된 사용자)
   */
  resendVerification: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/resend-verification'
    );
    return response.data.data!;
  },
};
