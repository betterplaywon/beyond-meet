/**
 * 친구 목록 화면
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsFocused } from '@react-navigation/native';
import { User } from '../../@types';
import { Avatar } from '../../components/common/Avatar';
import { useMyProfile } from '../../hooks/useProfile';
import { useFriends } from '../../hooks/useFriends';
import { colors, typography, spacing } from '../../styles/theme';

const FriendsScreen = () => {
  const { data: user } = useMyProfile();
  const isFocused = useIsFocused(); // 현재 탭이 포커스되어 있는지 확인

  // React Query로 친구 목록 조회
  const {
    data: friends = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useFriends(user?.id);

  // 네트워크 에러 등 실제 API 에러 발생 시에만 Alert 표시
  // 친구가 0명인 경우는 정상 응답(빈 배열)이므로 error가 null임
  // 단, 현재 탭이 포커스되어 있을 때만 Alert 표시 (다른 탭에서 에러 발생 방지)
  React.useEffect(() => {
    if (error && isFocused) {
      Alert.alert('오류', '친구 목록을 불러오는데 실패했습니다.');
    }
  }, [error, isFocused]);

  const handleRefresh = () => {
    refetch();
  };

  const handleCallFriend = (friend: User) => {
    // TODO: 친구에게 통화 요청
    console.log('Call friend:', friend.nickname);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>아직 친구가 없어요</Text>
      <Text style={styles.emptyDescription}>
        영상 통화 후 친구를 추가해보세요
      </Text>
    </View>
  );

  const renderFriend = ({ item }: { item: User }) => (
    <View style={styles.friendCard}>
      <Avatar
        source={item.profilePhotos?.[0]}
        name={item.nickname}
        size="medium"
        online={item.onlineStatus === 'ONLINE'}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.nickname}</Text>
        <Text style={styles.friendStatus}>
          {item.onlineStatus === 'ONLINE' ? '🟢 온라인' : '⚪ 오프라인'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleCallFriend(item)}
        disabled={item.onlineStatus !== 'ONLINE'}
        style={[
          styles.callButtonContainer,
          item.onlineStatus !== 'ONLINE' && styles.callButtonDisabled,
        ]}
      >
        <Text style={styles.callButton}>📞</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>친구 목록</Text>
        <Text style={styles.headerSubtitle}>
          {friends.length > 0 ? `${friends.length}명의 친구` : ''}
        </Text>
      </View>

      {/* List */}
      {isLoading && friends.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>친구 목록을 불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={item => item.id}
          renderItem={renderFriend}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  listContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  friendInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  friendName: {
    ...typography.body1,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  friendStatus: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  callButtonContainer: {
    padding: spacing.sm,
  },
  callButton: {
    fontSize: 24,
  },
  callButtonDisabled: {
    opacity: 0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    ...typography.body1,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default FriendsScreen;
