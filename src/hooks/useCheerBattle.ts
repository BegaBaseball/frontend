import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/axios';
import { getCheerBattleStatus, CheerBattleStatus } from '../api/cheerApi';
import { useAuthCheerActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { resolveCheerBattleVoteLoginPath } from '../utils/cheerBattle';
import { getCurrentRelativeUrl } from '../utils/loginRedirect';

interface UseCheerBattleOptions {
    gameId: string | null | undefined;
    /** homeTeam ID (e.g. 'LG') */
    homeTeamId: string;
    /** awayTeam ID (e.g. 'KIA') */
    awayTeamId: string;
    enabled?: boolean;
}

type CheerBattleConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

interface CheerBattleState {
    /** vote counts keyed by teamId */
    stats: Record<string, number>;
    /** teamId the current user voted for, or null */
    myVote: string | null;
    isLoadingStatus: boolean;
    isVoting: boolean;
    isConnected: boolean;
    connectionStatus: CheerBattleConnectionStatus;
    reconnectAttempts: number;
    lastStatusSyncAt: number | null;
    error: string | null;
}

interface UseCheerBattleReturn extends CheerBattleState {
    vote: (teamId: string) => void;
    reconnect: () => void;
    homeVotes: number;
    awayVotes: number;
    totalVotes: number;
    homePercent: number;
    awayPercent: number;
}

/**
 * Manages CheerBattle state for a given game.
 *
 * - On mount: fetches initial status via REST (GET /api/cheer/battle/{gameId}/status)
 * - Subscribes to STOMP topic /topic/battle/{gameId} for live updates
 * - Sends votes via STOMP /app/battle/vote/{gameId}
 * - Optimistically updates UI and deducts cheer points from authStore
 */
export function useCheerBattle({
    gameId,
    homeTeamId,
    awayTeamId,
    enabled = true,
}: UseCheerBattleOptions): UseCheerBattleReturn {
    const navigate = useNavigate();
    const { isLoggedIn } = useAuthSession();
    const { userCheerPoints = 0 } = useAuthProfileSnapshot();
    const { deductCheerPoints } = useAuthCheerActions();

    const [state, setState] = useState<CheerBattleState>({
        stats: {},
        myVote: null,
        isLoadingStatus: false,
        isVoting: false,
        isConnected: false,
        connectionStatus: 'idle',
        reconnectAttempts: 0,
        lastStatusSyncAt: null,
        error: null,
    });

    const clientRef = useRef<Client | null>(null);
    const isSubscribedRef = useRef(false);

    // -----------------------------------------------------------------------
    // Initial REST status fetch
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!gameId || !enabled) return;

        let cancelled = false;
        setState((prev) => ({ ...prev, isLoadingStatus: true, error: null }));

        getCheerBattleStatus(gameId)
            .then((data: CheerBattleStatus) => {
                if (cancelled) return;
                setState((prev) => ({
                    ...prev,
                    stats: data.stats ?? {},
                    myVote: data.myVote ?? null,
                    isLoadingStatus: false,
                    lastStatusSyncAt: Date.now(),
                }));
            })
            .catch(() => {
                if (cancelled) return;
                // Non-fatal: WebSocket will still provide live data
                setState((prev) => ({ ...prev, isLoadingStatus: false }));
            });

        return () => {
            cancelled = true;
        };
    }, [gameId, enabled]);

    // -----------------------------------------------------------------------
    // Fallback REST polling while WebSocket is not connected
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!gameId || !enabled) return;
        if (state.connectionStatus === 'connected') return;

        let cancelled = false;
        const syncStatus = async () => {
            try {
                const data = await getCheerBattleStatus(gameId);
                if (cancelled) return;
                setState((prev) => {
                    if (prev.connectionStatus === 'connected') return prev;
                    return {
                        ...prev,
                        stats: data.stats ?? prev.stats,
                        myVote: prev.myVote ?? data.myVote ?? null,
                        lastStatusSyncAt: Date.now(),
                    };
                });
            } catch {
                if (cancelled) return;
                setState((prev) => prev);
            }
        };

        syncStatus();
        const intervalId = window.setInterval(syncStatus, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [enabled, gameId, state.connectionStatus]);

    useLayoutEffect(() => {
        if (!gameId || !enabled) return;

        const handleOffline = () => {
            const client = clientRef.current;
            if (client?.active) {
                client.deactivate().catch(() => undefined);
            }
            setState((prev) => ({
                ...prev,
                isConnected: false,
                connectionStatus: 'offline',
                error: '네트워크가 오프라인 상태입니다.',
            }));
        };

        const handleOnline = () => {
            const client = clientRef.current;
            if (client && !client.active) {
                client.activate();
            }
            setState((prev) => {
                if (prev.connectionStatus === 'offline' || !prev.isConnected) {
                    return {
                        ...prev,
                        isConnected: false,
                        connectionStatus: 'reconnecting',
                        error: '실시간 연결을 다시 시도 중입니다.',
                    };
                }
                if (prev.isConnected) return prev;
                return {
                    ...prev,
                    isConnected: false,
                    connectionStatus: 'reconnecting',
                    error: '실시간 연결을 다시 시도 중입니다.',
                };
            });
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [gameId, enabled]);

    // -----------------------------------------------------------------------
    // STOMP WebSocket subscription
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!gameId || !enabled) return;

        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        setState((prev) => ({
            ...prev,
            isConnected: false,
            connectionStatus: online ? 'connecting' : 'offline',
            error: online ? null : '네트워크가 오프라인 상태입니다.',
        }));

        const apiBaseUrl = api.defaults.baseURL || '/api';
        let wsBaseUrl: string;

        if (apiBaseUrl.startsWith('http')) {
            wsBaseUrl = apiBaseUrl
                .replace(/^http:/, 'ws:')
                .replace(/^https:/, 'wss:')
                .replace(/\/api\/?$/, '');
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const cleanPath = apiBaseUrl.replace(/\/api\/?$/, '');
            wsBaseUrl = `${protocol}//${window.location.host}${cleanPath}`;
        }

        const brokerUrl = `${wsBaseUrl}/ws`;

        const client = new Client({
            brokerURL: brokerUrl,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                setState((prev) => ({
                    ...prev,
                    isConnected: true,
                    connectionStatus: 'connected',
                    reconnectAttempts: 0,
                    lastStatusSyncAt: Date.now(),
                    error: null,
                }));
                isSubscribedRef.current = true;

                client.subscribe(`/topic/battle/${gameId}`, (message) => {
                    try {
                        const updatedStats = JSON.parse(message.body) as Record<string, number>;
                        setState((prev) => ({
                            ...prev,
                            stats: updatedStats,
                            lastStatusSyncAt: Date.now(),
                        }));
                    } catch {
                        // Ignore malformed messages
                    }
                });
            },

            onStompError: () => {
                const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                    connectionStatus: isOnline ? 'reconnecting' : 'offline',
                    reconnectAttempts: prev.reconnectAttempts + 1,
                    error: isOnline
                        ? '실시간 연결이 불안정합니다. 자동으로 재연결을 시도합니다.'
                        : '네트워크가 오프라인 상태입니다.',
                }));
            },

            onWebSocketError: () => {
                const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                    connectionStatus: isOnline ? 'reconnecting' : 'offline',
                    reconnectAttempts: prev.reconnectAttempts + 1,
                    error: isOnline
                        ? '실시간 연결이 끊겼습니다. 자동으로 재연결을 시도합니다.'
                        : '네트워크가 오프라인 상태입니다.',
                }));
            },

            onWebSocketClose: () => {
                const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                    connectionStatus: isOnline ? 'reconnecting' : 'offline',
                    reconnectAttempts: prev.reconnectAttempts + 1,
                    error: isOnline
                        ? '실시간 연결이 끊겼습니다. 자동으로 재연결을 시도합니다.'
                        : '네트워크가 오프라인 상태입니다.',
                }));
                isSubscribedRef.current = false;
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            isSubscribedRef.current = false;
            if (clientRef.current?.active) {
                clientRef.current.deactivate();
            }
            clientRef.current = null;
            setState((prev) => ({
                ...prev,
                isConnected: false,
                connectionStatus: 'idle',
                reconnectAttempts: 0,
                lastStatusSyncAt: null,
                error: null,
            }));
        };
    }, [gameId, enabled]);

    const reconnect = useCallback(() => {
        if (!gameId || !enabled) return;

        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        if (!isOnline) {
            setState((prev) => ({
                ...prev,
                isConnected: false,
                connectionStatus: 'offline',
                error: '네트워크가 오프라인 상태입니다.',
            }));
            return;
        }

        const client = clientRef.current;
        if (!client) return;

        setState((prev) => ({
            ...prev,
            isConnected: false,
            connectionStatus: 'reconnecting',
            reconnectAttempts: prev.reconnectAttempts + 1,
            error: '실시간 연결을 다시 시도 중입니다.',
        }));

        if (!client.active) {
            client.activate();
            return;
        }

        client
            .deactivate()
            .catch(() => undefined)
            .finally(() => client.activate());
    }, [enabled, gameId]);

    // -----------------------------------------------------------------------
    // Vote action
    // -----------------------------------------------------------------------
    const vote = useCallback(
        (teamId: string) => {
            if (!gameId) return;

            const loginPath = resolveCheerBattleVoteLoginPath(isLoggedIn, getCurrentRelativeUrl());
            if (loginPath) {
                navigate(loginPath);
                return;
            }

            if (state.myVote !== null) {
                toast.info('이미 투표에 참여하셨습니다.');
                return;
            }

            const currentPoints = userCheerPoints;
            if (currentPoints < 1) {
                toast.error('응원 포인트가 부족합니다. (1포인트 필요)');
                return;
            }

            if (state.isVoting) return;

            if (!clientRef.current?.active) {
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                    connectionStatus: 'reconnecting',
                    error: '실시간 연결이 불안정합니다. 재연결 후 다시 시도해 주세요.',
                }));
                toast.warning('실시간 연결이 불안정합니다. 재연결 후 다시 시도해 주세요.');
                return;
            }

            // Optimistic update
            setState((prev) => ({
                ...prev,
                myVote: teamId,
                isVoting: true,
                stats: {
                    ...prev.stats,
                    [teamId]: (prev.stats[teamId] ?? 0) + 1,
                },
            }));
            deductCheerPoints(1);

            try {
                clientRef.current.publish({
                    destination: `/app/battle/vote/${gameId}`,
                    body: teamId,
                });
            } catch {
                toast.error('투표 전송에 실패했습니다.');
                // Rollback optimistic update
                setState((prev) => ({
                    ...prev,
                    myVote: null,
                    isVoting: false,
                    stats: {
                        ...prev.stats,
                        [teamId]: Math.max(0, (prev.stats[teamId] ?? 1) - 1),
                    },
                }));
                return;
            }

            setState((prev) => ({ ...prev, isVoting: false }));
        },
        [gameId, isLoggedIn, navigate, state.myVote, state.isVoting, deductCheerPoints, userCheerPoints]
    );

    // -----------------------------------------------------------------------
    // Derived percentages
    // -----------------------------------------------------------------------
    const homeVotes = state.stats[homeTeamId] ?? 0;
    const awayVotes = state.stats[awayTeamId] ?? 0;
    const totalVotes = homeVotes + awayVotes;

    const homePercent = totalVotes === 0 ? 50 : Math.round((homeVotes / totalVotes) * 100);
    const awayPercent = totalVotes === 0 ? 50 : 100 - homePercent;

    return {
        ...state,
        vote,
        reconnect,
        homeVotes,
        awayVotes,
        totalVotes,
        homePercent,
        awayPercent,
    };
}
