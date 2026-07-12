import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ChatMessage } from '../types/mate';
import { ensureRealtimeAuthSession } from '../utils/realtimeAuth';
import { buildPartySocketDestination } from '../utils/socketDestinations';
import { loadStompModule, resolveStompBrokerUrl, type StompClient, type StompMessage } from '../utils/stomp';

type OutboundChatMessage = {
  partyId: string | number;
  message: string;
  imageUrl?: string;
  clientMessageId: string;
};

interface UseWebSocketProps {
  partyId: string | number;
  onMessageReceived: (message: ChatMessage) => void;
  onConnectionRestored?: () => void;
  enabled?: boolean;
}

export function useWebSocket({
  partyId,
  onMessageReceived,
  onConnectionRestored,
  enabled = true,
}: UseWebSocketProps) {
  const clientRef = useRef<StompClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // 최신 콜백을 ref로 유지하여 deps에서 제거 → 불필요한 재연결 방지
  const onMessageReceivedRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  });
  const onConnectionRestoredRef = useRef(onConnectionRestored);
  useEffect(() => {
    onConnectionRestoredRef.current = onConnectionRestored;
  }, [onConnectionRestored]);

  // WebSocket 연결
  useEffect(() => {
    let disposed = false;
    const hasConnectedRef = { current: false };

    if (!enabled || !partyId) {
      if (clientRef.current?.active) {
        void clientRef.current.deactivate();
      }
      clientRef.current = null;
      setIsConnected(false);
      return;
    }

    void (async () => {
      const isAuthReady = await ensureRealtimeAuthSession();
      if (disposed || !enabled || !partyId || !isAuthReady) {
        return;
      }

      const { Client } = await loadStompModule();
      if (disposed || !enabled || !partyId) {
        return;
      }

      const client = new Client({
        brokerURL: resolveStompBrokerUrl(),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      client.onConnect = () => {
        const wasConnected = hasConnectedRef.current;
        hasConnectedRef.current = true;
        setIsConnected(true);

        // 해당 파티 채팅방 구독
        client.subscribe(buildPartySocketDestination(partyId), (message: StompMessage) => {
          const receivedMessage = JSON.parse(message.body) as ChatMessage;
          onMessageReceivedRef.current(receivedMessage);
        });

        if (wasConnected) {
          onConnectionRestoredRef.current?.();
        }
      };

      client.onStompError = (frame) => {
        const headerKeys = Object.keys(frame.headers || {}).sort().slice(0, 12);
        console.error('STOMP error', {
          command: frame.command,
          headerKeys,
          bodyLength: frame.body ? frame.body.length : 0,
        });
        toast.error('채팅 채널에 접근할 수 없습니다. 파티 참여 상태를 확인해주세요.');
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
      if (clientRef.current?.active) {
        void clientRef.current.deactivate();
      }
      clientRef.current = null;
      setIsConnected(false);
      hasConnectedRef.current = false;
    };
  }, [partyId, enabled]);

  // 메시지 전송
  const sendMessage = useCallback(
    (message: OutboundChatMessage): boolean => {
      if (!clientRef.current || !isConnected) {
        console.error('WebSocket is not connected');
        toast.error('채팅 서버와 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.');
        return false;
      }

      try {
        clientRef.current.publish({
          destination: `/app/chat/${partyId}`,
          body: JSON.stringify(message),
        });
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('메시지 전송에 실패했습니다.');
        return false;
      }
    },
    [partyId, isConnected]
  );

  return {
    sendMessage,
    isConnected,
  };
}
