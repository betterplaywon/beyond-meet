/**
 * 이메일 인증 화면
 * 6자리 코드 입력 UI
 *
 * 두 가지 플로우 지원:
 * 1. 회원가입 전 (route.params 존재): verifyCode API 사용, Register로 복귀
 * 2. 로그인 후 (route.params 없음): verifyEmail API 사용, 인증 완료 시 앱 진입
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, typography, spacing } from '../../styles/theme';
import {
  useVerifyEmail,
  useResendVerification,
  useVerifyCode,
  useSendVerificationCode,
} from '../../hooks/useEmailVerification';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList, RootStackParamList, RegisterFormData } from '../../@types';

const { width, height } = Dimensions.get('window');
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

// 두 가지 플로우를 지원하기 위한 Props 타입
// 1. AuthStackParamList의 EmailVerification (회원가입 전): email, formData 전달
// 2. RootStackParamList의 EmailVerification (로그인 후): params 없음
type AuthFlowProps = StackScreenProps<AuthStackParamList, 'EmailVerification'>;
type RootFlowProps = StackScreenProps<RootStackParamList, 'EmailVerification'>;

// Union 타입으로 두 플로우 모두 지원
interface Props {
  navigation: AuthFlowProps['navigation'] | RootFlowProps['navigation'];
  route: {
    params?: {
      email?: string;
      formData?: RegisterFormData;
    };
  };
}

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // 회원가입 전 플로우인지 확인 (route.params가 있으면 회원가입 전)
  const isPreRegistration = !!route.params?.email;
  const emailFromParams = route.params?.email;
  const formDataFromParams = route.params?.formData;

  // 로그인 후 플로우용 (authStore에서 가져옴)
  const userEmailFromStore = useAuthStore((state) => state.userEmail);

  // 실제 사용할 이메일
  const email = emailFromParams || userEmailFromStore || '';

  // 회원가입 전 플로우용 hooks
  const verifyCodeMutation = useVerifyCode();
  const sendCodeMutation = useSendVerificationCode();

  // 로그인 후 플로우용 hooks
  const verifyEmailMutation = useVerifyEmail();
  const resendVerificationMutation = useResendVerification();

  // 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (text: string, index: number) => {
    // 숫자만 허용
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length > 1) {
      // 붙여넣기 처리
      const pastedCode = numericText.slice(0, CODE_LENGTH).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + pastedCode.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // 단일 문자 입력
      const newCode = [...code];
      newCode[index] = numericText;
      setCode(newCode);

      if (numericText && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== CODE_LENGTH) {
      return;
    }

    if (isPreRegistration) {
      // 회원가입 전 플로우: verifyCode API 사용
      verifyCodeMutation.mutate(
        { email, code: verificationCode },
        {
          onSuccess: () => {
            // 인증 성공 → Register 화면의 Step 2로 이동
            (navigation as AuthFlowProps['navigation']).navigate('Register', {
              emailVerified: true,
              formData: formDataFromParams,
            });
          },
        }
      );
    } else {
      // 로그인 후 플로우: verifyEmail API 사용 (기존 로직)
      verifyEmailMutation.mutate(verificationCode);
    }
  };

  const handleResend = () => {
    const isPending = isPreRegistration
      ? sendCodeMutation.isPending
      : resendVerificationMutation.isPending;

    if (resendCooldown > 0 || isPending) return;

    if (isPreRegistration) {
      // 회원가입 전 플로우: sendVerificationCode API 사용
      sendCodeMutation.mutate(email, {
        onSuccess: () => {
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setCode(Array(CODE_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        },
      });
    } else {
      // 로그인 후 플로우: resendVerification API 사용 (기존 로직)
      resendVerificationMutation.mutate(undefined, {
        onSuccess: () => {
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setCode(Array(CODE_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        },
      });
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : '***@***.***';
  const isCodeComplete = code.every((c) => c !== '');

  // 현재 진행 중인 mutation 상태
  const isVerifying = isPreRegistration
    ? verifyCodeMutation.isPending
    : verifyEmailMutation.isPending;
  const isResending = isPreRegistration
    ? sendCodeMutation.isPending
    : resendVerificationMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      {/* 배경 원형 */}
      <View style={styles.blurBackground} pointerEvents="none">
        <View style={styles.blurCircle} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* 아이콘 */}
        <View style={styles.iconContainer}>
          <Icon name="mark-email-read" size={64} color={colors.primary} />
        </View>

        {/* 타이틀 */}
        <Text style={styles.title}>이메일 인증</Text>
        <Text style={styles.subtitle}>
          {maskedEmail}로{'\n'}전송된 6자리 코드를 입력해주세요
        </Text>

        {/* 코드 입력 */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* 타이머 안내 */}
        <Text style={styles.timerText}>
          인증 코드는 10분 후 만료됩니다
        </Text>

        {/* 인증 버튼 */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (!isCodeComplete || isVerifying) && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={!isCodeComplete || isVerifying}
        >
          <Text style={styles.verifyButtonText}>
            {isVerifying ? '확인 중...' : '인증하기'}
          </Text>
        </TouchableOpacity>

        {/* 재전송 링크 */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>코드를 받지 못하셨나요? </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0 || isResending}
          >
            <Text
              style={[
                styles.resendLink,
                resendCooldown > 0 && styles.resendLinkDisabled,
              ]}
            >
              {resendCooldown > 0
                ? `재전송 (${resendCooldown}초)`
                : isResending
                ? '전송 중...'
                : '재전송'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  blurBackground: {
    position: 'absolute',
    top: height * 0.75,
    left: -width * 0.15,
    right: -width * 0.15,
    height: height * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurCircle: {
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  timerText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xl,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 18,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  resendLink: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.primary,
  },
  resendLinkDisabled: {
    color: colors.textTertiary,
  },
});

export default EmailVerificationScreen;
