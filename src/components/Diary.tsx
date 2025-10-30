import sadEmoji from 'figma:asset/cd25f780197933e8036601b5d1a3c3337692d39c.png';
import angryEmoji from 'figma:asset/42dd52586f6d1d030d23511fbd3cb76d6f973a98.png';
import boredEmoji from 'figma:asset/d1ffa1015580d6d5f87b9c727162461d8be1f9cf.png';
import fullEmoji from 'figma:asset/c5b952237a2428b4f5b6a0a8504b604f69464631.png';
import happyEmoji from 'figma:asset/5843378a1433c3b38912e3121e2ff42cf8f6cd42.png';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ChevronLeft, ChevronRight, TrendingUp, X, Camera } from 'lucide-react';
import ChatBot from './ChatBot';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useDiaryStore } from '../store/diaryStore';
import Navbar from './Navbar';

export default function Diary() {
  const {
    currentMonth,
    selectedEntry,
    isDialogOpen,
    isEditMode,
    editedEntry,
    editPhotos,
    isCreateMode,
    newEntry,
    diaryEntries,
    setCurrentMonth,
    setSelectedEntry,
    setIsDialogOpen,
    setIsEditMode,
    setEditedEntry,
    setEditPhotos,
    setIsCreateMode,
    setNewEntry,
    addDiaryEntry,
    updateDiaryEntry,
    resetNewEntry,
  } = useDiaryStore();

  const emojiStats = [
    { name: '속상', emoji: sadEmoji, count: 2 },
    { name: '분노', emoji: angryEmoji, count: 1 },
    { name: '뭐함', emoji: boredEmoji, count: 1 },
    { name: '배부름', emoji: fullEmoji, count: 3 },
    { name: '좋음', emoji: happyEmoji, count: 5 }
  ];

  const totalCount = emojiStats.reduce((sum, item) => sum + item.count, 0);

  const handleDateClick = (entry: any) => {
    if (entry && entry.type === 'attended') {
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

  const handleSaveEdit = () => {
    if (editedEntry) {
      const updated = { ...editedEntry, photos: editPhotos };
      updateDiaryEntry(editedEntry.date, updated);
      setSelectedEntry(updated);
      setIsEditMode(false);
      setIsDialogOpen(false);
    }
  };

  const handleCreateClick = () => {
    resetNewEntry();
    setIsCreateMode(true);
  };

  const handleSaveCreate = () => {
    if (newEntry.date && newEntry.team && newEntry.stadium) {
      const entry = {
        ...newEntry,
        type: 'attended' as const,
        emoji: newEntry.emoji || happyEmoji,
        emojiName: newEntry.emojiName || '좋음',
        team: newEntry.team,
        stadium: newEntry.stadium,
        score: newEntry.score || '',
        memo: newEntry.memo || '',
        photos: newEntry.photos || []
      };
      addDiaryEntry(entry as any);
      setIsCreateMode(false);
      resetNewEntry();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setNewEntry({ photos: [...(newEntry.photos || []), ...newPhotos] });
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = (newEntry.photos || []).filter((_: any, i: number) => i !== index);
    setNewEntry({ photos: updatedPhotos });
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
      <Navbar currentPage="diary" />

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
              <span className="text-gray-700">오늘</span>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                  60% (3승 2패)
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

              return (
                <button
                  key={i}
                  onClick={() => handleDateClick(entry)}
                  className={`aspect-square border rounded-lg p-2 flex flex-col ${
                    isValidDay ? 'bg-white' : 'bg-gray-50'
                  } ${entry ? (entry.type === 'attended' ? 'border-2 cursor-pointer hover:opacity-80' : 'border-2 cursor-default') : 'cursor-default'}`}
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
                      : isValidDay ? 'white' : '#f9fafb'
                  }}
                  disabled={!entry || entry.type !== 'attended'}
                >
                  {isValidDay && (
                    <>
                      <div className="text-sm text-center w-full">{dayNumber}</div>
                      {entry && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-1">
                          <div className="text-xs text-gray-600 line-clamp-1 text-center">{entry.team}</div>
                          <img src={entry.emoji} alt={entry.emojiName} className="w-7 h-7" />
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
        <DialogContent className="sm:max-w-[500px]">
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
                <img src={selectedEntry.emoji} alt={selectedEntry.emojiName} className="w-20 h-20" />
                <div>
                  <div className="text-sm text-gray-600">오늘의 기분</div>
                  <div className="text-2xl" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                    {selectedEntry.emojiName}
                  </div>
                </div>
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
              <div className="pt-4">
                <Button 
                  className="w-full text-white"
                  style={{ backgroundColor: '#2d5f4f' }}
                  onClick={handleEditClick}
                >
                  수정하기
                </Button>
              </div>
            </div>
          )}

          {/* Edit Mode */}
          {editedEntry && isEditMode && (
            <div className="space-y-4 mt-4">
              {/* Emoji Selection */}
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
                  <input
                    type="text"
                    value={editedEntry.team}
                    onChange={(e) => setEditedEntry({ ...editedEntry, team: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                  />
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
                
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">스코어</label>
                  <input
                    type="text"
                    value={editedEntry.score}
                    onChange={(e) => setEditedEntry({ ...editedEntry, score: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">메모</label>
                  <textarea
                    value={editedEntry.memo}
                    onChange={(e) => setEditedEntry({ ...editedEntry, memo: e.target.value })}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] resize-none"
                  />
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
                value={newEntry.date || ''}
                onChange={(e) => setNewEntry({ date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
              />
            </div>

            {/* Emoji Selection */}
            <div>
              <label className="text-sm text-gray-600 mb-3 block">오늘의 기분</label>
              <div className="flex items-center justify-around p-4 bg-gray-50 rounded-2xl">
                {emojiStats.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setNewEntry({ emoji: item.emoji, emojiName: item.name })}
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

            {/* Photo Upload */}
            <div>
              <label className="text-sm text-gray-600 mb-3 block">사진 추가</label>
              <div className="grid grid-cols-3 gap-3">
                {(newEntry.photos || []).map((photo: string, index: number) => (
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
                {(newEntry.photos || []).length < 6 && (
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

            {/* Match Info */}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">경기</label>
                <input
                  type="text"
                  value={newEntry.team || ''}
                  onChange={(e) => setNewEntry({ team: e.target.value })}
                  placeholder="예) KIA vs NC"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">구장</label>
                <input
                  type="text"
                  value={newEntry.stadium || ''}
                  onChange={(e) => setNewEntry({ stadium: e.target.value })}
                  placeholder="예) 광주 KIA 챔피언스 필드"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">스코어</label>
                <input
                  type="text"
                  value={newEntry.score || ''}
                  onChange={(e) => setNewEntry({ score: e.target.value })}
                  placeholder="예) 5-3 KIA 승"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f]"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-500 mb-1 block">메모</label>
                <textarea
                  value={newEntry.memo || ''}
                  onChange={(e) => setNewEntry({ memo: e.target.value })}
                  placeholder="오늘의 직관 경험을 기록해보세요"
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
