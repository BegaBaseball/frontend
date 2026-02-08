import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationData } from '../types/notification';

export const useNotificationSocket = () => {
    const { user } = useAuthStore();
    const { addNotification } = useNotificationStore();
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        // 로그인이 안되어 있거나 유저 정보가 없으면 연결하지 않음
        if (!user) {
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

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        let wsBaseUrl = '';

        if (apiBaseUrl.startsWith('http')) {
            wsBaseUrl = apiBaseUrl
                .replace(/^http:/, 'ws:')
                .replace(/^https:/, 'wss:')
                .replace(/\/api\/?$/, '');
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // "/api" -> ""
            const cleanPath = apiBaseUrl.replace(/\/api\/?$/, '');
            wsBaseUrl = `${protocol}//${window.location.host}${cleanPath}`;
        }

        const brokerUrl = `${wsBaseUrl}/ws`;

        const client = new Client({
            brokerURL: brokerUrl,

            // 재연결 설정
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                // 개인 알림 구독
                client.subscribe(`/topic/notifications/${user.id}`, (message) => {
                    try {
                        const notification: NotificationData = JSON.parse(message.body);
                        addNotification(notification);
                        // 알림 수신 시 사용자 정보(포인트 등) 최신화
                        useAuthStore.getState().fetchProfileAndAuthenticate();
                    } catch (error) {
                        console.error('Failed to parse notification:', error);
                    }
                });
            },

            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },

            onWebSocketError: (event) => {
                console.error('WebSocket error:', event);
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
    }, [user?.id, addNotification]); // user.id가 변경될 때마다(로그인/로그아웃) 재실행
};
