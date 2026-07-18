import { useEffect, useRef } from 'react';

import { useAuthSession } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationData } from '../types/notification';
import { isIgnorableNotificationError, notificationApi } from '../utils/notificationApi';
import { ensureRealtimeAuthSession } from '../utils/realtimeAuth';
import { NOTIFICATION_SOCKET_DESTINATION } from '../utils/socketDestinations';
import { loadStompModule, resolveStompBrokerUrl, type StompClient } from '../utils/stomp';

export const reloadNotificationSnapshot = async (
    fetchNotifications: () => Promise<NotificationData[]>,
    setNotifications: (notifications: NotificationData[]) => void,
    isCurrent: () => boolean = () => true,
) => {
    const notifications = await fetchNotifications();
    if (isCurrent()) {
        setNotifications(notifications);
    }
};

export const useNotificationSocket = (enabled = true) => {
    const { isLoggedIn, userId } = useAuthSession();
    const addNotification = useNotificationStore((state) => state.addNotification);
    const setNotifications = useNotificationStore((state) => state.setNotifications);
    const clientRef = useRef<StompClient | null>(null);

    useEffect(() => {
        let disposed = false;
        let reloadGeneration = 0;
        const disconnect = () => {
            if (clientRef.current) {
                void clientRef.current.deactivate();
                clientRef.current = null;
            }
        };

        if (!enabled) {
            disconnect();
            return;
        }

        // 로그인이 안되어 있거나 유저 정보가 없으면 연결하지 않음
        if (!isLoggedIn) {
            disconnect();
            return;
        }

        // 이미 연결되어 있고 활성화 상태라면 재연결 하지 않음
        if (clientRef.current && clientRef.current.active) {
            return;
        }

        void (async () => {
            const isAuthReady = await ensureRealtimeAuthSession();
            if (disposed || !enabled || !isLoggedIn || clientRef.current?.active || !isAuthReady) {
                return;
            }

            const { Client } = await loadStompModule();
            if (disposed || !enabled || !isLoggedIn || clientRef.current?.active) {
                return;
            }

            const client = new Client({
                brokerURL: resolveStompBrokerUrl(),

                // 재연결 설정
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,

                onConnect: () => {
                    if (disposed) {
                        return;
                    }

                    const currentReloadGeneration = ++reloadGeneration;
                    const isCurrentReload = () => (
                        !disposed && currentReloadGeneration === reloadGeneration
                    );
                    const receivedDuringReload: NotificationData[] = [];
                    let snapshotReloaded = false;

                    // 개인 알림 구독
                    client.subscribe(NOTIFICATION_SOCKET_DESTINATION, (message) => {
                        if (disposed) {
                            return;
                        }

                        try {
                            const notification: NotificationData = JSON.parse(message.body);
                            if (isCurrentReload() && !snapshotReloaded) {
                                receivedDuringReload.push(notification);
                            }
                            addNotification(notification);
                        } catch (error) {
                            console.error('Failed to parse notification:', error);
                        }
                    });

                    void reloadNotificationSnapshot(
                        notificationApi.getNotifications,
                        setNotifications,
                        isCurrentReload,
                    ).catch((error) => {
                        if (isCurrentReload() && !isIgnorableNotificationError(error)) {
                            console.error('Failed to reload notifications after socket connection:', error);
                        }
                    }).finally(() => {
                        if (!isCurrentReload()) {
                            return;
                        }

                        snapshotReloaded = true;
                        receivedDuringReload.forEach(addNotification);
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
        })();

        return () => {
            disposed = true;
            // 컴포넌트 언마운트 시 연결 해제
            disconnect();
        };
    }, [enabled, isLoggedIn, userId, addNotification, setNotifications]); // isLoggedIn/userId 변경 시(로그인/로그아웃) 재실행
};
