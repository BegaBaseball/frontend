import chatBotIcon from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Badge } from './ui/badge';
import { X, Send, Check, Copy, BrainCircuit, ChevronRight, ChevronDown, Zap, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatBot } from '../hooks/useChatBot';
import { useAuthSession } from '../store/authStore';
import { useIsMobile } from '../hooks/use-mobile';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';


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

interface ChatBotProps {
  autoOpen?: boolean;
  onClosed?: () => void;
}

type TypingPhase = 1 | 2 | 3;

type TypingHintGroup = {
  category: string;
  weight: number;
  texts: string[];
};

type SelectedTypingHint = {
  category: string;
  text: string;
};

const TYPING_PHASE_HINTS: Record<TypingPhase, TypingHintGroup[]> = {
  1: [
    { category: '상황형', weight: 5, texts: ['야구 장면을 정렬하고 있어요. 잠깐만 응답 포인트를 맞추고 있어요.', '핵심 장면을 골라 흐름대로 정리 중이에요.', '요청하신 포인트를 다시 한 번 다듬고 있어요.'] },
    { category: '신뢰형', weight: 3, texts: ['데이터의 문맥을 정리해 정확한 답변으로 붙들어 넣고 있어요.', '근거 기반 순서로 답안을 정렬하고 있어요.'] },
    { category: '유머형', weight: 2, texts: ['잠시 타격 준비! 말이 완성될 위치를 잡고 있어요.', '타자처럼 타이밍 맞춰 문장을 준비 중이에요.'] },
  ],
  2: [
    { category: '상황형', weight: 4, texts: ['요청량이 조금 많아요. 더 정확한 답변으로 정리 중이에요.', '많은 구간을 한 번 더 정렬해 응답 품질을 맞추고 있어요.', '동시 처리량이 높아 확인 과정을 늘리고 있어요.'] },
    { category: '신뢰형', weight: 4, texts: ['실시간 기록을 재확인해 오차를 줄이고 있어요.', '출처와 수치를 다시 매칭해 정합성을 맞추고 있어요.'] },
    { category: '유머형', weight: 2, texts: ['투구가 조금 빡빡하네요. 추가 교차검증 중이에요.', '방금 전달한 장면을 한 번 더 리플레이하고 있어요.'] },
  ],
  3: [
    { category: '상황형', weight: 5, texts: ['요청이 누적되어 최종 정리 중이에요. 정확도를 최우선으로 처리하고 있어요.', '남은 집계 라인을 마무리해 최종 답변으로 결합 중이에요.', '응답 품질 검수를 마친 뒤 한 번에 전달 준비 중이에요.'] },
    { category: '신뢰형', weight: 4, texts: ['최종 교차체크를 진행하고 있습니다. 조금만 더 기다려 주세요.', '데이터 정합성 경로를 재확인해 마무리 중입니다.'] },
    { category: '유머형', weight: 1, texts: ['야구장 점검 중처럼 마지막 정렬 라운드를 돌고 있어요.'] },
  ],
};

const TYPING_HINT_REPEAT_HISTORY_COUNT = 2;
const TYPING_CHAR_INTERVAL_MS = 50;
const TYPING_RESTART_DELAY_MS = 700;
const TYPING_HINT_PHASE_2_DELAY_MS = 6000;
const TYPING_HINT_PHASE_3_DELAY_MS = 11000;
const TYPING_A11Y_TEXT_BY_PHASE: Record<TypingPhase, string> = {
  1: '챗봇이 답변을 준비하고 있습니다.',
  2: '요청량이 많아 응답 정확도 검토 중입니다.',
  3: '최종 정리를 마무리하고 있어요.',
};

const pickTypingHint = (phase: TypingPhase, recentHints: string[], previousCategory: string | null): SelectedTypingHint => {
  const phaseGroups = TYPING_PHASE_HINTS[phase] ?? TYPING_PHASE_HINTS[1];
  const weightedGroups = phaseGroups.map((group) => ({
    ...group,
    effectiveWeight: Math.max(group.weight - (group.category === previousCategory ? 1 : 0), 1),
  }));
  const totalWeight = weightedGroups.reduce((acc, group) => acc + group.effectiveWeight, 0);
  let seed = Math.random() * totalWeight;
  let selectedIndex = 0;

  for (const group of weightedGroups) {
    const index = weightedGroups.indexOf(group);
    seed -= group.effectiveWeight;
    if (seed <= 0) {
      selectedIndex = index;
      break;
    }
  }

  const selectedGroup = phaseGroups[selectedIndex];
  const available = selectedGroup.texts.filter((text) => !recentHints.includes(text));
  if (available.length > 0) {
    return {
      category: selectedGroup.category,
      text: available[Math.floor(Math.random() * available.length)],
    };
  }

  const fallback = selectedGroup.texts[Math.floor(Math.random() * selectedGroup.texts.length)];
  return { category: selectedGroup.category, text: fallback };
};

export default function ChatBot({ autoOpen = false, onClosed }: ChatBotProps) {
  const { isLoggedIn } = useAuthSession();
  // const isLoggedIn = true;
  const isMobile = useIsMobile();
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
    handleCancelStream,
  } = useChatBot(autoOpen);

  const [isClosing, setIsClosing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<number>>(new Set());
  const [typingPhase, setTypingPhase] = useState<TypingPhase>(1);
  const [typingText, setTypingText] = useState('');
  const recentTypingHintsRef = useRef<string[]>([]);
  const previousTypingCategoryRef = useRef<string | null>(null);
  const isRateLimited = rateLimitActive && rateLimitCountdown > 0;
  const isSendDisabled = isRateLimited || (!isProcessing && !inputMessage.trim());

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

  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleClose = () => {
    if (isClosing) {
      return;
    }

    if (isProcessing) {
      handleCancelStream();
    }

    setIsClosing(true);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      onClosed?.();
    }, 300); // 300ms matches animation duration
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const handleNavigateToLogin = () => {
    const loginPath = buildLoginPath(getCurrentRelativeUrl());
    handleClose();
    window.setTimeout(() => {
      navigate(loginPath);
    }, 300);
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

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
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

  useEffect(() => {
    if (!isTyping) {
      setTypingPhase(1);
      recentTypingHintsRef.current = [];
      previousTypingCategoryRef.current = null;
      setTypingText('');
      return;
    }

    setTypingPhase(1);
    const mediumDelayTimer = window.setTimeout(() => {
      setTypingPhase(2);
    }, TYPING_HINT_PHASE_2_DELAY_MS);
    const longDelayTimer = window.setTimeout(() => {
      setTypingPhase(3);
    }, TYPING_HINT_PHASE_3_DELAY_MS);

    return () => {
      window.clearTimeout(mediumDelayTimer);
      window.clearTimeout(longDelayTimer);
      setTypingPhase(1);
    };
  }, [isTyping]);

  useEffect(() => {
    if (!isTyping) {
      setTypingText('');
      return;
    }

    let typingInterval: number | null = null;
    let restartTimer: number | null = null;

    const clearTimers = () => {
      if (typingInterval) {
        window.clearInterval(typingInterval);
        typingInterval = null;
      }
      if (restartTimer) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
    };

    const startTyping = () => {
      clearTimers();
      const usedHints = recentTypingHintsRef.current.slice(-TYPING_HINT_REPEAT_HISTORY_COUNT);
      const selectedHint = pickTypingHint(typingPhase, usedHints, previousTypingCategoryRef.current);
      const message = selectedHint.text;
      recentTypingHintsRef.current = [...usedHints, message].slice(-TYPING_HINT_REPEAT_HISTORY_COUNT);
      previousTypingCategoryRef.current = selectedHint.category;
      let index = 0;
      setTypingText('');

      typingInterval = window.setInterval(() => {
        index += 1;
        const nextText = message.slice(0, index);
        setTypingText(nextText);

        if (index >= message.length) {
          clearTimers();
          restartTimer = window.setTimeout(() => {
            if (!isTyping) return;
            startTyping();
          }, TYPING_RESTART_DELAY_MS);
        }
      }, TYPING_CHAR_INTERVAL_MS);
    };

    startTyping();

    return () => {
      clearTimers();
    };
  }, [isTyping, typingPhase]);

  const typingLiveText = TYPING_A11Y_TEXT_BY_PHASE[typingPhase];

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
              ? 'inset-0 rounded-none max-h-[100dvh] max-w-full'
              : 'bottom-5 right-5 w-[min(400px,calc(100vw-2rem))] h-[600px] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
            }
          `}
        >
          {/* Header */}
          <div className="p-3 md:p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-primary">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 rounded-full bg-primary grid place-items-center p-0.5">
                <img
                  src={chatBotIcon}
                  alt="BEGA"
                  className="pointer-events-none block h-13 w-13 rounded-full object-contain object-center"
                  loading="eager"
                  aria-hidden="true"
                  decoding="async"
                />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-sm md:text-base m-0">야구 가이드 BEGA</h3>
                  <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">Beta</Badge>
                </div>
                <p className="text-white/80 text-[11px] md:text-xs m-0">야구 정보 안내</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer
                         p-2 rounded-full transition-colors
                         min-w-[44px] min-h-[44px] flex items-center justify-center
                         focus:outline-none focus-visible:outline-none focus:ring-0"
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
                  <button
                    type="button"
                    onClick={handleNavigateToLogin}
                    className="inline-block py-2.5 px-6 rounded-xl text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10
                               border border-gray-300 dark:border-white/20 no-underline font-medium
                               hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                  >
                    로그인하러 가기
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  // 봇 메시지이고 텍스트가 아직 없으면(로딩 중) 렌더링하지 않음 (로딩바만 표시)
                  if (message.sender === 'bot' && !message.text) return null;

                  const isStreamError = message.sender === 'bot' && message.isError === true;
                  const isCancelled = message.sender === 'bot' && message.cancelled === true;

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
                                : isCancelled
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700/40'
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
                              {isCancelled && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5 dark:bg-amber-400/10 dark:border-amber-400/30 dark:text-amber-200">
                                  응답 취소됨
                                </span>
                              )}
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
                          {/* DB 장애 면책 배너 */}
                          {message.strategy === 'llm_knowledge_db_unavailable' && (
                            <div className="mt-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
                              ⚠️ 현재 통계 DB에 일시적으로 접근할 수 없어 일반 지식 기반으로 답변드렸습니다. 수치는 부정확할 수 있습니다.
                            </div>
                          )}
                          {/* Tool Disclosure - AI가 사용한 도구 목록 */}
                          {!isStreamError && !isCancelled && (() => {
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
                              type="button"
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
                    <div className="chatbot-typing-text text-sm text-zinc-500 dark:text-zinc-300 leading-6" aria-live="polite">
                      <span className="chatbot-baseball h-4 w-4 mr-1 inline-flex items-center justify-center text-[14px] align-top">
                        ⚾
                      </span>
                      <span>{typingText}</span>
                      <span aria-hidden="true" className="chatbot-typing-cursor">|</span>
                      <span className="sr-only">{typingLiveText}</span>
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
          {isLoggedIn ? (
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
                  name="message"
                  data-testid="chatbot-message-input"
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={isProcessing ? '답변을 기다리는 중...' : '메시지를 입력하세요...'}
                  inputMode="text"
                  autoComplete="off"
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm py-2 px-1
                             placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                {isProcessing && (
                  <button
                    type="button"
                    onClick={handleCancelStream}
                    className="bg-amber-500 text-white border-none rounded-xl p-2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-amber-600"
                    aria-label="응답 취소"
                    data-testid="chatbot-cancel-button"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSendDisabled}
                  data-testid="chatbot-send-button"
                  className={`
                    bg-primary text-white border-none rounded-xl p-2
                    ${isSendDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#3d7f6f]'}
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
          ) : (
            <div className="border-t border-gray-200 bg-gray-50/90 p-4 dark:border-white/10 dark:bg-black/20">
              <button
                type="button"
                data-testid="chatbot-login-cta-footer"
                onClick={handleNavigateToLogin}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d7f6f]"
              >
                로그인 후 질문하기
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                경기 정보, 규정, 선수 기록 질문을 로그인 후 바로 이어서 확인할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Launcher Button - 챗봇이 닫혀있을 때만 표시 */}
      {!isOpen && !autoOpen && (
          <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed w-14 h-14 sm:w-16 sm:h-16 sm:min-h-[64px] sm:min-w-[64px] md:w-18 md:h-18 rounded-full bg-primary border-none
                     shadow-[0_10px_25px_rgba(0,0,0,0.3)] cursor-pointer
                     p-0.5
                     flex items-center justify-center text-white
                     transition-all duration-200 active:bg-primary active:text-white
                     touch-action-manipulation
                     overflow-hidden
                     bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))]
                     md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))] md:right-[calc(1.25rem+env(safe-area-inset-right))]
                     focus:outline-none focus-visible:outline-none focus:ring-0"
          aria-label="챗봇 열기"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="h-14 w-14 rounded-full bg-primary grid place-items-center p-0.5">
            <img
              src={chatBotIcon}
              alt=""
              className="pointer-events-none block h-13 w-13 rounded-full object-contain object-center"
              aria-hidden="true"
              decoding="async"
              loading="eager"
            />
          </span>
        </button>
      )}
    </div>
  );
}
