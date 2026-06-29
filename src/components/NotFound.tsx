import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 숫자 */}
        <div className="relative mb-6">
          <span className="text-120 sm:text-160 font-black leading-none tracking-tighter text-gray-100 dark:text-white select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 메시지 */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-gray-500 dark:text-white mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-2.5 text-base font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            홈으로 이동
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-2.5 text-base font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98]"
          >
            이전 페이지로
          </button>
        </div>
      </div>
    </div>
  );
}
