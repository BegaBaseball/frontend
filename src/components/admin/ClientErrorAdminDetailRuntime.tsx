import type { AdminClientErrorEventDetail } from '../../types/admin';
import PlainDialog from '../ui/plain-dialog';
import { AdminAlertTriangleIcon } from './AdminDetailIcons';
import { AdminBadge } from './AdminPanelPrimitives';
import {
  bucketBadgeClass,
  formatDetailedDateTime,
  sourceBadgeClass,
} from './clientErrorAdminShared';

export default function ClientErrorAdminDetailRuntime({
  open,
  detailLoading,
  selectedEvent,
  onClose,
  onOpenDetail,
}: {
  open: boolean;
  detailLoading: boolean;
  selectedEvent: AdminClientErrorEventDetail | null;
  onClose: () => void;
  onOpenDetail: (eventId: string) => void | Promise<void>;
}) {
  return (
    <PlainDialog
      open={open}
      onClose={onClose}
      title="Client Error Detail"
      description="Error ID 기준 raw stack, feedback, 동일 fingerprint 최근 이벤트를 함께 봅니다."
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
              <div className="space-y-2 text-caption text-slate-300">
                <p className="font-mono text-caption text-slate-500">{selectedEvent.event.eventId}</p>
                <p>{selectedEvent.event.message}</p>
                <p>route: {selectedEvent.event.route}</p>
                <p>endpoint: {selectedEvent.event.endpoint || '-'}</p>
                <p>occurredAt: {formatDetailedDateTime(selectedEvent.event.occurredAt)}</p>
                <p>feedbackCount: {selectedEvent.event.feedbackCount}</p>
                <p>fingerprint: {selectedEvent.event.fingerprint}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400">
                <AdminAlertTriangleIcon className="h-4 w-4" />
                Feedback
              </h4>
              <div className="space-y-3">
                {selectedEvent.feedback.length ? selectedEvent.feedback.map((item) => (
                  <div key={`${item.eventId}-${item.occurredAt}-${item.actionTaken}`} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <p className="text-caption text-slate-100">{item.comment}</p>
                    <p className="mt-2 text-caption text-slate-500">
                      {item.actionTaken} · {formatDetailedDateTime(item.occurredAt)}
                    </p>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-800 px-3 py-8 text-center text-caption text-slate-500">
                    연결된 피드백이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h4 className="mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400">Stack Trace</h4>
              <pre className="max-h-[280px] overflow-auto rounded-xl bg-slate-950/80 p-4 text-caption text-slate-200">
                {selectedEvent.stack || 'No stack trace'}
              </pre>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h4 className="mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400">Component Stack</h4>
              <pre className="max-h-[280px] overflow-auto rounded-xl bg-slate-950/80 p-4 text-caption text-slate-200">
                {selectedEvent.componentStack || 'No component stack'}
              </pre>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h4 className="mb-3 text-caption font-semibold uppercase tracking-[0.2em] text-slate-400">같은 Fingerprint 최근 이벤트</h4>
            <div className="space-y-3">
              {selectedEvent.sameFingerprintRecentEvents.length ? selectedEvent.sameFingerprintRecentEvents.map((item) => (
                <button
                  key={item.eventId}
                  type="button"
                  onClick={() => void onOpenDetail(item.eventId)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-left transition hover:border-slate-600"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge className={sourceBadgeClass[item.source]}>{item.source}</AdminBadge>
                    <span className="text-caption text-slate-500">{formatDetailedDateTime(item.occurredAt)}</span>
                  </div>
                    <p className="mt-2 text-caption text-slate-100">{item.message}</p>
                </button>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-800 px-3 py-8 text-center text-caption text-slate-500">
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
  );
}
