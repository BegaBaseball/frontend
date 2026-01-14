import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { ChevronLeft, Search, TrendingUp } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { useNavigate } from 'react-router-dom';
import { Input } from "./ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";

interface OffseasonMovement {
    id: number;
    date: string;
    section: string;
    team: string; // teamCode
    player: string;
    remarks: string;
    bigEvent: boolean;
    estimatedAmount: number;
}

const API_BASE_URL = import.meta.env.VITE_NO_API_BASE_URL || 'http://localhost:8080';

const formatRemarks = (text: string) => {
    if (!text) return text;
    // Removed inner capturing group to prevent split from returning the number part separately
    const parts = text.split(/(\d+(?:,\d+)*\s*(?:억|만\s*원|만\s*달러|달러))/g);

    return (
        <span>
            {parts.map((part, i) => {
                if (part.match(/(\d+(?:,\d+)*)\s*(?:억|만\s*원|만\s*달러|달러)/)) {
                    return <span key={i} className="font-bold text-[#2d5f4f] dark:text-[#4ade80]">{part}</span>;
                }
                return part;
            })}
        </span>
    );
};

export default function OffSeasonList() {
    const navigate = useNavigate();
    const [movements, setMovements] = useState<OffseasonMovement[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<'date' | 'amount'>('date');

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);

        const fetchMovements = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/kbo/offseason/movements`);
                if (res.ok) {
                    const data = await res.json();
                    setMovements(data);
                }
            } catch (error) {
                console.error("Failed to fetch offseason movements", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMovements();
    }, []);

    const filteredList = movements
        .filter(item =>
            item.player.includes(searchTerm) ||
            item.team.includes(searchTerm) ||
            (item.remarks && item.remarks.includes(searchTerm)) ||
            item.section.includes(searchTerm)
        )
        .sort((a, b) => {
            if (sortOrder === 'amount') {
                return b.estimatedAmount - a.estimatedAmount;
            }
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

    // Use shared team name utility
    const getTeamName = (code: string) => {
        const teamNameMap: { [key: string]: string } = {
            'OB': '두산', 'HT': 'KIA', 'LT': '롯데', 'NC': 'NC', 'SS': '삼성',
            'WO': '키움', 'SK': 'SSG', 'HH': '한화', 'LG': 'LG', 'KT': 'KT'
        };
        return teamNameMap[code] || code;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

                {/* Back Navigation */}
                <button
                    onClick={() => navigate('/offseason')}
                    className="group flex items-center gap-2 text-gray-500 hover:text-[#2d5f4f] dark:text-gray-400 dark:hover:text-[#4ade80] transition-colors"
                >
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm group-hover:shadow-md transition-all border border-gray-100 dark:border-gray-700">
                        <ChevronLeft className="w-5 h-5" />
                    </div>
                    <span className="font-bold">스토브리그 홈으로</span>
                </button>

                {/* Mini Hero Banner */}
                <section className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-lg border-none" style={{ backgroundColor: '#2d5f4f' }}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('/grid-pattern.svg')] bg-center"></div>
                    <div className="px-5 py-6 md:px-8 md:py-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-white text-xl md:text-2xl font-black flex items-center gap-2">
                                <TrendingUp className="w-6 h-6" />
                                2025-26 스토브리그 전체 현황
                            </h1>
                            <p className="text-emerald-100/70 text-sm md:text-base mt-1">총 {filteredList.length}건의 이적 내역</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'date' | 'amount')}
                                className="bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30"
                            >
                                <option value="date" className="text-gray-900">최신순</option>
                                <option value="amount" className="text-gray-900">금액순</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Search Bar */}
                <div className="relative max-w-xl w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="선수명, 구단, 내용으로 검색..."
                        className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-12 text-lg shadow-sm rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-800">
                            <TableRow>
                                <TableHead className="w-[120px] text-center font-bold text-gray-700 dark:text-gray-300">날짜</TableHead>
                                <TableHead className="w-[100px] text-center font-bold text-gray-700 dark:text-gray-300">구분</TableHead>
                                <TableHead className="w-[140px] text-center font-bold text-gray-700 dark:text-gray-300">구단</TableHead>
                                <TableHead className="w-[120px] text-center font-bold text-gray-700 dark:text-gray-300">선수</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-gray-300">내용</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                                        데이터를 불러오는 중입니다...
                                    </TableCell>
                                </TableRow>
                            ) : filteredList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                                        검색 결과가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredList.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${item.bigEvent ? 'border-l-4 border-l-[#2d5f4f] bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}
                                    >
                                        <TableCell className="text-center text-sm text-gray-500">{item.date}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`whitespace-nowrap ${item.bigEvent ? 'bg-[#2d5f4f] text-white border-[#2d5f4f]' : 'bg-white dark:bg-gray-700'}`}>
                                                {item.section}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <TeamLogo team={getTeamName(item.team)} size={24} />
                                                <span className="font-bold text-sm hidden md:inline">{getTeamName(item.team)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-center font-bold text-base ${item.bigEvent ? 'text-[#2d5f4f] dark:text-[#4ade80]' : 'text-gray-900 dark:text-gray-100'}`}>{item.player}</TableCell>
                                        <TableCell className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                                            {formatRemarks(item.remarks)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
