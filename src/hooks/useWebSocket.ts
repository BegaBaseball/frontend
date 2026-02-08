import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';

interface ChatMessage {
  id: string | number;
  partyId: string | number;
  senderId: string | number;
  senderName: string;
  message: string;
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

  // WebSocket 연결
  useEffect(() => {
    if (!enabled || !partyId) {
      setIsConnected(false);
      return;
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Development proxy handles /ws -> backend
    // Production Nginx handles /ws -> backend
    const brokerUrl = `${protocol}//${window.location.host}/ws`;

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
        onMessageReceived(receivedMessage);
      });
    };

    client.onStompError = (frame) => {
      console.error('STOMP error:', frame);
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
  }, [partyId, enabled, onMessageReceived]);

  // 메시지 전송
  const sendMessage = useCallback(
    (message: {
      partyId: string | number;
      senderId: string | number;
      senderName: string;
      message: string;
    }) => {
      if (!clientRef.current || !isConnected) {
        console.error('WebSocket is not connected');
        return;
      }

      try {
        clientRef.current.publish({
          destination: `/app/chat/${partyId}`,
          body: JSON.stringify(message),
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [partyId, isConnected]
  );

  return {
    sendMessage,
    isConnected,
  };
}