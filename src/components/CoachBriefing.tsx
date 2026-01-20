
import { useState } from 'react';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Loader2, Zap, TrendingUp, Users, Shield, Calendar, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeTeam, CoachAnalyzeResponse } from '../api/coach';
import { useAuthStore } from '../store/authStore';
import { TEAM_LIST, TEAM_NAME_TO_ID, getFullTeamName } from '../constants/teams';
import { useTheme } from '../hooks/useTheme';

export default function CoachBriefing() {
    const { user } = useAuthStore();
    const { theme } = useTheme();

    const [isOpen, setIsOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>(user?.favoriteTeam || 'LG');
    const [focus, setFocus] = useState<string[]>(['recent_form']);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoachAnalyzeResponse | null>(null);

    const focusOptions = [
        { id: 'recent_form', label: '최근 전력', icon: TrendingUp },
        { id: 'bullpen', label: '불펜 상태', icon: Shield },
        { id: 'matchup', label: '상대 전적', icon: Users },
        { id: 'starter', label: '선발 투수', icon: Zap },
    ];

    const handleAnalyze = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await analyzeTeam({
                team_id: TEAM_NAME_TO_ID[selectedTeam] || selectedTeam, // Ensure ID is used if Name provided
                focus: focus,
            });
            setResult(response);
        } catch (error) {
            console.error(error);
            setResult({ error: '분석 중 오류가 발생했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    const toggleFocus = (id: string) => {
        setFocus(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                    <Zap className="w-4 h-4" />
                    The Coach 분석
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-blue-600 dark:text-blue-400">
                        <Zap className="w-6 h-6" /> The Coach Briefing
                    </DialogTitle>
                    <DialogDescription>
                        데이터에 기반한 심층 분석과 전략적 조언을 제공합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 py-4 space-y-6">
                    {/* Settings Section */}
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">분석 대상 팀</Label>
                            <div className="flex flex-wrap gap-2">
                                {TEAM_LIST.slice(1).map((teamName) => ( // '없음' 제외
                                    <button
                                        key={teamName}
                                        onClick={() => setSelectedTeam(teamName)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                      ${selectedTeam === teamName
                                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {teamName}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">중점 분석 포인트</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {focusOptions.map((opt) => (
                                    <div
                                        key={opt.id}
                                        className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all
                      ${focus.includes(opt.id)
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                        onClick={() => toggleFocus(opt.id)}
                                    >
                                        <opt.icon className={`w-4 h-4 ${focus.includes(opt.id) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                                        <span className={`text-sm ${focus.includes(opt.id) ? 'font-medium text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {opt.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                분석 중...
                            </>
                        ) : (
                            '실시간 분석 요청'
                        )}
                    </Button>

                    {/* Result Section */}
                    {result && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h4 className="flex items-center gap-2 font-bold text-lg mb-4 text-slate-800 dark:text-white border-b pb-2">
                                    <Bot className="w-5 h-5 text-blue-600" />
                                    Coach's Insight
                                </h4>

                                {result.answer ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700"
                                    >
                                        {result.answer}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-red-500">{result.error || '데이터를 불러올 수 없습니다.'}</p>
                                )}

                                {result.tool_calls && result.tool_calls.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <p className="text-xs text-slate-400">
                                            참조된 데이터 소스: {result.tool_calls.length}개
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
