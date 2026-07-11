import { useEffect, useState } from 'react';

import { listChatFavorites } from '../../api/chatSessions';
import type { ChatFavoriteItem } from '../../types/chatbot';
import {
  ChatBotSessionSpinnerIcon as ChatBotSpinnerIcon,
  ChatBotSessionStarIcon as ChatBotStarIcon,
} from './ChatBotSessionIcons';

interface ChatBotFavoritesTabProps {
  refreshKey: number;
  onCopyMessage: (text: string, index: number) => Promise<void> | void;
  onReaskFavorite: (favorite: ChatFavoriteItem) => Promise<void> | void;
  onOpenFavoriteSession: (favorite: ChatFavoriteItem) => Promise<void> | void;
}

export default function ChatBotFavoritesTab({
  refreshKey,
  onCopyMessage,
  onReaskFavorite,
  onOpenFavoriteSession,
}: ChatBotFavoritesTabProps) {
  const [favorites, setFavorites] = useState<ChatFavoriteItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      setIsLoadingFavorites(true);
      try {
        const nextFavorites = await listChatFavorites();
        if (!cancelled) {
          setFavorites(nextFavorites);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFavorites(false);
        }
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-body text-muted-foreground">저장한 답변을 다시 열고, 복사하거나 같은 질문을 이어갈 수 있습니다.</p>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {isLoadingFavorites ? (
          <div className="flex h-full items-center justify-center text-body text-muted-foreground">
            <ChatBotSpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
            즐겨찾기를 불러오는 중입니다.
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-body text-muted-foreground dark:border-white/10 dark:bg-white/5">
            즐겨찾기한 답변이 없습니다.
          </div>
        ) : (
          favorites.map((favorite) => (
            <div
              key={favorite.messageId}
              data-testid="chatbot-favorite-card"
              data-message-id={favorite.messageId}
              data-session-id={favorite.sessionId}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 truncate text-body font-semibold text-gray-900 dark:text-white">{favorite.sessionTitle}</p>
                  <p className="mt-1 text-body font-semibold text-muted-foreground">
                    {new Date(favorite.favoritedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <ChatBotStarIcon className="h-4 w-4 fill-current text-amber-500" />
              </div>
              {favorite.prompt && (
                <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-body text-muted-foreground dark:bg-black/20">
                  원 질문: {favorite.prompt}
                </div>
              )}
              <p className="mt-3 whitespace-pre-wrap text-body text-gray-700 dark:text-white">{favorite.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { void onCopyMessage(favorite.content, favorite.messageId); }}
                  data-testid="chatbot-favorite-copy"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-body font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => { void onReaskFavorite(favorite); }}
                  data-testid="chatbot-favorite-reask"
                  disabled={!favorite.prompt}
                  className={`rounded-xl px-3 py-2 text-body font-semibold transition-colors ${
                    favorite.prompt
                      ? 'bg-primary text-white hover:bg-[#3d7f6f]'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-white/40'
                  }`}
                >
                  다시 질문
                </button>
                <button
                  type="button"
                  onClick={() => { void onOpenFavoriteSession(favorite); }}
                  data-testid="chatbot-favorite-open-session"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-body font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                >
                  원 대화로 이동
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
