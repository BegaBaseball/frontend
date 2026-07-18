import { useEffect, useState } from 'react';

import { listChatSessions } from '../../api/chatSessions';
import type { ChatSessionSummary } from '../../types/chatbot';
import {
  ChatBotSessionHistoryIcon as ChatBotHistoryIcon,
  ChatBotSessionPlusIcon as ChatBotPlusIcon,
  ChatBotSessionSpinnerIcon as ChatBotSpinnerIcon,
  ChatBotSessionTrashIcon as ChatBotTrashIcon,
} from './ChatBotSessionIcons';

interface ChatBotHistoryTabProps {
  currentSessionId: number | null;
  refreshKey: number;
  onCreateNewSession: () => Promise<ChatSessionSummary | null>;
  onOpenSession: (sessionId: number, title?: string) => Promise<void> | void;
  onDeleteSession: (sessionId: number) => Promise<boolean> | boolean;
}

const sortSessions = (items: ChatSessionSummary[]) => [...items].sort(
  (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
);

export default function ChatBotHistoryTab({
  currentSessionId,
  refreshKey,
  onCreateNewSession,
  onOpenSession,
  onDeleteSession,
}: ChatBotHistoryTabProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const nextSessions = await listChatSessions();
        if (!cancelled) {
          setSessions(sortSessions(nextSessions));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSessions(false);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleCreateSession = async () => {
    const created = await onCreateNewSession();
    if (!created) {
      return;
    }

    setSessions((prev) => sortSessions([created, ...prev.filter((session) => session.sessionId !== created.sessionId)]));
  };

  const handleDelete = async (sessionId: number) => {
    const deleted = await onDeleteSession(sessionId);
    if (!deleted) {
      return;
    }

    const remainingSessions = sessions.filter((session) => session.sessionId !== sessionId);
    setSessions(remainingSessions);

    if (sessionId === currentSessionId && remainingSessions[0]) {
      await onOpenSession(remainingSessions[0].sessionId, remainingSessions[0].title);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="m-0 text-body text-muted-foreground">최근 세션을 다시 열거나 새 대화를 시작할 수 있습니다.</p>
        <button
          type="button"
          onClick={() => { void handleCreateSession(); }}
          data-testid="chatbot-history-new-session"
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-body font-semibold text-white transition-colors hover:bg-[#3d7f6f]"
        >
          <ChatBotPlusIcon className="h-3.5 w-3.5" />
          새 대화
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoadingSessions ? (
          <div className="flex h-full items-center justify-center text-body text-muted-foreground">
            <ChatBotSpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
            히스토리를 불러오는 중입니다.
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-body text-muted-foreground dark:border-white/10 dark:bg-white/5">
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
                  onClick={() => { void onOpenSession(session.sessionId, session.title); }}
                  data-testid="chatbot-history-session-open"
                  data-session-id={session.sessionId}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <ChatBotHistoryIcon className="h-4 w-4 text-primary" />
                    <p className="m-0 truncate text-body font-semibold text-gray-900 dark:text-white">{session.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-body text-muted-foreground">
                    {session.latestMessagePreview || '아직 메시지가 없습니다.'}
                  </p>
                  <p className="mt-2 text-body font-semibold text-muted-foreground">
                    {new Date(session.lastMessageAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(session.sessionId);
                  }}
                  data-testid="chatbot-history-session-delete"
                  data-session-id={session.sessionId}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  aria-label="세션 삭제"
                >
                  <ChatBotTrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
