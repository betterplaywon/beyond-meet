/**
 * 비밀번호 변경 화면
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { RootStackParamList } from '../../@types';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { authApi } from '../../api/auth.api';
import { useTranslation } from 'react-i18next';
import { parseApiError } from '../../services/api';
import { colors, typography, spacing } from '../../styles/theme';

type ChangePasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ChangePassword'
>;

interface Props {
  navigation: ChangePasswordScreenNavigationProp;
}

const ChangePasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 비밀번호 변경 mutation
  const { mutate: changePassword, isPending } = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('changePassword.success'), [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      Alert.alert(t('common.error'), parseApiError(error));
    },
  });

  const handleSubmit = () => {
    // 유효성 검사
    if (!currentPassword.trim()) {
      Alert.alert(t('common.error'), t('changePassword.currentRequired'));
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert(t('common.error'), t('changePassword.newRequired'));
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('changePassword.newMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('changePassword.newMismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(t('common.error'), t('changePassword.samePassword'));
      return;
    }

    changePassword();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('changePassword.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* 안내 문구 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🔒</Text>
            <Text style={styles.infoText}>
              {t('changePassword.description')}
            </Text>
          </View>

          {/* 입력 필드 */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('changePassword.currentPassword')}</Text>
              <Input
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('changePassword.newPassword')}</Text>
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                secureTextEntry
                autoComplete="new-password"
              />
              {newPassword.length > 0 && newPassword.length < 8 && (
                <Text style={styles.errorText}>
                  {t('changePassword.minLengthError')}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('changePassword.confirmPassword')}</Text>
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                secureTextEntry
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 &&
                newPassword !== confirmPassword && (
                  <Text style={styles.errorText}>
                    {t('changePassword.mismatchError')}
                  </Text>
                )}
            </View>
          </View>

          {/* 변경 버튼 */}
          <Button
            title={isPending ? t('changePassword.changing') : t('changePassword.submit')}
            onPress={handleSubmit}
            disabled={isPending}
            variant="primary"
            size="large"
            style={styles.submitButton}
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoText: {
    ...typography.body2,
    color: colors.primary,
    flex: 1,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body2Medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});

export default ChangePasswordScreen;
