import { useEffect, useState } from 'react';

type EmojiPickerModule = typeof import('emoji-picker-react');

interface LazyEmojiPickerProps {
  isDarkMode: boolean;
  onEmojiSelect: (emoji: string) => void;
  width?: number;
  height?: number;
}

export default function LazyEmojiPicker({
  isDarkMode,
  onEmojiSelect,
  width = 300,
  height = 400,
}: LazyEmojiPickerProps) {
  const [pickerModule, setPickerModule] = useState<EmojiPickerModule | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import('emoji-picker-react')
      .then((module) => {
        if (!cancelled) {
          setPickerModule(module);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadFailed) {
    return (
      <div className="w-[300px] rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-lg dark:border-border dark:bg-card dark:text-slate-300">
        이모지를 불러오지 못했습니다.
      </div>
    );
  }

  if (!pickerModule) {
    return (
      <div className="flex h-[400px] w-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 shadow-lg dark:border-border dark:bg-card dark:text-slate-300">
        이모지 불러오는 중...
      </div>
    );
  }

  const EmojiPicker = pickerModule.default;
  const theme = isDarkMode ? pickerModule.Theme.DARK : pickerModule.Theme.LIGHT;

  return (
    <EmojiPicker
      onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
      theme={theme}
      lazyLoadEmojis
      skinTonesDisabled
      searchPlaceHolder="이모지 검색..."
      width={width}
      height={height}
    />
  );
}
