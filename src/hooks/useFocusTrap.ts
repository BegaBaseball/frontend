import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        // 보이는 요소만 (display:none / 부모 hidden 제외). offsetParent 는 position:fixed 에서 null 일 수 있어 rects 도 함께 검사.
        .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
}

interface UseFocusTrapOptions {
    /** true 일 때만 트랩 활성화 (예: 다이얼로그 open) */
    active: boolean;
}

/**
 * 컨테이너 내부로 키보드 포커스를 가두고, 비활성/언마운트 시 직전 포커스로 복귀시킨다.
 * - 활성화 시 컨테이너 내 첫 focusable(없으면 컨테이너 자체)에 포커스.
 * - Tab/Shift+Tab 으로 첫↔마지막 focusable 순환(wrap).
 * 공유 다이얼로그 프리미티브(PlainDialog)에서 사용. portal DOM 기준으로 동작.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, { active }: UseFocusTrapOptions): void {
    useEffect(() => {
        if (!active) return;
        const container = containerRef.current;
        if (!container || typeof document === 'undefined') return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        // 초기 포커스: 첫 focusable, 없으면 컨테이너 자체.
        const initial = getFocusable(container);
        if (initial.length > 0) {
            initial[0].focus();
        } else {
            container.focus();
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const focusable = getFocusable(container);
            if (focusable.length === 0) {
                // 포커스 가능한 게 없으면 컨테이너에 묶어둔다.
                event.preventDefault();
                container.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const activeEl = document.activeElement;

            if (event.shiftKey) {
                if (activeEl === first || !container.contains(activeEl)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (activeEl === last || !container.contains(activeEl)) {
                event.preventDefault();
                first.focus();
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            // 직전 포커스 요소가 여전히 문서에 연결돼 있으면 복귀.
            if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
                previouslyFocused.focus();
            }
        };
    }, [active, containerRef]);
}
