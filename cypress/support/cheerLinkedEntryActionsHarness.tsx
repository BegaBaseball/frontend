import { createElement, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

import MateDetailRuntime from '../../src/components/MateDetailRuntime';
import { ConfirmDialogProvider } from '../../src/components/contexts/ConfirmDialogContext';
import DiaryViewSection from '../../src/components/mypage/DiaryformRuntime';
import { useAuthStore } from '../../src/store/authStore';

interface Task9EntryHarness {
  mountSubject: () => void;
  setTarget: (target: string) => void;
  waitForLinkedLookupSettlement: (index: number) => Promise<void>;
  unmountSubject: () => void;
  unmount: () => void;
}

const MountedMateDetailRuntime = MateDetailRuntime as ComponentType<{ id?: string }>;

const installLinkedLookupSettlementTracker = () => {
  const originalFetch = window.fetch;
  const settlements: Promise<void>[] = [];

  const waitForClientWork = () => new Promise<void>((resolve) => {
    window.setTimeout(() => {
      const finish = () => window.setTimeout(resolve, 0);
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(finish);
        return;
      }
      finish();
    }, 0);
  });

  const trackedFetch: typeof window.fetch = (input, init) => {
    const requestUrl = input instanceof Request ? input.url : String(input);
    const responsePromise = originalFetch.call(window, input, init);
    if (!requestUrl.includes('/api/cheer/posts/linked')) return responsePromise;

    let markSettled!: () => void;
    settlements.push(new Promise<void>((resolve) => { markSettled = resolve; }));
    void responsePromise.then(
      () => waitForClientWork().then(markSettled),
      () => waitForClientWork().then(markSettled),
    );
    return responsePromise;
  };

  window.fetch = trackedFetch;
  return {
    restore() {
      if (window.fetch === trackedFetch) window.fetch = originalFetch;
    },
    waitForSettlement(index: number) {
      const settlement = settlements[index];
      return settlement ?? Promise.reject(new Error(`LINKED_LOOKUP_${index}_NOT_STARTED`));
    },
  };
};

function LocationProbe() {
  const location = useLocation();
  return createElement(
    'output',
    { 'data-testid': 'entry-router-location' },
    `${location.pathname}${location.search}`,
  );
}

const createHarness = (
  container: Element,
  renderSubject: (target: string) => ReactNode,
  initialTarget: string,
  onUnmount?: () => void,
): Task9EntryHarness => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const root = createRoot(container);
  const linkedLookupTracker = installLinkedLookupSettlementTracker();
  let target = initialTarget;
  let subjectMounted = true;

  const render = () => {
    root.render(createElement(
      MemoryRouter,
      { initialEntries: ['/task-9'] },
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          ConfirmDialogProvider,
          null,
          subjectMounted
            ? createElement(
              'section',
              { 'data-testid': 'entry-subject', 'data-target': target },
              renderSubject(target),
            )
            : null,
          createElement(LocationProbe),
          createElement(Toaster),
        ),
      ),
    ));
  };

  render();

  return {
    mountSubject() {
      subjectMounted = true;
      render();
    },
    setTarget(nextTarget) {
      target = nextTarget;
      render();
    },
    waitForLinkedLookupSettlement(index) {
      return linkedLookupTracker.waitForSettlement(index);
    },
    unmountSubject() {
      subjectMounted = false;
      render();
    },
    unmount() {
      root.unmount();
      queryClient.clear();
      linkedLookupTracker.restore();
      onUnmount?.();
    },
  };
};

export function mountDiaryEntryHarness(
  container: Element,
  initialDate = '2026-07-15',
): Task9EntryHarness {
  return createHarness(
    container,
    (date) => createElement(DiaryViewSection, { initialDate: date }),
    initialDate,
  );
}

export function mountMateEntryHarness(
  container: Element,
  initialPartyId = '44',
): Task9EntryHarness {
  const login = () => useAuthStore.getState().login(
    'task9@example.com',
    'Task 9 Host',
    null,
    'ROLE_USER',
    'LG',
    1,
    0,
    'task9host',
    'LOCAL',
    true,
  );
  login();
  const harness = createHarness(
    container,
    (partyId) => createElement(MountedMateDetailRuntime, { id: partyId }),
    initialPartyId,
    () => useAuthStore.getState().reset(),
  );
  login();
  return harness;
}
