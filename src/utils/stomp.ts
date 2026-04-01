import { SERVER_BASE_URL } from '../constants/config';

export type { Client as StompClient, IMessage as StompMessage } from '@stomp/stompjs';

let stompModulePromise: Promise<typeof import('@stomp/stompjs')> | null = null;

export const loadStompModule = () => {
  if (!stompModulePromise) {
    stompModulePromise = import('@stomp/stompjs');
  }

  return stompModulePromise;
};

export const resolveStompBrokerUrl = (): string => {
  try {
    const serverUrl = new URL(SERVER_BASE_URL);
    const serverProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${serverProtocol}//${serverUrl.host}/ws`;
  } catch {
    if (typeof window !== 'undefined') {
      const pageProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${pageProtocol}//${window.location.host}/ws`;
    }

    const wsProtocol = SERVER_BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
    const wsHost = SERVER_BASE_URL.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${wsHost}/ws`;
  }
};
