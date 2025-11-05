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
   * PATCH /api/users/me
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
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
   * 프로필 사진 업데이트
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
