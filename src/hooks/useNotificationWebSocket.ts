import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationData } from '../types/notification'; 

interface UseNotificationWebSocketProps {
  userId: number | null;
  enabled?: boolean;
}

export function useNotificationWebSocket({ userId, enabled = true }: UseNotificationWebSocketProps) {
  const clientRef = useRef<Client | null>(null);
  const { addNotification, incrementUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        
        
        // 알림 구독
        client.subscribe(`/topic/notifications/${userId}`, (message: IMessage) => {
          try {
            const notification: NotificationData = JSON.parse(message.body);
            
            
            // Zustand 스토어에 추가
            addNotification(notification);
            incrementUnreadCount();
            
            // 브라우저 알림 (권한이 있으면)
            if (Notification && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/baseball-logo.png',
              });
            }
          } catch (error) {
            console.error('알림 처리 오류:', error);
          }
        });
      },
      onDisconnect: () => {
        
      },
      onStompError: (frame) => {
        console.error('STOMP 오류:', frame);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        
      }
    };
  }, [userId, enabled, addNotification, incrementUnreadCount]);

  return {
    isConnected: clientRef.current?.connected || false,
  };
}