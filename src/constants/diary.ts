import worstEmoji from 'figma:asset/7642c88659d68a93b809e39f4c56d9c284123115.png';
import fullEmoji from 'figma:asset/691ca553a888de6b3262d9c3c63d03f37db27b4a.png';
import bestEmoji from 'figma:asset/19b0bb1cde805dc5d6e6af053a4bd1622a1a4fad.png';
import angryEmoji from 'figma:asset/01cb53a9197c5457e6d7dd7460bdf1cd27b5440b.png';
import happyEmoji from 'figma:asset/e2bd5a0f58df48e435d03f049811638d849de606.png';

export const EMOJI_STATS = [
  { name: '최악', emoji: worstEmoji },
  { name: '배부름', emoji: fullEmoji },
  { name: '최고', emoji: bestEmoji },
  { name: '분노', emoji: angryEmoji },
  { name: '즐거움', emoji: happyEmoji },
];

export const WINNING_OPTIONS = [
  { value: 'WIN', label: '승', bg: '#22c55e', lightBg: '#f0fdf4', textColor: '#166534' },
  { value: 'DRAW', label: '무', bg: '#eab308', lightBg: '#fefce8', textColor: '#854d0e' },
  { value: 'LOSE', label: '패', bg: '#ef4444', lightBg: '#fef2f2', textColor: '#991b1b' },
];

export const MAX_PHOTOS = 6;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60MB

export const DEFAULT_EMOJI = happyEmoji;
export const DEFAULT_EMOJI_NAME = '즐거움';