import { lazy, Suspense } from 'react';

const UserProfileRuntime = lazy(() => import('./UserProfile'));

const UserProfileFallback = () => (
  <div className="mx-auto max-w-2xl pb-8">
    <div className="flex items-center px-4 py-4">
      <div className="h-5 w-16 rounded bg-gray-200 dark:bg-secondary" />
    </div>
    <div className="overflow-hidden border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
      <div className="h-[150px] w-full bg-gray-200 dark:bg-secondary" />
      <div className="relative z-10 px-6 -mt-[50px]">
        <div className="h-20 w-20 rounded-full bg-gray-100 p-1 shadow-sm dark:bg-border sm:h-[100px] sm:w-[100px]">
          <div className="h-full w-full rounded-full bg-gray-200 dark:bg-secondary" />
        </div>
      </div>
      <div className="space-y-3 px-6 pt-4 pb-6">
        <div className="h-8 w-40 rounded bg-gray-200 dark:bg-secondary" />
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-secondary" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-secondary" />
          <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-secondary" />
        </div>
      </div>
    </div>
  </div>
);

export default function UserProfilePage() {
  return (
    <Suspense fallback={<UserProfileFallback />}>
      <UserProfileRuntime />
    </Suspense>
  );
}
