import {
  AdminApiResponse,
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
  AdminClientErrorDashboard,
  AdminClientErrorEventDetail,
  AdminClientErrorEventPage,
  AdminNonCanonicalCleanupTrackerEntry,
  AdminNonCanonicalCleanupTrackerRecord,
  AdminGameStatusMismatchBatchResult,
  AdminGameStatusRepairBatchResult,
  AdminMate,
  AdminOffseasonMovement,
  AdminOffseasonMovementPayload,
  AdminPost,
  AdminReport,
  AdminReportPage,
  AdminSeatView,
  AdminStats,
  AdminUser,
  ReleaseDecisionArtifactRecord,
  ReleaseDecisionArtifactSummary,
  ReleaseDecisionDraftResponse,
  ReleaseDecisionEvalCase,
  ReleaseDecisionEvaluateResponse,
  ReleaseDecisionPreset,
} from '../types/admin';
import { getApiErrorMessage } from '../utils/errorUtils';
import { getApiErrorStatus } from './errorStatus';
import {
  privateDelete,
  privateGet,
  privatePatch,
  privatePost,
  privatePut,
} from './privateClient';

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

export interface AdminStadium {
  stadiumId: string;
  stadiumName: string;
  team: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
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

const isStatusError = (error: unknown, status: number): boolean =>
  getApiErrorStatus(error) === status;

const readErrorMessage = (error: unknown, fallback: string): string =>
  getApiErrorMessage(error, fallback);

interface AdminRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const unwrapAdminResponse = <T>(payload: AdminApiResponse<T> | null | undefined, fallback: string): T => {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback);
  }

  return payload.data;
};

/**
 * 관리자 통계 조회
 */
export const fetchAdminStats = async (
  requestOptions: AdminRequestOptions = {},
): Promise<AdminStats> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminStats>>('/admin/stats', requestOptions);
    return unwrapAdminResponse(response, '통계 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '통계 조회 실패'));
  }
};

/**
 * 유저 목록 조회
 */
export const fetchAdminUsers = async (search?: string): Promise<AdminUser[]> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminUser[]>>('/admin/users', {
      params: { search },
    });
    return unwrapAdminResponse(response, '유저 목록 조회 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
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
    const response = await privateDelete<AdminApiResponse<unknown>>(`/admin/users/${userId}`);
    unwrapAdminResponse(response, '유저 삭제 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '유저 삭제 실패'));
  }
};

/**
 * 게시글 목록 조회
 */
export const fetchAdminPosts = async (): Promise<AdminPost[]> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminPost[]>>('/admin/posts');
    return unwrapAdminResponse(response, '게시글 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '게시글 조회 실패'));
  }
};

/**
 * 게시글 삭제
 */
export const deleteAdminPost = async (postId: number): Promise<void> => {
  try {
    const response = await privateDelete<AdminApiResponse<unknown>>(`/admin/posts/${postId}`);
    unwrapAdminResponse(response, '게시글 삭제 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '게시글 삭제 실패'));
  }
};

/**
 * 메이트 목록 조회
 */
export const fetchAdminMates = async (): Promise<AdminMate[]> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminMate[]>>('/admin/mates');
    return unwrapAdminResponse(response, '메이트 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '메이트 조회 실패'));
  }
};

/**
 * 메이트 삭제
 */
export const deleteAdminMate = async (mateId: number): Promise<void> => {
  try {
    const response = await privateDelete<AdminApiResponse<unknown>>(`/admin/mates/${mateId}`);
    unwrapAdminResponse(response, '메이트 삭제 실패');
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
    const response = await privateGet<AdminApiResponse<AdminReportPage>>('/admin/reports', {
      params: query,
    });
    return unwrapAdminResponse(response, '신고 목록 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '신고 목록 조회 실패'));
  }
};

export const fetchAdminReportDetail = async (reportId: number): Promise<AdminReport> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminReport>>(`/admin/reports/${reportId}`);
    return unwrapAdminResponse(response, '신고 상세 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '신고 상세 조회 실패'));
  }
};

export const handleAdminReport = async (
  reportId: number,
  payload: {
    action: 'TAKE_DOWN' | 'REQUIRE_MODIFICATION' | 'WARNING' | 'DISMISS' | 'RESTORE';
    adminMemo?: string;
  },
): Promise<AdminReport> => {
  try {
    const response = await privatePatch<AdminApiResponse<AdminReport>, typeof payload>(
      `/admin/reports/${reportId}`,
      payload,
    );
    return unwrapAdminResponse(response, '신고 처리 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '신고 처리 실패'));
  }
};

export const appealAdminReport = async (reportId: number, appealReason: string): Promise<AdminReport> => {
  try {
    const response = await privatePost<AdminApiResponse<AdminReport>, { appealReason: string }>(
      `/admin/reports/${reportId}/appeal`,
      { appealReason },
    );
    return unwrapAdminResponse(response, '이의제기 등록 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '이의제기 등록 실패'));
  }
};

export const fetchAdminSeatViews = async (params?: {
  moderationStatus?: string;
  stadium?: string;
  aiSuggestedLabel?: string;
  adminLabel?: string;
  ticketVerified?: boolean;
}): Promise<AdminSeatView[]> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminSeatView[]>>('/admin/seat-views', {
      params,
    });
    return unwrapAdminResponse(response, '시야뷰 후보 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '시야뷰 후보 조회 실패'));
  }
};

export const fetchAdminSeatViewDetail = async (seatViewId: number): Promise<AdminSeatView> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminSeatView>>(`/admin/seat-views/${seatViewId}`);
    return unwrapAdminResponse(response, '시야뷰 후보 상세 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '시야뷰 후보 상세 조회 실패'));
  }
};

export const fetchAdminGameStatusMismatches = async (params: {
  startDate: string;
  endDate?: string;
}): Promise<AdminGameStatusMismatchBatchResult> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminGameStatusMismatchBatchResult>>(
      '/admin/games/status-mismatches',
      { params },
    );
    return unwrapAdminResponse(response, '경기 상태 불일치 조회 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, '경기 상태 불일치 조회 실패'));
  }
};

export const repairAdminGameStatusMismatches = async (params: {
  startDate: string;
  endDate?: string;
  dryRun?: boolean;
}): Promise<AdminGameStatusRepairBatchResult> => {
  try {
    const response = await privatePost<AdminApiResponse<AdminGameStatusRepairBatchResult>, Record<string, never>>(
      '/admin/games/repair-status-mismatches',
      {},
      {
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          dryRun: params.dryRun ?? true,
        },
      },
    );
    return unwrapAdminResponse(response, '경기 상태 불일치 복구 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, '경기 상태 불일치 복구 실패'));
  }
};

export const fetchAdminNonCanonicalCleanupTrackers = async (): Promise<AdminNonCanonicalCleanupTrackerEntry[]> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminNonCanonicalCleanupTrackerEntry[]>>(
      '/admin/games/non-canonical-cleanup-trackers',
    );
    return unwrapAdminResponse(response, '비정상 팀 코드 정제 tracker 조회 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, '비정상 팀 코드 정제 tracker 조회 실패'));
  }
};

export const upsertAdminNonCanonicalCleanupTracker = async (params: {
  startDate: string;
  endDate?: string;
  record: AdminNonCanonicalCleanupTrackerRecord;
}): Promise<AdminNonCanonicalCleanupTrackerEntry> => {
  try {
    const response = await privatePut<
      AdminApiResponse<AdminNonCanonicalCleanupTrackerEntry>,
      Omit<AdminNonCanonicalCleanupTrackerRecord, 'updatedAt'>
    >(
      '/admin/games/non-canonical-cleanup-trackers',
      {
        ticketUrl: params.record.ticketUrl,
        assignee: params.record.assignee,
        status: params.record.status,
        note: params.record.note,
        gameIds: params.record.gameIds,
      },
      {
        params: {
          startDate: params.startDate,
          endDate: params.endDate ?? params.startDate,
        },
      },
    );
    return unwrapAdminResponse(response, '비정상 팀 코드 정제 tracker 저장 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, '비정상 팀 코드 정제 tracker 저장 실패'));
  }
};

export const deleteAdminNonCanonicalCleanupTracker = async (params: {
  startDate: string;
  endDate?: string;
}): Promise<void> => {
  try {
    await privateDelete<null>('/admin/games/non-canonical-cleanup-trackers', {
      params: {
        startDate: params.startDate,
        endDate: params.endDate ?? params.startDate,
      },
    });
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, '비정상 팀 코드 정제 tracker 삭제 실패'));
  }
};

export const fetchAdminClientErrorDashboard = async (params?: {
  from?: string;
  to?: string;
}): Promise<AdminClientErrorDashboard> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminClientErrorDashboard>>('/admin/client-errors/dashboard', {
      params,
    });
    return unwrapAdminResponse(response, '클라이언트 에러 대시보드 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '클라이언트 에러 대시보드 조회 실패'));
  }
};

export const fetchAdminClientErrorEvents = async (params?: {
  bucket?: string;
  source?: string;
  statusGroup?: string;
  route?: string;
  fingerprint?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<AdminClientErrorEventPage> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminClientErrorEventPage>>('/admin/client-errors/events', {
      params: {
        ...params,
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    });
    return unwrapAdminResponse(response, '클라이언트 에러 이벤트 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '클라이언트 에러 이벤트 조회 실패'));
  }
};

export const fetchAdminClientErrorEventDetail = async (eventId: string): Promise<AdminClientErrorEventDetail> => {
  try {
    const response = await privateGet<AdminApiResponse<AdminClientErrorEventDetail>>(
      `/admin/client-errors/events/${eventId}`,
    );
    return unwrapAdminResponse(response, '클라이언트 에러 이벤트 상세 조회 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '클라이언트 에러 이벤트 상세 조회 실패'));
  }
};

export const handleAdminSeatView = async (
  seatViewId: number,
  payload: {
    adminLabel: 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';
    moderationStatus: 'APPROVED' | 'REJECTED';
    adminMemo?: string;
  },
): Promise<AdminSeatView> => {
  try {
    const response = await privatePatch<AdminApiResponse<AdminSeatView>, typeof payload>(
      `/admin/seat-views/${seatViewId}`,
      payload,
    );
    return unwrapAdminResponse(response, '시야뷰 후보 처리 실패');
  } catch (error) {
    throw new Error(readErrorMessage(error, '시야뷰 후보 처리 실패'));
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
    const response = await privatePost<AdminApiResponse<RoleChangeResponse>, { reason: string | null }>(
      `/admin/roles/users/${userId}/promote`,
      { reason: reason ?? null },
    );
    return unwrapAdminResponse(response, '역할 승격 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
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
    const response = await privatePost<AdminApiResponse<RoleChangeResponse>, { reason: string | null }>(
      `/admin/roles/users/${userId}/demote`,
      { reason: reason ?? null },
    );
    return unwrapAdminResponse(response, '역할 강등 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
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
    const response = await privatePost<AdminApiResponse<Place>, PlaceFormData>(
      `/admin/stadiums/${stadiumId}/places`,
      data,
    );
    return unwrapAdminResponse(response, '장소 추가 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isStatusError(error, 404)) {
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
    const response = await privatePut<AdminApiResponse<Place>, PlaceFormData>(
      `/admin/stadiums/places/${placeId}`,
      data,
    );
    return unwrapAdminResponse(response, '장소 수정 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isStatusError(error, 404)) {
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
    const response = await privateDelete<AdminApiResponse<unknown>>(`/admin/stadiums/places/${placeId}`);
    unwrapAdminResponse(response, '장소 삭제 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isStatusError(error, 404)) {
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
    const response = await privateGet<AdminApiResponse<AdminOffseasonMovement[]>>('/admin/offseason/movements', {
      params,
    });
    return unwrapAdminResponse(response, '스토브리그 이동 조회 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, '스토브리그 이동 조회 실패'));
  }
};

export const createAdminOffseasonMovement = async (
  payload: AdminOffseasonMovementPayload,
): Promise<AdminOffseasonMovement> => {
  try {
    const response = await privatePost<AdminApiResponse<AdminOffseasonMovement>, AdminOffseasonMovementPayload>(
      '/admin/offseason/movements',
      payload,
    );
    return unwrapAdminResponse(response, '스토브리그 이동 등록 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, '스토브리그 이동 등록 실패'));
  }
};

export const updateAdminOffseasonMovement = async (
  movementId: number,
  payload: AdminOffseasonMovementPayload,
): Promise<AdminOffseasonMovement> => {
  try {
    const response = await privatePut<AdminApiResponse<AdminOffseasonMovement>, AdminOffseasonMovementPayload>(
      `/admin/offseason/movements/${movementId}`,
      payload,
    );
    return unwrapAdminResponse(response, '스토브리그 이동 수정 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isStatusError(error, 404)) {
      throw new Error('스토브리그 이동을 찾을 수 없습니다.');
    }

    throw new Error(readErrorMessage(error, '스토브리그 이동 수정 실패'));
  }
};

export const deleteAdminOffseasonMovement = async (movementId: number): Promise<void> => {
  try {
    const response = await privateDelete<AdminApiResponse<unknown>>(`/admin/offseason/movements/${movementId}`);
    unwrapAdminResponse(response, '스토브리그 이동 삭제 실패');
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }
    if (isStatusError(error, 404)) {
      throw new Error('스토브리그 이동을 찾을 수 없습니다.');
    }

    throw new Error(readErrorMessage(error, '스토브리그 이동 삭제 실패'));
  }
};

export const fetchCoachAutoBriefOpsHealth = async (params?: {
  window?: AdminCoachAutoBriefOpsWindow;
  startDate?: string;
  endDate?: string;
  sampleSize?: number;
}): Promise<AdminCoachAutoBriefOpsHealth> => {
  try {
    return await privateGet<AdminCoachAutoBriefOpsHealth>('/ai/coach/auto-brief/ops/health', {
      params: {
        window: params?.window,
        start_date: params?.startDate,
        end_date: params?.endDate,
        sample_size: params?.sampleSize,
      },
    });
  } catch (error) {
    if (isStatusError(error, 403)) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    throw new Error(readErrorMessage(error, 'Coach auto brief 운영 상태 조회 실패'));
  }
};

export const fetchReleaseDecisionPresets = async (): Promise<ReleaseDecisionPreset[]> => {
  try {
    return await privateGet<ReleaseDecisionPreset[]>('/ai/release-decision/presets');
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
    return await privatePost<ReleaseDecisionDraftResponse, typeof payload>('/ai/release-decision/draft', payload);
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 초안 생성 실패'));
  }
};

export const fetchReleaseDecisionEvalCases = async (): Promise<ReleaseDecisionEvalCase[]> => {
  try {
    return await privateGet<ReleaseDecisionEvalCase[]>('/ai/release-decision/eval-cases');
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 평가 케이스 조회 실패'));
  }
};

export const evaluateReleaseDecisionDraft = async (payload: {
  case_id: string;
  draft: ReleaseDecisionDraftResponse['result']['draft'];
}): Promise<ReleaseDecisionEvaluateResponse> => {
  try {
    return await privatePost<ReleaseDecisionEvaluateResponse, typeof payload>(
      '/ai/release-decision/evaluate',
      payload,
    );
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
    return await privatePost<ReleaseDecisionArtifactSummary, typeof payload>(
      '/ai/release-decision/save',
      payload,
    );
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 아티팩트 저장 실패'));
  }
};

export const fetchReleaseDecisionArtifacts = async (): Promise<ReleaseDecisionArtifactSummary[]> => {
  try {
    return await privateGet<ReleaseDecisionArtifactSummary[]>('/ai/release-decision/artifacts');
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 아티팩트 목록 조회 실패'));
  }
};

export const fetchReleaseDecisionArtifactDetail = async (
  artifactId: string,
): Promise<ReleaseDecisionArtifactRecord> => {
  try {
    return await privateGet<ReleaseDecisionArtifactRecord>(
      `/ai/release-decision/artifacts/${encodeURIComponent(artifactId)}`,
    );
  } catch (error) {
    throw new Error(readErrorMessage(error, 'AI 아티팩트 상세 조회 실패'));
  }
};

export const fetchAdminStadiums = async (): Promise<AdminStadium[]> => {
  try {
    return await privateGet<AdminStadium[]>('/stadiums');
  } catch (error) {
    throw new Error(readErrorMessage(error, '구장 목록을 불러올 수 없습니다.'));
  }
};

export const fetchAdminPlaces = async (stadiumId: string): Promise<Place[]> => {
  try {
    const response = await privateGet<Place[]>(`/stadiums/${stadiumId}/places`);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    throw new Error(readErrorMessage(error, '장소 목록을 불러올 수 없습니다.'));
  }
};
