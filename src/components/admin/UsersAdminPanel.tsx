import { useState } from 'react';
import { Search, Users, Trash2, UserCog } from 'lucide-react';
import { AdminBadge } from './AdminPanelPrimitives';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
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

const adminNativeSelectClassName = 'w-[120px] rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[14px] text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60';

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
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AdminUser | null>(null);

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
                    <TableCell className="text-slate-300 font-mono text-[14px]">{user.id}</TableCell>
                    <TableCell className="text-slate-200">{user.email}</TableCell>
                    <TableCell className="text-slate-200 font-semibold">{user.name}</TableCell>
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
                    <TableCell className="text-slate-400 text-[14px]">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-amber-400 font-semibold text-[14px]">
                        {user.postCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.role === 'ROLE_SUPER_ADMIN' ? (
                        <AdminBadge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/20">
                          최고관리자
                        </AdminBadge>
                      ) : user.role === 'ROLE_ADMIN' ? (
                        <AdminBadge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                          관리자
                        </AdminBadge>
                      ) : (
                        <AdminBadge className="bg-slate-700 text-slate-300 border-0">
                          일반
                        </AdminBadge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {/* SUPER_ADMIN 자신의 역할은 변경 불가 */}
                        {user.id === currentUserId || user.role === 'ROLE_SUPER_ADMIN' ? (
                          <span className="text-slate-600 text-[14px]">변경 불가</span>
                        ) : (
                          <select
                            data-testid={`admin-user-role-trigger-${user.id}`}
                            value={user.role}
                            onChange={(event) => {
                              const nextRole = event.target.value as 'ROLE_ADMIN' | 'ROLE_USER';
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
                            className={adminNativeSelectClassName}
                          >
                            <option value="ROLE_USER">일반 사용자</option>
                            <option value="ROLE_ADMIN">관리자</option>
                          </select>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        disabled={user.role === 'ROLE_ADMIN'}
                        onClick={() => setPendingDeleteUser(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PlainDialog
        open={Boolean(pendingDeleteUser)}
        onClose={() => setPendingDeleteUser(null)}
        title="유저를 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 유저의 모든 데이터가 영구적으로 삭제됩니다."
        className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100"
        footer={(
          <>
            <Button variant="outline" onClick={() => setPendingDeleteUser(null)} className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
              취소
            </Button>
            <Button
              onClick={() => {
                if (!pendingDeleteUser) return;
                handleDeleteUser(pendingDeleteUser.id);
                setPendingDeleteUser(null);
              }}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
            >
              삭제
            </Button>
          </>
        )}
      >
        {pendingDeleteUser ? (
          <p className="text-[14px] text-slate-400">
            <span className="font-semibold text-slate-200">{pendingDeleteUser.name}</span> 계정을 삭제합니다.
          </p>
        ) : null}
      </PlainDialog>
    </>
  );
}
