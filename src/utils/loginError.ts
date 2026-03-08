const PROVIDER_ERROR_PREFIXES = ["KAKAO_", "NAVER_", "GOOGLE_"];

export const getLoginQueryErrorMessage = (search: string): string | null => {
  const rawError = new URLSearchParams(search).get('error');
  if (!rawError) {
    return null;
  }

  if (PROVIDER_ERROR_PREFIXES.some((prefix) => rawError.startsWith(prefix))) {
    const [, providerMessage = '소셜 로그인 처리 중 오류가 발생했습니다.'] = rawError.split(':', 2);
    return providerMessage.trim() || '소셜 로그인 처리 중 오류가 발생했습니다.';
  }

  switch (rawError) {
    case 'manual_link_required':
      return '기존 계정으로 로그인 후 마이페이지에서 소셜 계정을 연동해주세요.';
    case 'invalid_oauth2_request':
      return 'OAuth2 인증 요청이 유효하지 않습니다. 다시 시도해주세요.';
    case 'oauth2_link_session_expired':
      return '계정 연동 세션이 만료되었습니다. 마이페이지에서 다시 시도해주세요.';
    case 'oauth2_link_failed':
      return '계정 연동 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
    case 'oauth2_provider_payload_invalid':
      return '소셜 로그인 응답이 올바르지 않습니다. 다시 시도해주세요.';
    case 'user_not_found_after_auth':
      return '소셜 로그인 처리 후 계정을 찾지 못했습니다. 다시 시도해주세요.';
    case 'oauth2_auth_failed':
      return '소셜 로그인에 실패했습니다. 다시 시도해주세요.';
    default:
      return null;
  }
};
