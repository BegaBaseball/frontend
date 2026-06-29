import { useMemo, useState } from 'react';
import { SharedSearchIcon } from './icons/SharedLeafIcons';

const RECENT_EMOJI_STORAGE_KEY = 'bega_recent_emojis';
const MAX_RECENT_EMOJIS = 18;

const EMOJI_GROUPS = [
  {
    id: 'baseball',
    label: '야구',
    emojis: ['⚾', '🏟️', '📣', '🔥', '👏', '🙌', '💪', '🏆', '🎯', '🚀', '⭐', '🥎', '🎉', '🎊', '🥇', '📢'],
  },
  {
    id: 'faces',
    label: '표정',
    emojis: ['😀', '😆', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥹', '😭', '😤', '🤔', '😡', '🤯', '😴', '🥳'],
  },
  {
    id: 'reactions',
    label: '반응',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '🫶', '🤝', '✌️', '🤞', '🫡', '💯', '❤️', '🧡', '💛', '💚', '💙'],
  },
  {
    id: 'fun',
    label: '기분',
    emojis: ['🤣', '😅', '😉', '😮', '🤗', '😬', '🥲', '😋', '😱', '🤤', '🤪', '😇', '✨', '💥', '🌈', '☀️'],
  },
] as const;

const EMOJI_KEYWORDS: Record<string, string[]> = {
  '⚾': ['야구', 'baseball', 'ball'],
  '🏟️': ['구장', 'stadium', 'field'],
  '📣': ['응원', 'cheer', 'megaphone'],
  '🔥': ['불', 'fire', 'hot'],
  '👏': ['박수', 'clap'],
  '🙌': ['만세', 'cheer', 'hands'],
  '💪': ['힘', 'strong', 'power'],
  '🏆': ['우승', 'trophy', 'winner'],
  '🎯': ['목표', 'target'],
  '🚀': ['로켓', 'rocket'],
  '⭐': ['별', 'star'],
  '🎉': ['축하', 'party', 'celebrate'],
  '😀': ['웃음', 'happy', 'smile'],
  '😆': ['빵긋', 'laugh', 'funny'],
  '😊': ['미소', 'smile', 'nice'],
  '😍': ['좋아', 'love', 'heart eyes'],
  '🥰': ['사랑', 'love', 'cute'],
  '😭': ['눈물', 'cry', 'sad'],
  '😤': ['분노', 'angry', 'hmph'],
  '🤔': ['고민', 'think', 'hmm'],
  '😡': ['화남', 'mad', 'angry'],
  '🥳': ['파티', 'party', 'celebrate'],
  '👍': ['좋아요', 'like', 'yes'],
  '👎': ['싫어요', 'no', 'dislike'],
  '🙏': ['부탁', 'pray', 'thanks'],
  '🫶': ['하트', 'love', 'heart'],
  '🤝': ['약속', 'deal', 'handshake'],
  '💯': ['백점', 'perfect', '100'],
  '❤️': ['하트', 'love', 'heart'],
  '💙': ['블루', 'blue', 'heart'],
  '🤣': ['웃김', 'lol', 'funny'],
  '😅': ['머쓱', 'awkward', 'sweat'],
  '😉': ['윙크', 'wink'],
  '😮': ['놀람', 'surprised', 'wow'],
  '🤗': ['포옹', 'hug', 'warm'],
  '😱': ['충격', 'shock', 'scream'],
  '🤤': ['맛있', 'yummy', 'drool'],
  '✨': ['반짝', 'sparkles'],
  '💥': ['폭발', 'boom'],
  '🌈': ['무지개', 'rainbow'],
  '☀️': ['태양', 'sun'],
};

interface LazyEmojiPickerProps {
  isDarkMode: boolean;
  onEmojiSelect: (emoji: string) => void;
  width?: number;
  height?: number;
}

const readRecentEmojis = () => {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_EMOJI_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [] as string[];
  }
};

const writeRecentEmojis = (emojis: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(emojis));
  } catch {
    // Ignore storage failures and keep the picker usable.
  }
};

export default function LazyEmojiPicker({
  isDarkMode,
  onEmojiSelect,
  width = 300,
  height = 400,
}: LazyEmojiPickerProps) {
  const [query, setQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => readRecentEmojis());
  const [activeGroupId, setActiveGroupId] = useState<string>(() =>
    readRecentEmojis().length > 0 ? 'recent' : EMOJI_GROUPS[0].id
  );

  const groups = useMemo(() => {
    const baseGroups = EMOJI_GROUPS.map((group) => ({ ...group, emojis: [...group.emojis] }));
    if (recentEmojis.length === 0) {
      return baseGroups;
    }

    return [
      {
        id: 'recent',
        label: '최근',
        emojis: recentEmojis,
      },
      ...baseGroups,
    ];
  }, [recentEmojis]);

  const currentGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];

  const visibleEmojis = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return currentGroup?.emojis ?? [];
    }

    const uniqueEmojis = Array.from(new Set(groups.flatMap((group) => group.emojis)));
    return uniqueEmojis.filter((emoji) => {
      if (emoji.includes(trimmedQuery)) {
        return true;
      }

      return (EMOJI_KEYWORDS[emoji] ?? []).some((keyword) => keyword.toLowerCase().includes(trimmedQuery));
    });
  }, [currentGroup, groups, query]);

  const handleEmojiClick = (emoji: string) => {
    const nextRecentEmojis = [emoji, ...recentEmojis.filter((value) => value !== emoji)].slice(0, MAX_RECENT_EMOJIS);
    setRecentEmojis(nextRecentEmojis);
    writeRecentEmojis(nextRecentEmojis);
    onEmojiSelect(emoji);
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-lg ${
        isDarkMode
          ? 'border-border bg-card text-slate-100'
          : 'border-slate-200 bg-white text-slate-900'
      }`}
      style={{ width, height, maxWidth: 'calc(100vw - 2rem)' }}
    >
      <div className={`border-b px-3 py-3 ${isDarkMode ? 'border-border' : 'border-slate-200'}`}>
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            isDarkMode
              ? 'border-border bg-slate-900/40 text-slate-300'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <SharedSearchIcon className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이모지 검색..."
            className="w-full bg-transparent text-body outline-none placeholder:text-inherit"
          />
        </div>
      </div>

      <div className={`flex gap-1 overflow-x-auto px-3 py-2 ${isDarkMode ? 'border-border' : 'border-slate-200'}`}>
        {groups.map((group) => {
          const isActive = group.id === currentGroup.id && query.trim().length === 0;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setQuery('');
                setActiveGroupId(group.id);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-body font-semibold transition-colors ${
                isActive
                  ? isDarkMode
                    ? 'bg-primary/20 text-primary'
                    : 'bg-indigo-50 text-indigo-600'
                  : isDarkMode
                    ? 'bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div className="h-[calc(100%-7.5rem)] overflow-y-auto px-3 pb-3">
        {visibleEmojis.length > 0 ? (
          <div className="grid grid-cols-6 gap-2 pt-2">
            {visibleEmojis.map((emoji) => (
              <button
                key={`${query || currentGroup.id}-${emoji}`}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-800'
                    : 'hover:bg-slate-100'
                }`}
                aria-label={`이모지 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div
            className={`flex h-full items-center justify-center rounded-xl text-body ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
