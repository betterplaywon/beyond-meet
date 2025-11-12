/**
 * 사용자 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user-service';
import { AppError } from '../middlewares/errorHandler';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * 내 프로필 조회
   * GET /api/users/me
   */
  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      }

      const user = await this.userService.getProfile(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 다른 사용자 프로필 조회
   * GET /api/users/:userId
   */
  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;

      if (!requestingUserId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      }

      const user = await this.userService.getUserById(userId, requestingUserId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 업데이트
   * PUT /api/users/:userId
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUserId = req.user?.id;
      const { userId } = req.params;

      if (!authenticatedUserId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      }

      // 보안 검증: 본인의 프로필만 수정 가능
      if (authenticatedUserId !== userId) {
        throw new AppError(403, 'FORBIDDEN', '자신의 프로필만 수정할 수 있습니다');
      }

      const {
        nickname,
        bio,
        interests,
        preferredGender,
        minAge,
        maxAge,
        preferredCountries,
      } = req.body;

      const user = await this.userService.updateProfile(userId, {
        nickname,
        bio,
        interests,
        preferredGender,
        minAge,
        maxAge,
        preferredCountries,
      });

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 사진 업로드
   * POST /api/users/me/photos
   */
  uploadProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      }

      if (!req.file) {
        throw new AppError(400, 'NO_FILE_UPLOADED', '업로드할 파일이 없습니다');
      }

      const result = await this.userService.uploadProfilePhoto(userId, req.file);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 사진 삭제
   * DELETE /api/users/me/photos/:photoUrl
   */
  deleteProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { photoUrl } = req.params;

      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      }

      if (!photoUrl) {
        throw new AppError(400, 'MISSING_PHOTO_URL', '사진 URL이 필요합니다');
      }

      // URL 디코딩 (쿼리 파라미터로 전달된 경우)
      const decodedPhotoUrl = decodeURIComponent(photoUrl);

      await this.userService.deleteProfilePhoto(userId, decodedPhotoUrl);

      res.status(200).json({
        success: true,
        message: '프로필 사진이 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 사진 업데이트 (기존 메서드 유지 - 호환성)
   * POST /api/users/me/photos
   */
  updatePhotos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      }

      const { photoUrls } = req.body;

      if (!Array.isArray(photoUrls)) {
        throw new AppError(400, 'INVALID_INPUT', 'photoUrls는 배열이어야 합니다');
      }

      const user = await this.userService.updateProfilePhotos(userId, photoUrls);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 사용자 통계 조회
   * GET /api/users/me/stats
   */
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
      }

      const stats = await this.userService.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
