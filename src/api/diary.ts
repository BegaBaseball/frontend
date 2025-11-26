import { Game, SaveDiaryRequest, DiaryStatistics, DiaryEntry } from '../types/diary';
import { ErrorData, ServerErrorResponse } from '../types/error';

// const API_BASE = '/api/diary';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * 공통 에러 핸들러
 */
async function handleApiError(
    response: Response,
    openErrorModal: (data: ErrorData) => void,
    defaultMessage: string
): Promise<never> { // 이 함수는 항상 에러를 던지므로 Promise<never> 타입 사용
    let errorData: Partial<ServerErrorResponse> = {};
    
    try {
        // 응답 본문을 JSON으로 읽음 (backend:: GlobalExceptionHandler의 응답 구조)
        errorData = await response.json();
    } catch (e) {
        console.error(`[API Error] Failed to parse JSON response for status ${response.status}`, e);
    }

    // 서버 메시지(errorData.message)가 없으면 기본 메시지를 사용
    const errorMessage = errorData.message || `${defaultMessage} (HTTP ${response.status} 오류)`;

    // 전역 에러 모달 호출
    openErrorModal({
        message: errorMessage,
        statusCode: response.status,
    });

    // 상위 호출자에게 에러를 전파
    throw new Error(errorMessage);
}


/**
 * 특정 날짜의 경기 목록 조회
 */
export async function fetchGames(
    date: string,
    openErrorModal: (data: ErrorData) => void
  ): Promise<Game[]> {
  const response = await fetch(`${API_BASE_URL}/diary/games?date=${date}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    await handleApiError(response, openErrorModal, '경기 정보 불러오기 실패');
  }

  return response.json();
}

export async function fetchDiaries(
  openErrorModal: (data: ErrorData) => void
) : Promise<DiaryEntry[]> {
    const response = await fetch(`${API_BASE_URL}/diary/entries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
  });
  
  if (!response.ok) {
    await handleApiError(response, openErrorModal, '다이어리 목록 불러오기 실패');
  }
  return response.json();
}

/**
 * 다이어리 저장
 */
export async function saveDiary(
    data: SaveDiaryRequest,
    openErrorModal: (data: ErrorData) => void
  ) {
  const response = await fetch(`${API_BASE_URL}/diary/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response, openErrorModal, '다이어리 저장 실패');
  }

  return response.json();
}

/**
 * 다이어리 수정
 */
export async function updateDiary({ id, data }: { id: number; data: SaveDiaryRequest; },
  openErrorModal: (data: ErrorData) => void
) {
  const response = await fetch(`${API_BASE_URL}/diary/${id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response, openErrorModal, '다이어리 수정 실패');
  }

  return response.json();
}

/**
 * 다이어리 삭제
 */
export async function deleteDiary(
    id: number,
    openErrorModal: (data: ErrorData) => void
  ): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/diary/${id}/delete`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    await handleApiError(response, openErrorModal, '다이어리 삭제 실패');
  }
}

/**
 * 다이어리 이미지 업로드
 */
export async function uploadDiaryImages(
  diaryId: number,
  files: File[],
  openErrorModal: (data: ErrorData) => void
): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_BASE_URL}/diary/${diaryId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    await handleApiError(response, openErrorModal, '이미지 업로드 실패');
  }
  const result = await response.json();
  const photos = result.photos || result.data?.photos || [];
  return photos;
}

/**
 * 다이어리 통계 조회
 */
export async function fetchDiaryStatistics(
    openErrorModal: (data: ErrorData) => void
  ): Promise<DiaryStatistics> {
  const response = await fetch(`${API_BASE_URL}/diary/statistics`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    await handleApiError(response, openErrorModal, '통계 조회 실패');
  }

  return response.json();
}