import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function EndOfFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Check className="h-6 w-6" />
      </div>
      <h3 className="text-[15px] font-bold text-slate-900">모든 응원을 확인했습니다</h3>
      <p className="mt-1 text-sm text-slate-500">
        새로운 소식이 올라올 때까지 잠시만 기다려주세요!
      </p>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="mt-4 text-sm font-semibold text-[#2d5f4f] hover:underline"
      >
        처음으로 돌아가기
      </button>
    </motion.div>
  );
}
