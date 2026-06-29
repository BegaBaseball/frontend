import type { HomeLoadFailureReason } from '../../api/homeCore';
import type { ManualBaseballDataRequest } from '../../types/manualBaseballData';
import {
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
  MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
} from '../../utils/manualBaseballDataContract';

interface HomeRecoveryBannerProps {
  loadFailureReason: HomeLoadFailureReason | null;
  manualDataRequest: ManualBaseballDataRequest | null;
  onRetry: () => void;
}

const HOME_RECOVERY_BUTTON_CLASS = 'inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border bg-background px-4 text-15 font-semibold text-foreground transition-all outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 dark:border-input dark:bg-input/30 dark:hover:bg-input/50';
const HOME_RECOVERY_REFRESH_ICON_CLASS = 'mr-1 inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent';
const HOME_RECOVERY_WARNING_ICON_CLASS = 'text-2xl font-black leading-none text-amber-600 dark:text-amber-400';

export default function HomeRecoveryBanner({
  loadFailureReason,
  manualDataRequest,
  onRetry,
}: HomeRecoveryBannerProps) {
  const isManualDataError = loadFailureReason === 'manual-data-required';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div
        data-testid="home-global-recovery"
        className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/40 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <span className={HOME_RECOVERY_WARNING_ICON_CLASS} aria-hidden="true">!</span>
          </div>
          <div className="min-w-0">
            <p className="text-body text-amber-900 dark:text-amber-200 font-black">
              {isManualDataError ? '운영자 데이터가 필요합니다' : '서비스 연결을 확인하지 못했습니다'}
            </p>
            <p className="mt-1 text-body text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
              {isManualDataError
                ? MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE
                : '경기, 예정 경기, 홈 위젯을 한 번에 다시 불러올 수 있습니다.'}
            </p>
            {isManualDataError ? (
              <div className="mt-3 space-y-2">
                {manualDataRequest?.operatorMessage ? (
                  <p className="rounded-xl border border-amber-300 bg-white/70 px-3 py-2 text-13 font-bold leading-relaxed text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-100">
                    {manualDataRequest.operatorMessage}
                  </p>
                ) : null}
                {manualDataRequest?.missingItems?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {manualDataRequest.missingItems.slice(0, 4).map((item) => (
                      <span
                        key={`${item.key}:${item.label}`}
                        className="rounded-full border border-amber-300 bg-white/70 px-2 py-1 text-xs font-black text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200"
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="inline-flex rounded-md border border-amber-300 bg-white/70 px-2 py-1 font-mono text-xs font-black text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200">
                  {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className={`${HOME_RECOVERY_BUTTON_CLASS} w-full border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/40 sm:ml-auto sm:w-auto`}
        >
          <span className={HOME_RECOVERY_REFRESH_ICON_CLASS} aria-hidden="true" /> 전체 다시 시도
        </button>
      </div>
    </div>
  );
}
