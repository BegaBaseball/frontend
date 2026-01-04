// AdminPage.tsx
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Users, MessageSquare, Calendar, Trash2, ShieldAlert } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* 에러 메시지 */}
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
                                  <span>{TEAM_DATA[user.favoriteTeam]?.name || user.favoriteTeam}</span>
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
                                    disabled={user.role === 'ROLE_ADMIN'}
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
                    {posts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          게시글이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      posts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>{post.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo team={post.team} size={24} />
                              <span>{TEAM_DATA[post.team]?.name || post.team}</span>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
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
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePost(post.id)}
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
                    {mates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          메이트 모임이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mates.map((mate) => (
                        <TableRow key={mate.id}>
                          <TableCell>{mate.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo team={mate.homeTeam} size={20} />
                              <span className="text-xs">vs</span>
                              <TeamLogo team={mate.awayTeam} size={20} />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{mate.title}</TableCell>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
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
                                    onClick={() => handleDeleteMate(mate.id)}
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