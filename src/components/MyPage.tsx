import { useState, useEffect } from 'react';
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

const teamColors: { [key: string]: string } = {
  '없음': '#9ca3af',
  'LG': '#C30452',
  '두산': '#131230',
  'SSG': '#CE0E2D',
  'KT': '#000000',
  '키움': '#570514',
  'NC': '#315288',
  '삼성': '#074CA1',
  '롯데': '#041E42',
  '기아': '#EA0029',
  '한화': '#FF6600',
};

const teamFullNames: { [key: string]: string } = {
  '없음': '없음',
  'LG': 'LG 트윈스',
  '두산': '두산 베어스',
  'SSG': 'SSG 랜더스',
  'KT': 'KT 위즈',
  '키움': '키움 히어로즈',
  'NC': 'NC 다이노스',
  '삼성': '삼성 라이온즈',
  '롯데': '롯데 자이언츠',
  '기아': 'KIA 타이거즈',
  '한화': '한화 이글스',
};

type ViewMode = 'diary' | 'stats' | 'editProfile';

export default function MyPage() {
  const [profileImage, setProfileImage] = useState<string>('');
  const [name, setName] = useState('홍길동');
  const [email, setEmail] = useState('user@example.com');
  const [favoriteTeam, setFavoriteTeam] = useState('LG');
  const [nickname, setNickname] = useState('야구팬123');
  const [showTeamTest, setShowTeamTest] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('diary');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isEditMode, setIsEditMode] = useState(false);

  const { diaryEntries, addDiaryEntry, updateDiaryEntry } = useDiaryStore();

  const emojiStats = [
    { name: '최악', emoji: worstEmoji, count: 1 },
    { name: '배부름', emoji: fullEmoji, count: 3 },
    { name: '최고', emoji: bestEmoji, count: 5 },
    { name: '분노', emoji: angryEmoji, count: 2 },
    { name: '즐거움', emoji: happyEmoji, count: 8 }
  ];

  const totalCount = emojiStats.reduce((sum, item) => sum + item.count, 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
    }
  };

  const handleSave = () => {
    console.log('프로필 저장:', { name, email, favoriteTeam, nickname, profileImage });
    alert('프로필이 저장되었습니다!');
    setViewMode('diary');
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // 선택된 날짜의 다이어리 엔트리 찾기
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDiary = diaryEntries.find(e => e.date === selectedDateStr);

  // 다이어리 폼 상태
  const [diaryForm, setDiaryForm] = useState({
    emoji: happyEmoji,
    emojiName: '즐거움',
    team: '',
    stadium: '',
    score: '',
    memo: '',
    photos: [] as string[]
  });

  // 날짜 선택 시 해당 다이어리 로드
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsEditMode(false); // 날짜 변경 시 편집 모드 해제
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const entry = diaryEntries.find(e => e.date === dateStr);
    
    if (entry) {
      setDiaryForm({
        emoji: entry.emoji,
        emojiName: entry.emojiName,
        team: entry.team,
        stadium: entry.stadium,
        score: entry.score || '',
        memo: entry.memo || '',
        photos: entry.photos || []
      });
    } else {
      // 새 다이어리
      setIsEditMode(true); // 새 다이어리는 바로 편집 모드
      setDiaryForm({
        emoji: happyEmoji,
        emojiName: '즐거움',
        team: '',
        stadium: '',
        score: '',
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
    alert('다���어리가 저장되었습니다!');
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

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 상단 회원 정보 섹션 */}
        <Card className="p-8 mb-8">
          <div className="flex items-start justify-between">
            {/* 프로필 정보 */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
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
                    {favoriteTeam !== '없음' && (
                      <div className="w-6 h-6">
                        <TeamLogo team={favoriteTeam} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 mb-1">{nickname}</p>
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
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
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
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-gray-700">닉네임 *</Label>
                <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full" placeholder="닉네임을 입력하세요" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">이메일 *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" placeholder="이메일을 입력하세요" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team" className="text-gray-700">응원구단 *</Label>
                <Select value={favoriteTeam} onValueChange={setFavoriteTeam}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="응원하는 팀을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(teamColors).map(team => (
                      <SelectItem key={team} value={team}>
                        <div className="flex items-center gap-2">
                          {team !== '없음' && <div className="w-6 h-6"><TeamLogo team={team} size="sm" /></div>}
                          {team === '없음' && <div className="w-6 h-6 rounded-full" style={{ backgroundColor: teamColors[team] }} />}
                          {teamFullNames[team]}
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
                        {diaryForm.team}
                      </div>
                    </div>

                    <div className="grid grid-cols-[80px_1fr] gap-2">
                      <div className="text-sm text-gray-600">구장</div>
                      <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
                        {diaryForm.stadium}
                      </div>
                    </div>

                    {diaryForm.score && (
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <div className="text-sm text-gray-600">스코어</div>
                        <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
                          {diaryForm.score}
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
                  {/* Emoji Selection */}
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

                  {/* Photo Upload */}
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

                  {/* Match Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-500 mb-1 block">경기</label>
                      <input
                        type="text"
                        value={diaryForm.team}
                        onChange={(e) => setDiaryForm({ ...diaryForm, team: e.target.value })}
                        placeholder="예) KIA vs NC"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 mb-1 block">구장</label>
                      <input
                        type="text"
                        value={diaryForm.stadium}
                        onChange={(e) => setDiaryForm({ ...diaryForm, stadium: e.target.value })}
                        placeholder="예) 광주 KIA 챔피언스 필드"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 mb-1 block">스코어</label>
                      <input
                        type="text"
                        value={diaryForm.score}
                        onChange={(e) => setDiaryForm({ ...diaryForm, score: e.target.value })}
                        placeholder="예) 5-3 KIA 승"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-500 mb-1 block">메모</label>
                      <textarea
                        value={diaryForm.memo}
                        onChange={(e) => setDiaryForm({ ...diaryForm, memo: e.target.value })}
                        placeholder="오늘의 직관 경험을 기록해보세요"
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
          setFavoriteTeam(team);
          setShowTeamTest(false);
        }}
      />
    </div>
  );
}
