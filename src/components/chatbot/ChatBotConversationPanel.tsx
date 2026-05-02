import { memo, type FormEvent, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';

import DeferredMarkdown from '../DeferredMarkdown';
import {
  ChatBotBrainCircuitIcon,
  ChatBotCheckIcon,
  ChatBotChevronDownIcon,
  ChatBotChevronRightIcon,
  ChatBotCopyIcon,
  ChatBotSendIcon,
  ChatBotSpinnerIcon,
  ChatBotSquareIcon,
  ChatBotStarIcon,
  ChatBotZapIcon,
} from './ChatBotIcons';
import type { Message } from '../../types/chatbot';

type RateLimitCopy = {
  main: string;
  guide: string;
  buttonBase: string;
} | null;

const TOOL_NAME_KO: Record<string, string | null> = {
  get_player_stats: '선수 통계',
  get_career_stats: '커리어 통계',
  get_leaderboard: '순위 조회',
  validate_player: null,
  get_team_summary: '팀 정보',
  get_team_advanced_metrics: '팀 고급 지표',
  get_game_box_score: '경기 결과',
  get_games_by_date: '경기 일정',
  get_game_lineup: '라인업',
  get_head_to_head: '팀 상대 전적',
  get_recent_games_by_team: '최근 경기',
  get_team_rank: '팀 순위',
  get_korean_series_winner: '한국시리즈 우승',
  predict_matchup: '대결 예측',
  calculate_win_probability: '승리 확률',
  get_player_wpa_leaders: '승리 기여 선수',
  get_clutch_moments: '클러치 순간',
  check_bullpen_availability: '불펜 가용 현황',
  search_regulations: '규정 검색',
  search_documents: '문서 검색',
  get_current_datetime: null,
};

const formatToolParams = (params: Record<string, unknown>): string => {
  const parts: string[] = [];
  if (params.player_name) parts.push(String(params.player_name));
  if (params.team_name) parts.push(String(params.team_name));
  if (params.team1 && params.team2) parts.push(`${params.team1} vs ${params.team2}`);
  else if (params.team1) parts.push(String(params.team1));
  if (params.stat_name) parts.push(String(params.stat_name));
  if (params.year) parts.push(`${params.year}년`);
  if (params.position === 'batting') parts.push('타자');
  else if (params.position === 'pitching') parts.push('투수');
  if (params.date) parts.push(String(params.date));
  if (params.limit && Number(params.limit) !== 10) parts.push(`상위 ${params.limit}명`);
  return parts.join(' · ');
};

type ConversationMessageProps = {
  message: Message;
  index: number;
  isExpanded: boolean;
  isCopied: boolean;
  onCopyMessage: (text: string, index: number) => void;
  onToggleToolCalls: (index: number) => void;
  onFavoriteToggle: (message: Message, event: MouseEvent<HTMLButtonElement>) => void;
};

const ChatConversationMessage = memo(function ChatConversationMessage({
  message,
  index,
  isExpanded,
  isCopied,
  onCopyMessage,
  onToggleToolCalls,
  onFavoriteToggle,
}: ConversationMessageProps) {
  if (message.sender === 'bot' && !message.text) return null;

  const isStreamError = message.sender === 'bot' && message.isError === true;
  const isCancelled = message.sender === 'bot' && message.cancelled === true;
  const isFavoritable =
    message.sender === 'bot' && message.status === 'COMPLETED' && !message.isSystem;

  return (
    <div
      key={message.id ?? index}
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {message.sender === 'bot' ? (
        <div className="group relative max-w-[85%]">
          <div
            className={`
              rounded-2xl border py-2.5 px-4
              ${
                isStreamError
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300'
                  : isCancelled
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200'
                    : 'border-gray-300 bg-gray-100 text-gray-900 dark:border-white/10 dark:bg-secondary/80 dark:text-white'
              }
            `}
          >
            <DeferredMarkdown
              className="prose max-w-none text-[16px] dark:prose-invert"
              fallbackClassName="whitespace-pre-wrap break-words text-[16px]"
              content={
                isStreamError
                  ? '응답 중 오류가 발생했습니다. 다시 시도해주세요.'
                  : message.text
              }
            />
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isCancelled && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[15px] font-semibold text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                  응답 취소됨
                </span>
              )}
              {message.cached && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[15px] font-semibold text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400">
                  <ChatBotZapIcon className="h-3 w-3" />
                  빠른 응답
                </span>
              )}
              {message.favorite && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[15px] font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <ChatBotStarIcon className="h-3 w-3 fill-current" />
                  즐겨찾기
                </span>
              )}
              <p className="m-0 text-[16px] text-gray-500 dark:text-gray-300">
                {message.timestamp.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          {message.strategy === 'llm_knowledge_db_unavailable' && (
            <div className="mt-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[16px] text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
              ⚠️ 현재 통계 DB에 일시적으로 접근할 수 없어 일반 지식 기반으로 답변드렸습니다.
              수치는 부정확할 수 있습니다.
            </div>
          )}
          {!isStreamError && !isCancelled && (() => {
            const visibleTools = (message.toolCalls ?? []).filter(
              (toolCall) =>
                TOOL_NAME_KO[toolCall.toolName] !== null &&
                TOOL_NAME_KO[toolCall.toolName] !== undefined,
            );
            if (visibleTools.length === 0) return null;
            return (
              <div className="mt-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => onToggleToolCalls(index)}
                  className="flex items-center gap-1 text-[16px] font-semibold text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <ChatBotChevronDownIcon
                    className={`h-3 w-3 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  AI 검색 도구 {visibleTools.length}개
                </button>
                {isExpanded && (
                  <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
                    {visibleTools.map((toolCall, toolIndex) => {
                      const label = TOOL_NAME_KO[toolCall.toolName];
                      const params = formatToolParams(toolCall.parameters);
                      return (
                      <li
                        key={toolIndex}
                          className="flex items-start gap-1 text-[16px] text-gray-500 dark:text-gray-400"
                      >
                          <span className="mt-0.5 shrink-0">╰</span>
                          <span>
                            <span className="font-semibold text-gray-600 dark:text-gray-300">
                              {label}
                            </span>
                            {params && (
                              <span className="ml-1 text-gray-400 dark:text-gray-500">
                                {params}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}
          {!isStreamError && (
            <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {isFavoritable && (
                <button
                  type="button"
                  onClick={(event) => {
                    void onFavoriteToggle(message, event);
                  }}
                  data-testid="chatbot-message-favorite-toggle"
                  data-message-server-id={message.serverId ?? ''}
                  className="rounded-full border border-gray-200 bg-white p-1 text-gray-400 shadow-sm hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-amber-300"
                  aria-label={message.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                  title={message.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                >
                  <ChatBotStarIcon
                    className={`h-3 w-3 ${message.favorite ? 'fill-current text-amber-500' : ''}`}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => onCopyMessage(message.text, index)}
                className="rounded-full border border-gray-200 bg-white p-1 text-gray-400 shadow-sm hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-white"
                aria-label="메시지 복사"
                title="복사"
              >
                {isCopied ? (
                  <ChatBotCheckIcon className="h-3 w-3 text-green-500" />
                ) : (
                  <ChatBotCopyIcon className="h-3 w-3" />
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-[85%] rounded-2xl bg-primary py-2.5 px-4 text-white">
          <p className="m-0 text-[16px]">{message.text}</p>
          <p className="mt-1 text-[16px] text-white/70">
            {message.timestamp.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.message === next.message &&
  prev.index === next.index &&
  prev.isExpanded === next.isExpanded &&
  prev.isCopied === next.isCopied);

interface ChatBotConversationPanelProps {
  messages: Message[];
  isLoadingMessages: boolean;
  isTyping: boolean;
  typingText: string;
  typingLiveText: string;
  expandedToolCalls: Set<number>;
  copiedIndex: number | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  inputMessage: string;
  isProcessing: boolean;
  isSendDisabled: boolean;
  rateLimitActive: boolean;
  rateLimitCountdown: number;
  pendingMessage: string;
  rateLimitCopy: RateLimitCopy;
  setInputMessage: (value: string) => void;
  onConversationSubmit: (event: FormEvent) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCopyMessage: (text: string, index: number) => void;
  onToggleToolCalls: (index: number) => void;
  onFavoriteToggle: (message: Message, event: MouseEvent<HTMLButtonElement>) => void;
  onCancelStream: () => void;
  onRetrySend: () => void;
  onRestorePendingMessage: () => void;
  onNavigateToPrediction: () => void;
}

export default function ChatBotConversationPanel({
  messages,
  isLoadingMessages,
  isTyping,
  typingText,
  typingLiveText,
  expandedToolCalls,
  copiedIndex,
  messagesEndRef,
  messagesContainerRef,
  inputRef,
  inputMessage,
  isProcessing,
  isSendDisabled,
  rateLimitActive,
  rateLimitCountdown,
  pendingMessage,
  rateLimitCopy,
  setInputMessage,
  onConversationSubmit,
  onInputKeyDown,
  onCopyMessage,
  onToggleToolCalls,
  onFavoriteToggle,
  onCancelStream,
  onRetrySend,
  onRestorePendingMessage,
  onNavigateToPrediction,
}: ChatBotConversationPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={messagesContainerRef}
        aria-live="polite"
        aria-label="대화 내용"
        role="log"
        className="scrollbar-hide flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-[16px] text-muted-foreground">
            <ChatBotSpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
            대화 내용을 불러오는 중입니다.
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatConversationMessage
                key={message.id ?? index}
                message={message}
                index={index}
                isExpanded={expandedToolCalls.has(index)}
                isCopied={copiedIndex === index}
                onCopyMessage={onCopyMessage}
                onToggleToolCalls={onToggleToolCalls}
                onFavoriteToggle={onFavoriteToggle}
              />
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div
                  className="chatbot-typing-text text-[16px] leading-6 text-zinc-500 dark:text-zinc-300"
                  aria-live="polite"
                >
                  <span className="chatbot-baseball mr-1 inline-flex h-4 w-4 items-center justify-center align-top text-[16px]">
                    ⚾
                  </span>
                  <span>{typingText}</span>
                  <span aria-hidden="true" className="chatbot-typing-cursor">
                    |
                  </span>
                  <span className="sr-only">{typingLiveText}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50/90 px-4 py-2 dark:border-white/10 dark:bg-black/20">
          <button
            type="button"
            onClick={onNavigateToPrediction}
            className="flex w-full items-center gap-1.5 text-[16px] font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ChatBotBrainCircuitIcon className="h-[13px] w-[13px] shrink-0" />
          <span>팀 심층 분석 (AI 코치)</span>
          <ChatBotChevronRightIcon className="ml-auto h-[13px] w-[13px] shrink-0" />
        </button>
      </div>

      <form
        onSubmit={onConversationSubmit}
        className="border-t border-gray-200 p-4 dark:border-white/10"
      >
        <div
          className={`
            flex items-center gap-2 rounded-2xl border border-gray-300 bg-gray-100 p-2
            transition-colors duration-200 dark:border-white/10 dark:bg-background
            ${
              isProcessing
                ? 'border-primary/50 bg-gray-100 dark:bg-background/80'
                : 'focus-within:border-primary focus-within:bg-gray-50 dark:focus-within:bg-black'
            }
          `}
        >
          <label htmlFor="chatbot-message-input" className="sr-only">
            메시지 입력
          </label>
          <input
            id="chatbot-message-input"
            name="message"
            data-testid="chatbot-message-input"
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={isProcessing ? '답변을 기다리는 중...' : '메시지를 입력하세요...'}
            inputMode="text"
            autoComplete="off"
            className="flex-1 border-none bg-transparent px-1 py-2 text-[16px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
          />
          {isProcessing && (
            <button
              type="button"
              onClick={onCancelStream}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-amber-500 text-white transition-colors hover:bg-amber-600"
              aria-label="응답 취소"
              data-testid="chatbot-cancel-button"
            >
              <ChatBotSquareIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSendDisabled}
            data-testid="chatbot-send-button"
            className={`
              flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border-none bg-primary p-2 text-white
              transition-colors
              ${isSendDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#3d7f6f]'}
            `}
            aria-label="메시지 전송"
          >
            <ChatBotSendIcon className="h-4 w-4" />
          </button>
        </div>
        {rateLimitActive && rateLimitCopy && (
          <div
            aria-live="assertive"
            aria-atomic="true"
            role="status"
            className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[16px] text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
          >
            <p className="m-0">{rateLimitCopy.main}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-amber-800 dark:text-amber-100">
                {rateLimitCopy.guide}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onRetrySend}
                  disabled={rateLimitCountdown > 0}
                  className={`
                    rounded-lg px-3 py-1 text-[16px] font-semibold transition-colors
                    ${
                      rateLimitCountdown > 0
                        ? 'cursor-not-allowed bg-amber-100 text-amber-500 dark:bg-amber-400/20 dark:text-amber-200'
                        : 'bg-primary text-white hover:bg-[#3d7f6f]'
                    }
                  `}
                >
                  {rateLimitCountdown > 0
                    ? `${rateLimitCountdown}초 후 ${rateLimitCopy.buttonBase}`
                    : `지금 ${rateLimitCopy.buttonBase}`}
                </button>
                <button
                  type="button"
                  onClick={onRestorePendingMessage}
                  disabled={!pendingMessage.trim()}
                  className={`
                    rounded-lg border border-amber-200 px-3 py-1 text-[16px] font-semibold transition-colors
                    ${
                      pendingMessage.trim().length > 0
                        ? 'text-amber-900 hover:bg-amber-100 dark:border-amber-200/40 dark:text-amber-100 dark:hover:bg-amber-400/10'
                        : 'cursor-not-allowed text-amber-300 dark:text-amber-300/60'
                    }
                  `}
                >
                  메시지 복구
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
