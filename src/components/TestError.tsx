import React from 'react';
import api from '../api/axios';
import { Button } from './ui/button';

export default function TestError() {
    const triggerError = async (status: number) => {
        try {
            // Intentionally calling non-existent endpoints or mocking status
            // Since we can't easily force backend to return 500/403 without backend changes,
            // we can simulate the event dispatch manually for testing UI, 
            // OR try to call a real endpoint that might fail.

            // Method 1: Manual Event Dispatch (Testing UI only)
            // const error = {
            //   response: { status, data: { message: `Test Error ${status}` } }
            // };
            // window.dispatchEvent(new CustomEvent('global-api-error', { 
            //   detail: { 
            //     type: 'SERVER', 
            //     message: `Test Error ${status}`, 
            //     statusCode: status 
            //   } 
            // }));

            // Method 2: Real API call (Testing Interceptor)
            // We need a way to mock this.
            // Let's use a non-existent URL for 404
            if (status === 404) {
                await api.get('/non-existent-endpoint');
            }
            // For 401, we can try to call a protected endpoint without auth (if we logout first)
            // For 500, difficult without backend support.

            // Let's simulate Axios Error structure for manual dispatch to test 'parseError' logic implicitly?
            // No, let's trust the interceptor works if 404 works.

        } catch {
            // error handled locally
        }
    };

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

    return (
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold">Global Error Handler Test</h1>
            <div className="flex flex-wrap gap-4">
                <Button onClick={() => triggerError(404)} variant="destructive">
                    Trigger Real 404 (Axios)
                </Button>

                <div className="w-full h-px bg-gray-200 my-4" />
                <h2 className="text-lg font-semibold w-full">Simulate UI (Event Dispatch)</h2>

                <Button onClick={() => triggerManualDispatch(400)} variant="outline">
                    Simulate 400
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
