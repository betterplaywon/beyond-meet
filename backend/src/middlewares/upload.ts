/**
 * 파일 업로드 미들웨어 (Multer)
 */

import multer from 'multer';
import path from 'path';
import { AppError } from './errorHandler';

// 메모리 스토리지 사용 (Supabase에 업로드하므로 디스크에 저장하지 않음)
const storage = multer.memoryStorage();

// 파일 필터 (이미지만 허용)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'INVALID_FILE_TYPE', '이미지 파일만 업로드 가능합니다 (JPEG, PNG, WebP)'));
  }
};

// Multer 설정
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});
