import { Calendar, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { formatGameDate } from '../../utils/formatters';

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
  return (
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
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
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
                <TableCell className="text-slate-300 font-mono text-sm">{mate.id}</TableCell>
                <TableCell className="text-slate-200 font-medium max-w-[200px] truncate">{mate.title}</TableCell>
                <TableCell className="text-slate-300">{mate.hostName}</TableCell>
                <TableCell className="text-slate-400 text-sm">{formatGameDate(mate.gameDate)}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-sky-400 font-semibold">{mate.currentMembers}</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-400">{mate.maxMembers}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={statusBadge[mate.status]?.className || 'bg-slate-700 text-slate-300 border-0'}>
                    {statusBadge[mate.status]?.label || mate.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                          메이트 모임을 삭제하시겠습니까?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          이 작업은 되돌릴 수 없습니다. 모임과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                          취소
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteMate(mate.id)}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
