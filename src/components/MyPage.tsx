import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Save, User, Edit, BarChart3, ChevronLeft, ChevronRight, X, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import ChatBot from './ChatBot';
import TeamRecommendationTest from './TeamRecommendationTest';
import TeamLogo from './TeamLogo';
import Navbar from './Navbar';
import worstEmoji from 'figma:asset/7642c88659d68a93b809e39f4c56d9c284123115.png';
import fullEmoji from 'figma:asset/691ca553a888de6b3262d9c3c63d03f37db27b4a.png';
import bestEmoji from 'figma:asset/19b0bb1cde805dc5d6e6af053a4bd1622a1a4fad.png';
import angryEmoji from 'figma:asset/01cb53a9197c5457e6d7dd7460bdf1cd27b5440b.png';
import happyEmoji from 'figma:asset/e2bd5a0f58df48e435d03f049811638d849de606.png';
import { useDiaryStore } from '../store/diaryStore';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';
import { uploadPostImages, uploadProfileImage, supabaseClient } from '../api/images'; 

const API_URL = 'http://localhost:8080/api/auth/mypage';
const DEFAULT_PROFILE_IMAGE = 'https://placehold.co/100x100/374151/ffffff?text=User';


const showCustomAlert = (message: string) => {

    console.log('ALERT:', message);

    const alertBox = document.getElementById('custom-alert-box');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.classList.remove('hidden', 'opacity-0');
        alertBox.classList.add('opacity-100');
        setTimeout(() => {
            alertBox.classList.remove('opacity-100');
            alertBox.classList.add('opacity-0');
            setTimeout(() => {
                alertBox.classList.add('hidden');
            }, 500); // Transition duration
        }, 3000);
    }
};

const TEAM_DATA: { [key: string]: { name: string, color: string } } = {
    // DB 약어(Key) : { 표시명(name), 색상(color) }
    '없음': { name: '없음', color: '#9ca3af' },
    'LG': { name: 'LG 트윈스', color: '#C30452' },
    'OB': { name: '두산 베어스', color: '#131230' },
    'SK': { name: 'SSG 랜더스', color: '#CE0E2D' },
    'KT': { name: 'KT 위즈', color: '#000000' },
    'WO': { name: '키움 히어로즈', color: '#570514' }, // 키움 히어로즈 약어 확인 필요
    'NC': { name: 'NC 다이노스', color: '#315288' },
    'SS': { name: '삼성 라이온즈', color: '#074CA1' },
    'LT': { name: '롯데 자이언츠', color: '#041E42' },
    'HT': { name: '기아 타이거즈', color: '#EA0029' },
    'HH': { name: '한화 이글스', color: '#FF6600' },
};

// 가입일 형식 변환 유틸리티 함수
const formatDate = (dateString: string | null): string => {
    if (!dateString) return '정보 없음';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '유효하지 않은 날짜';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}년 ${month}월 ${day}일`;
    } catch (e) {
        console.error("날짜 형식 변환 오류:", e);
        return '날짜 오류';
    }
};
type ViewMode = 'diary' | 'stats' | 'editProfile';

export default function MyPage() {
    const navigateToLogin = useNavigationStore((state) => state.navigateToLogin);
    const setCurrentView = useNavigationStore((state) => state.setCurrentView);
    const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);
    const [newProfileImageFile, setNewProfileImageFile] = useState<File | null>(null); 
    const [name, setName] = useState('로딩 중...');
    const [email, setEmail] = useState('loading@...');
    const [savedFavoriteTeam, setSavedFavoriteTeam] = useState('없음');
    const [editingFavoriteTeam, setEditingFavoriteTeam] = useState('없음');
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTeamTest, setShowTeamTest] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('diary');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [isEditMode, setIsEditMode] = useState(false);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);


    const { diaryEntries, addDiaryEntry, updateDiaryEntry } = useDiaryStore();

    const emojiStats = [
        { name: '최악', emoji: worstEmoji, count: 0 },
        { name: '배부름', emoji: fullEmoji, count: 0 },
        { name: '최고', emoji: bestEmoji, count: 0 },
        { name: '분노', emoji: angryEmoji, count: 0 },
        { name: '즐거움', emoji: happyEmoji, count: 0 }
    ];

    const totalCount = emojiStats.reduce((sum, item) => sum + item.count, 0);

    // 서버에서 프로필 정보 가져오기 (GET)
    const fetchUserProfile = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const MAX_RETRIES = 1;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const response = await fetch(API_URL, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                    });

                    if (response.ok) {
                        const apiResponse = await response.json();

                        if (apiResponse.data) {
                            const profileDto = apiResponse.data;
                            const initialTeamId = profileDto.favoriteTeam || '없음';

                            // DTO 필드를 사용하여 상태 업데이트
                            setName(profileDto.name || '알 수 없음');
                            setEmail(profileDto.email || '알 수 없음');
                            setSavedFavoriteTeam(initialTeamId);
                            setEditingFavoriteTeam(initialTeamId);
                            setCreatedAt(profileDto.createdAt || null);
                            setProfileImage(profileDto.profileImageUrl || DEFAULT_PROFILE_IMAGE);
                            setLoading(false);
                            return; // 성공적으로 데이터 로드
                        } else {
                            // apiResponse.data가 없는 경우 (데이터 로드 실패)
                            showCustomAlert(apiResponse.message || '프로필 데이터를 찾을 수 없습니다.');
                            throw new Error('API Data Missing Error');
                        }
                    }

                    if (response.status === 401) {
                        // 서버로부터 401 응답을 받으면 토큰을 지우고 로그인 페이지로 이동
                        alert('로그인 후 이용해주세요')
                        showCustomAlert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
                        navigateToLogin();
                        return;
                    }

                    if (attempt < MAX_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    } else {
                        // API 서버가 작동하지 않을 경우를 대비하여 더미데이터를 설정합니다.
                        if (response.status === 404 || response.status === 500) {
                            setName('홍길동');
                            setEmail('hong.gildong@kbo.com');
                            setSavedFavoriteTeam('LG'); // 더미 데이터
                            setEditingFavoriteTeam('LG'); // 더미 데이터
                            setCreatedAt('2023-08-15T10:00:00Z');
                            setProfileImage(DEFAULT_PROFILE_IMAGE);
                            showCustomAlert(`[Mock Data] 서버 응답 오류(${response.status}). 기본 데이터로 표시합니다.`);
                            return;
                        }
                        throw new Error(`Failed to fetch profile after ${MAX_RETRIES} attempts: ${response.statusText}`);
                    }

                } catch (innerError) {
                    if (attempt < MAX_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    } else {
                        throw innerError;
                    }
                }
            }

        } catch (err) {
            console.error('프로필 로딩 오류:', err);
            setError('프로필 정보를 불러오는 데 실패했습니다. 서버 상태를 확인하세요.');
            // 데이터 로딩 실패 시 더미 데이터로 대체
            setName('사용자');
            setEmail('user@example.com');
            setSavedFavoriteTeam('LG'); // 더미 데이터
            setEditingFavoriteTeam('LG'); // 더미 데이터
            setCreatedAt('2023-01-01T00:00:00Z');
            setProfileImage('https://placehold.co/100x100/374151/ffffff?text=User');
            showCustomAlert('프로필 로딩 중 통신 오류 발생. Mock 데이터로 대체합니다.');
        } finally {
            setLoading(false);
        }
    }, [navigateToLogin]);

    useEffect(() => {
        // profileImage 상태가 blob: URL로 시작하는 경우
        if (profileImage.startsWith('blob:')) {
            return () => {
                URL.revokeObjectURL(profileImage);
                console.log(`[Cleanup] Revoked blob URL: ${profileImage}`);
            };
        }
    }, [profileImage]);

    useEffect(() => {
        fetchUserProfile();
        return () => {
        };
    }, [fetchUserProfile]);


    // 프로필 이미지 로컬 업로드 미리보기
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // 1. File 객체를 상태에 저장 (handleSave에서 사용)
            setNewProfileImageFile(file); 

            // 2. 로컬 미리보기용 URL 생성 및 상태에 저장
            // 이전 blob URL이 있다면 해제 (이전 상태가 blob인 경우만 안전하게 해제)
            if (profileImage.startsWith('blob:')) {
                URL.revokeObjectURL(profileImage);
            }
            const imageUrl = URL.createObjectURL(file);
            setProfileImage(imageUrl);
            
            showCustomAlert('이미지 미리보기 적용됨. 저장을 눌러 서버에 반영하세요.');
        }
    }

    function getJwtFromCookie(): string | null {
    // 1. document.cookie 문자열을 가져옵니다.
    const cookies = document.cookie;
    
    // 2. Authorization=...; 형태의 쿠키를 찾습니다.
    const match = cookies.match(/Authorization=([^;]+)/);

    if (match && match[1]) {
        let token = match[1];
        
        // 1. URL 디코딩 수행 (가장 흔한 문제)
        token = decodeURIComponent(token); 
        
        // 2. 'Bearer ' 접두사가 있다면 제거
        if (token.startsWith('Bearer ')) {
            token = token.substring(7); // 'Bearer ' 7글자 제거
        }
        
        // 3. 토큰이 비어있는지 다시 확인
        if (token.length > 0) {
            return token;
        }
    }
    return null;
}

    // 3. 프로필 정보 저장 (PUT)
    const handleSave = async () => {
    setLoading(true);
    setError(null);

    // 닉네임 유효성 검사 (기존 로직)
    if (!name.trim()) {
        showCustomAlert('이름(닉네임)은 필수로 입력해야 합니다.');
        setLoading(false);
        return;
    }

    // 🚨 절대 URL을 위한 백엔드 호스트 추출
    const BACKEND_HOST = API_URL.split('/api')[0]; // 예: 'http://localhost:8080'
    let finalImageUrl: string | undefined = undefined;

    // 1. 프로필 이미지가 새로 업로드되는 경우에만 토큰 획득 및 Supabase 인증 과정 필요
    if (newProfileImageFile) {
        try {
            // 🚨🚨🚨 CRITICAL FIX: 프록시 우회를 위한 절대 경로 사용 🚨🚨🚨
            const tokenResponse = await fetch(`${BACKEND_HOST}/api/auth/supabasetoken`, {
                method: 'GET',
                credentials: 'include' // HttpOnly 쿠키가 localhost:3000 -> localhost:8080으로 전송됨 (CORS 필요)
            });

            // 401 Unauthorized 등 오류 처리
            if (!tokenResponse.ok) {
                if (tokenResponse.status === 401) {
                    throw new Error('인증 정보 만료');
                }
                throw new Error(`토큰 획득 실패: HTTP ${tokenResponse.status}`);
            }
            
            // 2. 응답 텍스트를 먼저 읽어 JSON 파싱 오류 및 응답 본문 누락 방지
            const responseText = await tokenResponse.text();
            
            if (!responseText || responseText.length === 0) {
                 throw new Error('Supabase 토큰을 받지 못했습니다. (응답 본문 없음)');
            }

            // 3. 텍스트를 JSON으로 변환하고 토큰 추출
            const apiResponse = JSON.parse(responseText); 
            const supabaseJwt = apiResponse.data?.token; // 🚨 최종 확인된 올바른 접근 경로

            if (!supabaseJwt) {
                console.error("서버 응답 데이터 구조 오류:", apiResponse); 
                throw new Error('Supabase 토큰을 받지 못했습니다. (데이터 구조 문제)');
            }

            // 4. 획득한 JWT를 Supabase SDK에 설정 (RLS 우회)
            await supabaseClient.auth.setSession({ access_token: supabaseJwt, refresh_token: 'dummy' });
            console.log('✅ Supabase SDK 세션 설정 완료. 업로드 시작.');


            // 5. Supabase Storage 업로드 함수 호출
            const uploadedUrls = await uploadProfileImage(email, newProfileImageFile);

            if (uploadedUrls && uploadedUrls.length > 0) {
                finalImageUrl = uploadedUrls[0];
                console.log("Supabase 업로드 성공, URL:", finalImageUrl);
            }
        
        } catch (uploadError) {
            // 토큰 획득 오류나 이미지 업로드 오류 처리
            console.error('이미지 업로드 및 토큰 설정 오류:', uploadError);
            if (uploadError instanceof Error && uploadError.message === '인증 정보 만료') {
                showCustomAlert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
                navigateToLogin();
            } else {
                showCustomAlert('이미지 업로드에 실패했습니다. (Supabase 오류)');
            }
            setLoading(false);
            return;
        }
    }

        // 요청 본문(Body)의 키를 'name'으로 사용하고 favoriteTeam을 포함
        const updatedProfile: {
            name: string;
            favoriteTeam: string | null;
            email: string;
            profileImageUrl?: string; // ⬅️ URL 필드
        } = {
            name: name.trim(),
            favoriteTeam: editingFavoriteTeam === '없음' ? null : editingFavoriteTeam,
            email: email,
        };

        if (finalImageUrl) {
            updatedProfile.profileImageUrl = finalImageUrl; 
        } else if (newProfileImageFile === null && profileImage !== DEFAULT_PROFILE_IMAGE) {
            // 이미지를 변경하지 않았으나 기존에 유효한 URL이 있다면 그 URL을 다시 보냄
            updatedProfile.profileImageUrl = profileImage; 
        } else if (newProfileImageFile === null && profileImage === DEFAULT_PROFILE_IMAGE) {
            // 프로필 사진을 디폴트로 유지
            // (이 경우 필드 자체를 생략하거나 null을 보내는 것이 백엔드에 따라 다름. 여기서는 생략)
        }

        try {
            const response = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(updatedProfile),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    showCustomAlert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
                    navigateToLogin();
                    return;
                }
                throw new Error(`Failed to save profile: ${response.statusText}`);
            }

            const apiResponse = await response.json();
            if (apiResponse.success) {
                // 새로운 JWT 토큰 처리
                const newToken = apiResponse.data.token;
                if (newToken) {
                    // 백엔드에서 받은 새 토큰을 localStorage의 기존 토큰과 교체
                    localStorage.setItem('authToken', newToken);
                }

                // 상태 업데이트: 업데이트된 프로필 정보로 UI 상태를 갱신
                const updatedProfileData = apiResponse.data;
                setName(updatedProfileData.name);
                setSavedFavoriteTeam(editingFavoriteTeam);
                if (finalImageUrl) {
                setProfileImage(finalImageUrl);
            } else if (updatedProfileData.profileImageUrl) {
                setProfileImage(updatedProfileData.profileImageUrl);
            }
            
            setNewProfileImageFile(null);


                // 성공 알림
                showCustomAlert(apiResponse.message || '프로필이 성공적으로 저장되었습니다!');
                alert('변경사항이 적용되었습니다.')
                setViewMode('diary');
                console.log('프로필 저장 성공. 알림 표시 및 뷰 전환 실행 완료.');

                return;
            } else {
                showCustomAlert(apiResponse.message || '프로필 저장에 실패했습니다. (API 응답 실패)');
                return; // catch 블록 진입 방지
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';

            // 실제 오류(통신 오류, HTTP 4xx/5xx 등)만 처리
            console.error('프로필 저장 오류:', err);
            setError('프로필 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
            showCustomAlert(`프로필 저장 중 오류 발생: ${errorMessage}`); // 이 부분이 실제 오류를 띄웁니다.
        } finally {
            setLoading(false);
        }
    }


    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };
    // ====================================================================================
    // 선택된 날짜의 다이어리 엔트리 찾기
    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const selectedDiary = diaryEntries.find(e => e.date === selectedDateStr);

    // 다이어리 폼 상태
    const [diaryForm, setDiaryForm] = useState({
        type: 'attended' as 'attended' | 'scheduled',
        emoji: happyEmoji,
        emojiName: '즐거움',
        gameId: '',
        memo: '',
        photos: [] as string[]
    });

    // 선택된 날짜의 경기 목록
    const [availableGames, setAvailableGames] = useState<any[]>([]);

    const TEAMS = [
        'KIA',
        'LG',
        'NC',
        'SSG',
        '두산',
        'KT',
        '롯데',
        '삼성',
        '한화',
        '키움'
    ];

    // 날짜 선택 시 해당 다이어리 로드 및 경기 정보 불러오기
    const handleDateSelect = async (date: Date) => {
        setSelectedDate(date);
        setIsEditMode(false); // 날짜 변경 시 편집 모드 해제
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const entry = diaryEntries.find(e => e.date === dateStr);

        // 해당 날짜의 경기 정보 불러오기
        try {
            const response = await fetch(`/api/diary/games?date=${dateStr}`);
            if (response.ok) {
                const games = await response.json();
                setAvailableGames(games);
            } else {
                setAvailableGames([]);
            }
        } catch (error) {
            console.error('경기 정보 불러오기 실패:', error);
            setAvailableGames([]);
        }

        if (entry) {
            setDiaryForm({
                type: entry.type || 'attended',
                emoji: entry.emoji,
                emojiName: entry.emojiName,
                gameId: entry.gameId || '',
                memo: entry.memo || '',
                photos: entry.photos || []
            });
        } else {
            // 새 다이어리
            setIsEditMode(true); // 새 다이어리는 바로 편집 모드
            setDiaryForm({
                type: 'attended',
                emoji: happyEmoji,
                emojiName: '즐거움',
                gameId: '',
                memo: '',
                photos: []
            });
        }
    };

    useEffect(() => {
        // selectedDate가 변경될 때마다 폼 업데이트
        handleDateSelect(selectedDate);
    }, [selectedDate]);

    const handleSaveDiary = () => {
        const entry = {
            date: selectedDateStr,
            type: 'attended' as const,
            ...diaryForm
        };

        if (selectedDiary) {
            updateDiaryEntry(selectedDateStr, entry as any);
        } else {
            addDiaryEntry(entry as any);
        }
        alert('다이어리가 저장되었습니다!');
        setIsEditMode(false); // 저장 후 편집 모드 해제
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
            setDiaryForm({ ...diaryForm, photos: [...diaryForm.photos, ...newPhotos] });
        }
    };

    const removePhoto = (index: number) => {
        const updatedPhotos = diaryForm.photos.filter((_, i) => i !== index);
        setDiaryForm({ ...diaryForm, photos: updatedPhotos });
    };

    return (
        <div className="min-h-screen bg-white">
            <Navbar currentPage="mypage" />

            <div id="custom-alert-box" className="hidden opacity-0 transition-opacity duration-500 fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded-md shadow-lg"></div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 상단 회원 정보 섹션 */}
                <Card className="p-8 mb-8">
                    <div className="flex items-start justify-between">
                        {/* 프로필 정보 */}
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                                    {profileImage ? (
                                        <img src={profileImage.startsWith('blob:') ? profileImage : `${profileImage}?t=${Date.now()}`} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 style={{ color: '#2d5f4f' }}>{name}</h2>
                                    <div className="flex items-center gap-2">
                                        {savedFavoriteTeam !== '없음' && (
                                            <div className="w-6 h-6">
                                                <TeamLogo team={savedFavoriteTeam} size="sm" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-gray-600 mb-1">{name}</p>
                                <p className="text-sm text-gray-500">{email}</p>
                            </div>
                        </div>

                        {/* 버튼들 */}
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => setViewMode('editProfile')}
                                className="flex items-center gap-2 bg-white border-2 hover:bg-gray-50"
                                style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                            >
                                <Edit className="w-4 h-4" />
                                내 정보 수정
                            </Button>
                            <Button
                                onClick={() => setViewMode(viewMode === 'stats' ? 'diary' : 'stats')}
                                className="flex items-center gap-2 text-white"
                                style={{ backgroundColor: '#2d5f4f' }}
                            >
                                <BarChart3 className="w-4 h-4" />
                                {viewMode === 'stats' ? '다이어리 보기' : '통계 보기'}
                            </Button>
                        </div>
                    </div>

                    {/* 간단한 통계 정보 */}
                    <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
                        <div className="text-center">
                            <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                {totalCount}
                            </div>
                            <div className="text-sm text-gray-600">직관 횟수</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                12
                            </div>
                            <div className="text-sm text-gray-600">응원글</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                60%
                            </div>
                            <div className="text-sm text-gray-600">승률</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                3
                            </div>
                            <div className="text-sm text-gray-600">메이트 참여</div>
                        </div>
                    </div>
                </Card>

                {/* 내 정보 수정 뷰 */}
                {viewMode === 'editProfile' && (
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 style={{ color: '#2d5f4f' }}>내 정보 수정</h2>
                        </div>

                        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden">
                                    {profileImage ? (
                                        <img src={profileImage.startsWith('blob:') ? profileImage : `${profileImage}?t=${Date.now()}`} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-16 h-16 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md"
                                    style={{ borderColor: '#2d5f4f' }}
                                >
                                    <Camera className="w-5 h-5" style={{ color: '#2d5f4f' }} />
                                    <input type="file" accept="image/*" onChange={handleImageUpload as any} className="hidden" />
                                </label>
                            </div>
                            <div>
                                <h3 style={{ color: '#2d5f4f' }}>{name}</h3>
                                <p className="text-gray-600 mt-1">{email}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-700">이름 *</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="이름을 입력하세요" />
                            </div>
                            {/* <div className="space-y-2">
                                <Label htmlFor="nickname" className="text-gray-700">닉네임 *</Label>
                                <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full" placeholder="닉네임을 입력하세요" />
                            </div> */}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700">이메일 *</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" placeholder="이메일을 입력하세요" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="team" className="text-gray-700">응원구단 *</Label>
                                <Select value={editingFavoriteTeam} onValueChange={setEditingFavoriteTeam}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="응원하는 팀을 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(TEAM_DATA).map(teamId => (
                                            <SelectItem key={teamId} value={teamId}>
                                                <div className="flex items-center gap-2">
                                                    {teamId !== '없음' && <div className="w-6 h-6"><TeamLogo team={teamId} size="sm" /></div>}
                                                    {teamId === '없음' && <div className="w-6 h-6 rounded-full" style={{ backgroundColor: TEAM_DATA[teamId] ? TEAM_DATA[teamId].color : TEAM_DATA['없음'].color }} />}
                                                    {TEAM_DATA[teamId].name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-sm text-gray-500">응원구단은 응원게시판에서 사용됩니다</p>
                                    <Button variant="ghost" onClick={() => setShowTeamTest(true)} className="text-sm flex items-center h-auto py-1 px-2 hover:bg-green-50" style={{ color: '#2d5f4f' }}>
                                        구단 테스트 해보기
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                            <Button variant="outline" className="flex-1" onClick={() => setViewMode('diary')}>취소</Button>
                            <Button onClick={handleSave} className="flex-1 text-white flex items-center justify-center gap-2" style={{ backgroundColor: '#2d5f4f' }}>
                                <Save className="w-5 h-5" />
                                저장하기
                            </Button>
                        </div>
                    </div>
                )}

                {/* 통계 보기 뷰 */}
                {viewMode === 'stats' && (
                    <div className="space-y-8">
                        {/* 월간 통계 */}
                        <Card className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <TrendingUp className="w-7 h-7" style={{ color: '#2d5f4f' }} />
                                <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>월간 기분 통계</h2>
                            </div>

                            <div className="flex items-center justify-around mb-6">
                                {emojiStats.map((item, index) => (
                                    <div key={index} className="text-center">
                                        <img src={item.emoji} alt={item.name} className="w-20 h-20 mx-auto mb-2 object-contain" />
                                        <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                            {item.count}
                                        </div>
                                        <div className="text-sm text-gray-600">{item.name}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-6 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">총 직관 횟수</span>
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontWeight: 900, fontSize: '20px', color: '#2d5f4f' }}>
                                            {totalCount}회
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">응원팀 승률</span>
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                                            60% (3승 2패)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* 연간 통계 */}
                        <Card className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <BarChart3 className="w-7 h-7" style={{ color: '#2d5f4f' }} />
                                <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>연간 직관 통계</h2>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-6">
                                <div className="bg-green-50 p-6 rounded-xl text-center">
                                    <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                        24
                                    </div>
                                    <div className="text-sm text-gray-600">총 직관 횟수</div>
                                </div>
                                <div className="bg-green-50 p-6 rounded-xl text-center">
                                    <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                        15승
                                    </div>
                                    <div className="text-sm text-gray-600">응원팀 승리</div>
                                </div>
                                <div className="bg-green-50 p-6 rounded-xl text-center">
                                    <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                        62.5%
                                    </div>
                                    <div className="text-sm text-gray-600">연간 승률</div>
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">가장 많이 간 구장</span>
                                    <span style={{ fontWeight: 700, color: '#2d5f4f' }}>광주 KIA 챔피언스 필드 (8회)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">가장 행복했던 달</span>
                                    <span style={{ fontWeight: 700, color: '#2d5f4f' }}>7월 (좋음 12회)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">첫 직관</span>
                                    <span style={{ fontWeight: 700, color: '#2d5f4f' }}>2024년 3월 23일</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* 다이어리 뷰 */}
                {viewMode === 'diary' && (
                    <div className="rounded-3xl p-8" style={{ backgroundColor: '#2d5f4f' }}>
                        <div className="grid grid-cols-20 gap-8">
                            {/* 왼쪽: 캘린더 */}
                            <Card className="p-8 col-span-13">
                                <div className="flex items-center justify-between mb-6">
                                    <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-full">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h3 style={{ fontWeight: 900 }}>
                                        {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                                    </h3>
                                    <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-full">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-3">
                                    {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                                        <div key={day} className="text-center py-2 text-sm text-gray-500">
                                            {day}
                                        </div>
                                    ))}

                                    {Array.from({ length: 35 }, (_, i) => {
                                        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
                                        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                                        const dayNumber = i - firstDay + 1;
                                        const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

                                        const dateStr = isValidDay
                                            ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                                            : '';

                                        const entry = diaryEntries.find(e => e.date === dateStr);
                                        const isSelected = selectedDateStr === dateStr;

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => isValidDay && handleDateSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber))}
                                                className={`border rounded-lg p-2 flex flex-col min-h-[110px] ${
                                                    isValidDay ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                                                } ${isSelected ? 'ring-2 ring-offset-1' : ''}`}
                                                style={{
                                                    borderColor: entry
                                                        ? entry.type === 'attended'
                                                            ? '#2d5f4f'
                                                            : '#fbbf24'
                                                        : '#e5e7eb',
                                                    backgroundColor: entry
                                                        ? entry.type === 'attended'
                                                            ? '#e8f5f0'
                                                            : '#fef3c7'
                                                        : isValidDay ? 'white' : '#f9fafb',
                                                    ringColor: isSelected ? '#2d5f4f' : undefined
                                                }}
                                                disabled={!isValidDay}
                                            >
                                                {isValidDay && (
                                                    <>
                                                        <div className="text-sm text-center w-full mb-2">{dayNumber}</div>
                                                        {entry && (
                                                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                                                                <div className="text-xs text-gray-600 text-center leading-tight px-1">{entry.team}</div>
                                                                <img src={entry.emoji} alt={entry.emojiName} className="w-10 h-10 flex-shrink-0" />
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-6 mt-6 justify-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e8f5f0', border: '2px solid #2d5f4f' }} />
                                        <span className="text-sm text-gray-600">직관 완료</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24' }} />
                                        <span className="text-sm text-gray-600">직관 예정</span>
                                    </div>
                                </div>
                            </Card>

                            {/* 오른쪽: 다이어리 상세/작성 폼 */}
                            <Card className="p-6 col-span-7">
                                <div className="mb-6">
                                    <h3 style={{ color: '#2d5f4f', fontWeight: 900 }}>
                                        {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 직관 기록
                                    </h3>
                                </div>

                                {/* 다이어리가 있고 편집 모드가 아닐 때: 읽기 전용 뷰 */}
                                {selectedDiary && !isEditMode ? (
                                    <div className="p-6 space-y-6">
                                        {/* 헤더 */}
                                        <div className="flex items-center justify-between">
                                            <h3 style={{ fontWeight: 900, color: '#2d5f4f' }}>직관 기록</h3>
                                        </div>

                                        {/* 오늘의 기분 */}
                                        <div className="flex items-center gap-6 p-6 rounded-2xl" style={{ backgroundColor: '#f8fcfb' }}>
                                            <img src={diaryForm.emoji} alt={diaryForm.emojiName} className="w-20 h-20" />
                                            <div>
                                                <div className="text-sm text-gray-500 mb-1">오늘의 기분</div>
                                                <div className="text-2xl" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                                    {diaryForm.emojiName}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 사진 */}
                                        {diaryForm.photos.length > 0 && (
                                            <div>
                                                <div className="text-sm mb-3" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                                                    사진
                                                </div>
                                                {diaryForm.photos.length === 1 ? (
                                                    <img
                                                        src={diaryForm.photos[0]}
                                                        alt="직관 사진"
                                                        className="w-full rounded-xl object-cover max-h-64"
                                                    />
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {diaryForm.photos.slice(0, 4).map((photo: string, index: number) => (
                                                            <div key={index} className="aspect-square relative rounded-xl overflow-hidden">
                                                                <img
                                                                    src={photo}
                                                                    alt={`사진 ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                {index === 3 && diaryForm.photos.length > 4 && (
                                                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                                                        <span className="text-white text-2xl" style={{ fontWeight: 900 }}>
                                                                            +{diaryForm.photos.length - 4}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 경기 정보 */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                                <div className="text-sm text-gray-600">경기</div>
                                                <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
                                                    {(() => {
                                                        const game = availableGames.find(g => g.id === Number(diaryForm.gameId));
                                                        if (game) {
                                                            return `${game.homeTeam} vs ${game.awayTeam}`;
                                                        }
                                                        return selectedDiary?.team || '경기 정보 없음';
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                                <div className="text-sm text-gray-600">구장</div>
                                                <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
                                                    {(() => {
                                                        const game = availableGames.find(g => g.id === Number(diaryForm.gameId));
                                                        if (game) {
                                                            return game.stadium;
                                                        }
                                                        return selectedDiary?.stadium || '구장 정보 없음';
                                                    })()}
                                                </div>
                                            </div>

                                            {selectedDiary?.score && (
                                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                                    <div className="text-sm text-gray-600">스코어</div>
                                                    <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
                                                        {selectedDiary.score}
                                                    </div>
                                                </div>
                                            )}

                                            {diaryForm.memo && (
                                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                                    <div className="text-sm text-gray-600">메모</div>
                                                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                        {diaryForm.memo}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 수정하기 버튼 */}
                                        <div className="flex justify-center">
                                            <Button
                                                onClick={() => setIsEditMode(true)}
                                                className="w-full text-white"
                                                style={{ backgroundColor: '#2d5f4f' }}
                                            >
                                                수정하기
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* 편집 모드 또는 새 다이어리 작성 */
                                    <div className="space-y-4">
                                        {/* Type Selection */}
                                        <div>
                                            <label className="text-sm text-gray-600 mb-3 block">직관 유형</label>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setDiaryForm({ ...diaryForm, type: 'attended' })}
                                                    className={`flex-1 rounded-lg transition-all transform group ${
                                                        diaryForm.type === 'attended'
                                                            ? 'shadow-md scale-105'
                                                            : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                                                    }`}
                                                    style={diaryForm.type === 'attended' ? {
                                                        backgroundColor: 'rgb(45, 95, 79)',
                                                        padding: '10px'
                                                    } : {
                                                        padding: '10px'
                                                    }}
                                                >
                                                    <div className={`font-bold ${
                                                        diaryForm.type === 'attended'
                                                            ? 'text-white'
                                                            : 'text-gray-700 group-hover:text-[rgb(45,95,79)]'
                                                    }`}>
                                                        직관 완료
                                                    </div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDiaryForm({ ...diaryForm, type: 'scheduled' })}
                                                    className={`flex-1 rounded-lg transition-all transform group ${
                                                        diaryForm.type === 'scheduled'
                                                            ? 'shadow-md scale-105'
                                                            : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                                                    }`}
                                                    style={diaryForm.type === 'scheduled' ? {
                                                        backgroundColor: 'rgb(251, 191, 36)',
                                                        padding: '10px'
                                                    } : {
                                                        padding: '10px'
                                                    }}
                                                >
                                                    <div className={`font-bold ${
                                                        diaryForm.type === 'scheduled'
                                                            ? 'text-white'
                                                            : 'text-gray-700 group-hover:text-[rgb(251,191,36)]'
                                                    }`}>
                                                        직관 예정
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Emoji Selection */}
                                        {diaryForm.type === 'attended' && (
                                            <div>
                                                <label className="text-sm text-gray-600 mb-3 block">오늘의 기분</label>
                                                <div className="flex items-center justify-around p-4 bg-gray-50 rounded-2xl">
                                                    {emojiStats.map((item, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setDiaryForm({ ...diaryForm, emoji: item.emoji, emojiName: item.name })}
                                                            className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 ${
                                                                diaryForm.emojiName === item.name
                                                                    ? 'bg-white shadow-md scale-110'
                                                                    : 'hover:bg-white/50'
                                                            }`}
                                                        >
                                                            <img src={item.emoji} alt={item.name} className="w-12 h-12" />
                                                            <span className="text-xs text-gray-600">{item.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Photo Upload */}
                                        {diaryForm.type === 'attended' && (
                                            <div>
                                                <label className="text-sm text-gray-600 mb-3 block">사진 추가</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {diaryForm.photos.map((photo: string, index: number) => (
                                                        <div key={index} className="relative aspect-square">
                                                            <img src={photo} alt={`업로드 ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                                            <button
                                                                onClick={() => removePhoto(index)}
                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {diaryForm.photos.length < 6 && (
                                                        <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#2d5f4f] hover:bg-gray-50 transition-all">
                                                            <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                                            <span className="text-xs text-gray-500">사진 추가</span>
                                                            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                                                        </label>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">최대 6장까지 업로드 가능합니다</p>
                                            </div>
                                        )}

                                        {/* Match Info */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm text-gray-500 mb-1 block">경기 선택</label>
                                                {availableGames.length > 0 ? (
                                                    <select
                                                        value={diaryForm.gameId}
                                                        onChange={(e) => setDiaryForm({ ...diaryForm, gameId: e.target.value })}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] bg-white"
                                                    >
                                                        <option value="">경기를 선택하세요</option>
                                                        {availableGames.map((game) => (
                                                            <option key={game.id} value={game.id}>
                                                                {game.homeTeam} vs {game.awayTeam} - {game.stadium} {game.score ? `(${game.score})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center">
                                                        이 날짜에 예정된 경기가 없습니다
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="text-sm text-gray-500 mb-1 block">메모</label>
                                                <textarea
                                                    disabled={diaryForm.type === 'scheduled'}
                                                    value={diaryForm.memo}
                                                    onChange={(e) => setDiaryForm({ ...diaryForm, memo: e.target.value })}
                                                    placeholder={diaryForm.type === 'attended' ? "오늘의 직관 경험을 기록해보세요" : "경기 후 입력 가능"}
                                                    rows={4}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] resize-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            {selectedDiary && (
                                                <Button
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setIsEditMode(false);
                                                        handleDateSelect(selectedDate); // 원래 데이터로 복원
                                                    }}
                                                >
                                                    취소
                                                </Button>
                                            )}
                                            <Button
                                                className={`${selectedDiary ? 'flex-1' : 'w-full'} text-white`}
                                                style={{ backgroundColor: '#2d5f4f' }}
                                                onClick={handleSaveDiary}
                                            >
                                                {selectedDiary ? '저장하기' : '작성하기'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            <ChatBot />
            <TeamRecommendationTest
                isOpen={showTeamTest}
                onClose={() => setShowTeamTest(false)}
                onSelectTeam={(team) => {
                    setSavedFavoriteTeam(team);
                    setShowTeamTest(false);
                }}
            />
        </div>
    );
}