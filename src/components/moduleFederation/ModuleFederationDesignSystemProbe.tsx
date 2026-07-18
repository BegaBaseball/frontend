import { lazy, Suspense, useState } from 'react';

const RemoteButton = lazy(() => import('design_system/Button'));
const RemoteModal = lazy(() => import('design_system/Modal'));
const RemoteThemeProvider = lazy(() => import('design_system/ThemeProvider'));

const hasRemoteEntry = Boolean(import.meta.env.VITE_MF_DESIGN_SYSTEM_ENTRY?.trim());

function ModuleFederationProbeFallback() {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-caption font-semibold text-slate-300">
      Module Federation design system surface is loading.
    </div>
  );
}

export default function ModuleFederationDesignSystemProbe() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <main className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-caption font-bold uppercase tracking-[0.16em] text-emerald-300">
            Module Federation
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Design System Remote Probe
          </h1>
          <p className="max-w-2xl text-15 leading-6 text-slate-300">
            {hasRemoteEntry
              ? 'Remote entry is configured. The design_system modules are loaded through Module Federation.'
              : 'Remote entry is unset. This route is using the local design_system fallback aliases.'}
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
          <Suspense fallback={<ModuleFederationProbeFallback />}>
            <RemoteThemeProvider defaultTheme="system">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Remote Button
                  </h2>
                  <p className="mt-1 text-caption text-slate-400">
                    The host imports this control from design_system/Button.
                  </p>
                </div>
                <div>
                  <RemoteButton
                    variant="primary"
                    size="large"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Open Remote Modal
                  </RemoteButton>
                </div>
                <RemoteModal
                  open={isModalOpen}
                  onOpenChange={setIsModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  title="Design system modal"
                >
                  <p className="text-15 leading-6 text-slate-700 dark:text-slate-200">
                    The host imports this dialog from design_system/Modal.
                  </p>
                </RemoteModal>
              </div>
            </RemoteThemeProvider>
          </Suspense>
        </section>
      </main>
    </div>
  );
}
