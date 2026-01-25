// AdminPage.tsx - Stadium Night Theme
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Users, MessageSquare, Calendar, Trash2, Shield, Activity, TrendingUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import TeamLogo from './TeamLogo';
import { useAdminData } from '../hooks/useAdminData';
import { TEAM_DATA } from '../constants/teams';
import { formatDate, formatGameDate, getTimeAgo } from '../utils/formatters';

// Animated counter component
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

// Stat Card Component with glow effect
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'amber' | 'emerald' | 'sky';
  delay: number;
}) {
  const colorClasses = {
    amber: {
      glow: 'shadow-amber-500/20',
      border: 'border-amber-500/30',
      bg: 'from-amber-500/10 to-amber-600/5',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
    emerald: {
      glow: 'shadow-emerald-500/20',
      border: 'border-emerald-500/30',
      bg: 'from-emerald-500/10 to-emerald-600/5',
      icon: 'text-emerald-400',
      text: 'text-emerald-300',
    },
    sky: {
      glow: 'shadow-sky-500/20',
      border: 'border-sky-500/30',
      bg: 'from-sky-500/10 to-sky-600/5',
      icon: 'text-sky-400',
      text: 'text-sky-300',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border ${classes.border}
        bg-gradient-to-br ${classes.bg} backdrop-blur-sm
        p-6 shadow-2xl ${classes.glow}
        transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl
        animate-fade-in-up
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Diamond pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='%23fff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-2">
            {label}
          </p>
          <p className={`text-4xl font-black ${classes.text} tracking-tight`}>
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-800/50 ${classes.icon}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>

      {/* Subtle pulse animation */}
      <div
        className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl ${classes.icon} opacity-20`}
      />
    </div>
  );
}

export default function AdminPage() {
  const {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    users,
    posts,
    mates,
    stats,
    loading,
    error,
    successMessage,
    handleDeleteUser,
    handleDeletePost,
    handleDeleteMate,
  } = useAdminData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 admin-page">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-emerald-900/10 via-transparent to-transparent" />

        {/* Stadium field lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
          <defs>
            <pattern id="diamond-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 0L100 50L50 100L0 50Z" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diamond-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                ADMIN <span className="text-amber-400">CONTROL</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                BEGA Platform Management Dashboard
              </p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 mt-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
              Live Monitoring
            </span>
          </div>
        </header>

        {/* Alerts */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 backdrop-blur-sm animate-fade-in-up">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {successMessage}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 backdrop-blur-sm animate-fade-in-up">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 rotate-180" />
              {error}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="amber" delay={100} />
          <StatCard icon={MessageSquare} label="Total Posts" value={stats.totalPosts} color="emerald" delay={200} />
          <StatCard icon={Calendar} label="Mate Gatherings" value={stats.totalMates} color="sky" delay={300} />
        </div>

        {/* Main Content Card */}
        <div
          className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm shadow-2xl overflow-hidden animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-slate-800 px-6 pt-6">
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-800/50 p-1 rounded-xl">
                <TabsTrigger
                  value="users"
                  className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25 transition-all duration-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  유저
                </TabsTrigger>
                <TabsTrigger
                  value="posts"
                  className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  게시글
                </TabsTrigger>
                <TabsTrigger
                  value="parties"
                  className="rounded-lg data-[state=active]:bg-sky-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/25 transition-all duration-300"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  메이트
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Users Tab */}
            <TabsContent value="users" className="p-6">
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    placeholder="이메일 또는 이름으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl focus:ring-amber-500 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                        <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                        <TableHead className="text-slate-400 font-semibold">이메일</TableHead>
                        <TableHead className="text-slate-400 font-semibold">닉네임</TableHead>
                        <TableHead className="text-slate-400 font-semibold">선호 팀</TableHead>
                        <TableHead className="text-slate-400 font-semibold">가입일</TableHead>
                        <TableHead className="text-slate-400 font-semibold">게시글</TableHead>
                        <TableHead className="text-slate-400 font-semibold">역할</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            유저가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user, index) => (
                          <TableRow
                            key={user.id}
                            className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell className="text-slate-300 font-mono text-sm">{user.id}</TableCell>
                            <TableCell className="text-slate-200">{user.email}</TableCell>
                            <TableCell className="text-slate-200 font-medium">{user.name}</TableCell>
                            <TableCell>
                              {user.favoriteTeam ? (
                                <div className="flex items-center gap-2">
                                  <TeamLogo team={user.favoriteTeam} size={24} />
                                  <span className="text-slate-300">{TEAM_DATA[user.favoriteTeam]?.name || user.favoriteTeam}</span>
                                </div>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-amber-400 font-semibold text-sm">
                                {user.postCount}
                              </span>
                            </TableCell>
                            <TableCell>
                              {user.role?.includes('ROLE_ADMIN') ? (
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                                  관리자
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-700 text-slate-300 border-0">
                                  일반
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                    disabled={user.role === 'ROLE_ADMIN'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">유저를 삭제하시겠습니까?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                      이 작업은 되돌릴 수 없습니다. 유저의 모든 데이터가 영구적으로 삭제됩니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                      취소
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                                    >
                                      삭제
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="p-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                      <TableHead className="text-slate-400 font-semibold">팀</TableHead>
                      <TableHead className="text-slate-400 font-semibold">제목</TableHead>
                      <TableHead className="text-slate-400 font-semibold">작성자</TableHead>
                      <TableHead className="text-slate-400 font-semibold">작성 시간</TableHead>
                      <TableHead className="text-slate-400 font-semibold">좋아요</TableHead>
                      <TableHead className="text-slate-400 font-semibold">댓글</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-slate-500">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          게시글이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      posts.map((post, index) => (
                        <TableRow
                          key={post.id}
                          className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <TableCell className="text-slate-300 font-mono text-sm">{post.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo team={post.team} size={24} />
                              <span className="text-slate-300">{TEAM_DATA[post.team]?.name || post.team}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-200">{post.content?.slice(0, 40) || '-'}</span>
                              {post.isHot && (
                                <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] px-1.5 py-0 border-0 animate-pulse">
                                  HOT
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">{post.author}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{getTimeAgo(post.createdAt)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-rose-400">
                              <span className="text-lg">♥</span>
                              <span className="font-semibold">{post.likeCount}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 font-semibold text-sm">
                              {post.commentCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">게시글을 삭제하시겠습니까?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    이 작업은 되돌릴 수 없습니다. 게시글과 모든 댓글이 영구적으로 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                    취소
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePost(post.id)}
                                    className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Parties Tab */}
            <TabsContent value="parties" className="p-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                      <TableHead className="text-slate-400 font-semibold">경기</TableHead>
                      <TableHead className="text-slate-400 font-semibold">제목</TableHead>
                      <TableHead className="text-slate-400 font-semibold">호스트</TableHead>
                      <TableHead className="text-slate-400 font-semibold">경기장</TableHead>
                      <TableHead className="text-slate-400 font-semibold">경기일</TableHead>
                      <TableHead className="text-slate-400 font-semibold">인원</TableHead>
                      <TableHead className="text-slate-400 font-semibold">상태</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16 text-slate-500">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          메이트 모임이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mates.map((mate, index) => (
                        <TableRow
                          key={mate.id}
                          className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <TableCell className="text-slate-300 font-mono text-sm">{mate.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                              <TeamLogo team={mate.homeTeam} size={20} />
                              <span className="text-slate-500 text-xs font-bold">VS</span>
                              <TeamLogo team={mate.awayTeam} size={20} />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-slate-200 truncate block">{mate.title}</span>
                          </TableCell>
                          <TableCell className="text-slate-300">{mate.hostName}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{mate.stadium}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{formatGameDate(mate.gameDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div className="flex -space-x-1">
                                {[...Array(Math.min(mate.currentMembers, 3))].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold"
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                              </div>
                              <span className="text-slate-400 text-sm ml-1">
                                {mate.currentMembers}/{mate.maxMembers}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`border-0 ${
                                mate.status === 'pending'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : mate.status === 'matched'
                                  ? 'bg-sky-500/20 text-sky-400'
                                  : mate.status === 'selling'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-700/50 text-slate-400'
                              }`}
                            >
                              {mate.status === 'pending' && '모집중'}
                              {mate.status === 'matched' && '매칭완료'}
                              {mate.status === 'selling' && '티켓판매'}
                              {mate.status === 'sold' && '판매완료'}
                              {mate.status === 'completed' && '완료'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">
                                    메이트 모임을 삭제하시겠습니까?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    이 작업은 되돌릴 수 없습니다. 모임과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                    취소
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteMate(mate.id)}
                                    className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-slate-600 text-sm">
          <p>BEGA Platform Admin Dashboard v2.0</p>
        </footer>
      </div>
    </div>
  );
}
