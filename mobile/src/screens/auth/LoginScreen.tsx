/**
 * 로그인 화면
 * Figma: Simple Login - Login Screen 디자인 적용
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useLogin } from '../../hooks/useAuth';
import { colors, spacing } from '../../styles/theme';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* 상단 곡선 장식 */}
        <View style={styles.curveContainer}>
          <Svg
            width={width}
            height={height * 0.32}
            viewBox={`0 0 ${width} ${height * 0.32}`}
          >
            <Path
              d={`M0,0 L${width},0 L${width},${height * 0.22} Q${width * 0.5},${height * 0.38} 0,${height * 0.22} Z`}
              fill={colors.primary}
            />
          </Svg>
        </View>

        <View style={styles.content}>
          {/* 타이틀 */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Sign in</Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            <Input
              label="이메일"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Text>✉️</Text>}
            />

            <Input
              label="비밀번호"
              placeholder="8자 이상 입력"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Text>🔒</Text>}
            />
          </View>

          {/* Login Button */}
          <Button
            title="로그인"
            variant="primary"
            size="large"
            fullWidth
            onPress={handleLogin}
            loading={loginMutation.isPending}
          />

          {/* Sign up link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  curveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: height * 0.30,
    justifyContent: 'flex-start',
  },
  titleContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  titleUnderline: {
    width: 70,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  form: {
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
});

export default LoginScreen;
