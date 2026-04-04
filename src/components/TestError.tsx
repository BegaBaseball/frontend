import React, { useState } from 'react';
import { Button } from './ui/button';

function RenderCrash(): never {
    throw new Error('Test render crash for ErrorBoundary');
}

export default function TestError() {
    const [shouldCrashOnRender, setShouldCrashOnRender] = useState(false);
    const isDev = import.meta.env.DEV;

    const triggerManualDispatch = (status: number) => {
        // This tests the Context Listener
        const events = {
            400: { type: 'UNKNOWN', message: '잘못된 요청입니다.', statusCode: 400 },
            401: { type: 'AUTH', message: '로그인이 필요합니다.', statusCode: 401 },
            403: { type: 'PERMISSION', message: '접근 권한이 없습니다.', statusCode: 403 },
            404: { type: 'NOT_FOUND', message: '요청한 리소스를 찾을 수 없습니다.', statusCode: 404 },
            500: { type: 'SERVER', message: '서버 내부 오류가 발생했습니다.', statusCode: 500 },
        };

        const detail = events[status as keyof typeof events] || events[500];

        window.dispatchEvent(new CustomEvent('global-api-error', {
            detail
        }));
    };

    if (shouldCrashOnRender) {
        return <RenderCrash />;
    }

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Global Error Handler Test</h1>
            <div className="flex flex-wrap gap-4">
                {isDev && (
                    <Button onClick={() => setShouldCrashOnRender(true)} variant="destructive">
                        Trigger Render Crash
                    </Button>
                )}

                <div className="w-full h-px bg-gray-200 my-4" />
                <h2 className="text-lg font-semibold w-full">Simulate UI (Event Dispatch)</h2>

                <Button onClick={() => triggerManualDispatch(400)} variant="outline">
                    Simulate 400
                </Button>
                <Button onClick={() => triggerManualDispatch(401)} variant="outline">
                    Simulate 401
                </Button>
                <Button onClick={() => triggerManualDispatch(403)} variant="outline">
                    Simulate 403
                </Button>
                <Button onClick={() => triggerManualDispatch(404)} variant="outline">
                    Simulate 404
                </Button>
                <Button onClick={() => triggerManualDispatch(500)} variant="destructive">
                    Simulate 500
                </Button>
            </div>
        </div>
    );
}
