/**
 * 로그인 화면
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useLogin } from '../../hooks/useAuth';
import { colors, typography, spacing } from '../../styles/theme';

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleLogin = () => {
    if (!email || !password) {
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            <Text style={styles.title}>로그인</Text>
            <Text style={styles.subtitle}>계정에 로그인하세요</Text>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="이메일"
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Text>📧</Text>}
              />

              <Input
                label="비밀번호"
                placeholder="8자 이상 입력"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Text>🔒</Text>}
              />

              <Button
                title="비밀번호를 잊으셨나요?"
                variant="text"
                size="small"
                onPress={() => {}}
              />
            </View>

            <Button
              title="로그인"
              variant="primary"
              fullWidth
              onPress={handleLogin}
              loading={loginMutation.isPending}
            />

            <View style={styles.divider}>
              <Text style={styles.dividerText}>또는</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>계정이 없으신가요?</Text>
              <Button
                title="회원가입"
                variant="text"
                size="small"
                onPress={() => navigation.navigate('Register')}
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
  divider: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
});

export default LoginScreen;
