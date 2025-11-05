import { supabaseStorage } from '../config/supabase';

/**
 * Supabase Storage 서비스
 * - 프로필 사진, 배경 이미지 등 파일 업로드/삭제
 */
export class StorageService {
  private readonly PROFILE_PHOTOS_BUCKET = 'profile-photos';

  /**
   * 프로필 사진 업로드
   * @param userId - 사용자 ID
   * @param file - 업로드할 파일 (Buffer)
   * @param fileName - 파일명
   * @returns 업로드된 파일의 public URL
   */
  async uploadProfilePhoto(
    userId: string,
    file: Buffer,
    fileName: string
  ): Promise<string> {
    const filePath = `${userId}/${Date.now()}_${fileName}`;

    const { data, error } = await supabaseStorage
      .from(this.PROFILE_PHOTOS_BUCKET)
      .upload(filePath, file, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload profile photo: ${error.message}`);
    }

    // Public URL 생성
    const { data: publicUrlData } = supabaseStorage
      .from(this.PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  /**
   * 프로필 사진 삭제
   * @param filePath - 삭제할 파일 경로
   */
  async deleteProfilePhoto(filePath: string): Promise<void> {
    const { error } = await supabaseStorage
      .from(this.PROFILE_PHOTOS_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete profile photo: ${error.message}`);
    }
  }

  /**
   * 여러 프로필 사진 삭제
   * @param filePaths - 삭제할 파일 경로 배열
   */
  async deleteMultipleProfilePhotos(filePaths: string[]): Promise<void> {
    const { error } = await supabaseStorage
      .from(this.PROFILE_PHOTOS_BUCKET)
      .remove(filePaths);

    if (error) {
      throw new Error(`Failed to delete profile photos: ${error.message}`);
    }
  }

  /**
   * Storage Bucket 생성 (초기 설정용)
   */
  async createBucket(): Promise<void> {
    const { error } = await supabaseStorage.createBucket(
      this.PROFILE_PHOTOS_BUCKET,
      {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }
    );

    if (error && error.message !== 'Bucket already exists') {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }
}

export const storageService = new StorageService();
