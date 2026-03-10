import axios from 'axios';
import {
  AdminUser,
  AdminStats,
  AdminPost,
  AdminMate,
  AdminApiResponse,
  AdminOffseasonMovement,
  AdminOffseasonMovementPayload,
  AdminReport,
  AdminReportPage,
  ReleaseDecisionArtifactRecord,
  ReleaseDecisionArtifactSummary,
  ReleaseDecisionDraftResponse,
  ReleaseDecisionEvaluateResponse,
  ReleaseDecisionEvalCase,
  ReleaseDecisionPreset,
} from '../types/admin';
import api from './axios';

// ─── Stadium / Place Types ───────────────────────────────────────────────────

export interface Place {
  id: number;
  stadiumName: string;
  category: string;
  name: string;
  description?: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  rating?: number;
  openTime?: string;
  closeTime?: string;
}

export interface PlaceFormData {
  name: string;
  category: string;
  description?: string;
  address?: string;
  phone?: string;
  lat: number;
  lng: number;
  rating?: number;
  openTime?: string;
  closeTime?: string;
}

type ApiErrorData = {
  detail?: string;
  message?: string;
};

const isAxiosStatusError = (error: unknown, status: number): boolean =>
  axios.isAxiosError(error) && error.response?.status === status;

const readErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorData | undefined;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail;
      }
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const unwrapAdminResponse = <T>(payload: AdminApiResponse<T> | null | undefined, fallback: string): T => {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback);
  }
  return payload.data;
};

/**
 * 관리자 통계 조회
 */
export const fetchAdminStats = async (): Promise<AdminStats> => {
  try {
    const response = await api.get<AdminApiResponse<AdminStats>>('/admin/stats');
    return unwrapAdminResponse(response.data, '통계 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '통계 조회 실패'));
  }
};

/**
 * 유저 목록 조회
 */
export const fetchAdminUsers = async (search?: string): Promise<AdminUser[]> => {
  try {
    const response = await api.get<AdminApiResponse<AdminUser[]>>('/admin/users', {
      params: { search },
    });
    return unwrapAdminResponse(response.data, '유저 목록 조회 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    throw new Error(readErrorMessage(error, '유저 목록 조회 실패'));
  }
};

/**
 * 유저 삭제
 */
export const deleteAdminUser = async (userId: number): Promise<void> => {
  try {
    const response = await api.delete<AdminApiResponse<unknown>>(`/admin/users/${userId}`);
    unwrapAdminResponse(response.data, '유저 삭제 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '유저 삭제 실패'));
  }
};

/**
 * 게시글 목록 조회
 */
export const fetchAdminPosts = async (): Promise<AdminPost[]> => {
  try {
    const response = await api.get<AdminApiResponse<AdminPost[]>>('/admin/posts');
    return unwrapAdminResponse(response.data, '게시글 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '게시글 조회 실패'));
  }
};

/**
 * 게시글 삭제
 */
export const deleteAdminPost = async (postId: number): Promise<void> => {
  try {
    const response = await api.delete<AdminApiResponse<unknown>>(`/admin/posts/${postId}`);
    unwrapAdminResponse(response.data, '게시글 삭제 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '게시글 삭제 실패'));
  }
};

/**
 * 메이트 목록 조회
 */
export const fetchAdminMates = async (): Promise<AdminMate[]> => {
  try {
    const response = await api.get<AdminApiResponse<AdminMate[]>>('/admin/mates');
    return unwrapAdminResponse(response.data, '메이트 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '메이트 조회 실패'));
  }
};

/**
 * 메이트 삭제
 */
export const deleteAdminMate = async (mateId: number): Promise<void> => {
  try {
    const response = await api.delete<AdminApiResponse<unknown>>(`/admin/mates/${mateId}`);
    unwrapAdminResponse(response.data, '메이트 삭제 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '메이트 삭제 실패'));
  }
};

export const fetchAdminReports = async (params?: {
  status?: string;
  reason?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}): Promise<AdminReportPage> => {
  const query = {
    status: params?.status,
    reason: params?.reason,
    fromDate: params?.fromDate,
    toDate: params?.toDate,
    page: params?.page ?? 0,
    size: params?.size ?? 20,
  };

  try {
    const response = await api.get<AdminApiResponse<AdminReportPage>>('/admin/reports', { params: query });
    return unwrapAdminResponse(response.data, '신고 목록 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '신고 목록 조회 실패'));
  }
};

export const fetchAdminReportDetail = async (reportId: number): Promise<AdminReport> => {
  try {
    const response = await api.get<AdminApiResponse<AdminReport>>(`/admin/reports/${reportId}`);
    return unwrapAdminResponse(response.data, '신고 상세 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '신고 상세 조회 실패'));
  }
};

export const handleAdminReport = async (
  reportId: number,
  payload: { action: 'TAKE_DOWN' | 'REQUIRE_MODIFICATION' | 'WARNING' | 'DISMISS' | 'RESTORE'; adminMemo?: string }
): Promise<AdminReport> => {
  try {
    const response = await api.patch<AdminApiResponse<AdminReport>>(`/admin/reports/${reportId}`, payload);
    return unwrapAdminResponse(response.data, '신고 처리 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '신고 처리 실패'));
  }
};

export const appealAdminReport = async (reportId: number, appealReason: string): Promise<AdminReport> => {
  try {
    const response = await api.post<AdminApiResponse<AdminReport>>(`/admin/reports/${reportId}/appeal`, {
      appealReason,
    });
    return unwrapAdminResponse(response.data, '이의제기 등록 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '이의제기 등록 실패'));
  }
};

// ─── Role Management (SUPER_ADMIN only) ──────────────────────────────────────

export interface RoleChangeResponse {
  userId: number;
  email: string;
  name: string;
  previousRole: string;
  newRole: string;
  changedAt: string;
}

/**
 * 사용자를 ADMIN으로 승격 (SUPER_ADMIN 전용)
 * POST /api/admin/roles/users/{userId}/promote
 */
export const promoteToAdmin = async (userId: number, reason?: string): Promise<RoleChangeResponse> => {
  try {
    const response = await api.post<AdminApiResponse<RoleChangeResponse>>(`/admin/roles/users/${userId}/promote`, {
      reason: reason ?? null,
    });
    return unwrapAdminResponse(response.data, '역할 승격 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('SUPER_ADMIN 권한이 필요합니다.');
    }
    throw new Error(readErrorMessage(error, '역할 승격 실패'));
  }
};

/**
 * ADMIN을 USER로 강등 (SUPER_ADMIN 전용)
 * POST /api/admin/roles/users/{userId}/demote
 */
export const demoteToUser = async (userId: number, reason?: string): Promise<RoleChangeResponse> => {
  try {
    const response = await api.post<AdminApiResponse<RoleChangeResponse>>(`/admin/roles/users/${userId}/demote`, {
      reason: reason ?? null,
    });
    return unwrapAdminResponse(response.data, '역할 강등 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('SUPER_ADMIN 권한이 필요합니다.');
    }
    throw new Error(readErrorMessage(error, '역할 강등 실패'));
  }
};

// ─── Stadium Place Management (ADMIN+) ───────────────────────────────────────

/**
 * 구장에 새 장소 추가
 * POST /api/admin/stadiums/{stadiumId}/places
 */
export const createPlace = async (stadiumId: string, data: PlaceFormData): Promise<Place> => {
  try {
    const response = await api.post<AdminApiResponse<Place>>(`/admin/stadiums/${stadiumId}/places`, data);
    return unwrapAdminResponse(response.data, '장소 추가 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isAxiosStatusError(error, 404)) {
      throw new Error('구장을 찾을 수 없습니다.');
    }
    throw new Error(readErrorMessage(error, '장소 추가 실패'));
  }
};

/**
 * 장소 정보 수정
 * PUT /api/admin/stadiums/places/{placeId}
 */
export const updatePlace = async (placeId: number, data: PlaceFormData): Promise<Place> => {
  try {
    const response = await api.put<AdminApiResponse<Place>>(`/admin/stadiums/places/${placeId}`, data);
    return unwrapAdminResponse(response.data, '장소 수정 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isAxiosStatusError(error, 404)) {
      throw new Error('장소를 찾을 수 없습니다.');
    }
    throw new Error(readErrorMessage(error, '장소 수정 실패'));
  }
};

/**
 * 장소 삭제
 * DELETE /api/admin/stadiums/places/{placeId}
 */
export const deletePlace = async (placeId: number): Promise<void> => {
  try {
    const response = await api.delete<AdminApiResponse<unknown>>(`/admin/stadiums/places/${placeId}`);
    unwrapAdminResponse(response.data, '장소 삭제 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isAxiosStatusError(error, 404)) {
      throw new Error('장소를 찾을 수 없습니다.');
    }
    throw new Error(readErrorMessage(error, '장소 삭제 실패'));
  }
};

export const fetchAdminOffseasonMovements = async (params?: {
  search?: string;
  section?: string;
  teamCode?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AdminOffseasonMovement[]> => {
  try {
    const response = await api.get<AdminApiResponse<AdminOffseasonMovement[]>>('/admin/offseason/movements', {
      params,
    });
    return unwrapAdminResponse(response.data, '스토브리그 이동 조회 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    throw new Error(readErrorMessage(error, '스토브리그 이동 조회 실패'));
  }
};

export const createAdminOffseasonMovement = async (
  payload: AdminOffseasonMovementPayload
): Promise<AdminOffseasonMovement> => {
  try {
    const response = await api.post<AdminApiResponse<AdminOffseasonMovement>>('/admin/offseason/movements', payload);
    return unwrapAdminResponse(response.data, '스토브리그 이동 등록 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    throw new Error(readErrorMessage(error, '스토브리그 이동 등록 실패'));
  }
};

export const updateAdminOffseasonMovement = async (
  movementId: number,
  payload: AdminOffseasonMovementPayload
): Promise<AdminOffseasonMovement> => {
  try {
    const response = await api.put<AdminApiResponse<AdminOffseasonMovement>>(
      `/admin/offseason/movements/${movementId}`,
      payload
    );
    return unwrapAdminResponse(response.data, '스토브리그 이동 수정 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isAxiosStatusError(error, 404)) {
      throw new Error('스토브리그 이동을 찾을 수 없습니다.');
    }
    throw new Error(readErrorMessage(error, '스토브리그 이동 수정 실패'));
  }
};

export const deleteAdminOffseasonMovement = async (movementId: number): Promise<void> => {
  try {
    const response = await api.delete<AdminApiResponse<unknown>>(`/admin/offseason/movements/${movementId}`);
    unwrapAdminResponse(response.data, '스토브리그 이동 삭제 실패');
  } catch (error) {
    if (isAxiosStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isAxiosStatusError(error, 404)) {
      throw new Error('스토브리그 이동을 찾을 수 없습니다.');
    }
    throw new Error(readErrorMessage(error, '스토브리그 이동 삭제 실패'));
  }
};

export const fetchReleaseDecisionPresets = async (): Promise<ReleaseDecisionPreset[]> => {
  try {
    const response = await api.get<ReleaseDecisionPreset[]>('/ai/release-decision/presets');
    return response.data;
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 운영 프리셋 조회 실패'));
  }
};

export const draftReleaseDecision = async (payload: {
  scenario: string;
  task_prompt?: string;
  seed_paths?: string[];
  allowed_roots?: string[];
  model?: string;
  max_tool_rounds?: number;
  max_output_tokens?: number;
}): Promise<ReleaseDecisionDraftResponse> => {
  try {
    const response = await api.post<ReleaseDecisionDraftResponse>('/ai/release-decision/draft', payload);
    return response.data;
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 초안 생성 실패'));
  }
};

export const fetchReleaseDecisionEvalCases = async (): Promise<ReleaseDecisionEvalCase[]> => {
  try {
    const response = await api.get<ReleaseDecisionEvalCase[]>('/ai/release-decision/eval-cases');
    return response.data;
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 평가 케이스 조회 실패'));
  }
};

export const evaluateReleaseDecisionDraft = async (payload: {
  case_id: string;
  draft: ReleaseDecisionDraftResponse['result']['draft'];
}): Promise<ReleaseDecisionEvaluateResponse> => {
  try {
    const response = await api.post<ReleaseDecisionEvaluateResponse>('/ai/release-decision/evaluate', payload);
    return response.data;
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 평가 실행 실패'));
  }
};

export const saveReleaseDecisionArtifact = async (payload: {
  scenario: string;
  task_prompt?: string;
  seed_paths: string[];
  allowed_roots: string[];
  draft_response: ReleaseDecisionDraftResponse['result'];
  markdown: string;
  evaluation?: ReleaseDecisionEvaluateResponse | null;
}): Promise<ReleaseDecisionArtifactSummary> => {
  try {
    const response = await api.post<ReleaseDecisionArtifactSummary>('/ai/release-decision/save', payload);
    return response.data;
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 아티팩트 저장 실패'));
  }
};

export const fetchReleaseDecisionArtifacts = async (): Promise<ReleaseDecisionArtifactSummary[]> => {
  try {
    const response = await api.get<ReleaseDecisionArtifactSummary[]>('/ai/release-decision/artifacts');
    return response.data;
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 아티팩트 목록 조회 실패'));
  }
};

export const fetchReleaseDecisionArtifactDetail = async (
  artifactId: string
): Promise<ReleaseDecisionArtifactRecord> => {
  try {
    const response = await api.get<ReleaseDecisionArtifactRecord>(
      `/ai/release-decision/artifacts/${encodeURIComponent(artifactId)}`
    );
    return response.data;
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 아티팩트 상세 조회 실패'));
  }
};
