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
import { RootStackParamList } from '../../@types';
import { useAuthStore } from '../../store/authStore';
import { useMyProfile, useUpdateSettings, useDeleteAccount } from '../../hooks/useProfile';
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
  const { data: user } = useMyProfile();
  const logout = useAuthStore(state => state.logout);

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
          options: ['취소', '남성', '여성', '누구나'],
          cancelButtonIndex: 0,
          title: '매칭하고 싶은 성별을 선택하세요',
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
        '원하는 성별',
        '매칭하고 싶은 성별을 선택하세요',
        [
          { text: '남성', onPress: () => handleSaveGenderFilter('MALE') },
          { text: '여성', onPress: () => handleSaveGenderFilter('FEMALE') },
          { text: '누구나', onPress: () => handleSaveGenderFilter('ANYONE') },
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
          Alert.alert('성공', '매칭 필터가 업데이트되었습니다.');
        },
        onError: err => {
          console.error('Failed to update gender filter:', err);
          Alert.alert('오류', parseApiError(err));
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
      Alert.alert('오류', '유효한 숫자를 입력해주세요.');
      return;
    }

    if (minAge < 18 || maxAge > 100) {
      Alert.alert('오류', '나이는 18세 이상 100세 이하로 설정해주세요.');
      return;
    }

    if (minAge > maxAge) {
      Alert.alert('오류', '최소 나이는 최대 나이보다 작아야 합니다.');
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
          Alert.alert('성공', '나이 범위가 업데이트되었습니다.');
        },
        onError: err => {
          console.error('Failed to update age range:', err);
          Alert.alert('오류', parseApiError(err));
        },
      },
    );
  };

  const handleBlockList = () => {
    // TODO: 차단 목록 화면으로 이동
    Alert.alert('준비 중', '차단 목록 기능은 추후 구현 예정입니다.');
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('LegalContent', {
      type: 'privacy',
      title: '개인정보처리방침',
    });
  };

  const handleTermsOfService = () => {
    navigation.navigate('LegalContent', {
      type: 'terms',
      title: '이용약관',
    });
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말 탈퇴하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
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
      Alert.alert('오류', '비밀번호를 입력해주세요.');
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
        Alert.alert('오류', parseApiError(err));
      },
    });
  };

  const getGenderFilterText = () => {
    switch (genderFilter) {
      case 'MALE':
        return '남성';
      case 'FEMALE':
        return '여성';
      case 'ANYONE':
        return '누구나';
      default:
        return '전체';
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
            <Text style={styles.modalTitle}>나이 범위 설정</Text>
            <Text style={styles.modalSubtitle}>
              매칭하고 싶은 나이 범위를 설정하세요 (18-100세)
            </Text>

            <View style={styles.ageInputContainer}>
              <View style={styles.ageInputWrapper}>
                <Text style={styles.ageInputLabel}>최소 나이</Text>
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
                <Text style={styles.ageInputLabel}>최대 나이</Text>
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
                <Text style={styles.modalCancelText}>취소</Text>
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
                  {isUpdating ? '저장 중...' : '저장'}
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
            <Text style={styles.modalTitle}>비밀번호 확인</Text>
            <Text style={styles.modalSubtitle}>
              회원 탈퇴를 진행하려면 비밀번호를 입력해주세요
            </Text>

            <TextInput
              style={styles.passwordInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="비밀번호"
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
                <Text style={styles.modalCancelText}>취소</Text>
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
                  {isDeleting ? '처리 중...' : '탈퇴'}
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
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 계정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Text style={styles.menuLabel}>계정 정보</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>비밀번호 변경</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 매칭 필터 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>매칭 필터</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleEditGenderFilter}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>원하는 성별</Text>
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
            <Text style={styles.menuLabel}>나이 범위</Text>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>
                {ageRange.min} - {ageRange.max}세
              </Text>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Text style={styles.menuLabel}>국가</Text>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue}>🇰🇷 대한민국</Text>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>푸시 알림</Text>
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
                      Alert.alert('오류', parseApiError(err));
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
          <Text style={styles.sectionTitle}>기타</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleBlockList}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>차단 목록</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePrivacyPolicy}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>개인정보 처리방침</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTermsOfService}
            activeOpacity={0.7}
          >
            <Text style={styles.menuLabel}>이용약관</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>버전 정보</Text>
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
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteText}>회원 탈퇴</Text>
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
    fontSize: 24,
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
    ...typography.body2,
    fontWeight: '600',
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
    ...typography.h3,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoutText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteText: {
    ...typography.body1,
    fontWeight: '600',
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
    ...typography.body1,
    fontWeight: '600',
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
    ...typography.body1,
    fontWeight: '600',
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
    ...typography.body1,
    fontWeight: '600',
    color: colors.white,
  },
});

export default SettingsScreen;
