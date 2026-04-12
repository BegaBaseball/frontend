import type { Dispatch, SetStateAction } from 'react';
import { MapPin } from 'lucide-react';

import type { PlaceFormData } from '../../api/admin';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';

interface AdminPlaceDialogContentProps {
  open: boolean;
  mode: 'create' | 'edit';
  stadiumName: string;
  categories: readonly string[];
  stadiumError: string | null;
  placeForm: PlaceFormData;
  setPlaceForm: Dispatch<SetStateAction<PlaceFormData>>;
  placeSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

const selectClassName = 'w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-[14px] text-slate-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500';

export default function AdminPlaceDialogContent({
  open,
  mode,
  stadiumName,
  categories,
  stadiumError,
  placeForm,
  setPlaceForm,
  placeSubmitting,
  onOpenChange,
  onSubmit,
}: AdminPlaceDialogContentProps) {
  const isCreate = mode === 'create';

  return (
    <PlainDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={(
        <span className="flex items-center gap-2 text-white">
          <MapPin className="w-5 h-5 text-violet-400" />
          {isCreate ? '장소 추가' : '장소 수정'}
        </span>
      )}
      description={isCreate ? `${stadiumName} 구장에 새 장소를 추가합니다.` : '장소 정보를 수정합니다.'}
      className="max-w-lg max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-900 text-slate-100"
      footer={(
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            취소
          </Button>
          <Button
            onClick={onSubmit}
            disabled={placeSubmitting || !placeForm.name || !placeForm.category}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
          >
            {placeSubmitting ? '저장 중...' : (isCreate ? '추가' : '저장')}
          </Button>
        </>
      )}
    >
      <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <label className="text-[14px] text-slate-400">이름 *</label>
            <Input
              value={placeForm.name}
              onChange={(e) => setPlaceForm((form) => ({ ...form, name: e.target.value }))}
              placeholder="장소 이름"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-[14px] text-slate-400">카테고리 *</label>
            <select
              data-testid="admin-place-category-trigger"
              value={placeForm.category}
              onChange={(e) => setPlaceForm((form) => ({ ...form, category: e.target.value }))}
              className={selectClassName}
            >
              <option value="">카테고리 선택</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-[14px] text-slate-400">설명</label>
            <Input
              value={placeForm.description ?? ''}
              onChange={(e) => setPlaceForm((form) => ({ ...form, description: e.target.value }))}
              placeholder="장소 설명"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-[14px] text-slate-400">주소</label>
            <Input
              value={placeForm.address ?? ''}
              onChange={(e) => setPlaceForm((form) => ({ ...form, address: e.target.value }))}
              placeholder="도로명 주소"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-[14px] text-slate-400">전화번호</label>
            <Input
              value={placeForm.phone ?? ''}
              onChange={(e) => setPlaceForm((form) => ({ ...form, phone: e.target.value }))}
              placeholder="02-1234-5678"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-[14px] text-slate-400">위도 *</label>
              <Input
                type="number"
                step="any"
                value={placeForm.lat}
                onChange={(e) => setPlaceForm((form) => ({ ...form, lat: parseFloat(e.target.value) || 0 }))}
                placeholder="37.123456"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[14px] text-slate-400">경도 *</label>
              <Input
                type="number"
                step="any"
                value={placeForm.lng}
                onChange={(e) => setPlaceForm((form) => ({ ...form, lng: parseFloat(e.target.value) || 0 }))}
                placeholder="126.987654"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-[14px] text-slate-400">평점 (0.0 ~ 5.0)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={placeForm.rating ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setPlaceForm((form) => ({ ...form, rating: value === '' ? undefined : parseFloat(value) }));
              }}
              placeholder="4.5"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-[14px] text-slate-400">오픈 시간</label>
              <Input
                value={placeForm.openTime ?? ''}
                onChange={(e) => setPlaceForm((form) => ({ ...form, openTime: e.target.value }))}
                placeholder="09:00"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[14px] text-slate-400">마감 시간</label>
              <Input
                value={placeForm.closeTime ?? ''}
                onChange={(e) => setPlaceForm((form) => ({ ...form, closeTime: e.target.value }))}
                placeholder="22:00"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
          </div>
        </div>

        {stadiumError && (
          <p className="text-red-400 text-[14px] mt-1">{stadiumError}</p>
        )}
    </PlainDialog>
  );
}
