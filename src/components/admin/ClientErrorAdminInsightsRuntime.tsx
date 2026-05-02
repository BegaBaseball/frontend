import type { AdminClientErrorDashboard } from '../../types/admin';
import { getTimeAgo } from '../../utils/formatters';
import { AdminLinkIcon, AdminSirenIcon } from './AdminDetailIcons';
import { AdminBadge } from './AdminPanelPrimitives';
import {
  bucketBadgeClass,
  channelBadgeClass,
  formatDetailedDateTime,
} from './clientErrorAdminShared';

export default function ClientErrorAdminInsightsRuntime({
  dashboard,
}: {
  dashboard: AdminClientErrorDashboard | null;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <AdminLinkIcon className="h-5 w-5 text-amber-300" />
          <div>
            <h3 className="text-lg font-bold text-white">Recent Feedback</h3>
            <p className="text-[14px] text-slate-400">사용자가 Error ID 기준으로 전송한 최신 제보입니다.</p>
          </div>
        </div>

        <div className="space-y-3">
          {dashboard?.recentFeedback.length ? dashboard.recentFeedback.map((item) => (
            <div key={`${item.eventId}-${item.occurredAt}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <AdminBadge className={bucketBadgeClass.feedback}>FEEDBACK</AdminBadge>
                <span className="text-[14px] text-slate-500">{getTimeAgo(item.occurredAt)}</span>
              </div>
              <p className="text-[14px] text-slate-100">{item.comment}</p>
              <div className="mt-3 space-y-1 text-[14px] text-slate-400">
                <p>eventId: {item.eventId}</p>
                <p>route: {item.route}</p>
                <p>actionTaken: {item.actionTaken}</p>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-[14px] text-slate-500">
              최근 피드백이 없습니다.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <AdminSirenIcon className="h-5 w-5 text-rose-300" />
          <div>
            <h3 className="text-lg font-bold text-white">Recent Alerts</h3>
            <p className="text-[14px] text-slate-400">백엔드가 설정된 채널로 전송한 최근 알림 결과입니다.</p>
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
                <span className="text-[14px] text-slate-500">{formatDetailedDateTime(item.notifiedAt)}</span>
              </div>
              <p className="text-[14px] text-slate-100">{item.latestMessage || '메시지 없음'}</p>
              <div className="mt-3 space-y-1 text-[14px] text-slate-400">
                <p>route: {item.route}</p>
                <p>count: {item.observedCount} / threshold {item.thresholdCount}</p>
                <p>fingerprint: {item.fingerprint}</p>
                {item.failureReason ? <p className="text-red-300">failure: {item.failureReason}</p> : null}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-center text-[14px] text-slate-500">
              최근 알림 이력이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
