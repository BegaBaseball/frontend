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
import type { AdminReport, AdminReportFilters } from '../../types/admin';
import { getTimeAgo } from '../../utils/formatters';
import { AdminEyeIcon } from './AdminDetailIcons';
import { AdminStatusBadge, adminNativeSelectClassName } from './AdminPanelPrimitives';

type AdminReportAction =
  | 'TAKE_DOWN'
  | 'REQUIRE_MODIFICATION'
  | 'WARNING'
  | 'DISMISS'
  | 'RESTORE';

interface AdminReportsPanelProps {
  reportFilters: AdminReportFilters;
  reportsLoading: boolean;
  reports: AdminReport[];
  updateReportFilters: (next: Partial<AdminReportFilters>) => void;
  resetReportFilters: () => void;
  openReportDetail: (reportId: number) => void;
  handleReportAction: (
    reportId: number,
    action: AdminReportAction,
    adminMemo?: string
  ) => void | Promise<void>;
}

const reportStatusLabel: Record<string, string> = {
  PENDING: '대기',
  IN_REVIEW: '검토중',
  RESOLVED: '완료',
  CLOSED: '종결',
};

export function AdminReportsPanel({
  reportFilters,
  reportsLoading,
  reports,
  updateReportFilters,
  resetReportFilters,
  openReportDetail,
  handleReportAction,
}: AdminReportsPanelProps) {
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-6">
        <select
          value={reportFilters.status}
          data-testid="admin-reports-status-filter"
          onChange={(e) => updateReportFilters({ status: e.target.value })}
          className={adminNativeSelectClassName}
        >
          <option value="all">상태 전체</option>
          <option value="PENDING">PENDING</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <select
          value={reportFilters.reason}
          data-testid="admin-reports-reason-filter"
          onChange={(e) => updateReportFilters({ reason: e.target.value })}
          className={adminNativeSelectClassName}
        >
          <option value="all">사유 전체</option>
          <option value="SPAM">SPAM</option>
          <option value="INAPPROPRIATE_CONTENT">INAPPROPRIATE_CONTENT</option>
          <option value="ABUSIVE_LANGUAGE">ABUSIVE_LANGUAGE</option>
          <option value="ADVERTISEMENT">ADVERTISEMENT</option>
          <option value="COPYRIGHT_INFRINGEMENT">COPYRIGHT_INFRINGEMENT</option>
          <option value="FAKE_INFORMATION">FAKE_INFORMATION</option>
          <option value="OTHER">OTHER</option>
        </select>
        <Input
          type="date"
          value={reportFilters.fromDate}
          onChange={(e) => updateReportFilters({ fromDate: e.target.value })}
          className="bg-slate-800/50 border-slate-700 text-slate-200"
        />
        <Input
          type="date"
          value={reportFilters.toDate}
          onChange={(e) => updateReportFilters({ toDate: e.target.value })}
          className="bg-slate-800/50 border-slate-700 text-slate-200"
        />
        <Button
          variant="outline"
          data-testid="admin-reports-reset-filters"
          className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          onClick={resetReportFilters}
        >
          필터 초기화
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/50">
              <TableHead className="font-semibold text-slate-400">ID</TableHead>
              <TableHead className="font-semibold text-slate-400">사유</TableHead>
              <TableHead className="font-semibold text-slate-400">상태</TableHead>
              <TableHead className="font-semibold text-slate-400">게시물</TableHead>
              <TableHead className="font-semibold text-slate-400">신고자</TableHead>
              <TableHead className="font-semibold text-slate-400">접수일</TableHead>
              <TableHead className="text-right font-semibold text-slate-400">상세/조치</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-slate-500">
                  신고 목록 로딩 중...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-slate-500">
                  신고 케이스가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer border-slate-800 transition-colors duration-200 hover:bg-slate-800/30"
                  onClick={() => openReportDetail(report.id)}
                >
                  <TableCell className="font-mono text-[14px] text-slate-300">{report.id}</TableCell>
                  <TableCell className="text-slate-300">{report.reason || '-'}</TableCell>
                  <TableCell>
                    <AdminStatusBadge
                      status={report.status || 'PENDING'}
                      label={report.status ? (reportStatusLabel[report.status] || report.status) : '대기'}
                    />
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-slate-300">{report.postPreview || '-'}</TableCell>
                  <TableCell className="text-slate-300">{report.reporterHandle || '-'}</TableCell>
                  <TableCell className="text-[14px] text-slate-400">{getTimeAgo(report.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-report-detail-${report.id}`}
                        className="text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReportDetail(report.id);
                        }}
                      >
                        <AdminEyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-report-take-down-${report.id}`}
                        className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportAction(report.id, 'TAKE_DOWN', '정책 위반 게시물 비공개');
                        }}
                      >
                        비공개
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-report-dismiss-${report.id}`}
                        className="text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportAction(report.id, 'DISMISS', '검토 결과 위반 아님');
                        }}
                      >
                        기각
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
