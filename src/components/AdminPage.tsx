import { useState } from 'react';
import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Users, MessageSquare, Calendar, Trash2, Eye, ShieldAlert } from 'lucide-react';
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

// Mock user data
const mockUsers = [
  {
    id: 1,
    email: 'user1@example.com',
    name: '야구팬123',
    favoriteTeam: 'LG',
    joinDate: '2025-01-15',
    posts: 12,
    status: 'active',
  },
  {
    id: 2,
    email: 'user2@example.com',
    name: '베어스사랑',
    favoriteTeam: '두산',
    joinDate: '2025-02-20',
    posts: 8,
    status: 'active',
  },
  {
    id: 3,
    email: 'user3@example.com',
    name: 'SSG팬',
    favoriteTeam: 'SSG',
    joinDate: '2025-03-10',
    posts: 15,
    status: 'active',
  },
  {
    id: 4,
    email: 'user4@example.com',
    name: 'KT위즈팬',
    favoriteTeam: 'KT',
    joinDate: '2025-04-05',
    posts: 5,
    status: 'active',
  },
  {
    id: 5,
    email: 'user5@example.com',
    name: '히어로즈',
    favoriteTeam: '키움',
    joinDate: '2025-05-12',
    posts: 20,
    status: 'active',
  },
];

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const { posts, deletePost } = useCheerStore();
  const { parties } = useMateStore();

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeletePost = (postId: number) => {
    deletePost(postId);
  };

  const handleDeleteUser = (userId: number) => {
    console.log('Delete user:', userId);
    // 실제로는 API 호출
  };

  const handleDeleteParty = (partyId: number) => {
    console.log('Delete party:', partyId);
    // 실제로는 API 호출
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border-2" style={{ borderColor: '#2d5f4f' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">전체 유저</p>
                <p className="text-3xl" style={{ color: '#2d5f4f', fontWeight: 700 }}>
                  {mockUsers.length}
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
                  {posts.length}
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
                  {parties.length}
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
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TeamLogo team={user.favoriteTeam} size={24} />
                            <span>{user.favoriteTeam}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.joinDate}</TableCell>
                        <TableCell>{user.posts}</TableCell>
                        <TableCell>
                          <Badge
                            className="bg-green-100 text-green-700 hover:bg-green-100"
                          >
                            {user.status === 'active' ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>{post.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TeamLogo team={post.team} size={24} />
                            <span>{post.team}</span>
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
                        <TableCell>{post.timeAgo}</TableCell>
                        <TableCell>{post.likes}</TableCell>
                        <TableCell>{post.comments}</TableCell>
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
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePost(post.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
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
                      <TableHead>팀</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>경기장</TableHead>
                      <TableHead>경기일</TableHead>
                      <TableHead>인원</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((party) => (
                      <TableRow key={party.id}>
                        <TableCell>{party.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TeamLogo team={party.team} size={24} />
                            <span>{party.team}</span>
                          </div>
                        </TableCell>
                        <TableCell>{party.title}</TableCell>
                        <TableCell>{party.location}</TableCell>
                        <TableCell>{party.gameDate}</TableCell>
                        <TableCell>
                          {party.currentMembers}/{party.maxMembers}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              party.status === 'open'
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                            }
                          >
                            {party.status === 'open' ? '모집중' : '마감'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>메이트 모임을 삭제하시겠습니까?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  이 작업은 되돌릴 수 없습니다. 모임과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteParty(party.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
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
