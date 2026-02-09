/**
 * deleteAccount 단위 테스트
 *
 * 테스트 케이스:
 * 1. 정상 탈퇴 (프로필 사진 없음)
 * 2. 정상 탈퇴 (프로필 사진 포함 → Storage 삭제)
 * 3. 사용자 없음 → USER_NOT_FOUND
 * 4. 비밀번호 불일치 → INVALID_PASSWORD
 * 5. 활성 세션이 있어도 강제 종료 후 즉시 탈퇴
 * 6. Storage 삭제 실패해도 탈퇴는 완료
 */

// --- Mock 설정 (import 전에 선언) ---

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  matchSession: {
    updateMany: jest.fn(),
  },
  report: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('../utils/password', () => ({
  comparePassword: jest.fn(),
}));

jest.mock('../utils/jwt', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
}));

jest.mock('../middlewares/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, code: string, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  },
}));

jest.mock('../services/storage-service', () => ({
  deleteMultipleProfilePhotos: jest.fn(),
}));

jest.mock('../services/email-service', () => ({
  isEmailPreVerified: jest.fn(),
  clearEmailPreVerification: jest.fn(),
}));

jest.mock('../utils/user-status', () => ({
  updateUserStatus: jest.fn(),
}));

// --- Import ---

import { deleteAccount } from '../services/auth-service';
import { comparePassword } from '../utils/password';
import { deleteMultipleProfilePhotos } from '../services/storage-service';

const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;
const mockDeletePhotos = deleteMultipleProfilePhotos as jest.MockedFunction<
  typeof deleteMultipleProfilePhotos
>;

// --- 헬퍼 ---

const USER_ID = 'test-user-id';
const PASSWORD = 'correct-password';

const mockUser = (overrides = {}) => ({
  id: USER_ID,
  passwordHash: 'hashed-password',
  profilePhotos: [],
  ...overrides,
});

/** $transaction 내부에서 tx 인자로 mockPrisma를 전달 */
const setupTransaction = () => {
  mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
    return fn(mockPrisma);
  });
};

// --- 테스트 ---

describe('deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupTransaction();
  });

  describe('정상 탈퇴', () => {
    it('프로필 사진 없는 사용자가 정상적으로 탈퇴된다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser());
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.matchSession.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.report.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.delete.mockResolvedValue({});

      await expect(deleteAccount(USER_ID, PASSWORD)).resolves.toBeUndefined();

      // 활성 세션 강제 종료 호출 확인
      expect(mockPrisma.matchSession.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [{ userId1: USER_ID }, { userId2: USER_ID }],
          status: { in: ['PENDING', 'ACTIVE'] },
        },
        data: { status: 'CANCELLED' },
      });

      // Report 익명화 호출 확인
      expect(mockPrisma.report.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.report.updateMany).toHaveBeenCalledWith({
        where: { reporterId: USER_ID },
        data: { reporterId: null },
      });
      expect(mockPrisma.report.updateMany).toHaveBeenCalledWith({
        where: { reportedUserId: USER_ID },
        data: { reportedUserId: null },
      });

      // User 삭제 호출 확인
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: USER_ID },
      });

      // Storage 삭제는 호출되지 않음
      expect(mockDeletePhotos).not.toHaveBeenCalled();
    });

    it('프로필 사진이 있는 사용자 탈퇴 시 Storage에서 사진이 삭제된다', async () => {
      const photos = [
        'https://storage.example.com/profile-photos/test-user-id/1234_photo.jpg',
        'https://storage.example.com/profile-photos/test-user-id/5678_avatar.png',
      ];
      mockPrisma.user.findUnique.mockResolvedValue(mockUser({ profilePhotos: photos }));
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.matchSession.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.report.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.delete.mockResolvedValue({});
      mockDeletePhotos.mockResolvedValue(undefined as any);

      await deleteAccount(USER_ID, PASSWORD);

      expect(mockDeletePhotos).toHaveBeenCalledWith([
        'test-user-id/1234_photo.jpg',
        'test-user-id/5678_avatar.png',
      ]);
    });
  });

  describe('에러 케이스', () => {
    it('존재하지 않는 사용자 → USER_NOT_FOUND (404)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(deleteAccount(USER_ID, PASSWORD)).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    it('비밀번호 불일치 → INVALID_PASSWORD (400)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser());
      mockComparePassword.mockResolvedValue(false);

      await expect(deleteAccount(USER_ID, 'wrong-password')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_PASSWORD',
      });
    });
  });

  describe('활성 세션 강제 종료', () => {
    it('활성 세션이 있어도 강제 CANCELLED 후 즉시 탈퇴 진행', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser());
      mockComparePassword.mockResolvedValue(true);
      // 활성 세션 2건을 강제 종료
      mockPrisma.matchSession.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.report.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.delete.mockResolvedValue({});

      await expect(deleteAccount(USER_ID, PASSWORD)).resolves.toBeUndefined();

      // 세션 강제 종료 확인
      expect(mockPrisma.matchSession.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [{ userId1: USER_ID }, { userId2: USER_ID }],
          status: { in: ['PENDING', 'ACTIVE'] },
        },
        data: { status: 'CANCELLED' },
      });

      // 탈퇴가 정상 진행됨
      expect(mockPrisma.user.delete).toHaveBeenCalled();
    });
  });

  describe('Storage 삭제 실패 허용', () => {
    it('Storage 삭제 실패해도 탈퇴는 정상 완료된다', async () => {
      const photos = ['https://storage.example.com/profile-photos/test-user-id/photo.jpg'];
      mockPrisma.user.findUnique.mockResolvedValue(mockUser({ profilePhotos: photos }));
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.matchSession.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.report.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.delete.mockResolvedValue({});
      mockDeletePhotos.mockRejectedValue(new Error('Storage connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // 에러 없이 완료되어야 함
      await expect(deleteAccount(USER_ID, PASSWORD)).resolves.toBeUndefined();

      // 에러 로그가 출력됨
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DELETE_ACCOUNT] Failed to delete profile photos:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
