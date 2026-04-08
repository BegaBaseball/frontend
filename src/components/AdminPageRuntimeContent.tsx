import { lazy, Suspense, useState } from 'react';

import './AdminPage.css';
import { adminTabItems, type AdminTabValue } from './admin/adminPageTabs';

const AdminPageDataRuntime = lazy(() => import('./AdminPageDataRuntime'));

export default function AdminPageRuntimeContent() {
  const [activeTab, setActiveTab] = useState<AdminTabValue>('users');

  return (
    <>
      <div
        className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm shadow-2xl overflow-hidden animate-fade-in-up"
        style={{ animationDelay: '400ms' }}
      >
        <div className="border-b border-slate-800 px-6 pt-6">
          <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-800/50 p-1 sm:grid-cols-5 xl:grid-cols-10">
            {adminTabItems.map((item) => {
              const { value, label, icon: Icon, activeClassName } = item;
              const isActive = activeTab === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-testid={'testId' in item ? item.testId : undefined}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(value)}
                  className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                    isActive
                      ? activeClassName
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Suspense fallback={<div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 mx-6 mb-6 text-center text-slate-400">관리 데이터 로딩 중...</div>}>
          <AdminPageDataRuntime activeTab={activeTab} />
        </Suspense>
      </div>

      <footer className="mt-10 text-center text-slate-600 text-sm">
        <p>BEGA Platform Admin Dashboard v2.0</p>
      </footer>
    </>
  );
}
