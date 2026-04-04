import { X } from 'lucide-react';

import type { AdminSeatView } from '../../types/admin';
import { Button } from '../ui/button';

interface AdminSeatViewDetailDrawerProps {
  selectedSeatViewId: number;
  selectedSeatViewDetail: AdminSeatView | null;
  seatViewDetailLoading: boolean;
  adminMemo: string;
  setAdminMemo: (value: string) => void;
  closeSeatViewDetail: () => void;
  handleSeatViewAction: (
    seatViewId: number,
    payload: {
      adminLabel?: string;
      moderationStatus?: string;
      adminMemo?: string;
    }
  ) => Promise<void>;
}

export default function AdminSeatViewDetailDrawer({
  selectedSeatViewId,
  selectedSeatViewDetail,
  seatViewDetailLoading,
  adminMemo,
  setAdminMemo,
  closeSeatViewDetail,
  handleSeatViewAction,
}: AdminSeatViewDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={closeSeatViewDetail}
        aria-label="시야뷰 상세 패널 닫기"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-700 bg-slate-900/95 backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">시야뷰 후보 상세</p>
            <h2 className="text-lg font-bold text-white">Seat View #{selectedSeatViewId}</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={closeSeatViewDetail}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {seatViewDetailLoading || !selectedSeatViewDetail ? (
            <div className="text-slate-400">상세 정보를 불러오는 중...</div>
          ) : (
            <>
              <img
                src={selectedSeatViewDetail.photoUrl}
                alt="시야뷰 상세"
                className="w-full rounded-2xl border border-slate-800 object-cover max-h-[320px]"
              />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">상태</p>
                  <p className="text-slate-200 mt-1">{selectedSeatViewDetail.moderationStatus || '미제출'}</p>
                </div>
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">관리자 라벨</p>
                  <p className="text-slate-200 mt-1">{selectedSeatViewDetail.adminLabel || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">AI 추천</p>
                  <p className="text-slate-200 mt-1">
                    {selectedSeatViewDetail.aiSuggestedLabel || '-'}
                    {selectedSeatViewDetail.aiConfidence != null && ` (${Math.round(selectedSeatViewDetail.aiConfidence * 100)}%)`}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">티켓 인증</p>
                  <p className="text-slate-200 mt-1">{selectedSeatViewDetail.ticketVerified ? '완료' : '미인증'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 p-3 text-sm space-y-2">
                <p><span className="text-slate-500">구장:</span> <span className="text-slate-200">{selectedSeatViewDetail.stadium}</span></p>
                <p><span className="text-slate-500">좌석:</span> <span className="text-slate-200">{[selectedSeatViewDetail.section, selectedSeatViewDetail.block, selectedSeatViewDetail.seatRow, selectedSeatViewDetail.seatNumber].filter(Boolean).join(' / ') || '-'}</span></p>
                <p><span className="text-slate-500">업로드 타입:</span> <span className="text-slate-200">{selectedSeatViewDetail.sourceType}</span></p>
                <p><span className="text-slate-500">리워드 지급:</span> <span className="text-slate-200">{selectedSeatViewDetail.rewardGranted ? '완료' : '미지급'}</span></p>
                <p><span className="text-slate-500">AI 사유:</span> <span className="text-slate-200 whitespace-pre-wrap">{selectedSeatViewDetail.aiReason || '-'}</span></p>
              </div>

              <div className="rounded-lg border border-slate-800 p-3">
                <p className="text-sm text-slate-500 mb-2">관리자 메모</p>
                <textarea
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  className="w-full min-h-24 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  placeholder="분류 근거를 입력하세요."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                    adminLabel: 'SEAT_VIEW',
                    moderationStatus: 'APPROVED',
                    adminMemo,
                  })}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  승인
                </Button>
                <Button
                  onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                    adminLabel: 'TICKET',
                    moderationStatus: 'REJECTED',
                    adminMemo,
                  })}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  TICKET
                </Button>
                <Button
                  onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                    adminLabel: 'OTHER',
                    moderationStatus: 'REJECTED',
                    adminMemo,
                  })}
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                >
                  OTHER
                </Button>
                <Button
                  onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                    adminLabel: 'INAPPROPRIATE',
                    moderationStatus: 'REJECTED',
                    adminMemo,
                  })}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  INAPPROPRIATE
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
