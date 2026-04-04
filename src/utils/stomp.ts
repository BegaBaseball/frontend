import { getApiBaseUrl } from '../api/apiBase';

export type { Client as StompClient, IMessage as StompMessage } from '@stomp/stompjs';

let stompModulePromise: Promise<typeof import('@stomp/stompjs')> | null = null;

export const loadStompModule = () => {
  if (!stompModulePromise) {
    stompModulePromise = import('@stomp/stompjs');
  }

  return stompModulePromise;
};

export const resolveStompBrokerUrl = (apiBaseUrl = getApiBaseUrl()): string => {
  const normalizedBaseUrl = apiBaseUrl.trim();

  if (typeof window !== 'undefined' && (!normalizedBaseUrl || normalizedBaseUrl.startsWith('/'))) {
    const pageProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${pageProtocol}//${window.location.host}/ws`;
  }

  try {
    const serverUrl = new URL(
      normalizedBaseUrl,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    );
    const serverProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${serverProtocol}//${serverUrl.host}/ws`;
  } catch {
    if (typeof window !== 'undefined') {
      const pageProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${pageProtocol}//${window.location.host}/ws`;
    }

    const wsProtocol = normalizedBaseUrl.startsWith('https') ? 'wss:' : 'ws:';
    const wsHost = normalizedBaseUrl.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
    return `${wsProtocol}//${wsHost}/ws`;
  }
};
