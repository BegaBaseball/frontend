import { useNavigate } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Flame } from 'lucide-react';
import stadiumBg from '../assets/stadium.png';

interface HomeHeroProps {
    seasonYear: number;
}

export default function HomeHero({ seasonYear }: HomeHeroProps) {
    const navigate = useNavigate();

    return (
        <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
            {/* Background Image with Parallax-like fixed position */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
                style={{
                    backgroundImage: `url(${stadiumBg})`,
                }}
            >
                {/* Dark Overlay for readability */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-16">
                <div className="flex flex-col md:flex-row items-end justify-between gap-8">
                    {/* Text Content */}
                    <div className="space-y-4 max-w-2xl animate-in slide-in-from-bottom-8 fade-in duration-700">
                        <Badge variant="outline" className="text-white/90 border-white/30 px-4 py-1.5 text-sm backdrop-blur-md bg-white/10">
                            {seasonYear} KBO LEAGUE
                        </Badge>

                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                            야구의 모든 순간,<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                                BEGA와 함께
                            </span>
                        </h1>

                        <p className="text-gray-200 text-lg md:text-xl font-medium max-w-lg drop-shadow-md">
                            실시간 스코어, 전력 분석, 그리고 팬들과의 소통까지.<br />
                            가장 스마트한 야구 가이드 BEGA입니다.
                        </p>

                        <div className="flex gap-4 pt-4">
                            <Button
                                onClick={() => navigate('/offseason')}
                                className="h-12 px-6 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg hover:shadow-orange-500/30 transition-all duration-300"
                            >
                                <Flame className="w-5 h-5 mr-2" />
                                스토브리그
                            </Button>
                        </div>
                    </div>

                    {/* Placeholder for My Team Widget (Phase 2) */}
                    {/* <div className="hidden md:block w-80 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl animate-in slide-in-from-right-8 fade-in duration-800 delay-200">
                        <p className="text-white/60 text-sm font-medium mb-2">MY TEAM</p>
                        <div className="text-white text-center py-8">
                            <p className="font-bold">로그인하고<br/>마이팀 정보를 확인하세요</p>
                        </div>
                    </div> */}
                </div>
            </div>
        </section>
    );
}
