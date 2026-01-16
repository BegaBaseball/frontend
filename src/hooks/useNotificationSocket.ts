import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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

        let socketUrl: string;

        if (import.meta.env.DEV) {
            // 개발 환경: 프록시 타겟(8080) 직접 사용 또는 로컬호스트
            socketUrl = 'http://localhost:8080/ws';
        } else {
            // 배포 환경: 현재 도메인의 /ws 엔드포인트 사용 (Nginx 등이 라우팅)
            const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            socketUrl = `${protocol}//${window.location.host}/ws`;
        }

        const client = new Client({
            // SockJS를 사용하는 factory 함수
            webSocketFactory: () => new SockJS(socketUrl),

            // 재연결 설정
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                console.log('Notification WebSocket Connected');

                // 개인 알림 구독
                client.subscribe(`/topic/notifications/${user.id}`, (message) => {
                    try {
                        const notification: NotificationData = JSON.parse(message.body);
                        console.log('New notification received:', notification);
                        addNotification(notification);
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
                console.log('Deactivating Notification WebSocket');
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [user, addNotification]); // user가 변경될 때마다(로그인/로그아웃) 재실행
};
