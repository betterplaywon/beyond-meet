/**
 * 프로필 화면
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../@types';
import { Avatar } from '../../components/common/Avatar';
import { Button, ListItemButton } from '../../components/common';
import { useMyProfile } from '../../hooks/useProfile';
import { useLogout } from '../../hooks/useAuth';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { data: user } = useMyProfile();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>내 프로필</Text>
          <Button
            title="편집"
            variant="text"
            onPress={() => navigation.navigate('ProfileEdit')}
          />
        </View>

        {/* Profile Info */}
        <View style={styles.profileContainer}>
          <Avatar
            source={user?.profilePhotos?.[0]}
            name={user?.nickname}
            size="xlarge"
          />

          <Text style={styles.nickname}>{user?.nickname}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.tags}>
            {user?.interests?.map((interest, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{interest}</Text>
              </View>
            ))}
          </View>

          {user?.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bio}>{user.bio}</Text>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <ListItemButton
            label="통화 기록"
            leftIcon={<Icon name="phone" size={24} color={colors.textSecondary} />}
            showChevron
            onPress={() => navigation.navigate('CallHistory')}
          />

          <View style={styles.menuDivider} />

          <ListItemButton
            label="설정"
            leftIcon={<Icon name="settings" size={24} color={colors.textSecondary} />}
            showChevron
            onPress={() => navigation.navigate('Settings')}
          />

          <View style={styles.menuDivider} />

          <ListItemButton
            label="도움말"
            leftIcon={<Icon name="help" size={24} color={colors.textSecondary} />}
            showChevron
            onPress={() => {}}
          />
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="로그아웃"
            variant="outline"
            fullWidth
            onPress={handleLogout}
            loading={logoutMutation.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.white,
  },
  nickname: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    backgroundColor: colors.secondary + '20',
    borderRadius: borderRadius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    ...typography.body2,
    color: colors.secondary,
    fontWeight: '600',
  },
  bioContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  bio: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: colors.white,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.textSecondary + '20',
  },
  logoutContainer: {
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
});

export default ProfileScreen;
