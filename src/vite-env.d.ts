/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_MAP_KEY?: string;
  readonly VITE_KAKAO_API_KEY?: string;
  readonly VITE_CHEER_API_URL?: string;
  readonly VITE_PROXY_TARGET?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_TOSS_CLIENT_KEY?: string;
  readonly VITE_MATE_PAYMENT_MODE?: 'DIRECT_TRADE' | 'TOSS_TEST';
  readonly VITE_MATE_REQUIRE_SOCIAL_VERIFICATION?: 'true' | 'false';
  readonly VITE_MOCK_CHATBOT_RATE_LIMIT?: 'true' | 'false' | 'cycling' | '10' | '20' | '40';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  kakao: typeof kakao;
  Kakao?: {
    isInitialized(): boolean;
    init(appKey: string): void;
    Share?: {
      sendDefault(settings: unknown): void;
    };
  };
  Cypress?: unknown;
  __MATE_PAYMENT_MODE__?: string;
}
