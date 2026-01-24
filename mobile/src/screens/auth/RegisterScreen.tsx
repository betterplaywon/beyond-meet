/**
 * 회원가입 화면
 * Figma: Cupid Arrow - Sign-up Screen 디자인 적용
 *
 * 플로우: Step 1 (계정 정보) → 이메일 인증 → Step 2 (프로필) → Step 3 (매칭) → 회원가입 완료
 */

import React, { useState, useEffect } from 'react';
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
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList, RegisterFormData } from '../../@types';
import { Input, Button } from '../../components/common';
import { Picker, PickerOption } from '../../components/common/Picker';
import { useRegister } from '../../hooks/useAuth';
import { useSendVerificationCode } from '../../hooks/useEmailVerification';
import { colors, typography, spacing } from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

type RegisterScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Register'
>;

type RegisterScreenRouteProp = RouteProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
  route: RegisterScreenRouteProp;
}

const DEFAULT_FORM_DATA: RegisterFormData = {
  email: '',
  password: '',
  passwordConfirm: '',
  nickname: '',
  birthYear: '',
  birthMonth: '',
  birthDay: '',
  gender: '',
  country: 'KR',
  preferredGender: '',
  minAge: 18,
  maxAge: 40,
};

const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();

  // 성별 옵션
  const GENDER_OPTIONS: PickerOption[] = [
    { label: t('options.gender.male'), value: 'MALE' },
    { label: t('options.gender.female'), value: 'FEMALE' },
    { label: t('options.gender.other'), value: 'OTHER' },
  ];

  // 선호 성별 옵션
  const PREFERRED_GENDER_OPTIONS: PickerOption[] = [
    { label: t('options.gender.male'), value: 'MALE' },
    { label: t('options.gender.female'), value: 'FEMALE' },
    { label: t('options.gender.anyone'), value: 'ANYONE' },
  ];

  // 국가 옵션 (주요 국가만)
  const COUNTRY_OPTIONS: PickerOption[] = [
    { label: t('options.countries.KR'), value: 'KR' },
    { label: t('options.countries.US'), value: 'US' },
    { label: t('options.countries.JP'), value: 'JP' },
    { label: t('options.countries.CN'), value: 'CN' },
    { label: t('options.countries.GB'), value: 'GB' },
    { label: t('options.countries.FR'), value: 'FR' },
    { label: t('options.countries.DE'), value: 'DE' },
    { label: t('options.countries.CA'), value: 'CA' },
    { label: t('options.countries.AU'), value: 'AU' },
  ];

  // 연도 옵션 (1950 ~ 2007, 18세 이상)
  const YEAR_OPTIONS: PickerOption[] = Array.from({ length: 58 }, (_, i) => {
    const year = 2007 - i;
    return { label: `${year}${t('register.year')}`, value: year.toString() };
  });

  // 월 옵션
  const MONTH_OPTIONS: PickerOption[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { label: `${month}${t('register.month')}`, value: month.toString().padStart(2, '0') };
  });

  // 일 옵션
  const DAY_OPTIONS: PickerOption[] = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    return { label: `${day}${t('register.day')}`, value: day.toString().padStart(2, '0') };
  });

  // 이메일 인증 완료 후 돌아온 경우 Step 2부터 시작
  const initialStep = route.params?.emailVerified ? 2 : 1;
  const initialFormData = route.params?.formData || DEFAULT_FORM_DATA;

  const [step, setStep] = useState(initialStep);
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [emailVerified, setEmailVerified] = useState(route.params?.emailVerified || false);
  const [verifiedEmail, setVerifiedEmail] = useState<string>(route.params?.formData?.email || '');

  const registerMutation = useRegister();
  const sendCodeMutation = useSendVerificationCode();

  // 이메일 인증 완료 후 돌아온 경우 처리
  useEffect(() => {
    if (route.params?.emailVerified && route.params?.formData) {
      setStep(2);
      setFormData(route.params.formData);
      setEmailVerified(true);
      setVerifiedEmail(route.params.formData.email);
    }
  }, [route.params]);

  // 이메일이 변경되면 인증 상태 초기화
  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value });
    // 인증된 이메일과 다르면 인증 상태 초기화
    if (emailVerified && value !== verifiedEmail) {
      setEmailVerified(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Step 1 검증
      if (!formData.email.trim()) {
        Alert.alert(t('common.error'), t('validation.emailRequired'));
        return;
      }
      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert(t('common.error'), t('validation.emailInvalid'));
        return;
      }
      if (!formData.password || formData.password.length < 8) {
        Alert.alert(t('common.error'), t('validation.passwordMinLength'));
        return;
      }
      if (!/[A-Z]/.test(formData.password)) {
        Alert.alert(t('common.error'), t('validation.passwordUppercase'));
        return;
      }
      if (!/[0-9]/.test(formData.password)) {
        Alert.alert(t('common.error'), t('validation.passwordNumber'));
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        Alert.alert(t('common.error'), t('validation.passwordSpecialChar'));
        return;
      }
      if (formData.password !== formData.passwordConfirm) {
        Alert.alert(t('common.error'), t('validation.passwordMismatch'));
        return;
      }

      // 이메일 인증 코드 발송 후 인증 화면으로 이동
      sendCodeMutation.mutate(formData.email, {
        onSuccess: () => {
          navigation.navigate('EmailVerification', {
            email: formData.email,
            formData: formData,
          });
        },
      });
    } else if (step === 2) {
      if (!formData.nickname.trim()) {
        Alert.alert(t('common.error'), t('validation.nicknameRequired'));
        return;
      }
      if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
        Alert.alert(t('common.error'), t('validation.birthDateRequired'));
        return;
      }
      if (!formData.gender) {
        Alert.alert(t('common.error'), t('validation.genderRequired'));
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.preferredGender) {
        Alert.alert(t('common.error'), t('validation.preferredGenderRequired'));
        return;
      }
      // 나이 범위 유효성 검사 및 기본값 적용
      const minAge = formData.minAge || 18;
      const maxAge = formData.maxAge || 40;
      if (minAge < 18 || minAge > 100) {
        Alert.alert(t('common.error'), t('validation.minAgeRange'));
        return;
      }
      if (maxAge < 18 || maxAge > 100) {
        Alert.alert(t('common.error'), t('validation.maxAgeRange'));
        return;
      }
      if (minAge >= maxAge) {
        Alert.alert(t('common.error'), t('validation.ageRangeInvalid'));
        return;
      }
      // 유효한 값으로 회원가입 진행
      handleRegister(minAge, maxAge);
    }
  };

  const handleRegister = (finalMinAge: number, finalMaxAge: number) => {
    const birthDate = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;

    registerMutation.mutate({
      email: formData.email,
      password: formData.password,
      nickname: formData.nickname,
      birthDate,
      gender: formData.gender as 'MALE' | 'FEMALE' | 'OTHER',
      country: formData.country,
      preferredGender: formData.preferredGender as 'MALE' | 'FEMALE' | 'ANYONE',
      minAge: finalMinAge,
      maxAge: finalMaxAge,
      preferredCountries: [formData.country],
    });
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return t('register.step1Title');
      case 2:
        return t('register.step2Title');
      case 3:
        return t('register.step3Title');
      default:
        return t('auth.register');
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return t('register.step1Subtitle');
      case 2:
        return t('register.step2Subtitle');
      case 3:
        return t('register.step3Subtitle');
      default:
        return '';
    }
  };

  // 아이콘 컴포넌트들
  const EmailIcon = () => (
    <Icon name="mail" size={20} color={colors.textTertiary} />
  );

  const LockIcon = () => (
    <Icon name="lock" size={20} color={colors.textTertiary} />
  );

  const PersonIcon = () => (
    <Icon name="person" size={20} color={colors.textTertiary} />
  );

  const isLoading = registerMutation.isPending || sendCodeMutation.isPending;

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
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  value={formData.email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<EmailIcon />}
                />

                <Input
                  label={t('auth.password')}
                  description={t('register.passwordHint')}
                  placeholder={t('register.passwordInputPlaceholder')}
                  value={formData.password}
                  onChangeText={value =>
                    setFormData({ ...formData, password: value })
                  }
                  secureTextEntry
                  leftIcon={<LockIcon />}
                />

                <Input
                  label={t('register.passwordConfirmLabel')}
                  placeholder={t('register.passwordConfirmPlaceholder')}
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
                  label={t('register.nickname')}
                  placeholder={t('register.nicknamePlaceholder')}
                  value={formData.nickname}
                  onChangeText={value =>
                    setFormData({ ...formData, nickname: value })
                  }
                  leftIcon={<PersonIcon />}
                />

                <Text style={styles.sectionLabel}>{t('register.birthDate')}</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Picker
                      value={formData.birthYear}
                      options={YEAR_OPTIONS}
                      onChange={value =>
                        setFormData({ ...formData, birthYear: value })
                      }
                      placeholder={t('register.year')}
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Picker
                      value={formData.birthMonth}
                      options={MONTH_OPTIONS}
                      onChange={value =>
                        setFormData({ ...formData, birthMonth: value })
                      }
                      placeholder={t('register.month')}
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Picker
                      value={formData.birthDay}
                      options={DAY_OPTIONS}
                      onChange={value =>
                        setFormData({ ...formData, birthDay: value })
                      }
                      placeholder={t('register.day')}
                    />
                  </View>
                </View>

                <Picker
                  label={t('register.gender')}
                  value={formData.gender}
                  options={GENDER_OPTIONS}
                  onChange={value =>
                    setFormData({
                      ...formData,
                      gender: value as 'MALE' | 'FEMALE' | 'OTHER',
                    })
                  }
                  placeholder={t('register.genderPlaceholder')}
                />

                <Picker
                  label={t('register.country')}
                  value={formData.country}
                  options={COUNTRY_OPTIONS}
                  onChange={value =>
                    setFormData({ ...formData, country: value })
                  }
                  placeholder={t('register.countryPlaceholder')}
                />
              </View>
            )}

            {/* Step 3: 매칭 필터 */}
            {step === 3 && (
              <View style={styles.form}>
                <Picker
                  label={t('register.preferredGender')}
                  value={formData.preferredGender}
                  options={PREFERRED_GENDER_OPTIONS}
                  onChange={value =>
                    setFormData({
                      ...formData,
                      preferredGender: value as 'MALE' | 'FEMALE' | 'ANYONE',
                    })
                  }
                  placeholder={t('register.preferredGenderPlaceholder')}
                />

                <Text style={styles.sectionLabel}>{t('register.preferredAgeRange')}</Text>
                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <Input
                      label={t('register.minAge')}
                      placeholder="18"
                      value={formData.minAge === 0 ? '' : formData.minAge.toString()}
                      onChangeText={value => {
                        const numericValue = value.replace(/[^0-9]/g, '');
                        setFormData({
                          ...formData,
                          minAge: numericValue === '' ? 0 : parseInt(numericValue, 10),
                        });
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={styles.ageSeparator}>~</Text>
                  <View style={styles.ageField}>
                    <Input
                      label={t('register.maxAge')}
                      placeholder="40"
                      value={formData.maxAge === 0 ? '' : formData.maxAge.toString()}
                      onChangeText={value => {
                        const numericValue = value.replace(/[^0-9]/g, '');
                        setFormData({
                          ...formData,
                          maxAge: numericValue === '' ? 0 : parseInt(numericValue, 10),
                        });
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 버튼 영역 */}
            <View style={styles.buttonContainer}>
              {step > 1 && (
                <Button
                  title={t('register.prev')}
                  variant="outline"
                  size="medium"
                  borderRadius="pill"
                  onPress={() => setStep(step - 1)}
                  style={{ flex: 1 }}
                />
              )}

              <Button
                title={
                  sendCodeMutation.isPending
                    ? t('register.sendingCode')
                    : registerMutation.isPending
                    ? t('register.registering')
                    : step === 1
                    ? t('register.emailVerification')
                    : step === 3
                    ? t('register.complete')
                    : t('register.next')
                }
                variant="primary"
                size="medium"
                borderRadius="pill"
                loading={isLoading}
                onPress={handleNextStep}
                style={{ flex: 1 }}
              />
            </View>

            {/* Login link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>{t('auth.login')}</Text>
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
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.body2Medium,
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
    ...typography.h5,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
    ...typography.body2Medium,
    color: colors.primary,
  },
});

export default RegisterScreen;
