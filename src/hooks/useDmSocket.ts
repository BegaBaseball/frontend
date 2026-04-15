import { useEffect, useRef, useState } from 'react';

import type { DirectMessage } from '../types/dm';
import { buildDmSocketDestination } from '../utils/socketDestinations';
import { loadStompModule, resolveStompBrokerUrl, type StompClient, type StompMessage } from '../utils/stomp';

type DmSocketFactoryOptions = {
  destination: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: unknown) => void;
  onMessage: (message: DirectMessage) => void;
};

type DmSocketFactory = (options: DmSocketFactoryOptions) => void | (() => void);

type DmSocketWindow = Window & {
  Cypress?: unknown;
  __begaDmSocketFactory?: DmSocketFactory;
};

interface UseDmSocketProps {
  roomId: number | string;
  enabled?: boolean;
  onMessageReceived: (message: DirectMessage) => void;
}

const getTestSocketFactory = (): DmSocketFactory | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const typedWindow = window as DmSocketWindow;
  if (!typedWindow.Cypress || typeof typedWindow.__begaDmSocketFactory !== 'function') {
    return null;
  }

  return typedWindow.__begaDmSocketFactory;
};

export function useDmSocket({ roomId, enabled = true, onMessageReceived }: UseDmSocketProps) {
  const clientRef = useRef<StompClient | null>(null);
  const onMessageReceivedRef = useRef(onMessageReceived);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    let disposed = false;
    const testSocketFactory = getTestSocketFactory();

    const disconnect = () => {
      if (clientRef.current?.active) {
        void clientRef.current.deactivate();
      }
      clientRef.current = null;
      setIsConnected(false);
    };

    if (!enabled || !roomId) {
      disconnect();
      return;
    }

    if (testSocketFactory) {
      const cleanup = testSocketFactory({
        destination: buildDmSocketDestination(roomId),
        onConnect: () => setIsConnected(true),
        onDisconnect: () => setIsConnected(false),
        onError: () => setIsConnected(false),
        onMessage: (message) => onMessageReceivedRef.current(message),
      });

      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
        setIsConnected(false);
      };
    }

    void (async () => {
      const { Client } = await loadStompModule();
      if (disposed || !enabled || !roomId) {
        return;
      }

      const client = new Client({
        brokerURL: resolveStompBrokerUrl(),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      client.onConnect = () => {
        setIsConnected(true);
        client.subscribe(buildDmSocketDestination(roomId), (message: StompMessage) => {
          const receivedMessage = JSON.parse(message.body) as DirectMessage;
          onMessageReceivedRef.current(receivedMessage);
        });
      };

      client.onStompError = (frame) => {
        console.error('DM STOMP error', {
          command: frame.command,
          headers: frame.headers,
          bodyLength: frame.body ? frame.body.length : 0,
        });
        setIsConnected(false);
      };

      client.onWebSocketClose = () => {
        setIsConnected(false);
      };

      client.activate();
      clientRef.current = client;
    })();

    return () => {
      disposed = true;
      disconnect();
    };
  }, [roomId, enabled]);

  return {
    isConnected,
  };
}
