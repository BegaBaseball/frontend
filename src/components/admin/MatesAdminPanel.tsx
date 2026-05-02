import { useState } from 'react';
import { AdminBadge } from './AdminPanelPrimitives';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatGameDate } from '../../utils/formatters';
import { AdminCalendarIcon, AdminTrashIcon } from './AdminPanelIcons';

interface AdminMate {
  id: number;
  title: string;
  hostName: string;
  gameDate: string;
  maxMembers: number;
  currentMembers: number;
  status: string;
}

interface MatesAdminPanelProps {
  mates: AdminMate[];
  handleDeleteMate: (mateId: number) => void;
}

const statusBadge: Record<string, { className: string; label: string }> = {
  pending: { className: 'bg-amber-500/20 text-amber-300 border-0', label: '모집중' },
  matched: { className: 'bg-emerald-500/20 text-emerald-300 border-0', label: '매칭완료' },
  selling: { className: 'bg-sky-500/20 text-sky-300 border-0', label: '티켓판매' },
  sold: { className: 'bg-violet-500/20 text-violet-300 border-0', label: '판매완료' },
  completed: { className: 'bg-slate-700 text-slate-300 border-0', label: '완료' },
};

export function MatesAdminPanel({ mates, handleDeleteMate }: MatesAdminPanelProps) {
  const [pendingDeleteMate, setPendingDeleteMate] = useState<AdminMate | null>(null);

  return (
    <>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400 font-semibold">ID</TableHead>
              <TableHead className="text-slate-400 font-semibold">제목</TableHead>
              <TableHead className="text-slate-400 font-semibold">호스트</TableHead>
              <TableHead className="text-slate-400 font-semibold">경기일</TableHead>
              <TableHead className="text-slate-400 font-semibold">인원</TableHead>
              <TableHead className="text-slate-400 font-semibold">상태</TableHead>
              <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                  <AdminCalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  메이트 모임이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              mates.map((mate, index) => (
                <TableRow
                  key={mate.id}
                  className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="text-slate-300 font-mono text-[14px]">{mate.id}</TableCell>
                  <TableCell className="text-slate-200 font-semibold max-w-[200px] truncate">{mate.title}</TableCell>
                  <TableCell className="text-slate-300">{mate.hostName}</TableCell>
                  <TableCell className="text-slate-400 text-[14px]">{formatGameDate(mate.gameDate)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-sky-400 font-semibold">{mate.currentMembers}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-400">{mate.maxMembers}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <AdminBadge className={statusBadge[mate.status]?.className || 'bg-slate-700 text-slate-300 border-0'}>
                      {statusBadge[mate.status]?.label || mate.status}
                    </AdminBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                      onClick={() => setPendingDeleteMate(mate)}
                    >
                      <AdminTrashIcon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PlainDialog
        open={Boolean(pendingDeleteMate)}
        onClose={() => setPendingDeleteMate(null)}
        title="메이트 모임을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 모임과 관련된 모든 데이터가 영구적으로 삭제됩니다."
        className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100"
        footer={(
          <>
            <Button variant="outline" onClick={() => setPendingDeleteMate(null)} className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
              취소
            </Button>
            <Button
              onClick={() => {
                if (!pendingDeleteMate) return;
                handleDeleteMate(pendingDeleteMate.id);
                setPendingDeleteMate(null);
              }}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
            >
              삭제
            </Button>
          </>
        )}
      >
        {pendingDeleteMate ? (
          <p className="text-[14px] text-slate-400">
            <span className="font-semibold text-slate-200">{pendingDeleteMate.title}</span> 모임을 삭제합니다.
          </p>
        ) : null}
      </PlainDialog>
    </>
  );
}
