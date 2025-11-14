/**
 * 설정 화면
 * UI_FLOW.md 3.10 참고
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../@types';
import { useAuthStore } from '../../store/authStore';
import { useMyProfile, useUpdateSettings } from '../../hooks/useProfile';
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
  const { mutate: updateSettings } = useUpdateSettings();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [genderFilter, setGenderFilter] = useState<
    'MALE' | 'FEMALE' | 'ANYONE'
  >('ANYONE');
  const [ageRange, setAgeRange] = useState({ min: 20, max: 30 });

  // 사용자 설정 로드
  useEffect(() => {
    if (user?.preferredGender) {
      setGenderFilter(user.preferredGender);
    }

    if (user?.minAge !== undefined && user?.maxAge !== undefined) {
      setAgeRange({ min: user.minAge, max: user.maxAge });
    }
  }, [user]);

  const handleChangePassword = () => {
    // TODO: 비밀번호 변경 화면으로 이동
    Alert.alert('준비 중', '비밀번호 변경 기능은 추후 구현 예정입니다.');
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
          setGenderFilter(gender);
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
    // TODO: 나이 범위 선택 모달 구현
    Alert.alert('준비 중', '나이 범위 설정 기능은 추후 구현 예정입니다.');
  };

  const handleBlockList = () => {
    // TODO: 차단 목록 화면으로 이동
    Alert.alert('준비 중', '차단 목록 기능은 추후 구현 예정입니다.');
  };

  const handlePrivacyPolicy = () => {
    // TODO: 개인정보 처리방침 웹뷰로 이동
    Alert.alert('준비 중', '개인정보 처리방침은 추후 추가 예정입니다.');
  };

  const handleTermsOfService = () => {
    // TODO: 이용약관 웹뷰로 이동
    Alert.alert('준비 중', '이용약관은 추후 추가 예정입니다.');
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          } catch (err) {
            console.error('Failed to logout:', err);
            // 에러가 발생해도 로그아웃 진행
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
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
            // TODO: 회원 탈퇴 API 호출
            Alert.alert('준비 중', '회원 탈퇴 기능은 추후 구현 예정입니다.');
          },
        },
      ],
    );
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
    <SafeAreaView style={styles.container}>
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
              onValueChange={setPushEnabled}
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
});

export default SettingsScreen;
