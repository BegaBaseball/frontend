import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Users, MessageSquare, Calendar, Trash2, ShieldAlert } from 'lucide-react';
import { useCheerStore } from '../store/cheerStore';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
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

// 🔥 타입 정의
interface AdminUser {
  id: number;
  email: string;
  name: string;
  favoriteTeam: string | null;
  createdAt: string;
  postCount: number;
  role: string;
}

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalMates: number;
}

interface AdminPost {
  id: number;
  team: string;
  title: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  views: number;
  isHot: boolean;
}

interface AdminMate {
  id: number;
  teamId: string;
  title: string;
  stadium: string;
  gameDate: string;
  currentMembers: number;
  maxMembers: number;
  status: string;
  createdAt: string;
  hostName: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
}

// 🔥 팀 이름 매핑
const TEAM_NAMES: { [key: string]: string } = {
  'LG': 'LG',
  'OB': '두산',
  'SK': 'SSG',
  'KT': 'KT',
  'WO': '키움',
  'NC': 'NC',
  'SS': '삼성',
  'LT': '롯데',
  'HT': '기아',
  'HH': '한화',
};

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const { parties } = useMateStore();
  const { removePost } = useCheerStore();
  

  // 🔥 백엔드 데이터 상태
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [backendPosts, setBackendPosts] = useState<AdminPost[]>([]);
  const [backendMates, setBackendMates] = useState<AdminMate[]>([]);

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalMates: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 통계 데이터 가져오기
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('통계 조회 실패');
      }

      const apiResponse = await response.json();
      if (apiResponse.success) {
        setStats(apiResponse.data);
      }
    } catch (err) {
      console.error('통계 조회 오류:', err);
      setError('통계를 불러오는데 실패했습니다.');
    }
  };

  // 🔥 유저 목록 가져오기
  const fetchUsers = async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = search 
        ? `/api/admin/users?search=${encodeURIComponent(search)}`
        : '/api/admin/users';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('관리자 권한이 필요합니다.');
        }
        throw new Error('유저 목록 조회 실패');
      }

      const apiResponse = await response.json();
      if (apiResponse.success) {
        setUsers(apiResponse.data);
      }
    } catch (err) {
      console.error('유저 조회 오류:', err);
      setError(err instanceof Error ? err.message : '유저 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 유저 삭제
  const handleDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('유저 삭제 실패');
      }

      const apiResponse = await response.json();
      if (apiResponse.success) {
        alert('유저가 삭제되었습니다.');
        // 목록 새로고침
        fetchUsers(searchTerm || undefined);
        fetchStats(); // 통계도 갱신
      }
    } catch (err) {
      console.error('유저 삭제 오류:', err);
      alert('유저 삭제에 실패했습니다.');
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/posts', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('게시글 조회 실패');
      }

      const apiResponse = await response.json();
      if (apiResponse.success) {
        setBackendPosts(apiResponse.data);
        console.log('✅ 게시글 로드 성공:', apiResponse.data.length, '개');
      }
    } catch (err) {
      console.error('게시글 조회 오류:', err);
      setError('게시글을 불러오는데 실패했습니다.');
    }
  };

  // 🔥 게시글 삭제
   const handleDeletePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('게시글 삭제 실패');
      }

      const apiResponse = await response.json();
      if (apiResponse.success) {
        alert('게시글이 삭제되었습니다.');
        
        // 🔥 Store에서도 삭제
        removePost(postId);
        
        // 백엔드 목록에서도 삭제
        setBackendPosts(prev => prev.filter(p => p.id !== postId));
        
        // 통계 갱신
        fetchStats();
      }
    } catch (err) {
      console.error('게시글 삭제 오류:', err);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const getTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
};

// 🔥 경기 날짜 포맷 함수 추가
const formatGameDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
};

  const fetchMates = async () => {
  try {
    const response = await fetch('/api/admin/mates', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('메이트 조회 실패');
    }

    const apiResponse = await response.json();
    if (apiResponse.success) {
      setBackendMates(apiResponse.data);
      console.log('✅ 메이트 로드 성공:', apiResponse.data.length, '개');
    }
  } catch (err) {
    console.error('메이트 조회 오류:', err);
    setError('메이트를 불러오는데 실패했습니다.');
  }
};

  // 🔥 메이트 삭제
  const handleDeleteParty = async (partyId: number) => {
    try {
      const response = await fetch(`/api/admin/mates/${partyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('메이트 삭제 실패');
      }

      const apiResponse = await response.json();
      if (apiResponse.success) {
        alert('메이트 모임이 삭제되었습니다.');
        fetchStats(); // 통계 갱신
        // TODO: mateStore에서도 삭제하는 함수가 있다면 호출
      }
    } catch (err) {
      console.error('메이트 삭제 오류:', err);
      alert('메이트 삭제에 실패했습니다.');
    }
  };

  // 🔥 검색어 변경 시 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'users') {
        fetchUsers(searchTerm || undefined);
      }
    }, 500); // 500ms 디바운싱

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  // 🔥 초기 데이터 로드
  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchPosts();
    fetchMates();
  }, []);

  // 🔥 날짜 포맷 함수
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="home" />

      {/* Grass decoration */}
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-10 pointer-events-none opacity-30"
      />

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8" style={{ color: '#2d5f4f' }} />
            <h1 style={{ color: '#2d5f4f' }}>관리자 페이지</h1>
          </div>
          <p className="text-gray-600">BEGA 플랫폼의 유저, 게시글, 메이트를 관리합니다</p>
        </div>

        {/* 🔥 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border-2" style={{ borderColor: '#2d5f4f' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">전체 유저</p>
                <p className="text-3xl" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                  {stats.totalUsers}
                </p>
              </div>
              <Users className="w-12 h-12 opacity-20" style={{ color: '#2d5f4f' }} />
            </div>
          </Card>

          <Card className="p-6 bg-white border-2" style={{ borderColor: '#2d5f4f' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">전체 게시글</p>
                <p className="text-3xl" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                  {stats.totalPosts}
                </p>
              </div>
              <MessageSquare className="w-12 h-12 opacity-20" style={{ color: '#2d5f4f' }} />
            </div>
          </Card>

          <Card className="p-6 bg-white border-2" style={{ borderColor: '#2d5f4f' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">메이트 모임</p>
                <p className="text-3xl" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                  {stats.totalMates}
                </p>
              </div>
              <Calendar className="w-12 h-12 opacity-20" style={{ color: '#2d5f4f' }} />
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="p-6 bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="users">유저 관리</TabsTrigger>
              <TabsTrigger value="posts">게시글 관리</TabsTrigger>
              <TabsTrigger value="parties">메이트 관리</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="이메일 또는 이름으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>ID</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>닉네임</TableHead>
                        <TableHead>선호 팀</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>게시글 수</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            유저가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>
                              {user.favoriteTeam ? (
                                <div className="flex items-center gap-2">
                                  <TeamLogo team={user.favoriteTeam} size={24} />
                                  <span>{TEAM_NAMES[user.favoriteTeam] || user.favoriteTeam}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">없음</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell>{user.postCount}</TableCell>
                            <TableCell>
                              {user.role?.includes('ROLE_ADMIN') ? (
                                <Badge 
                                  className="bg-red-100 text-red-700"
                                  style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
                                >
                                  관리자
                                </Badge>
                              ) : (
                                <Badge 
                                  className="bg-green-100 text-green-700"
                                  style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                                >
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
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={user.role === 'ROLE_ADMIN'} // 🔥 관리자는 삭제 불가
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>유저를 삭제하시겠습니까?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      이 작업은 되돌릴 수 없습니다. 유저의 모든 데이터가 영구적으로 삭제됩니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200">
                                      취소
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      style={{ backgroundColor: '#dc2626', color: '#ffffff' }}  // 🔥 강제 적용
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
            <TabsContent value="posts">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>ID</TableHead>
                      <TableHead>팀</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>작성 시간</TableHead>
                      <TableHead>좋아요</TableHead>
                      <TableHead>댓글</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backendPosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          게시글이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backendPosts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>{post.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo team={post.team} size={24} />
                              <span>{TEAM_NAMES[post.team] || post.team}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {post.title}
                              {post.isHot && (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                  HOT
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{post.author}</TableCell>
                          <TableCell>{getTimeAgo(post.createdAt)}</TableCell>
                          <TableCell>{post.likeCount}</TableCell>
                          <TableCell>{post.commentCount}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>게시글을 삭제하시겠습니까?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    이 작업은 되돌릴 수 없습니다. 게시글과 모든 댓글이 영구적으로 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    취소
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePost(post.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    style={{ backgroundColor: '#dc2626', color: '#ffffff' }}  // 🔥 강제 적용
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
            <TabsContent value="parties">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>ID</TableHead>
                      <TableHead>경기</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>호스트</TableHead>
                      <TableHead>경기장</TableHead>
                      <TableHead>경기일</TableHead>
                      <TableHead>인원</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backendMates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          메이트 모임이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backendMates.map((mate) => (
                        <TableRow key={mate.id}>
                          <TableCell>{mate.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo team={mate.homeTeam} size={20} />
                              <span className="text-xs">vs</span>
                              <TeamLogo team={mate.awayTeam} size={20} />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {mate.title}
                          </TableCell>
                          <TableCell>{mate.hostName}</TableCell>
                          <TableCell>{mate.stadium}</TableCell>
                          <TableCell>{formatGameDate(mate.gameDate)}</TableCell>
                          <TableCell>
                            {mate.currentMembers}/{mate.maxMembers}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                mate.status === 'pending'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                  : mate.status === 'matched'
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                  : mate.status === 'selling'
                                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                              }
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
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-gray-900">
                                    메이트 모임을 삭제하시겠습니까?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-600">
                                    이 작업은 되돌릴 수 없습니다. 모임과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteParty(mate.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
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
        </Card>
      </div>
    </div>
  );
}