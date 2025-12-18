/**
 * 회원가입 화면
 * Figma: Cupid Arrow - Sign-up Screen 디자인 적용
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { Input } from '../../components/common/Input';
import { Picker, PickerOption } from '../../components/common/Picker';
import { useRegister } from '../../hooks/useAuth';
import { colors, typography, spacing } from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

type RegisterScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

// 성별 옵션
const GENDER_OPTIONS: PickerOption[] = [
  { label: '남성', value: 'MALE' },
  { label: '여성', value: 'FEMALE' },
  { label: '기타', value: 'OTHER' },
];

// 선호 성별 옵션
const PREFERRED_GENDER_OPTIONS: PickerOption[] = [
  { label: '남성', value: 'MALE' },
  { label: '여성', value: 'FEMALE' },
  { label: '누구나', value: 'ANYONE' },
];

// 국가 옵션 (주요 국가만)
const COUNTRY_OPTIONS: PickerOption[] = [
  { label: '대한민국', value: 'KR' },
  { label: '미국', value: 'US' },
  { label: '일본', value: 'JP' },
  { label: '중국', value: 'CN' },
  { label: '영국', value: 'GB' },
  { label: '프랑스', value: 'FR' },
  { label: '독일', value: 'DE' },
  { label: '캐나다', value: 'CA' },
  { label: '호주', value: 'AU' },
];

// 연도 옵션 (1950 ~ 2007, 18세 이상)
const YEAR_OPTIONS: PickerOption[] = Array.from({ length: 58 }, (_, i) => {
  const year = 2007 - i;
  return { label: `${year}년`, value: year.toString() };
});

// 월 옵션
const MONTH_OPTIONS: PickerOption[] = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  return { label: `${month}월`, value: month.toString().padStart(2, '0') };
});

// 일 옵션
const DAY_OPTIONS: PickerOption[] = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  return { label: `${day}일`, value: day.toString().padStart(2, '0') };
});

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    inviteCode: '',
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '' as 'MALE' | 'FEMALE' | 'OTHER' | '',
    country: 'KR',
    preferredGender: '' as 'MALE' | 'FEMALE' | 'ANYONE' | '',
    minAge: 18,
    maxAge: 40,
  });

  const registerMutation = useRegister();

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.inviteCode.trim()) {
        Alert.alert('오류', '초대 코드를 입력해주세요');
        return;
      }
      if (!formData.email.trim()) {
        Alert.alert('오류', '이메일을 입력해주세요');
        return;
      }
      if (!formData.password || formData.password.length < 8) {
        Alert.alert('오류', '비밀번호는 8자 이상이어야 합니다');
        return;
      }
      if (formData.password !== formData.passwordConfirm) {
        Alert.alert('오류', '비밀번호가 일치하지 않습니다');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.nickname.trim()) {
        Alert.alert('오류', '닉네임을 입력해주세요');
        return;
      }
      if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
        Alert.alert('오류', '생년월일을 선택해주세요');
        return;
      }
      if (!formData.gender) {
        Alert.alert('오류', '성별을 선택해주세요');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.preferredGender) {
        Alert.alert('오류', '선호 성별을 선택해주세요');
        return;
      }
      if (formData.minAge >= formData.maxAge) {
        Alert.alert('오류', '최소 나이는 최대 나이보다 작아야 합니다');
        return;
      }
      handleRegister();
    }
  };

  const handleRegister = () => {
    const birthDate = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;

    registerMutation.mutate({
      inviteCode: formData.inviteCode,
      email: formData.email,
      password: formData.password,
      nickname: formData.nickname,
      birthDate,
      gender: formData.gender as 'MALE' | 'FEMALE' | 'OTHER',
      country: formData.country,
      preferredGender: formData.preferredGender as 'MALE' | 'FEMALE' | 'ANYONE',
      minAge: formData.minAge,
      maxAge: formData.maxAge,
      preferredCountries: [formData.country],
    });
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return '계정 만들기';
      case 2:
        return '프로필 정보';
      case 3:
        return '매칭 설정';
      default:
        return '회원가입';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return '새로운 인연을 만나기 위한\n첫 번째 단계예요';
      case 2:
        return '당신에 대해\n조금 더 알려주세요';
      case 3:
        return '어떤 사람을\n만나고 싶으신가요?';
      default:
        return '';
    }
  };

  // 아이콘 컴포넌트들
  const TicketIcon = () => (
    <Icon name="confirmation-number" size={20} color={colors.textTertiary} />
  );

  const EmailIcon = () => (
    <Icon name="mail" size={20} color={colors.textTertiary} />
  );

  const LockIcon = () => (
    <Icon name="lock" size={20} color={colors.textTertiary} />
  );

  const PersonIcon = () => (
    <Icon name="person" size={20} color={colors.textTertiary} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 하단 blur 배경 효과 - top 기준으로 고정 */}
      <View style={styles.blurBackground} pointerEvents="none">
        <View style={styles.blurCircle} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* 진행 표시 */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressDot,
                  step >= 1 && styles.progressDotActive,
                ]}
              />
              <View
                style={[
                  styles.progressLine,
                  step >= 2 && styles.progressLineActive,
                ]}
              />
              <View
                style={[
                  styles.progressDot,
                  step >= 2 && styles.progressDotActive,
                ]}
              />
              <View
                style={[
                  styles.progressLine,
                  step >= 3 && styles.progressLineActive,
                ]}
              />
              <View
                style={[
                  styles.progressDot,
                  step >= 3 && styles.progressDotActive,
                ]}
              />
            </View>

            {/* 타이틀 */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{getStepTitle()}</Text>
              <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
            </View>

            {/* Step 1: 기본 정보 */}
            {step === 1 && (
              <View style={styles.form}>
                <Input
                  label="초대 코드"
                  placeholder="BETA2025-001"
                  value={formData.inviteCode}
                  onChangeText={value =>
                    setFormData({ ...formData, inviteCode: value })
                  }
                  leftIcon={<TicketIcon />}
                />

                <Input
                  label="이메일"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChangeText={value =>
                    setFormData({ ...formData, email: value })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<EmailIcon />}
                />

                <Input
                  label="비밀번호"
                  placeholder="8자 이상 입력"
                  value={formData.password}
                  onChangeText={value =>
                    setFormData({ ...formData, password: value })
                  }
                  secureTextEntry
                  leftIcon={<LockIcon />}
                />

                <Input
                  label="비밀번호 확인"
                  placeholder="비밀번호를 다시 입력"
                  value={formData.passwordConfirm}
                  onChangeText={value =>
                    setFormData({ ...formData, passwordConfirm: value })
                  }
                  secureTextEntry
                  leftIcon={<LockIcon />}
                />
              </View>
            )}

            {/* Step 2: 프로필 정보 */}
            {step === 2 && (
              <View style={styles.form}>
                <Input
                  label="닉네임"
                  placeholder="닉네임 (2-10자)"
                  value={formData.nickname}
                  onChangeText={value =>
                    setFormData({ ...formData, nickname: value })
                  }
                  leftIcon={<PersonIcon />}
                />

                <Text style={styles.sectionLabel}>생년월일</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Picker
                      value={formData.birthYear}
                      options={YEAR_OPTIONS}
                      onChange={value =>
                        setFormData({ ...formData, birthYear: value })
                      }
                      placeholder="년"
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Picker
                      value={formData.birthMonth}
                      options={MONTH_OPTIONS}
                      onChange={value =>
                        setFormData({ ...formData, birthMonth: value })
                      }
                      placeholder="월"
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Picker
                      value={formData.birthDay}
                      options={DAY_OPTIONS}
                      onChange={value =>
                        setFormData({ ...formData, birthDay: value })
                      }
                      placeholder="일"
                    />
                  </View>
                </View>

                <Picker
                  label="성별"
                  value={formData.gender}
                  options={GENDER_OPTIONS}
                  onChange={value =>
                    setFormData({
                      ...formData,
                      gender: value as 'MALE' | 'FEMALE' | 'OTHER',
                    })
                  }
                  placeholder="성별을 선택하세요"
                />

                <Picker
                  label="국가"
                  value={formData.country}
                  options={COUNTRY_OPTIONS}
                  onChange={value =>
                    setFormData({ ...formData, country: value })
                  }
                  placeholder="국가를 선택하세요"
                />
              </View>
            )}

            {/* Step 3: 매칭 필터 */}
            {step === 3 && (
              <View style={styles.form}>
                <Picker
                  label="선호 성별"
                  value={formData.preferredGender}
                  options={PREFERRED_GENDER_OPTIONS}
                  onChange={value =>
                    setFormData({
                      ...formData,
                      preferredGender: value as 'MALE' | 'FEMALE' | 'ANYONE',
                    })
                  }
                  placeholder="선호 성별을 선택하세요"
                />

                <Text style={styles.sectionLabel}>선호 나이 범위</Text>
                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <Input
                      label="최소"
                      placeholder="18"
                      value={formData.minAge.toString()}
                      onChangeText={value =>
                        setFormData({
                          ...formData,
                          minAge: parseInt(value) || 18,
                        })
                      }
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={styles.ageSeparator}>~</Text>
                  <View style={styles.ageField}>
                    <Input
                      label="최대"
                      placeholder="40"
                      value={formData.maxAge.toString()}
                      onChangeText={value =>
                        setFormData({
                          ...formData,
                          maxAge: parseInt(value) || 40,
                        })
                      }
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 버튼 영역 */}
            <View style={styles.buttonContainer}>
              {step > 1 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep(step - 1)}
                >
                  <Text style={styles.backButtonText}>← 이전</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  registerMutation.isPending && styles.nextButtonDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleNextStep}
                disabled={registerMutation.isPending}
              >
                <Text style={styles.nextButtonText}>
                  {registerMutation.isPending
                    ? '처리 중...'
                    : step === 3
                    ? '회원가입 완료'
                    : '다음'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>로그인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: height * 0.08,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.textTertiary,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  progressLine: {
    width: 50,
    height: 2,
    backgroundColor: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
  },
  form: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateField: {
    flex: 1,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ageField: {
    flex: 1,
  },
  ageSeparator: {
    fontSize: 20,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  buttonContainer: {
    marginBottom: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  backButtonText: {
    ...typography.body1,
    color: colors.primary,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default RegisterScreen;
