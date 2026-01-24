# Part 11: Supabase Storage로 프로필 사진 업로드 구현

## 1. 파일 저장소 선택

화상 채팅 앱을 만들다 보니 사용자 프로필 사진을 저장할 곳이 필요했다. AWS S3가 가장 유명하지만, 베타 서비스를 무료로 운영하려다 보니 비용이 걱정됐다. 검색해보니 Supabase에 Storage 기능이 있고, **1GB까지 무료**라는 걸 알게 됐다.

### Supabase Storage를 선택한 이유

1. **무료 티어**: 1GB 저장소 + 2GB 전송량/월
2. **PostgreSQL과 통합**: 이미 Supabase를 DB로 사용 중이라 관리가 편함
3. **Public URL 자동 생성**: CDN을 통한 빠른 이미지 제공
4. **Row Level Security (RLS)**: 파일 레벨 접근 제어 가능

검토한 다른 옵션들:
- **AWS S3**: 가장 안정적이지만 프리티어가 12개월로 제한
- **Cloudinary**: 이미지 최적화 기능이 좋지만 무료 용량이 적음 (25GB/월 전송량)
- **Firebase Storage**: 좋지만 Supabase와 통합이 자연스럽지 않음

## 2. Supabase Storage 설정

### 2.1 Bucket 생성

Supabase Dashboard에서 Storage 섹션으로 가서 `profile-photos` 버킷을 생성했다.

설정:
- **Public bucket**: 프로필 사진은 누구나 볼 수 있어야 하므로 public으로 설정
- **File size limit**: 5MB (프로필 사진으로 충분한 크기)
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

### 2.2 백엔드 설정

먼저 Supabase 클라이언트를 설정했다.

```typescript
// backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables.');
}

// Service Role Key를 사용하여 RLS 우회 (서버 사이드 전용)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabaseStorage = supabaseAdmin.storage;
```

**왜 Service Role Key?**
- 일반 Anon Key는 RLS 정책의 영향을 받음
- Service Role Key는 모든 데이터에 접근 가능 (서버 사이드에서만 사용)
- 파일 업로드/삭제 시 인증된 사용자인지 백엔드에서 직접 검증

## 3. 파일 업로드 구현

### 3.1 Multer 설정 (메모리 스토리지)

파일 업로드를 받기 위해 Multer를 설정했다. 파일을 디스크에 저장하지 않고 메모리에 임시로 보관한 후 바로 Supabase에 업로드하는 방식을 선택했다.

```typescript
// backend/src/middlewares/upload.ts
import multer from 'multer';
import { AppError } from './errorHandler';

// 메모리 스토리지 사용 (디스크에 저장하지 않음)
const storage = multer.memoryStorage();

// 이미지 파일만 허용
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'INVALID_FILE_TYPE', '이미지 파일만 업로드 가능합니다 (JPEG, PNG, WebP)'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});
```

**메모리 스토리지를 선택한 이유**:
1. 디스크 I/O 오버헤드 없음
2. 서버 디스크 공간 절약
3. Railway 같은 서버리스 환경에서 파일 시스템이 휘발성이므로 디스크 저장이 의미 없음

### 3.2 Storage Service 구현

Supabase Storage와 상호작용하는 서비스 레이어를 만들었다.

```typescript
// backend/src/services/storage-service.ts
import { supabaseStorage } from '../config/supabase';

const PROFILE_PHOTOS_BUCKET = 'profile-photos';

export const uploadProfilePhoto = async (
  userId: string,
  file: Buffer,
  fileName: string
): Promise<string> => {
  // 파일 경로: userId/timestamp_fileName
  const filePath = `${userId}/${Date.now()}_${fileName}`;

  const { data, error } = await supabaseStorage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(filePath, file, {
      contentType: 'image/jpeg',
      upsert: false, // 같은 이름 파일 덮어쓰기 방지
    });

  if (error) {
    throw new Error(`Failed to upload profile photo: ${error.message}`);
  }

  // Public URL 생성
  const { data: publicUrlData } = supabaseStorage
    .from(PROFILE_PHOTOS_BUCKET)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
};

export const deleteProfilePhoto = async (filePath: string): Promise<void> => {
  const { error } = await supabaseStorage
    .from(PROFILE_PHOTOS_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete profile photo: ${error.message}`);
  }
};
```

**파일 경로 구조**:
- `{userId}/{timestamp}_{fileName}`
- 사용자별 폴더 분리로 관리 편의성 확보
- 타임스탬프로 파일명 중복 방지

### 3.3 User Service에서 사진 관리

User Service에서 Multer로 받은 파일을 Storage Service로 전달하고, DB에 URL을 저장하는 로직을 구현했다.

```typescript
// backend/src/services/user-service.ts
import * as storageService from './storage-service';

export const uploadProfilePhoto = async (userId: string, file: Express.Multer.File) => {
  // 1. 사용자 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhotos: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 2. 최대 6장 제한
  if (user.profilePhotos.length >= 6) {
    throw new AppError(400, 'MAX_PHOTOS_REACHED', '최대 6장의 사진만 업로드할 수 있습니다');
  }

  // 3. 이미지 유효성 검증
  validateImage(file.buffer);

  // 4. Supabase Storage에 업로드
  const photoUrl = await storageService.uploadProfilePhoto(
    userId,
    file.buffer,
    file.originalname
  );

  // 5. DB에 URL 추가
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhotos: [...user.profilePhotos, photoUrl],
    },
    select: {
      id: true,
      profilePhotos: true,
    },
  });

  return {
    photoUrl,
    profilePhotos: updatedUser.profilePhotos,
  };
};
```

찾아봤더니 **이미지 검증**이 중요하다는 걸 알게 됐다. 악의적인 파일 업로드를 방지하기 위해 `image-validator.ts`를 만들었다.

```typescript
// backend/src/utils/image-validator.ts
import { AppError } from '../middlewares/errorHandler';

export const validateImage = (buffer: Buffer): void => {
  // JPEG 시그니처: FF D8 FF
  const jpegSignature = Buffer.from([0xff, 0xd8, 0xff]);
  // PNG 시그니처: 89 50 4E 47
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  const isJpeg = buffer.subarray(0, 3).equals(jpegSignature);
  const isPng = buffer.subarray(0, 4).equals(pngSignature);

  if (!isJpeg && !isPng) {
    throw new AppError(400, 'INVALID_IMAGE_FORMAT', '유효하지 않은 이미지 형식입니다');
  }
};
```

**Magic Number 검증이 필요한 이유**:
- MIME type만으로는 검증 불충분 (클라이언트에서 조작 가능)
- 파일 시그니처(Magic Number)로 실제 파일 형식 확인
- 보안 취약점 방지

### 3.4 Controller와 Route 연결

```typescript
// backend/src/controllers/user-controller.ts
export const uploadProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (!req.file) {
      throw new AppError(400, 'NO_FILE_UPLOADED', '업로드할 파일이 없습니다');
    }

    const result = await userService.uploadProfilePhoto(userId, req.file);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
```

```typescript
// backend/src/routes/user-routes.ts
import { upload } from '../middlewares/upload';

router.post(
  '/me/photos',
  uploadLimiter, // Rate limiting (1시간에 10회)
  upload.single('photo'), // Multer 미들웨어
  userController.uploadProfilePhoto
);
```

## 4. React Native에서 이미지 업로드

### 4.1 react-native-image-picker 설정

모바일에서 갤러리나 카메라로 사진을 선택하기 위해 `react-native-image-picker`를 사용했다.

```bash
npm install react-native-image-picker
cd ios && pod install
```

iOS 권한 설정 (`ios/BeyondMeet/Info.plist`):
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>프로필 사진을 선택하기 위해 갤러리 접근이 필요합니다</string>
<key>NSCameraUsageDescription</key>
<string>프로필 사진을 촬영하기 위해 카메라 접근이 필요합니다</string>
```

Android 권한 설정 (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

### 4.2 ProfileEditScreen 구현

프로필 편집 화면에서 사진을 추가/삭제하는 UI를 만들었다.

```typescript
// mobile/src/screens/profile/ProfileEditScreen.tsx
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { useUploadProfilePhoto, useDeleteProfilePhoto } from '../../hooks/useProfile';

const ProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { mutate: uploadPhoto } = useUploadProfilePhoto();
  const { mutate: deletePhoto } = useDeleteProfilePhoto();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

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
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
          return;
        }

        const asset = response.assets?.[0];
        if (!asset?.uri) return;

        // 로컬 미리보기로 추가
        const newPhoto: PhotoItem = {
          uri: asset.uri,
          isLocal: true,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
        };

        setPhotos((prev) => [...prev, newPhoto]);
      }
    );
  };

  const handleRemovePhoto = (photo: PhotoItem, index: number) => {
    if (photo.isLocal) {
      // 로컬 사진: 바로 목록에서 제거
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      // 서버 사진: 삭제 대기 목록에 추가
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

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // 1. 삭제할 서버 사진들 병렬 처리
      await Promise.all(
        photosToDelete.map((photoUrl) =>
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
        localPhotos.map((photo) =>
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
      updateProfile(/* ... */);
    } catch (err) {
      Alert.alert('오류', parseApiError(err));
    }
  };

  return (
    <ScrollView>
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
            >
              <Text style={styles.removePhotoIcon}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 3 && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
            <Text style={styles.addPhotoIcon}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};
```

**구현 포인트**:
1. **isLocal 플래그**: 서버에 이미 저장된 사진과 로컬 미리보기를 구분
2. **병렬 처리**: `Promise.all`로 삭제/업로드를 동시에 처리하여 속도 향상
3. **NEW 뱃지**: 로컬 사진에 뱃지를 표시하여 사용자에게 아직 저장 전임을 알림

### 4.3 React Query Hook 구현

```typescript
// mobile/src/hooks/useProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadProfilePhotoAPI, deleteProfilePhotoAPI } from '../api/user.api';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useUploadProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { uri: string; type: string; name: string }) => {
      const formData = new FormData();
      formData.append('photo', {
        uri: data.uri,
        type: data.type,
        name: data.name,
      } as any);

      return uploadProfilePhotoAPI(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_PROFILE] });
    },
  });
};

export const useDeleteProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoUrl: string) => deleteProfilePhotoAPI(photoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_PROFILE] });
    },
  });
};
```

**React Query를 사용한 이유**:
- 자동 캐시 무효화 (`invalidateQueries`)
- 업로드 상태 관리 (loading, error)
- 낙관적 업데이트 가능

## 5. 테스트 및 검증

### 5.1 업로드 흐름 테스트

1. **이미지 선택**: iOS 시뮬레이터 갤러리에서 사진 선택
2. **로컬 미리보기**: NEW 뱃지와 함께 화면에 표시됨
3. **저장 버튼 클릭**: 네트워크 요청 시작
4. **Supabase Storage 확인**: Dashboard에서 `profile-photos/userId/timestamp_filename.jpg` 경로에 파일 생성 확인
5. **Public URL 확인**: 브라우저에서 반환된 URL로 이미지 접근 가능

### 5.2 삭제 흐름 테스트

1. **서버 사진 삭제**: 기존 사진의 X 버튼 클릭 → Alert 표시
2. **삭제 확인**: 화면에서 사진 제거 + `photosToDelete` 배열에 추가
3. **저장 버튼 클릭**: Storage와 DB에서 모두 삭제
4. **Supabase Storage 확인**: 파일이 실제로 삭제됨

### 5.3 성능 테스트

- **업로드 시간**: 1MB 이미지 기준 2-3초 (Supabase CDN으로 빠른 전송)
- **병렬 업로드**: 3장 동시 업로드 시 약 5초 (순차 처리 대비 50% 단축)

## 6. 트러블슈팅

### 6.1 iOS에서 이미지 업로드 실패

**문제**: iOS에서 `launchImageLibrary`로 선택한 이미지가 백엔드에 전송되지 않음.

**원인**: iOS의 로컬 이미지 URI가 `file://` 프로토콜을 사용하는데, FormData가 제대로 처리하지 못함.

**해결**:
```typescript
const formData = new FormData();
formData.append('photo', {
  uri: Platform.OS === 'ios' ? data.uri.replace('file://', '') : data.uri,
  type: data.type,
  name: data.name,
} as any);
```

iOS에서는 `file://` 프리픽스를 제거해야 업로드가 정상 작동했다.

### 6.2 Supabase Storage 권한 오류

**문제**: 파일 업로드 시 `"new row violates row-level security policy"` 오류 발생.

**원인**: Public bucket으로 설정했지만 RLS 정책이 활성화되어 있음.

**해결**: Supabase Dashboard에서 Storage → Policies → `profile-photos` 버킷의 INSERT/DELETE 정책 추가:

```sql
-- INSERT policy
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- DELETE policy
CREATE POLICY "Allow users to delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');
```

백엔드에서 Service Role Key를 사용하면 RLS를 우회하지만, 클라이언트에서 직접 업로드하려면 정책이 필요하다.

### 6.3 파일 크기 초과 오류

**문제**: 6MB 이미지 업로드 시 `PayloadTooLargeError` 발생.

**원인**: Express의 기본 body parser 제한은 100kb. Multer 제한은 5MB로 설정했지만 Express가 먼저 요청을 거부함.

**해결**:
```typescript
// backend/src/server.ts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

Express의 body parser 제한을 10MB로 상향 조정하여 해결.

## 7. 정리

Supabase Storage를 사용하여 프로필 사진 업로드 기능을 구현했다. 주요 구현 내용:

1. **Multer + Memory Storage**: 디스크 I/O 없이 메모리에서 바로 Supabase로 전송
2. **Magic Number 검증**: MIME type뿐만 아니라 파일 시그니처로 실제 이미지 검증
3. **React Native Image Picker**: 갤러리/카메라에서 이미지 선택
4. **로컬 미리보기**: 저장 전에 UI에 먼저 표시하여 사용자 경험 향상
5. **병렬 업로드/삭제**: `Promise.all`로 성능 최적화

다음 Part에서는 **친구 시스템 및 즐겨찾기** 기능을 구현해보겠다.
