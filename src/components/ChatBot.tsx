import chatBotIcon from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Badge } from './ui/badge';
import { X, Send, Check, Copy, BrainCircuit, ChevronRight, ChevronDown, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatBot } from '../hooks/useChatBot';
import { useAuthStore } from '../store/authStore';
import { useIsMobile } from '../hooks/use-mobile';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';


// 도구 이름 한국어 매핑 (null이면 UI에서 숨김)
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
  if (params.player_name)                    parts.push(String(params.player_name));
  if (params.team_name)                      parts.push(String(params.team_name));
  if (params.team1 && params.team2)          parts.push(`${params.team1} vs ${params.team2}`);
  else if (params.team1)                     parts.push(String(params.team1));
  if (params.stat_name)                      parts.push(String(params.stat_name));
  if (params.year)                           parts.push(`${params.year}년`);
  if (params.position === 'batting')         parts.push('타자');
  else if (params.position === 'pitching')   parts.push('투수');
  if (params.date)                           parts.push(String(params.date));
  if (params.limit && Number(params.limit) !== 10) parts.push(`상위 ${params.limit}명`);
  return parts.join(' · ');
};

interface ChatBotProps {
  autoOpen?: boolean;
}

export default function ChatBot({ autoOpen = false }: ChatBotProps) {
  const { isLoggedIn } = useAuthStore();
  // const isLoggedIn = true;
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const {
    isOpen,
    setIsOpen,
    messages,
    inputMessage,
    setInputMessage,
    isTyping,
    isProcessing,
    rateLimitActive,
    rateLimitCountdown,
    rateLimitStage,
    pendingMessage,
    messagesEndRef,
    messagesContainerRef,
    handleSendMessage,
    handleRetrySend,
    handleRestorePendingMessage,
  } = useChatBot();

  const [isClosing, setIsClosing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<number>>(new Set());
  const isRateLimited = rateLimitActive && rateLimitCountdown > 0;

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
    }
  }, [autoOpen, setIsOpen]);

  const toggleToolCalls = (index: number) => {
    setExpandedToolCalls(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const rateLimitCopy = (() => {
    if (!rateLimitActive) return null;

    if (rateLimitStage === 1) {
      return {
        main: '전 경기 실시간 스탯을 집계하고 있습니다. 더욱 정확한 답변을 위해 잠시 숫자를 정리할 시간이 필요해요.',
        guide: `약 ${rateLimitCountdown}초 후에 다시 질문하실 수 있습니다. 작성하신 내용은 그대로 보관 중이에요.`,
        buttonBase: '다시 시도',
      };
    }

    if (rateLimitStage === 2) {
      return {
        main: '데이터 정합성을 유지하기 위해 추가 집계가 진행 중입니다.',
        guide: `안정적인 답변을 위해 ${rateLimitCountdown}초만 더 기다려 주세요. 잠시 후 버튼이 활성화됩니다.`,
        buttonBase: '데이터 다시 요청',
      };
    }

    return {
      main: '현재 데이터 집계 요청이 매우 많아 처리 대기 중입니다.',
      guide: `시스템을 재정비하는 중입니다. ${rateLimitCountdown}초 후에 다시 시도해 주시거나, 잠시 후에 다시 방문해 주세요.`,
      buttonBase: '최종 재시도',
    };
  })();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // 300ms matches animation duration
  };

  const handleCopyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // clipboard API not available (e.g. non-HTTPS)
    }
  };

  // 모바일에서 챗봇 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // Input Auto-focus
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isProcessing && inputRef.current) {
      // give a small timeout to ensure the DOM is ready and the disabled attribute is removed
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isOpen, isProcessing]);

  return (
    <div className="fixed z-[9999]">
      {/* Chat Window - 모바일: 전체화면 / 데스크톱: 우측하단 팝업 */}
      {isOpen && (
        <div
          className={`
            ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}
            fixed flex flex-col overflow-hidden
            bg-white dark:bg-black border border-gray-200 dark:border-white/10
            ${isMobile
              ? 'inset-0 rounded-none'
              : 'bottom-5 right-5 w-[min(400px,calc(100vw-2rem))] h-[600px] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
            }
          `}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-primary">
            <div className="flex items-center gap-3">
              <img
                src={chatBotIcon}
                alt="BEGA"
                className="w-10 h-10 rounded-full bg-white p-1.5"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-base m-0">야구 가이드 BEGA</h3>
                  <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">Beta</Badge>
                </div>
                <p className="text-white/80 text-xs m-0">야구 정보 안내</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer
                         p-2 rounded-full transition-colors
                         min-w-[44px] min-h-[44px] flex items-center justify-center
                         focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="챗봇 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            aria-live="polite"
            aria-label="대화 내용"
            role="log"
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide"
          >
            {!isLoggedIn ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6 rounded-2xl bg-gray-100 dark:bg-card/50 border border-gray-300 dark:border-white/10">
                  <h3 className="text-gray-900 dark:text-white font-bold mb-2">로그인이 필요합니다</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">야구 가이드 챗봇은 로그인 후 이용하실 수 있습니다.</p>
                  <a
                    href="/login"
                    className="inline-block py-2.5 px-6 rounded-xl text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10
                               border border-gray-300 dark:border-white/20 no-underline font-medium
                               hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                  >
                    로그인하러 가기
                  </a>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  // 봇 메시지이고 텍스트가 아직 없으면(로딩 중) 렌더링하지 않음 (로딩바만 표시)
                  if (message.sender === 'bot' && !message.text) return null;

                  const isStreamError = message.sender === 'bot' && message.isError === true;

                  return (
                    <div
                      key={message.id ?? index}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.sender === 'bot' ? (
                        <div className="group relative max-w-[85%]">
                          <div
                            className={`
                              py-2.5 px-4 rounded-2xl
                              ${isStreamError
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/40'
                                : 'bg-gray-100 dark:bg-secondary/80 text-gray-900 dark:text-white border border-gray-300 dark:border-white/10'
                              }
                            `}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm prose dark:prose-invert max-w-none">
                              {isStreamError
                                ? '응답 중 오류가 발생했습니다. 다시 시도해주세요.'
                                : message.text}
                            </ReactMarkdown>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {message.cached && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 dark:bg-amber-400/10 dark:border-amber-400/30 dark:text-amber-400">
                                  <Zap className="w-2.5 h-2.5" />
                                  빠른 응답
                                </span>
                              )}
                              <p className="text-[11px] text-gray-500 dark:text-gray-300 m-0">
                                {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          {/* Tool Disclosure - AI가 사용한 도구 목록 */}
                          {!isStreamError && (() => {
                            const visibleTools = (message.toolCalls ?? []).filter(
                              tc => TOOL_NAME_KO[tc.toolName] !== null && TOOL_NAME_KO[tc.toolName] !== undefined
                            );
                            if (visibleTools.length === 0) return null;
                            const isExpanded = expandedToolCalls.has(index);
                            return (
                              <div className="mt-1.5 ml-1">
                                <button
                                  type="button"
                                  onClick={() => toggleToolCalls(index)}
                                  className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                                  AI 검색 도구 {visibleTools.length}개
                                </button>
                                {isExpanded && (
                                  <ul className="mt-1 space-y-0.5 list-none p-0 m-0">
                                    {visibleTools.map((tc, i) => {
                                      const label = TOOL_NAME_KO[tc.toolName];
                                      const params = formatToolParams(tc.parameters);
                                      return (
                                        <li key={i} className="flex items-start gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                                          <span className="mt-0.5 shrink-0">╰</span>
                                          <span>
                                            <span className="font-medium text-gray-600 dark:text-gray-300">{label}</span>
                                            {params && <span className="text-gray-400 dark:text-gray-500 ml-1">{params}</span>}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            );
                          })()}
                          {/* Copy button - shown on hover, only for non-error bot messages */}
                          {!isStreamError && (
                            <button
                              onClick={() => handleCopyMessage(message.text, index)}
                              className="
                                absolute -top-2 -right-2
                                opacity-0 group-hover:opacity-100
                                transition-opacity duration-150
                                bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                                rounded-full p-1 shadow-sm
                                text-gray-400 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white
                                focus:outline-none focus:ring-2 focus:ring-primary/50
                              "
                              aria-label="메시지 복사"
                              title="복사"
                            >
                              {copiedIndex === index
                                ? <Check className="w-3 h-3 text-green-500" />
                                : <Copy className="w-3 h-3" />
                              }
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          className="py-2.5 px-4 rounded-2xl max-w-[85%] bg-primary text-white"
                        >
                          <p className="m-0 text-sm">{message.text}</p>
                          <p className="mt-1 text-[11px] text-white/70">
                            {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="py-3 px-4 rounded-2xl bg-gray-100 dark:bg-secondary/80 border border-gray-300 dark:border-white/10">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-border rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-border rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-border rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* AI Coach Shortcut */}
          {isLoggedIn && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate('/prediction');
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors w-full"
              >
                <BrainCircuit size={13} className="shrink-0" />
                <span>팀 심층 분석 (AI 코치)</span>
                <ChevronRight size={13} className="ml-auto shrink-0" />
              </button>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-gray-200 dark:border-white/10"
          >
            <div className={`
              flex items-center gap-2 bg-gray-100 dark:bg-background rounded-2xl p-2 border border-gray-300 dark:border-white/10
              transition-colors duration-200
              ${isProcessing ? 'border-primary/50 bg-gray-100 dark:bg-background/80' : 'focus-within:border-primary focus-within:bg-gray-50 dark:focus-within:bg-black'}
            `}>
              <label htmlFor="chatbot-message-input" className="sr-only">
                메시지 입력
              </label>
              <input
                id="chatbot-message-input"
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={!isLoggedIn ? '로그인이 필요합니다...' : (isProcessing ? '답변을 기다리는 중...' : '메시지를 입력하세요...')}
                disabled={!isLoggedIn}
                inputMode="text"
                autoComplete="off"
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm py-2 px-1
                           placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!isLoggedIn || isProcessing || isRateLimited || !inputMessage.trim()}
                className={`
                  bg-primary text-white border-none rounded-xl p-2
                  ${(!isLoggedIn || isProcessing || isRateLimited || !inputMessage.trim()) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#3d7f6f]'}
                  transition-colors
                  min-w-[40px] min-h-[40px] flex items-center justify-center
                `}
                aria-label="메시지 전송"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {rateLimitActive && rateLimitCopy && (
              <div
                aria-live="assertive"
                aria-atomic="true"
                role="status"
                className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
              >
                <p className="m-0">
                  {rateLimitCopy.main}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-800 dark:text-amber-100">
                    {rateLimitCopy.guide}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetrySend}
                      disabled={rateLimitCountdown > 0}
                      className={`
                        rounded-lg px-3 py-1 text-xs font-semibold
                        ${rateLimitCountdown > 0
                          ? 'cursor-not-allowed bg-amber-100 text-amber-500 dark:bg-amber-400/20 dark:text-amber-200'
                          : 'bg-primary text-white hover:bg-[#3d7f6f]'
                        }
                        transition-colors
                      `}
                    >
                      {rateLimitCountdown > 0
                        ? `${rateLimitCountdown}초 후 ${rateLimitCopy.buttonBase}`
                        : `지금 ${rateLimitCopy.buttonBase}`}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestorePendingMessage}
                      disabled={!pendingMessage.trim()}
                      className={`
                        rounded-lg border border-amber-200 px-3 py-1 text-xs font-semibold
                        ${pendingMessage.trim().length > 0
                          ? 'text-amber-900 hover:bg-amber-100 dark:border-amber-200/40 dark:text-amber-100 dark:hover:bg-amber-400/10'
                          : 'cursor-not-allowed text-amber-300 dark:text-amber-300/60'
                        }
                        transition-colors
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
      )}

      {/* Launcher Button - 챗봇이 닫혀있을 때만 표시 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 w-16 h-16 rounded-full bg-primary border-none
                     shadow-[0_10px_25px_rgba(0,0,0,0.3)] cursor-pointer
                     flex items-center justify-center text-white
                     transition-transform duration-200 hover:scale-110 active:scale-95
                     focus:outline-none focus:ring-4 focus:ring-primary/50"
          aria-label="챗봇 열기"
        >
          <img
            src={chatBotIcon}
            alt=""
            className="w-12 h-12 rounded-full"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
