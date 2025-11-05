/**
 * 회원가입 화면 (간단한 버전)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useRegister } from '../../hooks/useAuth';
import { colors, typography, spacing } from '../../styles/theme';

type RegisterScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    inviteCode: '',
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    birthDate: '1990-01-01',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    country: 'KR',
    profilePhotos: [] as string[],
  });

  const registerMutation = useRegister();

  const handleRegister = () => {
    if (!formData.email || !formData.password || !formData.nickname) {
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      return;
    }

    registerMutation.mutate({
      inviteCode: formData.inviteCode,
      email: formData.email,
      password: formData.password,
      nickname: formData.nickname,
      birthDate: formData.birthDate,
      gender: formData.gender,
      country: formData.country,
      profilePhotos: formData.profilePhotos,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
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
              title="← 뒤로"
              variant="text"
              onPress={() => navigation.goBack()}
            />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>계정 만들기</Text>
            <Text style={styles.subtitle}>새로운 계정을 만드세요</Text>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="초대 코드"
                placeholder="초대 코드를 입력하세요"
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

              <Input
                label="닉네임"
                placeholder="닉네임 (2-10자)"
                value={formData.nickname}
                onChangeText={(value) =>
                  setFormData({ ...formData, nickname: value })
                }
                leftIcon={<Text>👤</Text>}
              />
            </View>

            <Button
              title="회원가입"
              variant="primary"
              fullWidth
              onPress={handleRegister}
              loading={registerMutation.isPending}
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
    paddingTop: spacing.xl,
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
