import { StrictMode, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type {
  CheerPost,
  LinkedPostLookup,
  LinkedPostLookupParams,
} from '../../src/api/cheerApi';
import CheerComposerRuntime from '../../src/components/CheerComposerRuntime';
import type { LinkedPostTarget } from '../../src/components/cheer/CheerPresentation';
import * as linkedRouteModule from '../../src/components/cheer/CheerLinkedComposerRoute';
import { getCheerPostsFeedQueryKey } from '../../src/hooks/cheerQueryKeys';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

type RouteModule = typeof linkedRouteModule;

interface HarnessRoute {
  openComposerOnMount: boolean;
  linkedRouteRequested: boolean;
  linkedTarget: LinkedPostTarget | null;
}

interface HarnessAuth {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
}

interface PendingLookup {
  params: LinkedPostLookupParams;
  result: Deferred<LinkedPostLookup>;
}

export interface CheerComposerLifecycleHarness {
  getImportCalls: () => number;
  getLookupCalls: () => LinkedPostLookupParams[];
  getLoginCalls: () => number;
  getFeedPostIds: () => number[];
  failNextImport: () => void;
  holdNextImport: () => void;
  resolveHeldImport: () => void;
  resolveLookup: (index: number, value: LinkedPostLookup) => void;
  rejectLookup: (index: number, error: unknown) => void;
  rerenderIrrelevant: () => void;
  setAuth: (auth: HarnessAuth) => void;
  setRoute: (route: HarnessRoute) => void;
  seedFeed: (posts: CheerPost[]) => void;
  unmountComposer: () => void;
  unmount: () => void;
}

function LocationProbe({ onLocationChange }: { onLocationChange: (pathname: string) => void }) {
  const location = useLocation();
  useEffect(() => onLocationChange(location.pathname), [location.pathname, onLocationChange]);
  return createElement('output', { 'data-testid': 'composer-router-location' }, location.pathname);
}

export function mountCheerComposerLifecycleHarness(
  container: Element,
): CheerComposerLifecycleHarness {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const root = createRoot(container);
  const pendingLookups: PendingLookup[] = [];
  let route: HarnessRoute = {
    openComposerOnMount: true,
    linkedRouteRequested: true,
    linkedTarget: { postType: 'CHECKIN', diaryId: 12 },
  };
  let auth: HarnessAuth = { isAuthLoading: true, isLoggedIn: false };
  let importCalls = 0;
  let loginCalls = 0;
  let renderVariant = 0;
  let composerMounted = true;
  let nextImport: 'resolve' | 'reject' | 'hold' = 'resolve';
  let heldImport: Deferred<RouteModule> | null = null;

  const importRouteModule = () => {
    importCalls += 1;
    const behavior = nextImport;
    nextImport = 'resolve';
    if (behavior === 'reject') return Promise.reject(new Error('CHUNK_LOAD_FAILED'));
    if (behavior === 'hold') {
      heldImport = deferred<RouteModule>();
      return heldImport.promise;
    }
    return Promise.resolve(linkedRouteModule);
  };

  const lookupLinkedPost = (params: LinkedPostLookupParams) => {
    const result = deferred<LinkedPostLookup>();
    pendingLookups.push({ params, result });
    return result.promise;
  };

  const syncRouteAfterNavigation = (pathname: string) => {
    if (pathname === '/cheer/write' || !route.openComposerOnMount) return;
    route = { openComposerOnMount: false, linkedRouteRequested: false, linkedTarget: null };
    queueMicrotask(render);
  };

  const render = () => {
    const runtimeProps = {
      ...route,
      ...auth,
      hasFavoriteTeam: true,
      authUserEmail: 'writer@example.com',
      authUserHandle: '@writer',
      authUserName: 'Writer',
      authUserFavoriteTeam: 'LG',
      activeFeedTab: 'all' as const,
      teamColor: '#C30452',
      teamAccent: '#C30452',
      teamContrastText: '#FFFFFF',
      teamLabel: 'LG',
      teamLogoId: 'LG',
      userDisplayName: `Writer ${renderVariant}`,
      onRequireLogin: () => { loginCalls += 1; },
      linkedRouteDependencies: {
        importRouteModule,
        lookupLinkedPost,
      },
    };
    const Runtime = CheerComposerRuntime as unknown as React.ComponentType<Record<string, unknown>>;

    root.render(createElement(
      StrictMode,
      null,
      createElement(
        MemoryRouter,
        { initialEntries: ['/cheer/write?postType=CHECKIN&diaryId=12'] },
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(
            'main',
            {
              'data-linked-route-requested': String(route.linkedRouteRequested),
              'data-render-variant': String(renderVariant),
            },
            composerMounted ? createElement(Runtime, runtimeProps) : null,
            createElement(LocationProbe, { onLocationChange: syncRouteAfterNavigation }),
          ),
        ),
      ),
    ));
  };

  render();

  return {
    getImportCalls: () => importCalls,
    getLookupCalls: () => pendingLookups.map(({ params }) => params),
    getLoginCalls: () => loginCalls,
    getFeedPostIds: () => {
      const data = queryClient.getQueryData<{ pages: Array<{ content: CheerPost[] }> }>(
        getCheerPostsFeedQueryKey('all'),
      );
      return data?.pages.flatMap((page) => page.content.map((post) => post.id)) ?? [];
    },
    failNextImport: () => { nextImport = 'reject'; },
    holdNextImport: () => { nextImport = 'hold'; },
    resolveHeldImport: () => {
      heldImport?.resolve(linkedRouteModule);
      heldImport = null;
    },
    resolveLookup: (index, value) => pendingLookups[index]?.result.resolve(value),
    rejectLookup: (index, error) => pendingLookups[index]?.result.reject(error),
    rerenderIrrelevant: () => {
      renderVariant += 1;
      render();
    },
    setAuth: (nextAuth) => {
      auth = nextAuth;
      render();
    },
    setRoute: (nextRoute) => {
      route = nextRoute;
      render();
    },
    seedFeed: (posts) => {
      queryClient.setQueryData(getCheerPostsFeedQueryKey('all'), {
        pages: [{ content: posts, last: true, totalPages: 1, totalElements: posts.length, size: 20, number: 0 }],
        pageParams: [0],
      });
    },
    unmountComposer: () => {
      composerMounted = false;
      render();
    },
    unmount: () => {
      queryClient.clear();
      root.unmount();
    },
  };
}
