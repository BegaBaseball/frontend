import { Game, SaveDiaryRequest, DiaryStatistics } from '../types/diary';
// const API_BASE = '/api/diary';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * 특정 날짜의 경기 목록 조회
 */
export async function fetchGames(date: string): Promise<Game[]> {
  const response = await fetch(`${API_BASE_URL}/diary/games?date=${date}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('경기 정보 불러오기 실패');
  }

  return response.json();
}

export const fetchDiaries = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/diary/entries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * 다이어리 저장
 */
export async function saveDiary(data: SaveDiaryRequest) {
  const response = await fetch(`${API_BASE_URL}/diary/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('다이어리 저장 실패');
  }

  return response.json();
}

/**
 * 다이어리 수정
 */
export async function updateDiary({ id, data }: { id: number; data: SaveDiaryRequest }) {
  const response = await fetch(`${API_BASE_URL}/diary/${id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('다이어리 수정 실패');
  }

  return response.json();
}

/**
 * 다이어리 삭제
 */
export async function deleteDiary(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/diary/${id}/delete`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }), // ✅ Body 추가
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || '다이어리 삭제에 실패했습니다.');
  }
}

/**
 * 다이어리 이미지 업로드
 */
export async function uploadDiaryImages(
  diaryId: number,
  files: File[]
): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
    console.log('📤 업로드 대기:', file.name);
  });

  const response = await fetch(`${API_BASE_URL}/diary/${diaryId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  console.log('📡 이미지 업로드 응답:', response.status);

  if (!response.ok) {
    console.error('❌ 이미지 업로드 실패:', response.statusText);
    throw new Error('이미지 업로드 실패');
  }

  const result = await response.json();
  console.log('🔍 이미지 업로드 서버 응답 JSON 전체:', result);

  const photos = result.photos || result.data?.photos || [];
  console.log('✅ 업로드 완료, 사진 경로:', photos);

  return photos;
}

/**
 * 다이어리 통계 조회
 */
export async function fetchDiaryStatistics(): Promise<DiaryStatistics> {
  const response = await fetch(`${API_BASE_URL}/diary/statistics`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('통계 조회 실패');
  }

  return response.json();
}