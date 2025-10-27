import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import sadEmoji from 'figma:asset/cd25f780197933e8036601b5d1a3c3337692d39c.png';
import angryEmoji from 'figma:asset/42dd52586f6d1d030d23511fbd3cb76d6f973a98.png';
import boredEmoji from 'figma:asset/d1ffa1015580d6d5f87b9c727162461d8be1f9cf.png';
import fullEmoji from 'figma:asset/c5b952237a2428b4f5b6a0a8504b604f69464631.png';
import happyEmoji from 'figma:asset/5843378a1433c3b38912e3121e2ff42cf8f6cd42.png';
import { useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Bell, User, ChevronLeft, ChevronRight, TrendingUp, X, Camera, Upload, Clock, CheckCircle } from 'lucide-react';
import ChatBot from './ChatBot';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useDiaryStore } from '@/stores/useDiaryStore';

interface DiaryProps {
  onNavigateToLogin: () => void;
  onNavigate: (view: string) => void;
}

export default function Diary({ onNavigateToLogin, onNavigate }: DiaryProps) {
  // Zustand로 교체 - useState → useDiaryStore
  const diaryEntries = useDiaryStore(state => state.diaryEntries);
  const setDiaryEntries = useDiaryStore(state => state.setDiaryEntries);
  const date = useDiaryStore(state => state.date);
  const setDate = useDiaryStore(state => state.setDate);
  const currentMonth = useDiaryStore(state => state.currentMonth);
  const setCurrentMonth = useDiaryStore(state => state.setCurrentMonth);
  const selectedEntry = useDiaryStore(state => state.selectedEntry);
  const setSelectedEntry = useDiaryStore(state => state.setSelectedEntry);
  const isDialogOpen = useDiaryStore(state => state.isDialogOpen);
  const setIsDialogOpen = useDiaryStore(state => state.setIsDialogOpen);
  const isEditMode = useDiaryStore(state => state.isEditMode);
  const setIsEditMode = useDiaryStore(state => state.setIsEditMode);
  const editedEntry = useDiaryStore(state => state.editedEntry);
  const setEditedEntry = useDiaryStore(state => state.setEditedEntry);
  const editPhotos = useDiaryStore(state => state.editPhotos);
  const setEditPhotos = useDiaryStore(state => state.setEditPhotos);
  const isCreateMode = useDiaryStore(state => state.isCreateMode);
  const setIsCreateMode = useDiaryStore(state => state.setIsCreateMode);
  const newEntry = useDiaryStore(state => state.newEntry);
  const setNewEntry = useDiaryStore(state => state.setNewEntry);
  useEffect(() => {
    fetchDiaries();
  }, []);

  const fetchDiaries = async() => {
    try {
      const response = await fetch('/api/diary/show');
      if(response.ok) {
        const data = await response.json();

        const formattedEntries = data.map((diary: any) => ({
          id : diary.id,
          date: diary.date,
          team: diary.team,
          emoji: getEmojiImage(diary.emojiName),  // 이모지명 → 이미지
          emojiName: diary.emojiName,
          type: diary.type,  // "attended" or "scheduled"
          stadium: diary.stadium,
          score: diary.score,
          memo: diary.memo,
          photos: diary.photos || []
        }));
      // })));
        setDiaryEntries(formattedEntries);
      }
    } catch (error) {
      console.error('Error fetching diaries: ', error);
    }
  };

  const fetchDiaryDetail = async(id: number) => {
  const response = await fetch(`/api/diary/${id}`);
  const data = await response.json();
  return data;
  };
  
  const getCurrentMonthEmojiStats = () => {
    const stats = [
      { name: '속상', emoji: sadEmoji, count: 0 },
      { name: '분노', emoji: angryEmoji, count: 0 },
      { name: '뭐함', emoji: boredEmoji, count: 0 },
      { name: '배부름', emoji: fullEmoji, count: 0 },
      { name: '좋음', emoji: happyEmoji, count: 0 }
    ];

    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth();

    // 현재 월의 attended 타입 일기만 필터링
    const monthlyEntries = diaryEntries.filter(entry => {
      if (entry.type !== 'attended') return false; // 직관 완료만 카운트
      
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === currentYear && 
            entryDate.getMonth() === currentMonthNum;
    });

    // 이모지 카운트
    monthlyEntries.forEach(entry => {
      const stat = stats.find(s => s.name === entry.emojiName);
      if (stat) {
        stat.count++;
      }
    });

    return stats;
};

// 통계 계산 (currentMonth나 diaryEntries가 변경될 때마다 다시 계산됨)
const emojiStats = getCurrentMonthEmojiStats();

  const getEmojiImage = (emojiName: String) => {
    switch(emojiName) {
      case '좋음': return happyEmoji;
      case '배부름': return fullEmoji;
      case '뭐함': return boredEmoji;
      case '분노': return angryEmoji;
      case '속상': return sadEmoji;
      default: return happyEmoji;
    }
  }

  const totalCount = emojiStats.reduce((sum, item) => sum + item.count, 0);
  const mostFrequent = emojiStats.reduce((prev, current) => 
    (prev.count > current.count) ? prev : current
  );
  
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

  const handleDateClick = (entry: any) => {
    if (entry) {
      setSelectedEntry(entry);
      setEditedEntry({ ...entry });
      setEditPhotos(entry.photos || []);
      setIsEditMode(false);
      setIsDialogOpen(true);
    }
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleSaveEdit = async() => {
    try {
      const response = await fetch(`/api/diary/${editedEntry.id}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editedEntry.date,
          team: editedEntry.team,
          stadium: editedEntry.stadium,
          score: editedEntry.score,
          emojiName: editedEntry.emojiName,
          memo: editedEntry.memo,
          photos: editPhotos,
          type: editedEntry.type
        })
      });
      if(response.ok) {
        alert('게시글이 수정되었습니다.')
        fetchDiaries();
        setIsEditMode(false);
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating diary: ', error);
      alert('게시글 수정에 실패하였습니다.')
    }
  };

  const handleCreateClick = () => {
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      homeTeam: '',
      awayTeam: '',
      stadium: '',
      homeScore: '',
      awayScore: '',
      emoji: happyEmoji,
      emojiName: '좋음',
      memo: '',
      photos: []
    });
    setIsCreateMode(true);
  };

  const handleSaveCreate = async() => {
    try {
      const teamString = newEntry.homeTeam && newEntry.awayTeam
      ? `${newEntry.homeTeam} vs ${newEntry.awayTeam}`
      : '';
      // score를 "TEAM 1점수-TEAM 2점수" 형식으로 조합
      const scoreString = newEntry.type === 'attended' && newEntry.homeScore && newEntry.awayScore
        ? `${newEntry.homeScore}-${newEntry.awayScore}`
        : '';
      const response = await fetch('/api/diary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newEntry.date,
          team: teamString,           // ✅ game → team
          stadium: newEntry.stadium,
          type: newEntry.type.toUpperCase(),
          score: scoreString,
          memo: newEntry.memo,           // ✅ content → memo
          photos: newEntry.photos,
          emojiName: newEntry.emojiName  // ✅ mood → emojiName
        })
    });
    
    if(response.ok) {
      alert('게시글 등록을 완료했습니다.');
      setIsCreateMode(false);          // ✅ isEditMode → isCreateMode
      await fetchDiaries();
      // 캘린더 데이터 새로고침 필요 (추후 구현)
    } else {
      alert('게시글 등록에 실패하였습니다.');
    }
  } catch (error) {
    console.error('Error: ', error);
    alert('등록 중 오류가 발생했습니다.');
  }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/diary/${id}/delete`, {
        method: 'POST',
      });

      if(response.ok) {
        alert('삭제되었습니다.');
        setSelectedEntry(null);
        setEditedEntry(null);
        setIsEditMode(false);
        setIsDialogOpen(false);
        
        await fetchDiaries();
      } else {
        alert('삭제에 실패하였습니다.')
      }
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제 중 오류가 발생하였습니다.')
    }
  }
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setNewEntry({ ...newEntry, photos: [...newEntry.photos, ...newPhotos] });
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = newEntry.photos.filter((_: any, i: number) => i !== index);
    setNewEntry({ ...newEntry, photos: updatedPhotos });
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setEditPhotos([...editPhotos, ...newPhotos]);
    }
  };

  const removeEditPhoto = (index: number) => {
    const updatedPhotos = editPhotos.filter((_: any, i: number) => i !== index);
    setEditPhotos(updatedPhotos);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
              <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
              <div>
                <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
                <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
              </div>
            </button>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => onNavigate('home')} 
                className="text-gray-700 hover:opacity-70"
              >
                홈
              </button>
              <button 
                onClick={() => onNavigate('cheer')}
                className="text-gray-700 hover:opacity-70"
              >
                응원
              </button>
              <button 
                onClick={() => onNavigate('stadium')} 
                className="text-gray-700 hover:opacity-70"
              >
                구장
              </button>
              <button 
                onClick={() => onNavigate('prediction')}
                className="text-gray-700 hover:opacity-70"
              >
                예측
              </button>
              <button 
                onClick={() => onNavigate('diary')}
                className="hover:opacity-70"
                style={{ color: '#2d5f4f', fontWeight: 700 }}
              >
                다이어리
              </button>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => onNavigate('mypage')}
                className="text-gray-600 hover:text-gray-900"
              >
                <User className="w-5 h-5" />
              </button>
              <Button
                onClick={onNavigateToLogin}
                className="rounded-full px-6"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                로그인
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-7 h-7" style={{ color: '#2d5f4f' }} />
          <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>이번 달 기분 통계</h2>
        </div>

        {/* Emoji Statistics */}
        <Card className="p-8 mb-8">
          <div className="flex items-center justify-around mb-6">
            {emojiStats.map((item, index) => (
              <div key={index} className="text-center">
                <img src={item.emoji} alt={item.name} className="w-16 h-16 mx-auto mb-2 object-contain" />
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
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                  {/* 60% (3승 2패) */}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Calendar Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>직관 다이어리</h2>
          </div>
          <Button 
            className="rounded-full text-white"
            style={{ backgroundColor: '#2d5f4f' }}
            onClick={handleCreateClick}
          >
            + 기록하기
          </Button>
        </div>

        {/* Calendar */}
        <Card className="p-6">
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

          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center py-2 text-sm text-gray-500">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {Array.from({ length: 35 }, (_, i) => {
              const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
              const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
              const dayNumber = i - firstDay + 1;
              const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
              
              const dateStr = isValidDay 
                ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                : '';
              
              const entry = diaryEntries.find(e => e.date === dateStr);
              const isToday = isValidDay && new Date().toDateString() === new Date(dateStr).toDateString();

              return (
                <button
                  key={i}
                  onClick={() => entry && handleDateClick(entry)}
                  disabled={!isValidDay}
                  className={`aspect-square rounded-lg p-2 transition-all relative ${
                    !isValidDay ? 'bg-gray-50 border border-gray-300' : 
                    entry ? 'cursor-pointer hover:shadow-lg' : 
                    'bg-white border border-gray-300'
                  } ${isToday ? 'ring-2 ring-[#2d5f4f]' : ''}`}
                  style={{
                    borderWidth: entry ? '2px' : '1px',
                    borderColor: entry 
                      ? entry.type === 'attended' 
                        ? '#2d5f4f'    // ✅ 초록 테두리
                        : '#fbbf24'    // ✅ 노랑 테두리
                      : '#e5e7eb',
                    backgroundColor: entry 
                      ? entry.type === 'attended'
                        ? '#e8f5f0'    // ✅ 연한 초록 배경
                        : '#fef3c7'    // ✅ 연한 노랑 배경
                      : isValidDay ? 'white' : '#f9fafb'
                  }}
                >
                  {isValidDay && (
                    <>
                      {/* Entry 없는 날짜 - 날짜만 표시 */}
                      {!entry && (
                        <div className="text-sm text-gray-700 text-center font-medium">
                          {dayNumber}
                        </div>
                      )}
                      
                      {/* Entry 있는 날짜 - absolute 제거! */}
                      {entry && (
                        <div className="flex flex-col items-center justify-center h-full">
                          {/* 날짜 숫자 상단에 작게 */}
                          <div className="text-xs font-bold text-gray-500 mb-1">
                            {dayNumber}
                          </div>
                          
                          {/* 아이콘/이모지 */}
                          {entry.type === 'attended' ? (
                            <img src={entry.emoji} alt="emoji" className="w-8 h-8 mb-1" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-600 mb-1" />
                          )}
                          
                          {/* 팀 정보 */}
                          <span className="text-[10px] text-gray-700 text-center px-1 font-semibold line-clamp-1">
                            {entry.team}
                          </span>
                          
                          <span className="text-[10px] text-gray-500 text-center px-1 font-semibold line-clamp-1">
                            {entry.score}
                          </span>
                          
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 justify-center">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: '#e8f5f0', border: '2px solid #2d5f4f' }}
              />
              <span className="text-sm text-gray-600">직관 완료</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24' }}
              />
              <span className="text-sm text-gray-600">직관 예정</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Diary Entry Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" hideCloseButton={isEditMode}>
          <DialogHeader>
            <DialogTitle style={{ color: '#2d5f4f', fontWeight: 900 }}>
              {isEditMode ? '직관 기록 수정' : '직관 기록'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              직관 기록 상세 정보를 확인하고 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && !isEditMode && (
            <div className="space-y-4 mt-4">
              {/* Emoji and Mood */}
              <div className="flex items-center justify-center gap-4 py-6 bg-gray-50 rounded-2xl">
                {selectedEntry.type === 'attended' ? (
                  <>
                    <img src={selectedEntry.emoji} alt={selectedEntry.emojiName} className="w-20 h-20" />
                    <div>
                      <div className="text-sm text-gray-600">오늘의 기분</div>
                      <div className="text-2xl" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                        {selectedEntry.emojiName}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <Clock className="w-12 h-12 text-yellow-600 mb-2" />
                    <div className="text-sm text-gray-600">직관 예정</div>
                  </div>
                )}
              </div>

              {/* Photos */}
              {selectedEntry.photos && selectedEntry.photos.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-3">사진</div>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedEntry.photos.map((photo: string, index: number) => (
                      <div key={index} className="aspect-square">
                        <ImageWithFallback 
                          src={photo} 
                          alt={`직관 사진 ${index + 1}`} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Info */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-sm text-gray-500 w-20">경기</div>
                  <div style={{ fontWeight: 700 }}>{selectedEntry.team}</div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-sm text-gray-500 w-20">구장</div>
                  <div>{selectedEntry.stadium}</div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-sm text-gray-500 w-20">스코어</div>
                  <div style={{ fontWeight: 700, color: '#2d5f4f' }}>{selectedEntry.score}</div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-sm text-gray-500 w-20">메모</div>
                  <div className="flex-1 text-gray-700">{selectedEntry.memo}</div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1 text-white"
                  style={{ backgroundColor: '#2d5f4f' }}
                  onClick={handleEditClick}
                  >
                  수정하기
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(editedEntry.id)}
                >
                  삭제
                </Button>
              </div>
            </div>
          )}

          {/* Edit Mode */}
            {isEditMode && (
              <div>
                <label className="text-sm text-gray-600 mb-3 block">유형</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditedEntry({ ...editedEntry, type: 'attended' })}
                    className={`flex-1 rounded-lg transition-all transform group ${
                      editedEntry.type === 'attended'
                        ? 'shadow-md scale-105'
                        : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                    }`}
                    style={editedEntry.type === 'attended' ? {
                      backgroundColor: 'rgb(45, 95, 79)',
                      padding: '10px'
                    } : {
                      padding: '10px'
                    }}
                  >
                    <div className={`font-bold ${
                      editedEntry.type === 'attended' 
                        ? 'text-white' 
                        : 'text-gray-700 group-hover:text-[rgb(45,95,79)]'
                    }`}>
                      직관 완료
                    </div>
                  </button>
                  <button
                    onClick={() => setEditedEntry({ ...editedEntry, type: 'scheduled' })}
                    className={`flex-1 rounded-lg transition-all transform group ${
                      editedEntry.type === 'scheduled'
                        ? 'shadow-md scale-105'
                        : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                    }`}
                    style={editedEntry.type === 'scheduled' ? {
                      backgroundColor: 'rgb(251, 191, 36)',
                      padding: '10px'
                    } : {
                      padding: '10px'
                    }}
                  >
                    <div className={`font-bold ${
                      editedEntry.type === 'scheduled' 
                        ? 'text-white' 
                        : 'text-gray-700 group-hover:text-[rgb(251,191,36)]'
                    }`}>
                      직관 예정
                    </div>
                  </button>
                </div>
              </div>
            )}

          {editedEntry && isEditMode && (
            <div className="space-y-4 mt-4">
              {/* Emoji Selection */}
              {editedEntry.type === 'attended' && (
              <div>
                <label className="text-sm text-gray-600 mb-3 block">오늘의 기분</label>
                <div className="flex items-center justify-around p-4 bg-gray-50 rounded-2xl">
                  {emojiStats.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setEditedEntry({ ...editedEntry, emoji: item.emoji, emojiName: item.name })}
                      className={`p-2 rounded-xl transition-all ${
                        editedEntry.emojiName === item.name 
                          ? 'bg-white shadow-md scale-110' 
                          : 'hover:bg-white/50'
                      }`}
                    >
                      <img src={item.emoji} alt={item.name} className="w-12 h-12" />
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Photo Upload */}
              <div>
                <label className="text-sm text-gray-600 mb-3 block">사진</label>
                <div className="grid grid-cols-3 gap-3">
                  {editPhotos.map((photo: string, index: number) => (
                    <div key={index} className="relative aspect-square">
                      <img 
                        src={photo} 
                        alt={`업로드 ${index + 1}`} 
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeEditPhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editPhotos.length < 6 && (
                    <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#2d5f4f] hover:bg-gray-50 transition-all">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">사진 추가</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">최대 6장까지 업로드 가능합니다</p>
              </div>

              {/* Match Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">경기</label>
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editedEntry.team?.split(' vs ')[0] || ''}
                        onChange={(e) => {
                          const awayTeam = editedEntry.team?.split(' vs ')[1] || '';
                          setEditedEntry({ 
                            ...editedEntry, 
                            team: `${e.target.value} vs ${awayTeam}` 
                          });
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] bg-white"
                      >
                        <option value="">TEAM 1 선택</option>
                        {TEAMS.map((team) => (
                          <option key={team} value={team}>
                            {team}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500 font-bold">vs</span>
                      <select
                        value={editedEntry.team?.split(' vs ')[1] || ''}
                        onChange={(e) => {
                          const homeTeam = editedEntry.team?.split(' vs ')[0] || '';
                          setEditedEntry({ 
                            ...editedEntry, 
                            team: `${homeTeam} vs ${e.target.value}` 
                          });
                        }}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] bg-white"
                      >
                        <option value="">TEAM 2 선택</option>
                        {TEAMS.map((team) => (
                          <option key={team} value={team}>
                            {team}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-gray-700">{selectedEntry.team || '-'}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">구장</label>
                  <input
                    type="text"
                    value={editedEntry.stadium}
                    onChange={(e) => setEditedEntry({ ...editedEntry, stadium: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                  />
                </div>

                {/*Score*/}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">스코어</label>
                  {isEditMode ? (
                    editedEntry.type === 'attended' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editedEntry.score?.split('-')[0] || ''}
                          onChange={(e) => {
                            const awayScore = editedEntry.score?.split('-')[1] || '';
                            setEditedEntry({ 
                              ...editedEntry, 
                              score: `${e.target.value}-${awayScore}` 
                            });
                          }}
                          placeholder="TEAM 1 점수"
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                        />
                        <span className="text-gray-500 font-bold">-</span>
                        <input
                          type="number"
                          min="0"
                          value={editedEntry.score?.split('-')[1] || ''}
                          onChange={(e) => {
                            const homeScore = editedEntry.score?.split('-')[0] || '';
                            setEditedEntry({ 
                              ...editedEntry, 
                              score: `${homeScore}-${e.target.value}` 
                            });
                          }}
                          placeholder="TEAM 2 점수"
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        disabled
                        placeholder="경기 후 입력 가능"
                        className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-400"
                      />
                    )
                  ) : (
                    <p className="text-gray-700">{selectedEntry.score || '-'}</p>
                  )}
                </div>
                
                {/* Memo */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">메모</label>
                  {isEditMode ? (
                    <textarea
                      disabled={editedEntry.type === 'scheduled'}
                      value={editedEntry.memo}
                      onChange={(e) => setEditedEntry({ ...editedEntry, memo: e.target.value })}
                      placeholder={editedEntry.type === 'attended' ? "오늘의 직관 경험을 기록해보세요" : "경기 후 입력 가능"}
                      rows={4}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] resize-none"
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedEntry.memo || '-'}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsEditMode(false)}
                >
                  취소
                </Button>
                <Button 
                  className="flex-1 text-white"
                  style={{ backgroundColor: '#2d5f4f' }}
                  onClick={handleSaveEdit}
                >
                  저장하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Entry Dialog */}
      <Dialog open={isCreateMode} onOpenChange={setIsCreateMode}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: '#2d5f4f', fontWeight: 900 }}>
              직관 기록하기
            </DialogTitle>
            <DialogDescription className="sr-only">
              새로운 직관 기록을 작성합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Date Selection */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">날짜</label>
              <input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
              />
            </div>

            {/* Type Selection */}
            <div>
            <label className="text-sm text-gray-600 mb-3 block">유형</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNewEntry({ ...newEntry, type: 'attended' })}
                className={`flex-1 rounded-lg transition-all transform group ${
                  newEntry.type === 'attended'
                    ? 'shadow-md scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                }`}
                style={newEntry.type === 'attended' ? {
                  backgroundColor: 'rgb(45, 95, 79)',
                  padding: '10px'
                } : {
                  padding: '10px'
                }}
              >
                <div className={`font-bold ${
                  newEntry.type === 'attended' 
                    ? 'text-white' 
                    : 'text-gray-700 group-hover:text-[rgb(45,95,79)]'
                }`}>
                  직관 완료
                </div>
              </button>
              <button
                type="button"
                onClick={() => setNewEntry({ ...newEntry, type: 'scheduled' })}
                className={`flex-1 rounded-lg transition-all transform group ${
                  newEntry.type === 'scheduled'
                    ? 'shadow-md scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                }`}
                style={newEntry.type === 'scheduled' ? {
                  backgroundColor: 'rgb(251, 191, 36)',
                  padding: '10px'
                } : {
                  padding: '10px'
                }}
              >
                <div className={`font-bold ${
                  newEntry.type === 'scheduled' 
                    ? 'text-white' 
                    : 'text-gray-700 group-hover:text-[rgb(251,191,36)]'
                }`}>
                  직관 예정
                </div>
              </button>
            </div>
          </div>

            {/* Emoji Selection */}
            {newEntry.type === 'attended' && (
            <div>
              <label className="text-sm text-gray-600 mb-3 block">오늘의 기분</label>
              <div className="flex items-center justify-around p-4 bg-gray-50 rounded-2xl">
                {emojiStats.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setNewEntry({ ...newEntry, emoji: item.emoji, emojiName: item.name })}
                    className={`p-2 rounded-xl transition-all ${
                      newEntry.emojiName === item.name 
                        ? 'bg-white shadow-md scale-110' 
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <img src={item.emoji} alt={item.name} className="w-12 h-12" />
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Photo Upload */}
            {newEntry.type === 'attended' && (
            <div>
              <label className="text-sm text-gray-600 mb-3 block">사진 추가</label>
              <div className="grid grid-cols-3 gap-3">
                {newEntry.photos.map((photo: string, index: number) => (
                  <div key={index} className="relative aspect-square">
                    <img 
                      src={photo} 
                      alt={`업로드 ${index + 1}`} 
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {newEntry.photos.length < 6 && (
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#2d5f4f] hover:bg-gray-50 transition-all">
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">사진 추가</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">최대 6장까지 업로드 가능합니다</p>
            </div>
            )}

            {/* Match Info */}
            <div>
              <label className="text-sm text-gray-500 mb-1 block">경기</label>
              <div className="flex items-center gap-2">
                <select
                  value={newEntry.homeTeam}
                  onChange={(e) => setNewEntry({ ...newEntry, homeTeam: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] bg-white"
                >
                  <option value="">TEAM 1 선택</option>
                  {TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500 font-bold">vs</span>
                <select
                  value={newEntry.awayTeam}
                  onChange={(e) => setNewEntry({ ...newEntry, awayTeam: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] bg-white"
                >
                  <option value="">TEAM 2 선택</option>
                  {TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">구장</label>
                <input
                  type="text"
                  value={newEntry.stadium}
                  onChange={(e) => setNewEntry({ ...newEntry, stadium: e.target.value })}
                  placeholder="예) 광주 KIA 챔피언스 필드"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">스코어</label>
                {newEntry.type === 'attended' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={newEntry.homeScore}
                      onChange={(e) => setNewEntry({ ...newEntry, homeScore: e.target.value })}
                      placeholder="TEAM 1 점수"
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                    />
                    <span className="text-gray-500 font-bold">-</span>
                    <input
                      type="number"
                      min="0"
                      value={newEntry.awayScore}
                      onChange={(e) => setNewEntry({ ...newEntry, awayScore: e.target.value })}
                      placeholder="TEAM 2 점수"
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    disabled
                    placeholder="경기 후 입력 가능"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-400"
                  />
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">메모</label>
                <textarea
                  disabled={newEntry.type === 'scheduled'}
                  value={newEntry.memo}
                  onChange={(e) => setNewEntry({ ...newEntry, memo: e.target.value })}
                  placeholder={newEntry.type === 'attended' ? "오늘의 직관 경험을 기록해보세요" : "경기 후 입력 가능"}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsCreateMode(false)}
              >
                취소
              </Button>
              <Button 
                className="flex-1 text-white"
                style={{ backgroundColor: '#2d5f4f' }}
                onClick={handleSaveCreate}
              >
                저장하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}