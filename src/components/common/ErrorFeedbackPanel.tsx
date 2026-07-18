import { useMemo, useState } from 'react';
import type { ErrorRetryHandler, ErrorSource } from '../../types/error';

interface ErrorFeedbackPanelProps {
  errorId?: string | null;
  source: ErrorSource;
  onRetry?: ErrorRetryHandler;
  onReload?: (() => void) | null;
}

const FEEDBACK_ACTION_BY_SOURCE: Record<ErrorSource, string> = {
  runtime: 'error_boundary_feedback',
  unhandled_rejection: 'unhandled_rejection_feedback',
  api: 'api_error_feedback',
};

export default function ErrorFeedbackPanel({
  errorId,
  source,
  onRetry = null,
  onReload = null,
}: ErrorFeedbackPanelProps) {
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const trimmedComment = comment.trim();
  const statusMessage = useMemo(() => {
    if (status === 'success') {
      return '상황 제보가 접수되었습니다.';
    }

    if (status === 'error') {
      return '제보를 전송하지 못했습니다. 잠시 후 다시 시도해주세요.';
    }

    return '';
  }, [status]);

  const handleSubmitFeedback = async () => {
    if (!errorId || !trimmedComment || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const { submitClientErrorFeedback } = await import('../../utils/clientErrorReporter');
      const submitted = await submitClientErrorFeedback({
        eventId: errorId,
        comment: trimmedComment,
        actionTaken: FEEDBACK_ACTION_BY_SOURCE[source],
      });

      if (submitted) {
        setComment('');
        setStatus('success');
        return;
      }

      setStatus('error');
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!onRetry || isRetrying) {
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry();
    } catch {
      // Ignore here. Retry failures will flow through the normal error handlers.
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
      <div className="space-y-1">
        <p className="text-body font-semibold uppercase tracking-[0.2em] text-gray-500">
          Error ID
        </p>
        <code className="block break-all rounded-lg bg-white px-3 py-2 text-body text-gray-700">
          {errorId || '생성 중'}
        </code>
      </div>

      <div className="space-y-2">
        <label className="text-body font-semibold text-gray-700" htmlFor={`error-feedback-${source}`}>
          상황 설명
        </label>
        <textarea
          id={`error-feedback-${source}`}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            if (status !== 'idle') {
              setStatus('idle');
            }
          }}
          rows={4}
          placeholder="어떤 작업을 하던 중이었는지 적어주세요."
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-body text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {statusMessage ? (
        <p className={`text-body ${status === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
          {statusMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={isRetrying}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-body font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isRetrying ? '다시 시도 중...' : '다시 시도'}
          </button>
        ) : null}

        {onReload ? (
          <button
            type="button"
            onClick={onReload}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-body font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            페이지 새로고침
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSubmitFeedback()}
          disabled={!errorId || !trimmedComment || isSubmitting}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-body font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-red-100 disabled:bg-red-50 disabled:text-red-300"
        >
          {isSubmitting ? '제보 전송 중...' : '문제 제보'}
        </button>
      </div>
    </div>
  );
}
