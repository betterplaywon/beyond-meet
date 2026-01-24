/**
 * 설정 화면
 * UI_FLOW.md 3.10 참고
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActionSheetIOS,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../@types';
import { useMyProfile, useUpdateSettings, useDeleteAccount } from '../../hooks/useProfile';
import { useLogout } from '../../hooks/useAuth';
import { parseApiError } from '../../services/api';
import { colors, typography, spacing } from '../../styles/theme';

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { data: user } = useMyProfile();
  const { mutate: logout } = useLogout();

  // React Query mutation hook
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateSettings();

  // 서버 상태를 source of truth로 사용
  const pushEnabled = user?.pushEnabled ?? true;

  const genderFilter = user?.preferredGender || 'ANYONE';
  const ageRange = { min: user?.minAge || 20, max: user?.maxAge || 30 };

  // 나이 범위 모달 상태
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [tempMinAge, setTempMinAge] = useState(String(ageRange.min));
  const [tempMaxAge, setTempMaxAge] = useState(String(ageRange.max));

  // 회원 탈퇴 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // 회원 탈퇴 mutation
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleEditGenderFilter = () => {
    if (Platform.OS === 'ios') {
      // iOS: ActionSheet 사용
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('options.gender.male'), t('options.gender.female'), t('options.gender.anyone')],
          cancelButtonIndex: 0,
          title: t('settings.selectGender'),
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            handleSaveGenderFilter('MALE');
          } else if (buttonIndex === 2) {
            handleSaveGenderFilter('FEMALE');
          } else if (buttonIndex === 3) {
            handleSaveGenderFilter('ANYONE');
          }
        },
      );
    } else {
      // Android: Alert 사용 (취소는 외부 탭으로 처리)
      Alert.alert(
        t('settings.preferredGender'),
        t('settings.selectGender'),
        [
          { text: t('options.gender.male'), onPress: () => handleSaveGenderFilter('MALE') },
          { text: t('options.gender.female'), onPress: () => handleSaveGenderFilter('FEMALE') },
          { text: t('options.gender.anyone'), onPress: () => handleSaveGenderFilter('ANYONE') },
        ],
        { cancelable: true }, // 외부 탭으로 취소 가능
      );
    }
  };

  const handleSaveGenderFilter = (gender: 'MALE' | 'FEMALE' | 'ANYONE') => {
    if (!user?.id) return;

    updateSettings(
      {
        userId: user.id,
        settings: {
          preferredGender: gender,
        },
      },
      {
        onSuccess: () => {
          // React Query가 자동으로 user 데이터를 refetch하므로
          // genderFilter는 자동으로 업데이트됨 (로컬 상태 업데이트 불필요)
          Alert.alert(t('common.success'), t('settings.filterUpdated'));
        },
        onError: err => {
          console.error('Failed to update gender filter:', err);
          Alert.alert(t('common.error'), parseApiError(err));
        },
      },
    );
  };

  const handleEditAgeRange = () => {
    // 모달 열기 전 현재 값으로 초기화
    setTempMinAge(String(ageRange.min));
    setTempMaxAge(String(ageRange.max));
    setShowAgeModal(true);
  };

  const handleSaveAgeRange = () => {
    const minAge = parseInt(tempMinAge, 10);
    const maxAge = parseInt(tempMaxAge, 10);

    // 유효성 검사
    if (isNaN(minAge) || isNaN(maxAge)) {
      Alert.alert(t('common.error'), t('settings.invalidNumber'));
      return;
    }

    if (minAge < 18 || maxAge > 100) {
      Alert.alert(t('common.error'), t('settings.invalidAge'));
      return;
    }

    if (minAge > maxAge) {
      Alert.alert(t('common.error'), t('settings.minMaxError'));
      return;
    }

    if (!user?.id) return;

    updateSettings(
      {
        userId: user.id,
        settings: {
          minAge,
          maxAge,
        },
      },
      {
        onSuccess: () => {
          setShowAgeModal(false);
          Alert.alert(t('common.success'), t('settings.ageRangeUpdated'));
        },
        onError: err => {
          console.error('Failed to update age range:', err);
          Alert.alert(t('common.error'), parseApiError(err));
        },
      },
    );
  };

  const handleBlockList = () => {
    // TODO: 차단 목록 화면으로 이동
    Alert.alert(t('common.preparing'), t('settings.blockListPreparing'));
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('LegalContent', {
      type: 'privacy',
      title: t('settings.privacyPolicy'),
    });
  };

  const handleTermsOfService = () => {
    navigation.navigate('LegalContent', {
      type: 'terms',
      title: t('settings.termsOfService'),
    });
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('auth.deleteAccount'),
      t('auth.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            setShowDeleteModal(true);
          },
        },
      ],
    );
  };

  const handleConfirmDelete = () => {
    if (!deletePassword) {
      Alert.alert(t('common.error'), t('settings.enterPassword'));
      return;
    }

    deleteAccount(deletePassword, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setDeletePassword('');
        // logout이 mutation.onSuccess에서 호출되어 자동으로 로그인 화면으로 이동
      },
      onError: err => {
        console.error('Failed to delete account:', err);
        Alert.alert(t('common.error'), parseApiError(err));
      },
    });
  };

  const getGenderFilterText = () => {
    switch (genderFilter) {
      case 'MALE':
        return t('options.gender.male');
      case 'FEMALE':
        return t('options.gender.female');
      case 'ANYONE':
        return t('options.gender.anyone');
      default:
        return t('options.gender.all');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 나이 범위 설정 모달 */}
      <Modal
        visible={showAgeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.ageRangeSetup')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('settings.ageRangeDescription')}
            </Text>

            <View style={styles.ageInputContainer}>
              <View style={styles.ageInputWrapper}>
                <Text style={styles.ageInputLabel}>{t('settings.minAge')}</Text>
                <TextInput
                  style={styles.ageInput}
                  value={tempMinAge}
                  onChangeText={setTempMinAge}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="18"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <Text style={styles.ageSeparator}>~</Text>

              <View style={styles.ageInputWrapper}>
                <Text style={styles.ageInputLabel}>{t('settings.maxAge')}</Text>
                <TextInput
                  style={styles.ageInput}
                  value={tempMaxAge}
                  onChangeText={setTempMaxAge}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAgeModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  isUpdating && styles.modalButtonDisabled,
                ]}
                onPress={handleSaveAgeRange}
                disabled={isUpdating}
              >
                <Text style={styles.modalConfirmText}>
                  {isUpdating ? t('common.saving') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 회원 탈퇴 비밀번호 확인 모달 */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('auth.passwordConfirm')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('auth.deleteAccountPassword')}
            </Text>

            <TextInput
              style={styles.passwordInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDeleteButton,
                  isDeleting && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                <Text style={styles.modalDeleteText}>
                  {isDeleting ? t('common.processing') : t('auth.deleteAccount')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 계정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>{t('settings.changePassword')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 매칭 필터 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.matchFilter')}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleEditGenderFilter}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>{t('settings.preferredGender')}</Text>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>{getGenderFilterText()}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleEditAgeRange}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>{t('settings.ageRange')}</Text>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>
                {t('settings.ageRangeValue', { min: ageRange.min, max: ageRange.max })}
              </Text>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Text style={styles.menuLabel}>{t('settings.country')}</Text>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>🇰🇷 {t('options.countries.KR')}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>{t('settings.pushNotifications')}</Text>
            <Switch
              value={pushEnabled}
              onValueChange={(value) => {
                if (!user?.id) return;
                updateSettings(
                  {
                    userId: user.id,
                    settings: { pushEnabled: value },
                  },
                  {
                    onError: err => {
                      console.error('Failed to update push settings:', err);
                      Alert.alert(t('common.error'), parseApiError(err));
                    },
                  },
                );
              }}
              trackColor={{
                false: colors.textSecondary + '40',
                true: colors.primary + '60',
              }}
              thumbColor={pushEnabled ? colors.primary : colors.white}
            />
          </View>
        </View>

        {/* 기타 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.other')}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleBlockList}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>{t('settings.blockList')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePrivacyPolicy}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>{t('settings.privacyPolicy')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTermsOfService}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>{t('settings.termsOfService')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>{t('settings.version')}</Text>
            <Text style={styles.menuValue}>1.0.0</Text>
          </View>
        </View>

        {/* 계정 관리 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteText}>{t('auth.deleteAccount')}</Text>
          </TouchableOpacity>
        </View>

        {/* 여백 */}
        <View style={styles.bottomSpace} />
      </ScrollView>
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
  content: {
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.body2Medium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  menuLabel: {
    ...typography.body1,
    color: colors.textPrimary,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuValue: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  menuArrow: {
    ...typography.textLight,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoutText: {
    ...typography.body1Medium,
    color: colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteText: {
    ...typography.body1Medium,
    color: colors.error,
  },
  bottomSpace: {
    height: spacing.xl,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  ageInputWrapper: {
    alignItems: 'center',
  },
  ageInputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  ageInput: {
    ...typography.h3,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    textAlign: 'center',
    minWidth: 80,
  },
  ageSeparator: {
    ...typography.h3,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.body1Medium,
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    ...typography.body1Medium,
    color: colors.white,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  // 회원 탈퇴 모달 스타일
  passwordInput: {
    ...typography.body1,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalDeleteText: {
    ...typography.body1Medium,
    color: colors.white,
  },
});

export default SettingsScreen;
