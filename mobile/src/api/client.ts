/**
 * API 클라이언트 re-export
 *
 * 기존 apiClient를 사용하던 코드와의 하위 호환성을 위해
 * services/api.ts의 통합 클라이언트를 re-export합니다.
 */

import api from '../services/api';

export const apiClient = api;
export default api;
