import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { toast } from 'sonner';
import { SERVER_BASE_URL } from '../constants/config';

interface ChatMessage {
  id: string | number;
  partyId: string | number;
  senderId: string | number;
  senderName: string;
  message: string;
  imageUrl?: string;
  createdAt: string;
}

interface UseWebSocketProps {
  partyId: string | number;
  onMessageReceived: (message: ChatMessage) => void;
  enabled?: boolean;
}

export function useWebSocket({ partyId, onMessageReceived, enabled = true }: UseWebSocketProps) {
  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // 최신 콜백을 ref로 유지하여 deps에서 제거 → 불필요한 재연결 방지
  const onMessageReceivedRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  });

  // WebSocket 연결
  useEffect(() => {
    if (!enabled || !partyId) {
      setIsConnected(false);
      return;
    }

    const resolveBrokerUrl = (): string => {
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

    const brokerUrl = resolveBrokerUrl();

    const client = new Client({
      brokerURL: brokerUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);

      // 해당 파티 채팅방 구독
      client.subscribe(`/topic/party/${partyId}`, (message: IMessage) => {
        const receivedMessage = JSON.parse(message.body) as ChatMessage;
        onMessageReceivedRef.current(receivedMessage);
      });
    };

    client.onStompError = (frame) => {
      const headerKeys = Object.keys(frame.headers || {}).sort().slice(0, 12);
      console.error('STOMP error', {
        command: frame.command,
        headerKeys,
        bodyLength: frame.body ? frame.body.length : 0,
      });
      setIsConnected(false);
    };

    client.onWebSocketClose = () => {
      setIsConnected(false);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
      setIsConnected(false);
    };
  }, [partyId, enabled]);

  // 메시지 전송
  const sendMessage = useCallback(
    (message: {
      partyId: string | number;
      senderId: string | number;
      senderName: string;
      message: string;
      imageUrl?: string;
    }): boolean => {
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
