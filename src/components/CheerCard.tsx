import { MessageSquareQuote } from 'lucide-react';

export default function CheerCard() {
    return (
        <div className="h-full relative group overflow-hidden bg-gradient-to-tl from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />

            {/* Crowd Blur Effect */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2605&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay grayscale group-hover:grayscale-0 transition-all duration-700" />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquareQuote className="w-5 h-5 text-white/80" />
                    <span className="font-bold text-sm tracking-wide">HOT TOPIC</span>
                </div>

                <div className="mt-2">
                    <p className="text-xs text-indigo-200 mb-1">지금 팬들은...</p>
                    <p className="text-lg font-bold leading-snug line-clamp-2">
                        "와 오늘 김도영 홈런 실화냐?? 진짜 미쳤다 ㄷㄷ"
                    </p>
                    <div className="mt-3 flex gap-2">
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">🔥 10분전</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">💬 142개 댓글</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
