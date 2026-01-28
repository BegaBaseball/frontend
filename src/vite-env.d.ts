/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHEER_API_URL?: string;
  readonly VITE_SUPABASE_SIGN_FUNCTION_URL?: string;
  readonly VITE_PROXY_TARGET?: string;
  readonly VITE_AI_API_BASE_URL?: string;
  readonly VITE_MOCK_CHATBOT_RATE_LIMIT?: 'true' | 'false' | 'cycling' | '10' | '20' | '40';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  kakao: any;
}
