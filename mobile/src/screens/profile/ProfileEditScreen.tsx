/**
 * 프로필 편집 화면
 * UI_FLOW.md 3.9 참고
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { RootStackParamList } from '../../@types';
import { Input } from '../../components/common/Input';
import { useMyProfile, useUpdateProfile, useUploadProfilePhoto, useDeleteProfilePhoto } from '../../hooks/useProfile';
import { parseApiError } from '../../services/api';
import { colors, typography, spacing } from '../../styles/theme';

// 사진 타입 정의: 서버에 이미 존재하는 사진 vs 로컬에서 새로 추가된 사진
interface PhotoItem {
  uri: string;
  isLocal: boolean; // true: 로컬 미리보기, false: 서버에 저장된 사진
  type?: string;
  name?: string;
}

type ProfileEditScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProfileEdit'
>;
type ProfileEditScreenRouteProp = RouteProp<RootStackParamList, 'ProfileEdit'>;

interface Props {
  navigation: ProfileEditScreenNavigationProp;
  route: ProfileEditScreenRouteProp;
}

const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { data: user } = useMyProfile();

  // React Query mutation hooks
  const { mutate: updateProfile } = useUpdateProfile();
  const { mutate: uploadPhoto } = useUploadProfilePhoto();
  const { mutate: deletePhoto } = useDeleteProfilePhoto();

  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]); // 삭제할 서버 사진 URL
  const [isSaving, setIsSaving] = useState(false);

  // 사용자 데이터 로드
  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setBio(user.bio || '');
      setInterests(user.interests || []);
      // 서버 사진을 PhotoItem 형태로 변환
      setPhotos(
        (user.profilePhotos || []).map((uri) => ({
          uri,
          isLocal: false,
        }))
      );
    }
  }, [user]);

  const handleAddPhoto = () => {
    if (photos.length >= 3) {
      Alert.alert('알림', '최대 3장까지만 추가할 수 있습니다.');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
          return;
        }

        if (response.errorCode) {
          console.error('ImagePicker Error:', response.errorMessage);
          Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
          return;
        }

        const asset = response.assets?.[0];
        if (!asset?.uri) {
          Alert.alert('오류', '이미지를 가져올 수 없습니다.');
          return;
        }

        // 로컬 미리보기로 추가 (아직 서버에 업로드하지 않음)
        const newPhoto: PhotoItem = {
          uri: asset.uri,
          isLocal: true,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
        };

        setPhotos((prev) => [...prev, newPhoto]);
      },
    );
  };

  const handleRemovePhoto = (photo: PhotoItem, index: number) => {
    if (photo.isLocal) {
      // 로컬 사진: 바로 목록에서 제거
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      // 서버 사진: 삭제 대기 목록에 추가하고 화면에서 제거
      Alert.alert('사진 삭제', '이 사진을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            setPhotosToDelete((prev) => [...prev, photo.uri]);
            setPhotos((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]);
    }
  };

  const handleAddInterest = () => {
    Alert.prompt(
      '관심사 추가',
      '새로운 관심사를 입력하세요',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추가',
          onPress: (text?: string) => {
            if (text && text.trim()) {
              setInterests([...interests, text.trim()]);
            }
          },
        },
      ],
      'plain-text',
    );
  };

  const handleRemoveInterest = (index: number) => {
    const newInterests = [...interests];
    newInterests.splice(index, 1);
    setInterests(newInterests);
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    if (!nickname.trim()) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      // 1. 삭제할 서버 사진들 병렬 처리
      await Promise.all(
        photosToDelete.map(
          (photoUrl) =>
            new Promise<void>((resolve, reject) => {
              deletePhoto(photoUrl, {
                onSuccess: () => resolve(),
                onError: (err) => reject(err),
              });
            })
        )
      );

      // 2. 새로 추가된 로컬 사진들 병렬 업로드
      const localPhotos = photos.filter((p) => p.isLocal);
      await Promise.all(
        localPhotos.map(
          (photo) =>
            new Promise<void>((resolve, reject) => {
              uploadPhoto(
                { uri: photo.uri, type: photo.type!, name: photo.name! },
                {
                  onSuccess: () => resolve(),
                  onError: (err) => reject(err),
                }
              );
            })
        )
      );

      // 3. 프로필 정보 업데이트
      updateProfile(
        {
          userId: user.id,
          data: {
            nickname: nickname.trim(),
            bio: bio.trim(),
            interests,
          },
        },
        {
          onSuccess: () => {
            setIsSaving(false);
            Alert.alert('성공', '프로필이 업데이트되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() },
            ]);
          },
          onError: (err) => {
            setIsSaving(false);
            Alert.alert('오류', parseApiError(err));
          },
        }
      );
    } catch (err) {
      setIsSaving(false);
      Alert.alert('오류', parseApiError(err));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 편집</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.headerButtonText,
                styles.saveButton,
              ]}
            >
              저장
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 프로필 사진 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필 사진</Text>
          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                {photo.isLocal && (
                  <View style={styles.localBadge}>
                    <Text style={styles.localBadgeText}>NEW</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(photo, index)}
                  disabled={isSaving}
                >
                  <Text style={styles.removePhotoIcon}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <TouchableOpacity
                style={[
                  styles.addPhotoButton,
                  isSaving && styles.addPhotoButtonDisabled,
                ]}
                onPress={handleAddPhoto}
                disabled={isSaving}
              >
                <Text style={styles.addPhotoIcon}>+</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.photoHint}>최대 3장까지 추가 가능합니다</Text>
        </View>

        {/* 닉네임 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>닉네임</Text>
          <Input
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임을 입력하세요"
            maxLength={20}
          />
          <Text style={styles.inputHint}>최대 20자</Text>
        </View>

        {/* 자기소개 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자기소개</Text>
          <Input
            value={bio}
            onChangeText={setBio}
            placeholder="자기소개를 입력하세요"
            multiline
            numberOfLines={4}
            maxLength={200}
            style={styles.bioInput}
          />
          <Text style={styles.inputHint}>최대 200자</Text>
        </View>

        {/* 관심사 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>관심사</Text>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <TouchableOpacity
                key={index}
                style={styles.interestTag}
                onPress={() => handleRemoveInterest(index)}
              >
                <Text style={styles.interestText}>#{interest}</Text>
                <Text style={styles.removeInterestIcon}>×</Text>
              </TouchableOpacity>
            ))}
            {interests.length < 10 && (
              <TouchableOpacity
                style={styles.addInterestButton}
                onPress={handleAddInterest}
              >
                <Text style={styles.addInterestText}>+ 추가</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.inputHint}>최대 10개까지 추가 가능합니다</Text>
        </View>

        {/* 기본 정보 (수정 불가) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>생년월일</Text>
            <Text style={styles.infoValue}>1995년 3월 15일</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>성별</Text>
            <Text style={styles.infoValue}>남성</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>국가</Text>
            <Text style={styles.infoValue}>🇰🇷 대한민국</Text>
          </View>
          <Text style={styles.infoHint}>기본 정보는 수정할 수 없습니다</Text>
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
  headerButton: {
    padding: spacing.sm,
    minWidth: 60,
  },
  headerButtonText: {
    ...typography.body1,
    color: colors.textPrimary,
  },
  saveButton: {
    color: colors.primary,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoItem: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.textSecondary + '20',
  },
  localBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  localBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButtonDisabled: {
    opacity: 0.5,
  },
  removePhotoIcon: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textSecondary + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textSecondary + '10',
  },
  addPhotoIcon: {
    fontSize: 40,
    color: colors.textSecondary,
  },
  addPhotoButtonDisabled: {
    opacity: 0.5,
  },
  photoHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  inputHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  interestText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  removeInterestIcon: {
    ...typography.body1,
    color: colors.primary,
    fontWeight: 'bold',
  },
  addInterestButton: {
    backgroundColor: colors.textSecondary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addInterestText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  infoLabel: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body1,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  infoHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export default ProfileEditScreen;
