import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import {
  getMatePartyMyApplicationQueryOptions,
  useMatePartyFromRoute,
} from '../hooks/mateChatRoute';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import {
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { isPartyHostedByUser } from '../utils/mate';

const LazyMateChatApprovedRuntime = lazy(() => import('./MateChatApprovedRuntime'));
const LazyMateChatAccessStateRuntime = lazy(() => import('./MateChatAccessStateRuntime'));

export default function MateChat() {
  const { id } = useParams<{ id: string }>();
  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);
  const {
    userName: authUserName,
    userHandle: authUserHandle,
  } = useAuthProfileSnapshot();
  const { isAuthLoading, userId: currentUserId } = useAuthSession();

  const currentUser = currentUserId
    ? {
      id: currentUserId,
      name: authUserName ?? '',
      handle: authUserHandle ?? null,
    }
    : null;

  const isHost = currentUser && party
    ? isPartyHostedByUser(party, { id: currentUser.id, handle: currentUser.handle ?? null })
    : false;
  const myApplicationQuery = useQuery({
    ...(party?.id != null
      ? getMatePartyMyApplicationQueryOptions(party.id, currentUserId)
      : getMatePartyMyApplicationQueryOptions('unknown', currentUserId)),
    enabled: Boolean(party?.id && currentUser && !isHost),
  });
  const myApplication = myApplicationQuery.data ?? null;
  const isCheckingApproval = Boolean(party && currentUser && !isHost && myApplicationQuery.isPending);
  const approvalLoadError = myApplicationQuery.error
    ? '신청 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
    : null;

  if (isAuthLoading || (isPartyLoading && !party)) {
    return (
      <div className={`${matePageShellClass} flex flex-col`}>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Skeleton className="mb-2 h-9 w-16" />
            <Card className={`p-4 ${mateSectionCardClass}`}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <Card className={`mb-4 flex-1 overflow-hidden p-4 ${mateSectionCardClass}`} style={{ minHeight: '420px' }}>
            <div className="flex-1 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={`recv-${item}`} className="flex justify-start">
                  <div className="flex max-w-[60%] flex-col items-start space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-10 w-40 rounded-2xl" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              ))}
              {[1, 2].map((item) => (
                <div key={`send-${item}`} className="flex justify-end">
                  <div className="flex max-w-[60%] flex-col items-end space-y-1">
                    <Skeleton className="h-10 w-48 rounded-2xl" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-4 ${mateSectionCardClass}`}>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-16 rounded-md" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (partyError || !party) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime
          state="partyError"
          partyId={id}
          message={partyError || '파티 정보를 찾을 수 없습니다.'}
        />
      </Suspense>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime state="unauthenticated" partyId={id} />
      </Suspense>
    );
  }

  if (isCheckingApproval) {
    return (
      <div className={`${matePageShellClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-[16px] text-gray-500 dark:text-white">채팅 접근 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (approvalLoadError) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime
          state="approvalError"
          partyId={id}
          message={approvalLoadError}
          onRetry={() => void myApplicationQuery.refetch()}
        />
      </Suspense>
    );
  }

  if (!isHost && !myApplication?.isApproved) {
    return (
      <Suspense fallback={null}>
        <LazyMateChatAccessStateRuntime state="notApproved" partyId={id} />
      </Suspense>
    );
  }

  const mateChatViewFallback = (
    <>
      <Card className={`p-0 ${mateSectionCardClass}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-3xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </div>
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Card key={`mate-chat-summary-fallback-${index}`} className={`p-4 ${mateSectionCardClass}`}>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-3 h-5 w-24" />
            <Skeleton className="mt-2 h-4 w-full" />
          </Card>
        ))}
      </div>
      <Card className={`mt-4 flex-1 overflow-hidden p-3 sm:p-4 ${mateSectionCardClass}`}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-4 w-56" />
        <div className="mt-4 space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={`mate-chat-thread-fallback-${index}`} className="flex justify-start">
              <div className="max-w-[70%] space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-48 rounded-3xl" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );

  return (
    <Suspense fallback={mateChatViewFallback}>
      <LazyMateChatApprovedRuntime
        party={party}
        partyId={id ?? String(party.id)}
        currentUser={{
          id: currentUser.id,
          name: currentUser.name,
        }}
        isHost={isHost}
        isPartyRevalidating={isPartyRevalidating}
      />
    </Suspense>
  );
}
