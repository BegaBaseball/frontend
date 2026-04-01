import { History, Loader2, Plus, Trash2 } from 'lucide-react';
import type { ChatSessionSummary } from '../../types/chatbot';

interface ChatBotHistoryTabProps {
  currentSessionId: number | null;
  sessions: ChatSessionSummary[];
  isLoadingSessions: boolean;
  onCreateNewSession: () => Promise<void> | void;
  onOpenSession: (sessionId: number) => Promise<void> | void;
  onDeleteSession: (sessionId: number) => Promise<void> | void;
}

export default function ChatBotHistoryTab({
  currentSessionId,
  sessions,
  isLoadingSessions,
  onCreateNewSession,
  onOpenSession,
  onDeleteSession,
}: ChatBotHistoryTabProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="m-0 text-sm text-muted-foreground">최근 세션을 다시 열거나 새 대화를 시작할 수 있습니다.</p>
        <button
          type="button"
          onClick={() => { void onCreateNewSession(); }}
          data-testid="chatbot-history-new-session"
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#3d7f6f]"
        >
          <Plus className="h-3.5 w-3.5" />
          새 대화
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoadingSessions ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            히스토리를 불러오는 중입니다.
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
            아직 저장된 대화가 없습니다.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.sessionId}
              data-testid="chatbot-history-session"
              data-session-id={session.sessionId}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                session.sessionId === currentSessionId
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => { void onOpenSession(session.sessionId); }}
                  data-testid="chatbot-history-session-open"
                  data-session-id={session.sessionId}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <p className="m-0 truncate text-sm font-semibold text-gray-900 dark:text-white">{session.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {session.latestMessagePreview || '아직 메시지가 없습니다.'}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {new Date(session.lastMessageAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteSession(session.sessionId);
                  }}
                  data-testid="chatbot-history-session-delete"
                  data-session-id={session.sessionId}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  aria-label="세션 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
