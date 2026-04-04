import { X } from 'lucide-react';

import type { AdminReport } from '../../types/admin';
import { getTimeAgo } from '../../utils/formatters';
import { Button } from '../ui/button';

type AdminReportAction = 'TAKE_DOWN' | 'REQUIRE_MODIFICATION' | 'WARNING' | 'DISMISS' | 'RESTORE';

interface AdminReportDetailDrawerProps {
  selectedReportId: number;
  selectedReportDetail: AdminReport | null;
  reportDetailLoading: boolean;
  adminMemo: string;
  setAdminMemo: (value: string) => void;
  closeReportDetail: () => void;
  handleReportAction: (
    reportId: number,
    action: AdminReportAction,
    adminMemo?: string
  ) => Promise<void>;
}

export default function AdminReportDetailDrawer({
  selectedReportId,
  selectedReportDetail,
  reportDetailLoading,
  adminMemo,
  setAdminMemo,
  closeReportDetail,
  handleReportAction,
}: AdminReportDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={closeReportDetail}
        aria-label="상세 패널 닫기"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-700 bg-slate-900/95 backdrop-blur flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">신고 케이스 상세</p>
            <h2 className="text-lg font-bold text-white">Case #{selectedReportId}</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={closeReportDetail}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {reportDetailLoading || !selectedReportDetail ? (
            <div className="text-slate-400">상세 정보를 불러오는 중...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">상태</p>
                  <p className="text-slate-200 mt-1">{selectedReportDetail.status || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">사유</p>
                  <p className="text-slate-200 mt-1">{selectedReportDetail.reason || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">신고자</p>
                  <p className="text-slate-200 mt-1">{selectedReportDetail.reporterHandle || '-'}</p>
                </div>
                <div className="rounded-lg border border-slate-800 p-3">
                  <p className="text-slate-500">처리시각</p>
                  <p className="text-slate-200 mt-1">{selectedReportDetail.handledAt ? getTimeAgo(selectedReportDetail.handledAt) : '-'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 p-3 text-sm">
                <p className="text-slate-500 mb-1">게시물 미리보기</p>
                <p className="text-slate-200 whitespace-pre-wrap">{selectedReportDetail.postPreview || '-'}</p>
              </div>

              <div className="rounded-lg border border-slate-800 p-3 text-sm space-y-2">
                <p><span className="text-slate-500">요청 조치:</span> <span className="text-slate-200">{selectedReportDetail.requestedAction || '-'}</span></p>
                <p><span className="text-slate-500">Appeal 상태:</span> <span className="text-slate-200">{selectedReportDetail.appealStatus || '-'}</span></p>
                <p><span className="text-slate-500">Appeal 사유:</span> <span className="text-slate-200">{selectedReportDetail.appealReason || '-'}</span></p>
                <p><span className="text-slate-500">Appeal 횟수:</span> <span className="text-slate-200">{selectedReportDetail.appealCount ?? 0}</span></p>
                <p><span className="text-slate-500">증빙 URL:</span> <span className="text-slate-200 break-all">{selectedReportDetail.evidenceUrl || '-'}</span></p>
              </div>

              <div className="rounded-lg border border-slate-800 p-3">
                <p className="text-sm text-slate-500 mb-2">관리자 메모</p>
                <textarea
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  className="w-full min-h-24 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  placeholder="조치 근거를 입력하세요."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handleReportAction(selectedReportDetail.id, 'TAKE_DOWN', adminMemo)} className="bg-red-600 hover:bg-red-700 text-white">
                  TAKE_DOWN
                </Button>
                <Button onClick={() => handleReportAction(selectedReportDetail.id, 'DISMISS', adminMemo)} className="bg-slate-700 hover:bg-slate-600 text-white">
                  DISMISS
                </Button>
                <Button onClick={() => handleReportAction(selectedReportDetail.id, 'RESTORE', adminMemo)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  RESTORE
                </Button>
                <Button onClick={() => handleReportAction(selectedReportDetail.id, 'REQUIRE_MODIFICATION', adminMemo)} className="bg-amber-600 hover:bg-amber-700 text-white">
                  REQUIRE_MODIFICATION
                </Button>
                <Button onClick={() => handleReportAction(selectedReportDetail.id, 'WARNING', adminMemo)} className="col-span-2 bg-sky-600 hover:bg-sky-700 text-white">
                  WARNING
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
