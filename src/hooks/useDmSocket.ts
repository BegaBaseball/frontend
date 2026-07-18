import { useEffect, useRef, useState } from 'react';

import type { DirectMessage, DmDeleteEvent } from '../types/dm';
import { ensureRealtimeAuthSession } from '../utils/realtimeAuth';
import { buildDmSocketDestination } from '../utils/socketDestinations';
import { loadStompModule, resolveStompBrokerUrl, type StompClient, type StompMessage } from '../utils/stomp';

type DmSocketFactoryOptions = {
  destination: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: unknown) => void;
  onMessage: (message: DirectMessage | DmDeleteEvent) => void;
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
  onMessageDeleted?: (messageId: number) => void;
  onConnectionRestored?: () => void;
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

export function useDmSocket({
  roomId,
  enabled = true,
  onMessageReceived,
  onMessageDeleted,
  onConnectionRestored,
}: UseDmSocketProps) {
  const clientRef = useRef<StompClient | null>(null);
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onConnectionRestoredRef = useRef(onConnectionRestored);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageDeleted]);

  useEffect(() => {
    onConnectionRestoredRef.current = onConnectionRestored;
  }, [onConnectionRestored]);

  useEffect(() => {
    let disposed = false;
    let hasConnected = false;
    const testSocketFactory = getTestSocketFactory();

    const markConnected = () => {
      if (disposed) {
        return false;
      }

      const connectionWasRestored = hasConnected;
      hasConnected = true;
      setIsConnected(true);

      return connectionWasRestored;
    };

    const handleConnected = () => {
      if (markConnected()) {
        onConnectionRestoredRef.current?.();
      }
    };

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
        onConnect: handleConnected,
        onDisconnect: () => {
          if (!disposed) {
            setIsConnected(false);
          }
        },
        onError: () => {
          if (!disposed) {
            setIsConnected(false);
          }
        },
        onMessage: (message) => {
          if (disposed) {
            return;
          }

          const payload = message as DirectMessage | DmDeleteEvent;
          if ('deleted' in payload && payload.deleted) {
            onMessageDeletedRef.current?.(payload.messageId);
          } else {
            onMessageReceivedRef.current(payload as DirectMessage);
          }
        },
      });

      return () => {
        disposed = true;
        if (typeof cleanup === 'function') {
          cleanup();
        }
        setIsConnected(false);
      };
    }

    void (async () => {
      const isAuthReady = await ensureRealtimeAuthSession();
      if (disposed || !enabled || !roomId || !isAuthReady) {
        return;
      }

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
        const connectionWasRestored = markConnected();
        if (disposed) {
          return;
        }

        client.subscribe(buildDmSocketDestination(roomId), (message: StompMessage) => {
          if (disposed) {
            return;
          }

          const payload = JSON.parse(message.body) as DirectMessage | DmDeleteEvent;
          if ('deleted' in payload && payload.deleted) {
            onMessageDeletedRef.current?.(payload.messageId);
          } else {
            onMessageReceivedRef.current(payload as DirectMessage);
          }
        });

        if (connectionWasRestored) {
          onConnectionRestoredRef.current?.();
        }
      };

      client.onStompError = (frame) => {
        if (disposed) {
          return;
        }

        console.error('DM STOMP error', {
          command: frame.command,
          headers: frame.headers,
          bodyLength: frame.body ? frame.body.length : 0,
        });
        setIsConnected(false);
      };

      client.onWebSocketClose = () => {
        if (!disposed) {
          setIsConnected(false);
        }
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
