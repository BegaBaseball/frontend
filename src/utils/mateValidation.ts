const forbiddenWords = ['욕설', '비방', '광고'];
const phonePattern = /\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}/;
const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;

const hasForbiddenWord = (text: string): boolean =>
  forbiddenWords.some((word) => text.includes(word));

const hasBlockedContactOrLink = (text: string): boolean =>
  phonePattern.test(text) || emailPattern.test(text) || urlPattern.test(text);

export const validateMateDescription = (text: string): string => {
  if (text.length < 10) {
    return '소개글은 최소 10자 이상 입력해주세요.';
  }
  if (text.length > 200) {
    return '소개글은 200자를 초과할 수 없습니다.';
  }
  if (hasForbiddenWord(text)) {
    return '부적절한 단어가 포함되어 있습니다.';
  }
  if (hasBlockedContactOrLink(text)) {
    return '연락처 정보나 링크는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.';
  }
  return '';
};

export const validateMateApplyMessage = (text: string): string => {
  if (text.length < 10) {
    return '메시지는 최소 10자 이상 입력해주세요.';
  }
  if (text.length > 500) {
    return '메시지는 500자를 초과할 수 없습니다.';
  }
  if (hasForbiddenWord(text)) {
    return '부적절한 단어가 포함되어 있습니다.';
  }
  if (hasBlockedContactOrLink(text)) {
    return '연락처 정보나 링크는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.';
  }
  return '';
};

export const validateMateChatMessage = (text: string): string => {
  if (hasForbiddenWord(text)) {
    return '부적절한 단어가 포함되어 있습니다.';
  }
  if (hasBlockedContactOrLink(text)) {
    return '개인정보 보호를 위해 연락처 정보나 외부 링크는 공유할 수 없습니다.';
  }
  return '';
};
