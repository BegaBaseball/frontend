import type { Dispatch, SetStateAction } from 'react';

import { AdminBadge } from './AdminPanelPrimitives';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { Button } from '../ui/button';
import { AdminUserCogIcon } from './AdminPanelIcons';

interface PendingRoleChangeLike {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

interface AdminRoleChangeDialogContentProps {
  open: boolean;
  pendingRoleChange: PendingRoleChangeLike | null;
  roleChangeReason: string;
  setRoleChangeReason: Dispatch<SetStateAction<string>>;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

export default function AdminRoleChangeDialogContent({
  open,
  pendingRoleChange,
  roleChangeReason,
  setRoleChangeReason,
  onOpenChange,
  onConfirm,
}: AdminRoleChangeDialogContentProps) {
  return (
    <PlainDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={(
        <span className="flex items-center gap-2 text-white">
          <AdminUserCogIcon className="w-5 h-5 text-amber-400" />
          역할 변경 확인
        </span>
      )}
      description={(
        <span className="space-y-2 text-slate-400">
          <span className="block">
            <span className="text-slate-200 font-semibold">{pendingRoleChange?.userName}</span>
            {' '}({pendingRoleChange?.userEmail}) 의 역할을 변경합니다.
          </span>
          <span className="flex items-center gap-2 text-caption">
            <AdminBadge className="bg-slate-700 text-slate-300 border-0">
              {pendingRoleChange?.currentRole === 'ROLE_ADMIN' ? '관리자' : '일반 사용자'}
            </AdminBadge>
            <span className="text-slate-500">→</span>
            <AdminBadge
              className={
                pendingRoleChange?.targetRole === 'ROLE_ADMIN'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0'
                  : 'bg-slate-700 text-slate-300 border-0'
              }
            >
              {pendingRoleChange?.targetRole === 'ROLE_ADMIN' ? '관리자' : '일반 사용자'}
            </AdminBadge>
          </span>
        </span>
      )}
      className="max-w-md border-slate-800 bg-slate-900 text-slate-100"
      footer={(
        <>
          <Button
            variant="outline"
            data-testid="admin-role-change-cancel"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            data-testid="admin-role-change-confirm"
            className={
              pendingRoleChange?.targetRole === 'ROLE_ADMIN'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25'
                : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white border-0 hover:from-slate-500 hover:to-slate-600'
            }
            onClick={onConfirm}
          >
            {pendingRoleChange?.targetRole === 'ROLE_ADMIN' ? '관리자로 승격' : '일반 사용자로 강등'}
          </Button>
        </>
      )}
    >
      <div className="px-1 pb-2">
          <label className="block text-caption text-slate-400 mb-1">변경 사유 (선택)</label>
          <Input
            data-testid="admin-role-change-reason"
            placeholder="역할 변경 사유를 입력하세요..."
            value={roleChangeReason}
            onChange={(e) => setRoleChangeReason(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg focus:ring-amber-500 focus:border-amber-500"
          />
      </div>
    </PlainDialog>
  );
}
