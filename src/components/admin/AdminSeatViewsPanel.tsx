import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import type { AdminSeatView, AdminSeatViewFilters } from '../../types/admin';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { AdminEyeIcon } from './AdminDetailIcons';
import { AdminBadge, adminNativeSelectClassName } from './AdminPanelPrimitives';

type SeatViewModerationPayload = {
  adminLabel: 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';
  moderationStatus: 'APPROVED' | 'REJECTED';
  adminMemo?: string;
};

interface AdminSeatViewsPanelProps {
  seatViewFilters: AdminSeatViewFilters;
  seatViewsLoading: boolean;
  seatViews: AdminSeatView[];
  updateSeatViewFilters: (next: Partial<AdminSeatViewFilters>) => void;
  resetSeatViewFilters: () => void;
  openSeatViewDetail: (seatViewId: number) => void;
  handleSeatViewAction: (
    seatViewId: number,
    payload: SeatViewModerationPayload
  ) => void | Promise<void>;
}

export function AdminSeatViewsPanel({
  seatViewFilters,
  seatViewsLoading,
  seatViews,
  updateSeatViewFilters,
  resetSeatViewFilters,
  openSeatViewDetail,
  handleSeatViewAction,
}: AdminSeatViewsPanelProps) {
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-5">
        <select
          value={seatViewFilters.moderationStatus}
          data-testid="admin-seat-views-status-filter"
          onChange={(e) => updateSeatViewFilters({ moderationStatus: e.target.value })}
          className={adminNativeSelectClassName}
        >
          <option value="all">상태 전체</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <Input
          data-testid="admin-seat-views-stadium-filter"
          value={seatViewFilters.stadium}
          onChange={(e) => updateSeatViewFilters({ stadium: e.target.value })}
          placeholder="구장명 필터"
          className="bg-slate-800/50 border-slate-700 text-slate-200"
        />
        <select
          value={seatViewFilters.aiSuggestedLabel}
          data-testid="admin-seat-views-ai-filter"
          onChange={(e) => updateSeatViewFilters({ aiSuggestedLabel: e.target.value })}
          className={adminNativeSelectClassName}
        >
          <option value="all">AI 라벨 전체</option>
          <option value="SEAT_VIEW">SEAT_VIEW</option>
          <option value="TICKET">TICKET</option>
          <option value="OTHER">OTHER</option>
          <option value="INAPPROPRIATE">INAPPROPRIATE</option>
        </select>
        <select
          value={seatViewFilters.adminLabel}
          data-testid="admin-seat-views-admin-filter"
          onChange={(e) => updateSeatViewFilters({ adminLabel: e.target.value })}
          className={adminNativeSelectClassName}
        >
          <option value="all">관리자 라벨 전체</option>
          <option value="SEAT_VIEW">SEAT_VIEW</option>
          <option value="TICKET">TICKET</option>
          <option value="OTHER">OTHER</option>
          <option value="INAPPROPRIATE">INAPPROPRIATE</option>
        </select>
        <select
          value={seatViewFilters.ticketVerified}
          data-testid="admin-seat-views-ticket-filter"
          onChange={(e) => updateSeatViewFilters({ ticketVerified: e.target.value })}
          className={adminNativeSelectClassName}
        >
          <option value="all">티켓 인증 전체</option>
          <option value="verified">인증 완료</option>
          <option value="unverified">미인증</option>
        </select>
        <Button
          variant="outline"
          data-testid="admin-seat-views-reset-filters"
          className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          onClick={resetSeatViewFilters}
        >
          필터 초기화
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/50">
              <TableHead className="font-semibold text-slate-400">ID</TableHead>
              <TableHead className="font-semibold text-slate-400">사진</TableHead>
              <TableHead className="font-semibold text-slate-400">구장/좌석</TableHead>
              <TableHead className="font-semibold text-slate-400">AI</TableHead>
              <TableHead className="font-semibold text-slate-400">인증</TableHead>
              <TableHead className="font-semibold text-slate-400">상태</TableHead>
              <TableHead className="text-right font-semibold text-slate-400">상세/조치</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seatViewsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-slate-500">
                  시야뷰 후보 로딩 중...
                </TableCell>
              </TableRow>
            ) : seatViews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-slate-500">
                  시야뷰 후보가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              seatViews.map((seatView) => (
                <TableRow
                  key={seatView.id}
                  className="cursor-pointer border-slate-800 transition-colors duration-200 hover:bg-slate-800/30"
                  onClick={() => openSeatViewDetail(seatView.id)}
                >
                  <TableCell className="font-mono text-caption text-slate-300">{seatView.id}</TableCell>
                  <TableCell>
                    <img
                      src={seatView.photoUrl}
                      alt="시야뷰 후보"
                      className="h-14 w-14 rounded-lg border border-slate-800 object-cover"
                    />
                  </TableCell>
                  <TableCell className="text-caption text-slate-300">
                    <div>{formatStadiumDisplayName(seatView.stadium)}</div>
                    <div className="text-slate-500">
                      {[seatView.section, seatView.block, seatView.seatRow, seatView.seatNumber].filter(Boolean).join(' / ') || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-caption text-slate-300">
                    <div>{seatView.aiSuggestedLabel || '-'}</div>
                    <div className="text-slate-500">
                      {seatView.aiConfidence != null ? `${Math.round(seatView.aiConfidence * 100)}%` : '미분류'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AdminBadge className={seatView.ticketVerified ? 'bg-emerald-500/20 text-emerald-300 border-0' : 'bg-slate-700 text-slate-300 border-0'}>
                      {seatView.ticketVerified ? '인증 완료' : '미인증'}
                    </AdminBadge>
                  </TableCell>
                  <TableCell>
                    <AdminBadge
                      className={
                        seatView.moderationStatus === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-0'
                          : seatView.moderationStatus === 'REJECTED'
                            ? 'bg-red-500/20 text-red-300 border-0'
                            : 'bg-amber-500/20 text-amber-300 border-0'
                      }
                    >
                      {seatView.moderationStatus || '미제출'}
                    </AdminBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-seat-view-detail-${seatView.id}`}
                        className="text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSeatViewDetail(seatView.id);
                        }}
                      >
                        <AdminEyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-seat-view-approve-${seatView.id}`}
                        className="text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeatViewAction(seatView.id, {
                            adminLabel: 'SEAT_VIEW',
                            moderationStatus: 'APPROVED',
                            adminMemo: '관리자 승인',
                          });
                        }}
                      >
                        승인
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
