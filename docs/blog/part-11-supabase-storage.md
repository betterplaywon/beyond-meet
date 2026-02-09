# 영상 데이팅 앱 만들기 #11 - Supabase Storage로 프로필 사진 관리하기

> **이전 글 요약**: Part 10에서 Hugging Face를 사용해 AI 콘텐츠 모더레이션을 구현했다. 5초마다 영상을 캡처해서 분석하고, 부적절한 콘텐츠가 감지되면 경고나 강제 종료 조치를 취하도록 했다.

영상 데이팅 앱을 만들다 보니 사용자 프로필 사진을 저장할 곳이 필요해졌다. AWS S3가 가장 유명하지만, Beta 서비스를 무료로 운영하려다 보니 비용이 걱정됐다. 찾아보니 Supabase에 Storage 기능이 있고, **1GB까지 무료**라는 걸 알게 됐다.

---

## 파일 저장소 선택하기

### 왜 Supabase Storage인가

여러 서비스를 비교해봤다.

- **AWS S3**: 가장 안정적이지만 프리티어가 12개월로 제한되어 있다
- **Cloudinary**: 이미지 최적화 기능이 좋지만 무료 용량이 제한적이다 (25GB/월 전송량)
- **Firebase Storage**: 괜찮지만 이미 Supabase를 DB로 사용 중이라 통합이 자연스럽지 않다

결국 **Supabase Storage**를 선택했다. 이미 PostgreSQL을 Supabase로 사용하고 있어서 관리가 편하고, 무료 티어(1GB 저장소 + 2GB 전송량/월)도 Beta 운영에 충분했다. Public URL이 자동 생성되어 CDN을 통한 빠른 이미지 제공도 가능했다.

---

## Supabase Storage 설정

### Bucket 생성

Supabase Dashboard에서 Storage 섹션으로 가서 `profile-photos` 버킷을 생성했다.

설정은 다음과 같이 했다:
- **Public bucket**: 프로필 사진은 누구나 볼 수 있어야 하므로 public으로 설정
- **File size limit**: 5MB (프로필 사진으로 충분한 크기)
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

### 백엔드 Supabase 클라이언트 설정

```typescript
// backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service Role Key를 사용하여 RLS 우회 (서버 사이드 전용)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabaseStorage = supabaseAdmin.storage;
```

**Service Role Key**를 사용한 이유가 있다. 일반 Anon Key는 RLS(Row Level Security) 정책의 영향을 받는데, 서버 사이드에서는 백엔드가 직접 인증을 검증하므로 RLS를 우회하는 게 더 편리했다. 물론 이 키는 서버에서만 사용해야 한다.

---

## 파일 업로드 구현

### Multer로 파일 받기

파일 업로드를 받기 위해 Multer를 설정했다. 파일을 디스크에 저장하지 않고 메모리에 임시로 보관한 후 바로 Supabase에 업로드하는 방식을 선택했다.

```typescript
// backend/src/middlewares/upload.ts
import multer from 'multer';

// 메모리 스토리지 사용 (디스크에 저장하지 않음)
const storage = multer.memoryStorage();

// 이미지 파일만 허용
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'INVALID_FILE_TYPE', '이미지 파일만 업로드 가능합니다'));
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

메모리 스토리지를 선택한 이유는 디스크 I/O 오버헤드가 없고, Render 같은 서버리스 환경에서는 파일 시스템이 휘발성이라 디스크 저장이 의미 없기 때문이다.

### Storage Service 구현

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
```

파일 경로를 `{userId}/{timestamp}_{fileName}` 형태로 구성했다. 사용자별 폴더로 분리하면 나중에 관리가 편하고, 타임스탬프로 파일명 중복도 방지할 수 있다.

### 이미지 검증 로직

찾아보니 **Magic Number 검증**이 중요하다는 걸 알게 됐다. MIME type만으로는 충분하지 않다. 클라이언트에서 조작할 수 있기 때문이다.

```typescript
// backend/src/utils/image-validator.ts
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

파일의 첫 몇 바이트(Magic Number)를 확인해서 실제 이미지 파일인지 검증한다. 이렇게 하면 확장자만 바꾼 악의적인 파일 업로드를 방지할 수 있다.

---

## React Native에서 이미지 업로드

### react-native-image-picker 설정

모바일에서 갤러리나 카메라로 사진을 선택하기 위해 `react-native-image-picker`를 사용했다.

```bash
npm install react-native-image-picker
cd ios && pod install
```

iOS와 Android 모두 권한 설정이 필요하다. iOS는 `Info.plist`에 `NSPhotoLibraryUsageDescription`과 `NSCameraUsageDescription`을 추가하고, Android는 `AndroidManifest.xml`에 `READ_EXTERNAL_STORAGE`와 `CAMERA` 권한을 추가한다.

### 사진 선택 및 미리보기

프로필 편집 화면에서 사진을 추가/삭제하는 UI를 구현했다.

```typescript
// mobile/src/screens/profile/ProfileEditScreen.tsx
import { launchImageLibrary } from 'react-native-image-picker';

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
    (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
        return;
      }

      const asset = response.assets?.[0];
      if (!asset?.uri) return;

      // 로컬 미리보기로 추가 (아직 서버에 업로드 안 됨)
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
```

핵심은 **isLocal 플래그**다. 서버에 이미 저장된 사진과 로컬에서 선택만 한 사진을 구분해야 한다. 로컬 사진에는 "NEW" 뱃지를 표시해서 사용자에게 아직 저장 전임을 알려준다.

### React Query로 업로드 관리

```typescript
// mobile/src/hooks/useProfile.ts
export const useUploadProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photo: { uri: string; type: string; name: string }) =>
      userApi.uploadProfilePhoto(photo),
    onSuccess: () => {
      // 서버에서 최신 프로필 데이터를 다시 가져옴
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
};
```

React Query의 `useMutation`을 사용하면 업로드 상태 관리가 편하다. 성공하면 자동으로 프로필 쿼리를 무효화해서 최신 데이터를 가져온다.

저장 버튼을 누르면 삭제할 사진과 새로 추가된 사진을 `Promise.all`로 병렬 처리한다. 순차 처리보다 훨씬 빠르다.

---

## 겪었던 문제들

### iOS에서 이미지 업로드 실패

iOS에서 `launchImageLibrary`로 선택한 이미지가 백엔드에 전송되지 않는 문제가 있었다. iOS의 로컬 이미지 URI가 `file://` 프로토콜을 사용하는데, FormData가 제대로 처리하지 못하는 것이었다.

```typescript
const formData = new FormData();
formData.append('photo', {
  uri: Platform.OS === 'ios' ? data.uri.replace('file://', '') : data.uri,
  type: data.type,
  name: data.name,
} as any);
```

iOS에서는 `file://` 프리픽스를 제거해야 업로드가 정상 작동했다.

### Supabase Storage 권한 오류

파일 업로드 시 `"new row violates row-level security policy"` 오류가 발생했다. Public bucket으로 설정했지만 RLS 정책이 활성화되어 있어서 생긴 문제였다.

백엔드에서 Service Role Key를 사용하면 RLS를 우회하지만, 혹시 클라이언트에서 직접 업로드하려면 정책 설정이 필요하다.

### Express body parser 제한

6MB 이미지 업로드 시 `PayloadTooLargeError`가 발생했다. Express의 기본 body parser 제한이 100kb로 설정되어 있어서, Multer 제한(5MB)에 도달하기 전에 Express가 먼저 요청을 거부한 것이었다.

```typescript
// backend/src/server.ts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

Express의 body parser 제한을 10MB로 상향 조정해서 해결했다.

---

## 다음 글 예고

**Part 12: 친구 시스템**

다음 글에서는 친구 추가/삭제, 친구 목록 조회, 친구에게 직접 영상 통화 요청하는 기능을 구현한다.

---

## 마치며

Supabase Storage로 프로필 사진 업로드 기능을 구현하면서 몇 가지 배운 점이 있다.

MIME type만으로는 파일 검증이 부족하다는 걸 알게 됐다. Magic Number로 실제 파일 형식을 확인하는 게 보안상 중요하다.

메모리 스토리지 방식이 서버리스 환경에서는 더 적합했다. 디스크 I/O 없이 바로 클라우드 스토리지로 전송하니 효율적이었다.

로컬 미리보기와 서버 이미지를 구분하는 `isLocal` 플래그 패턴도 유용했다. 사용자 경험을 해치지 않으면서 저장 전 상태를 명확히 표시할 수 있었다.

---

**태그**: `Supabase` `Storage` `파일 업로드` `React Native` `Multer` `이미지 검증`
