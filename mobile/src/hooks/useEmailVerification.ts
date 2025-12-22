/**
 * 이메일 인증 관련 Hooks
 */

import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import Toast from 'react-native-toast-message';

/**
 * 회원가입 전 이메일 인증 코드 발송 Mutation (비인증)
 */
export const useSendVerificationCode = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.sendVerificationCode(email),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: '인증 코드 전송',
        text2: '이메일을 확인해주세요',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || '전송에 실패했습니다';
      Toast.show({
        type: 'error',
        text1: '전송 실패',
        text2: message,
      });
    },
  });
};

/**
 * 회원가입 전 이메일 인증 코드 확인 Mutation (비인증)
 */
export const useVerifyCode = () => {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authApi.verifyCode(email, code),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: '이메일 인증 완료',
        text2: '회원가입을 계속 진행해주세요',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || '인증에 실패했습니다';
      Toast.show({
        type: 'error',
        text1: '인증 실패',
        text2: message,
      });
    },
  });
};

/**
 * 이메일 인증 코드 확인 Mutation (로그인된 사용자)
 */
export const useVerifyEmail = () => {
  const setEmailVerified = useAuthStore((state) => state.setEmailVerified);

  return useMutation({
    mutationFn: (code: string) => authApi.verifyEmail(code),
    onSuccess: () => {
      setEmailVerified(true);
      Toast.show({
        type: 'success',
        text1: '이메일 인증 완료',
        text2: '환영합니다!',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || '인증에 실패했습니다';
      Toast.show({
        type: 'error',
        text1: '인증 실패',
        text2: message,
      });
    },
  });
};

/**
 * 이메일 인증 코드 재발송 Mutation (로그인된 사용자)
 */
export const useResendVerification = () => {
  return useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: '인증 코드 전송',
        text2: '이메일을 확인해주세요',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || '전송에 실패했습니다';
      Toast.show({
        type: 'error',
        text1: '전송 실패',
        text2: message,
      });
    },
  });
};
