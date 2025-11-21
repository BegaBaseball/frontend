// constants/validation.ts
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
  },
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

export const ERROR_MESSAGES = {
  NAME: {
    REQUIRED: '닉네임을 입력해주세요',
  },
  EMAIL: {
    REQUIRED: '이메일을 입력해주세요',
    INVALID: '올바른 이메일 형식이 아닙니다',
  },
  PASSWORD: {
    REQUIRED: '비밀번호를 입력해주세요',
    MIN_LENGTH: '비밀번호는 8자 이상이어야 합니다',
    INVALID: '대문자, 소문자, 숫자, 특수문자를 각 1개 이상 포함해야 합니다',
  },
  CONFIRM_PASSWORD: {
    REQUIRED: '비밀번호 확인을 입력해주세요',
    NOT_MATCH: '비밀번호가 일치하지 않습니다',
  },
  TEAM: {
    REQUIRED: '응원팀을 선택해주세요',
  },
};