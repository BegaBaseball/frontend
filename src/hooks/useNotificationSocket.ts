import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

import { useAuthSession } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationData } from '../types/notification';
import { SERVER_BASE_URL } from '../constants/config';
import { NOTIFICATION_SOCKET_DESTINATION } from '../utils/socketDestinations';

export const useNotificationSocket = (enabled = true) => {
    const { isLoggedIn, userId } = useAuthSession();
    const addNotification = useNotificationStore((state) => state.addNotification);
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
            return;
        }

        // 로그인이 안되어 있거나 유저 정보가 없으면 연결하지 않음
        if (!isLoggedIn) {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
            return;
        }

        // 이미 연결되어 있고 활성화 상태라면 재연결 하지 않음
        if (clientRef.current && clientRef.current.active) {
            return;
        }

        const resolveBrokerUrl = (): string => {
            try {
                const serverUrl = new URL(SERVER_BASE_URL);
                const serverProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
                return `${serverProtocol}//${serverUrl.host}/ws`;
            } catch {
                const pageProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                return `${pageProtocol}//${window.location.host}/ws`;
            }
        };

        const brokerUrl = resolveBrokerUrl();

        const client = new Client({
            brokerURL: brokerUrl,

            // 재연결 설정
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                // 개인 알림 구독
                client.subscribe(NOTIFICATION_SOCKET_DESTINATION, (message) => {
                    try {
                        const notification: NotificationData = JSON.parse(message.body);
                        addNotification(notification);
                    } catch (error) {
                        console.error('Failed to parse notification:', error);
                    }
                });
            },

            onStompError: (frame) => {
                const brokerMessage = frame.headers?.message || 'Unknown broker error';
                const detailLength = frame.body ? frame.body.length : 0;
                console.error('Broker STOMP error', {
                    message: brokerMessage,
                    detailLength,
                    command: frame.command,
                    code: frame.headers?.['message-id'] || frame.headers?.receipt,
                });
            },

            onWebSocketError: (event) => {
                const eventLike = event as Record<string, unknown>;
                const eventTarget = eventLike.target as Record<string, unknown> | undefined;
                console.error('WebSocket error:', {
                    type: eventLike.type ?? 'websocket',
                    message: eventLike.message ?? eventLike.reason ?? 'Unknown websocket error',
                    readyState: eventTarget?.readyState,
                    url: eventTarget?.url,
                });
            }
        });

        client.activate();
        clientRef.current = client;

        return () => {
            // 컴포넌트 언마운트 시 연결 해제
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [enabled, isLoggedIn, userId, addNotification]); // isLoggedIn/userId 변경 시(로그인/로그아웃) 재실행
};
