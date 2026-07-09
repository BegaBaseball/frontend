import { useState } from 'react';
import { AdminBadge } from './AdminPanelPrimitives';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import TeamLogo from '../TeamLogo';
import { TEAM_DATA } from '../../constants/teams';
import { getTimeAgo } from '../../utils/formatters';
import { AdminMessageSquareIcon, AdminTrashIcon } from './AdminPanelIcons';

interface AdminPost {
  id: number;
  team: string;
  content?: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isHot?: boolean;
}

interface PostsAdminPanelProps {
  posts: AdminPost[];
  handleDeletePost: (postId: number) => void;
}

export function PostsAdminPanel({ posts, handleDeletePost }: PostsAdminPanelProps) {
  const [pendingDeletePost, setPendingDeletePost] = useState<AdminPost | null>(null);

  return (
    <>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400 font-semibold">ID</TableHead>
              <TableHead className="text-slate-400 font-semibold">팀</TableHead>
              <TableHead className="text-slate-400 font-semibold">내용</TableHead>
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
                  <AdminMessageSquareIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  게시글이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow
                  key={post.id}
                  className="border-slate-800 transition-colors duration-150 hover:bg-slate-800/30"
                >
                  <TableCell className="text-slate-300 font-mono text-caption">{post.id}</TableCell>
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
                        <AdminBadge className="animate-pulse border-0 bg-red-500/20 px-1.5 py-0 text-11 text-red-200 motion-reduce:animate-none">
                          HOT
                        </AdminBadge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">{post.author}</TableCell>
                  <TableCell className="text-slate-400 text-caption">{getTimeAgo(post.createdAt)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <span className="text-lg">♥</span>
                      <span className="font-semibold">{post.likeCount}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 font-semibold text-caption">
                      {post.commentCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => setPendingDeletePost(post)}
                    >
                      <AdminTrashIcon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PlainDialog
        open={Boolean(pendingDeletePost)}
        onClose={() => setPendingDeletePost(null)}
        title="게시글을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 게시글과 관련된 모든 데이터가 영구적으로 삭제됩니다."
        className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100"
        footer={(
          <>
            <Button variant="outline" onClick={() => setPendingDeletePost(null)} className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700">
              취소
            </Button>
            <Button
              onClick={() => {
                if (!pendingDeletePost) return;
                handleDeletePost(pendingDeletePost.id);
                setPendingDeletePost(null);
              }}
              className="bg-red-500 text-white border-0 shadow-sm hover:bg-red-600"
            >
              삭제
            </Button>
          </>
        )}
      >
        {pendingDeletePost ? (
          <p className="text-caption text-slate-400">
            <span className="font-semibold text-slate-200">#{pendingDeletePost.id}</span> 게시글을 삭제합니다.
          </p>
        ) : null}
      </PlainDialog>
    </>
  );
}
