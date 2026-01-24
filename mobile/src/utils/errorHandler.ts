/**
 * API 에러 처리 유틸리티
 */

import { Alert } from 'react-native';
import axios, { AxiosError } from 'axios';
import i18n from '../i18n';
import { ApiResponse } from '../@types';

/**
 * API 에러에서 사용자에게 표시할 메시지를 추출합니다.
 */
export const parseApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    return axiosError.response?.data?.error?.message || i18n.t('errors.requestFailed');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return i18n.t('errors.unknown');
};

/**
 * 에러를 Alert으로 표시합니다.
 */
export const showErrorAlert = (error: unknown, title?: string): void => {
  Alert.alert(title || i18n.t('common.error'), parseApiError(error));
};
