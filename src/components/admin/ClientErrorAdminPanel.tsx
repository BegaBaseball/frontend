import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bug,
  Clock3,
  Filter,
  Link2,
  RefreshCw,
  Search,
  Siren,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  fetchAdminClientErrorDashboard,
  fetchAdminClientErrorEventDetail,
  fetchAdminClientErrorEvents,
} from '../../api/admin';
import type {
  AdminClientErrorDashboard,
  AdminClientErrorEventDetail,
  AdminClientErrorEventPage,
} from '../../types/admin';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { formatDate, getTimeAgo } from '../../utils/formatters';

const ClientErrorTrendChart = lazy(() => import('./ClientErrorTrendChart'));

type WindowKey = '1h' | '24h' | '7d';

type EventFilters = {
  bucket: 'all' | 'api' | 'runtime';
  source: 'all' | 'api' | 'runtime' | 'unhandled_rejection';
  statusGroup: 'all' | '5xx' | '4xx' | 'none';
  route: string;
  fingerprint: string;
  search: string;
};

const WINDOW_LABEL: Record<WindowKey, string> = {
  '1h': '최근 1시간',
  '24h': '최근 24시간',
  '7d': '최근 7일',
};

const initialEventPage: AdminClientErrorEventPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 20,
  number: 0,
  last: true,
};

const initialFilters: EventFilters = {
  bucket: 'all',
  source: 'all',
  statusGroup: 'all',
  route: '',
  fingerprint: '',
  search: '',
};

const bucketBadgeClass: Record<'api' | 'runtime' | 'feedback', string> = {
  api: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  runtime: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  feedback: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const sourceBadgeClass: Record<'api' | 'runtime' | 'unhandled_rejection' | 'unknown', string> = {
  api: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  runtime: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  unhandled_rejection: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  unknown: 'bg-slate-700 text-slate-300 border-slate-600',
};

const channelBadgeClass: Record<'telegram' | 'slack', string> = {
  telegram: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  slack: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const adminNativeSelectClassName = 'rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60';

function AdminBadge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}>
      {children}
    </span>
  );
}

const buildWindowRange = (windowKey: WindowKey) => {
  const to = new Date();
  const from = new Date(to);

  if (windowKey === '1h') {
    from.setHours(from.getHours() - 1);
  } else if (windowKey === '24h') {
    from.setHours(from.getHours() - 24);
  } else {
    from.setDate(from.getDate() - 7);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const formatAxisLabel = (value: string, granularity: 'hour' | 'day') => {
  const date = new Date(value);
  if (granularity === 'day') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${String(date.getHours()).padStart(2, '0')}:00`;
};

const formatDetailedDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return `${formatDate(value)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

function MonitoringCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'api' | 'runtime' | 'feedback';
}) {
  const toneClass = {
    api: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    runtime: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    feedback: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-4xl font-black">{value.toLocaleString()}</p>
    </div>
  );
}

export function ClientErrorAdminPanel({ active }: { active: boolean }) {
  const [windowKey, setWindowKey] = useState<WindowKey>('24h');
  const [dashboard, setDashboard] = useState<AdminClientErrorDashboard | null>(null);
  const [eventsPage, setEventsPage] = useState<AdminClientErrorEventPage>(initialEventPage);
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AdminClientErrorEventDetail | null>(null);

  const timeRange = buildWindowRange(windowKey);

  const loadDashboard = async () => {
    if (!active) {
      return;
    }

    setLoadingDashboard(true);
    setPanelError(null);
    try {
      const data = await fetchAdminClientErrorDashboard(timeRange);
      setDashboard(data);
    } catch (error) {
      console.error('클라이언트 에러 대시보드 조회 오류:', error);
      setPanelError(getApiErrorMessage(error, '클라이언트 에러 대시보드를 불러오지 못했습니다.'));
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadEvents = async (page = currentPage) => {
    if (!active) {
      return;
    }

    setLoadingEvents(true);
    setPanelError(null);
    try {
      const data = await fetchAdminClientErrorEvents({
        bucket: filters.bucket !== 'all' ? filters.bucket : undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        statusGroup: filters.statusGroup !== 'all' ? filters.statusGroup : undefined,
        route: filters.route || undefined,
        fingerprint: filters.fingerprint || undefined,
        search: filters.search || undefined,
        from: timeRange.from,
        to: timeRange.to,
        page,
        size: 20,
      });
      setEventsPage(data);
      setCurrentPage(data.number ?? page);
    } catch (error) {
      console.error('클라이언트 에러 이벤트 조회 오류:', error);
      setPanelError(getApiErrorMessage(error, '클라이언트 에러 이벤트를 불러오지 못했습니다.'));
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (!active) {
      return;
    }

    setCurrentPage(0);
    void loadDashboard();
    void loadEvents(0);
  }, [active, windowKey]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = setTimeout(() => {
      setCurrentPage(0);
      void loadEvents(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [active, filters.bucket, filters.source, filters.statusGroup, filters.route, filters.fingerprint, filters.search]);

  const handleRefresh = async () => {
    await Promise.all([loadDashboard(), loadEvents(currentPage)]);
  };

  const handleOpenDetail = async (eventId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await fetchAdminClientErrorEventDetail(eventId);
      setSelectedEvent(detail);
    } catch (error) {
      console.error('클라이언트 에러 상세 조회 오류:', error);
      setSelectedEvent(null);
      setPanelError(getApiErrorMessage(error, '클라이언트 에러 상세를 불러오지 못했습니다.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const chartData = dashboard?.timeSeries.map((point) => ({
    ...point,
    label: formatAxisLabel(point.bucketStart, dashboard.granularity),
  })) || [];

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
              <Bug className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">클라이언트 에러 관제</h2>
              <p className="text-sm text-slate-400">
                브라우저가 보고한 API/Runtime/Feedback 이벤트를 한 화면에서 추적합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            data-testid="admin-client-errors-window-trigger"
            value={windowKey}
            onChange={(event) => setWindowKey(event.target.value as WindowKey)}
            className={`w-[150px] ${adminNativeSelectClassName}`}
          >
            <option value="1h">최근 1시간</option>
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
          </select>

          <Button
            type="button"
            variant="outline"
            data-testid="admin-client-errors-refresh"
            onClick={() => void handleRefresh()}
            className="rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>

      {panelError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {panelError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MonitoringCard label="API Events" value={dashboard?.totals.api ?? 0} tone="api" />
        <MonitoringCard label="Runtime Events" value={dashboard?.totals.runtime ?? 0} tone="runtime" />
        <MonitoringCard label="Feedback" value={dashboard?.totals.feedback ?? 0} tone="feedback" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Bucket별 발생 추이</h3>
              <p className="text-sm text-slate-400">
                {WINDOW_LABEL[windowKey]} 기준 집계. 피드백은 별도 row로 적재된 사용자 제보 수입니다.
              </p>
            </div>
            <AdminBadge className="border-slate-700 bg-slate-800 text-slate-200">
              <Clock3 className="mr-1 h-3 w-3" />
              {dashboard?.granularity === 'day' ? 'Daily' : 'Hourly'}
            </AdminBadge>
          </div>

          <div className="h-[320px]">
            <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400">차트 로딩 중...</div>}>
              <ClientErrorTrendChart chartData={chartData} loading={loadingDashboard} />
            </Suspense>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-lg font-bold text-white">상위 Fingerprints</h3>
          <p className="mb-4 text-sm text-slate-400">
            동일 오류를 hash fingerprint로 묶어 상위 재발 패턴을 확인합니다.
          </p>
          <div className="space-y-3">
            {dashboard?.topFingerprints.length ? dashboard.topFingerprints.map((item) => (
              <button
                key={item.fingerprint}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    bucket: item.bucket === 'feedback' ? prev.bucket : item.bucket,
                    fingerprint: item.fingerprint,
                  }));
                  setCurrentPage(0);
                }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-rose-500/30 hover:bg-slate-950"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <AdminBadge className={bucketBadgeClass[item.bucket]}>{item.bucket.toUpperCase()}</AdminBadge>
                  <AdminBadge className={sourceBadgeClass[item.source]}>{item.source}</AdminBadge>
                  {item.latestAlertChannel ? (
                    <AdminBadge className={channelBadgeClass[item.latestAlertChannel]}>
                      {item.latestAlertChannel.toUpperCase()}
                    </AdminBadge>
                  ) : null}
                  <span className="text-sm font-semibold text-white">{item.count.toLocaleString()}건</span>
                </div>
                <p className="line-clamp-2 text-sm text-slate-200">{item.message}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <p>route: {item.route}</p>
                  <p>fingerprint: {item.fingerprint}</p>
                  <p>최근 발생: {getTimeAgo(item.latestOccurredAt)}</p>
                  <p>최근 알림: {item.latestAlertSentAt ? getTimeAgo(item.latestAlertSentAt) : '없음'}</p>
                </div>
              </button>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
                집계할 fingerprint가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <Filter className="h-5 w-5 text-slate-400" />
          <div>
            <h3 className="text-lg font-bold text-white">이벤트 탐색</h3>
            <p className="text-sm text-slate-400">
              bucket, source, status group, route, fingerprint, 전문 검색으로 raw event를 좁힙니다.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select
            data-testid="admin-client-errors-bucket-trigger"
            value={filters.bucket}
            onChange={(event) => setFilters((prev) => ({ ...prev, bucket: event.target.value as EventFilters['bucket'] }))}
            className={adminNativeSelectClassName}
          >
            <option value="all">Bucket 전체</option>
            <option value="api">API</option>
            <option value="runtime">Runtime</option>
          </select>

          <select
            data-testid="admin-client-errors-source-trigger"
            value={filters.source}
            onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value as EventFilters['source'] }))}
            className={adminNativeSelectClassName}
          >
            <option value="all">Source 전체</option>
            <option value="api">api</option>
            <option value="runtime">runtime</option>
            <option value="unhandled_rejection">unhandled_rejection</option>
          </select>

          <select
            data-testid="admin-client-errors-status-trigger"
            value={filters.statusGroup}
            onChange={(event) => setFilters((prev) => ({ ...prev, statusGroup: event.target.value as EventFilters['statusGroup'] }))}
            className={adminNativeSelectClassName}
          >
            <option value="all">Status 전체</option>
            <option value="5xx">5xx</option>
            <option value="4xx">4xx</option>
            <option value="none">none</option>
          </select>

          <Input
            data-testid="admin-client-errors-route-filter"
            value={filters.route}
            onChange={(event) => setFilters((prev) => ({ ...prev, route: event.target.value }))}
            placeholder="Route filter"
            className="rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 placeholder:text-slate-500"
          />

          <Input
            data-testid="admin-client-errors-fingerprint-filter"
            value={filters.fingerprint}
            onChange={(event) => setFilters((prev) => ({ ...prev, fingerprint: event.target.value }))}
            placeholder="Fingerprint"
            className="rounded-xl border-slate-700 bg-slate-800/70 font-mono text-slate-100 placeholder:text-slate-500"
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              data-testid="admin-client-errors-search-filter"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="message / route / eventId"
              className="rounded-xl border-slate-700 bg-slate-800/70 pl-10 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-800/40 hover:bg-slate-800/40">
                <TableHead className="text-slate-400">Bucket</TableHead>
                <TableHead className="text-slate-400">Message</TableHead>
                <TableHead className="text-slate-400">Route</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Occurred</TableHead>
                <TableHead className="text-right text-slate-400">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingEvents ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                    이벤트를 불러오는 중입니다.
                  </TableCell>
                </TableRow>
              ) : eventsPage.content.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                    조건에 맞는 이벤트가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                eventsPage.content.map((event) => (
                  <TableRow key={event.eventId} className="border-slate-800 hover:bg-slate-800/30">
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <AdminBadge className={bucketBadgeClass[event.bucket]}>{event.bucket}</AdminBadge>
                        <AdminBadge className={sourceBadgeClass[event.source]}>{event.source}</AdminBadge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal">
                      <p className="line-clamp-2 text-sm text-slate-200">{event.message}</p>
                      <p className="mt-2 text-xs font-mono text-slate-500">{event.eventId}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal text-sm text-slate-300">
                      {event.route}
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">
                      {event.statusCode ? `${event.statusCode} (${event.statusGroup})` : event.statusGroup}
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      <p>{getTimeAgo(event.occurredAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDetailedDateTime(event.occurredAt)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        data-testid={`admin-client-errors-detail-${event.eventId}`}
                        onClick={() => void handleOpenDetail(event.eventId)}
                        className="rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white"
                      >
                        열기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            총 {eventsPage.totalElements.toLocaleString()}건 중 {(eventsPage.number ?? 0) + 1} / {Math.max(eventsPage.totalPages, 1)} 페이지
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={(eventsPage.number ?? 0) <= 0 || loadingEvents}
              onClick={() => void loadEvents(Math.max((eventsPage.number ?? 0) - 1, 0))}
              className="rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-700"
            >
              이전
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={eventsPage.last || loadingEvents}
              onClick={() => void loadEvents((eventsPage.number ?? 0) + 1)}
              className="rounded-xl border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-700"
            >
              다음
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Link2 className="h-5 w-5 text-amber-300" />
            <div>
              <h3 className="text-lg font-bold text-white">Recent Feedback</h3>
              <p className="text-sm text-slate-400">사용자가 Error ID 기준으로 전송한 최신 제보입니다.</p>
            </div>
          </div>

          <div className="space-y-3">
            {dashboard?.recentFeedback.length ? dashboard.recentFeedback.map((item) => (
              <div key={`${item.eventId}-${item.occurredAt}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <AdminBadge className={bucketBadgeClass.feedback}>FEEDBACK</AdminBadge>
                  <span className="text-xs text-slate-500">{getTimeAgo(item.occurredAt)}</span>
                </div>
                <p className="text-sm text-slate-100">{item.comment}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <p>eventId: {item.eventId}</p>
                  <p>route: {item.route}</p>
                  <p>actionTaken: {item.actionTaken}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
                최근 피드백이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Siren className="h-5 w-5 text-rose-300" />
            <div>
              <h3 className="text-lg font-bold text-white">Recent Alerts</h3>
              <p className="text-sm text-slate-400">백엔드가 설정된 채널로 전송한 최근 알림 결과입니다.</p>
            </div>
          </div>

          <div className="space-y-3">
            {dashboard?.recentAlerts.length ? dashboard.recentAlerts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AdminBadge className={bucketBadgeClass[item.bucket]}>{item.bucket.toUpperCase()}</AdminBadge>
                    <AdminBadge className={channelBadgeClass[item.channel]}>{item.channel.toUpperCase()}</AdminBadge>
                    <AdminBadge className={item.deliveryStatus === 'SENT' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-red-500/30 bg-red-500/15 text-red-300'}>
                      {item.deliveryStatus}
                    </AdminBadge>
                  </div>
                  <span className="text-xs text-slate-500">{formatDetailedDateTime(item.notifiedAt)}</span>
                </div>
                <p className="text-sm text-slate-100">{item.latestMessage || '메시지 없음'}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <p>route: {item.route}</p>
                  <p>count: {item.observedCount} / threshold {item.thresholdCount}</p>
                  <p>fingerprint: {item.fingerprint}</p>
                  {item.failureReason ? <p className="text-red-300">failure: {item.failureReason}</p> : null}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
                최근 알림 이력이 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>

      <PlainDialog
        open={detailOpen}
        onClose={handleCloseDetail}
        title="Client Error Detail"
        description="Error ID 기준 raw stack, feedback, 동일 fingerprint 최근 이벤트를 함께 봅니다."
        contentTestId="admin-client-errors-detail-dialog"
        className="sm:max-w-4xl border-slate-700 bg-slate-950 text-slate-100"
        bodyClassName="max-h-[calc(85vh-5.5rem)] overflow-y-auto"
      >

          {detailLoading ? (
            <div className="py-12 text-center text-slate-400">상세 정보를 불러오는 중입니다.</div>
          ) : selectedEvent ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <AdminBadge className={bucketBadgeClass[selectedEvent.event.bucket]}>{selectedEvent.event.bucket.toUpperCase()}</AdminBadge>
                    <AdminBadge className={sourceBadgeClass[selectedEvent.event.source]}>{selectedEvent.event.source}</AdminBadge>
                    <AdminBadge className="border-slate-700 bg-slate-800 text-slate-200">{selectedEvent.event.statusGroup}</AdminBadge>
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <p className="font-mono text-xs text-slate-500">{selectedEvent.event.eventId}</p>
                    <p>{selectedEvent.event.message}</p>
                    <p>route: {selectedEvent.event.route}</p>
                    <p>endpoint: {selectedEvent.event.endpoint || '-'}</p>
                    <p>occurredAt: {formatDetailedDateTime(selectedEvent.event.occurredAt)}</p>
                    <p>feedbackCount: {selectedEvent.event.feedbackCount}</p>
                    <p>fingerprint: {selectedEvent.event.fingerprint}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <AlertTriangle className="h-4 w-4" />
                    Feedback
                  </h4>
                  <div className="space-y-3">
                    {selectedEvent.feedback.length ? selectedEvent.feedback.map((item) => (
                      <div key={`${item.eventId}-${item.occurredAt}-${item.actionTaken}`} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                        <p className="text-sm text-slate-100">{item.comment}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {item.actionTaken} · {formatDetailedDateTime(item.occurredAt)}
                        </p>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed border-slate-800 px-3 py-8 text-center text-sm text-slate-500">
                        연결된 피드백이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Stack Trace</h4>
                  <pre className="max-h-[280px] overflow-auto rounded-xl bg-slate-950/80 p-4 text-xs text-slate-200">
                    {selectedEvent.stack || 'No stack trace'}
                  </pre>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Component Stack</h4>
                  <pre className="max-h-[280px] overflow-auto rounded-xl bg-slate-950/80 p-4 text-xs text-slate-200">
                    {selectedEvent.componentStack || 'No component stack'}
                  </pre>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">같은 Fingerprint 최근 이벤트</h4>
                <div className="space-y-3">
                  {selectedEvent.sameFingerprintRecentEvents.length ? selectedEvent.sameFingerprintRecentEvents.map((item) => (
                    <button
                      key={item.eventId}
                      type="button"
                      onClick={() => void handleOpenDetail(item.eventId)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-left transition hover:border-slate-600"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminBadge className={sourceBadgeClass[item.source]}>{item.source}</AdminBadge>
                        <span className="text-xs text-slate-500">{formatDetailedDateTime(item.occurredAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-100">{item.message}</p>
                    </button>
                  )) : (
                    <div className="rounded-xl border border-dashed border-slate-800 px-3 py-8 text-center text-sm text-slate-500">
                      같은 fingerprint의 최근 이벤트가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">선택한 이벤트를 불러오지 못했습니다.</div>
          )}
      </PlainDialog>
    </div>
  );
}
