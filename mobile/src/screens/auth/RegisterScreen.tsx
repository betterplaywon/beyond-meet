/**
 * 회원가입 화면 (완성 버전)
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Picker, PickerOption } from '../../components/common/Picker';
import { useRegister } from '../../hooks/useAuth';
import { colors, typography, spacing } from '../../styles/theme';

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
  const [step, setStep] = useState(1); // 1: 기본 정보, 2: 프로필 정보, 3: 매칭 필터
  const [formData, setFormData] = useState({
    // Step 1: 기본 정보
    inviteCode: '',
    email: '',
    password: '',
    passwordConfirm: '',
    // Step 2: 프로필 정보
    nickname: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '' as 'MALE' | 'FEMALE' | 'OTHER' | '',
    country: 'KR',
    // Step 3: 매칭 필터
    preferredGender: '' as 'MALE' | 'FEMALE' | 'OTHER' | '',
    minAge: 18,
    maxAge: 40,
  });

  const registerMutation = useRegister();

  const handleNextStep = () => {
    if (step === 1) {
      // 기본 정보 검증
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
      // 프로필 정보 검증
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
      // 매칭 필터 검증 및 회원가입
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
      preferredGender: formData.preferredGender as 'MALE' | 'FEMALE' | 'OTHER',
      minAge: formData.minAge,
      maxAge: formData.maxAge,
      preferredCountries: [formData.country], // 기본값: 본인 국가
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Button
              title={step > 1 ? '← 이전' : '← 뒤로'}
              variant="text"
              onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
            />
          </View>

          <View style={styles.content}>
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
              <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
              <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
              <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
            </View>

            {/* Step 1: 기본 정보 */}
            {step === 1 && (
              <>
                <Text style={styles.title}>계정 만들기</Text>
                <Text style={styles.subtitle}>기본 정보를 입력해주세요</Text>

                <View style={styles.form}>
                  <Input
                    label="초대 코드"
                    placeholder="BETA2025-001"
                    value={formData.inviteCode}
                    onChangeText={(value) =>
                      setFormData({ ...formData, inviteCode: value })
                    }
                    leftIcon={<Text>🎫</Text>}
                  />

                  <Input
                    label="이메일"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChangeText={(value) =>
                      setFormData({ ...formData, email: value })
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={<Text>📧</Text>}
                  />

                  <Input
                    label="비밀번호"
                    placeholder="8자 이상 입력"
                    value={formData.password}
                    onChangeText={(value) =>
                      setFormData({ ...formData, password: value })
                    }
                    secureTextEntry
                    leftIcon={<Text>🔒</Text>}
                  />

                  <Input
                    label="비밀번호 확인"
                    placeholder="비밀번호를 다시 입력"
                    value={formData.passwordConfirm}
                    onChangeText={(value) =>
                      setFormData({ ...formData, passwordConfirm: value })
                    }
                    secureTextEntry
                    leftIcon={<Text>🔒</Text>}
                  />
                </View>
              </>
            )}

            {/* Step 2: 프로필 정보 */}
            {step === 2 && (
              <>
                <Text style={styles.title}>프로필 정보</Text>
                <Text style={styles.subtitle}>당신에 대해 알려주세요</Text>

                <View style={styles.form}>
                  <Input
                    label="닉네임"
                    placeholder="닉네임 (2-10자)"
                    value={formData.nickname}
                    onChangeText={(value) =>
                      setFormData({ ...formData, nickname: value })
                    }
                    leftIcon={<Text>👤</Text>}
                  />

                  <Text style={styles.sectionLabel}>생년월일</Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                      <Picker
                        value={formData.birthYear}
                        options={YEAR_OPTIONS}
                        onChange={(value) =>
                          setFormData({ ...formData, birthYear: value })
                        }
                        placeholder="년"
                      />
                    </View>
                    <View style={styles.dateField}>
                      <Picker
                        value={formData.birthMonth}
                        options={MONTH_OPTIONS}
                        onChange={(value) =>
                          setFormData({ ...formData, birthMonth: value })
                        }
                        placeholder="월"
                      />
                    </View>
                    <View style={styles.dateField}>
                      <Picker
                        value={formData.birthDay}
                        options={DAY_OPTIONS}
                        onChange={(value) =>
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
                    onChange={(value) =>
                      setFormData({ ...formData, gender: value as 'MALE' | 'FEMALE' | 'OTHER' })
                    }
                    placeholder="성별을 선택하세요"
                  />

                  <Picker
                    label="국가"
                    value={formData.country}
                    options={COUNTRY_OPTIONS}
                    onChange={(value) =>
                      setFormData({ ...formData, country: value })
                    }
                    placeholder="국가를 선택하세요"
                  />
                </View>
              </>
            )}

            {/* Step 3: 매칭 필터 */}
            {step === 3 && (
              <>
                <Text style={styles.title}>매칭 설정</Text>
                <Text style={styles.subtitle}>선호하는 상대를 설정하세요</Text>

                <View style={styles.form}>
                  <Picker
                    label="선호 성별"
                    value={formData.preferredGender}
                    options={GENDER_OPTIONS}
                    onChange={(value) =>
                      setFormData({ ...formData, preferredGender: value as 'MALE' | 'FEMALE' | 'OTHER' })
                    }
                    placeholder="선호 성별을 선택하세요"
                  />

                  <Text style={styles.sectionLabel}>선호 나이 범위</Text>
                  <View style={styles.ageRow}>
                    <View style={styles.ageField}>
                      <Input
                        label="최소 나이"
                        placeholder="18"
                        value={formData.minAge.toString()}
                        onChangeText={(value) =>
                          setFormData({ ...formData, minAge: parseInt(value) || 18 })
                        }
                        keyboardType="number-pad"
                      />
                    </View>
                    <Text style={styles.ageSeparator}>~</Text>
                    <View style={styles.ageField}>
                      <Input
                        label="최대 나이"
                        placeholder="40"
                        value={formData.maxAge.toString()}
                        onChangeText={(value) =>
                          setFormData({ ...formData, maxAge: parseInt(value) || 40 })
                        }
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <Text style={styles.infoText}>
                    💡 나중에 프로필 설정에서 변경할 수 있습니다
                  </Text>
                </View>
              </>
            )}

            <Button
              title={step === 3 ? '회원가입 완료' : '다음'}
              variant="primary"
              fullWidth
              onPress={handleNextStep}
              loading={registerMutation.isPending}
              style={styles.nextButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
              <Button
                title="로그인"
                variant="text"
                size="small"
                onPress={() => navigation.navigate('Login')}
              />
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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
    backgroundColor: colors.textSecondary + '40',
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.textSecondary + '40',
    marginHorizontal: spacing.xs,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  form: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.body2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '600',
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
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  nextButton: {
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
});

export default RegisterScreen;
