import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
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
import TeamLogo from '../TeamLogo';
import { TEAM_DATA } from '../../constants/teams';
import { getTimeAgo } from '../../utils/formatters';

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
  return (
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
                          이 작업은 되돌릴 수 없습니다. 게시글과 관련된 모든 데이터가 영구적으로 삭제됩니다.
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
  );
}
