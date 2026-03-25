import { Search, Users, Trash2, UserCog } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
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
} from '../ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import TeamLogo from '../TeamLogo';
import { TEAM_DATA } from '../../constants/teams';
import { formatDate } from '../../utils/formatters';

interface PendingRoleChange {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  favoriteTeam?: string;
  createdAt: string;
  postCount: number;
  role: string;
}

interface UsersAdminPanelProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  users: AdminUser[];
  loading: boolean;
  isSuperAdmin: boolean;
  currentUserId: number | null;
  handleDeleteUser: (userId: number) => void;
  setPendingRoleChange: (change: PendingRoleChange | null) => void;
  setRoleChangeReason: (reason: string) => void;
}

export function UsersAdminPanel({
  searchTerm,
  setSearchTerm,
  users,
  loading,
  isSuperAdmin,
  currentUserId,
  handleDeleteUser,
  setPendingRoleChange,
  setRoleChangeReason,
}: UsersAdminPanelProps) {
  return (
    <>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="이메일 또는 이름으로 검색..."
            data-testid="admin-users-search"
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
                {isSuperAdmin && (
                  <TableHead className="text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <UserCog className="w-4 h-4" />
                      역할 변경
                    </span>
                  </TableHead>
                )}
                <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 9 : 8} className="text-center py-16 text-slate-500">
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
                      {user.role === 'ROLE_SUPER_ADMIN' ? (
                        <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/20">
                          최고관리자
                        </Badge>
                      ) : user.role === 'ROLE_ADMIN' ? (
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                          관리자
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-700 text-slate-300 border-0">
                          일반
                        </Badge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {/* SUPER_ADMIN 자신의 역할은 변경 불가 */}
                        {user.id === currentUserId || user.role === 'ROLE_SUPER_ADMIN' ? (
                          <span className="text-slate-600 text-xs">변경 불가</span>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(nextRole: 'ROLE_ADMIN' | 'ROLE_USER') => {
                              if (nextRole === user.role) return;
                              setPendingRoleChange({
                                userId: user.id,
                                userName: user.name,
                                userEmail: user.email,
                                currentRole: user.role,
                                targetRole: nextRole,
                              });
                              setRoleChangeReason('');
                            }}
                          >
                            <SelectTrigger
                              data-testid={`admin-user-role-trigger-${user.id}`}
                              className="w-[120px] bg-slate-800/60 border-slate-700 text-slate-200 text-xs h-8 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                              <SelectItem value="ROLE_USER" className="text-xs focus:bg-slate-700 focus:text-slate-100">
                                일반 사용자
                              </SelectItem>
                              <SelectItem value="ROLE_ADMIN" className="text-xs focus:bg-slate-700 focus:text-slate-100">
                                관리자
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    )}
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
    </>
  );
}
