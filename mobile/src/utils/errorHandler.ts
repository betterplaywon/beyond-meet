/**
 * API 에러 처리 유틸리티
 */

import { Alert } from 'react-native';
import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../@types';

/**
 * API 에러에서 사용자에게 표시할 메시지를 추출합니다.
 */
export const parseApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    return axiosError.response?.data?.error?.message || '요청에 실패했습니다.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
};

/**
 * 에러를 Alert으로 표시합니다.
 */
export const showErrorAlert = (error: unknown, title = '오류'): void => {
  Alert.alert(title, parseApiError(error));
};
