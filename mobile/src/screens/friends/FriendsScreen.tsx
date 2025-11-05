/**
 * 친구 목록 화면
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { Avatar } from '../../components/common/Avatar';
import { colors, typography, spacing } from '../../styles/theme';

const FriendsScreen: React.FC = () => {
  // TODO: 실제 친구 목록 데이터 연동
  const friends: any[] = [];

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>아직 친구가 없어요</Text>
      <Text style={styles.emptyDescription}>
        영상 통화 후 친구를 추가해보세요
      </Text>
    </View>
  );

  const renderFriend = ({ item }: { item: any }) => (
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
      <Text style={styles.callButton}>📞</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>친구 목록</Text>
        <Text style={styles.headerSubtitle}>
          {friends.length > 0 ? `${friends.length}명의 친구` : ''}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriend}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
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
  callButton: {
    fontSize: 24,
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
