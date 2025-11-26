import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  Send,
  Bookmark,
  Eye,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { CommentItem } from './cheer/CommentItem';
import TeamLogo from './TeamLogo';
import { useCheerStore, Comment as CheerComment } from '../store/cheerStore';
import { PageResponse } from '../api/cheer';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addComment,
  addReply,
  deletePost,
  getPost,
  listComments,
  toggleCommentLike,
  togglePostLike,
} from '../api/cheer';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
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

const COMMENTS_PAGE_SIZE = 10;

export default function CheerDetail() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { postId: postIdParam } = useParams();
  const selectedPostId = Number(postIdParam);

  const {
    upsertPost,
    removePost,
    setPostLikeState,
    setPostCommentCount,
  } = useCheerStore();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const user = useAuthStore((state) => state.user);
  const userFavoriteTeam = user?.favoriteTeam ?? null;

  useEffect(() => {
    if (isNaN(selectedPostId) || selectedPostId === 0) {
      navigate('/cheer');
    }
  }, [selectedPostId, navigate]);

  const [commentInput, setCommentInput] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentPage, setCommentPage] = useState(0);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // ========== React Query ==========
  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['cheerPost', selectedPostId],
    queryFn: () => getPost(selectedPostId!),
    enabled: !!selectedPostId && !isNaN(selectedPostId),
  });

  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    isFetching: isCommentsFetching,
    refetch: refetchComments,
  } = useQuery<PageResponse<CheerComment>>({
    queryKey: ['cheerPostComments', selectedPostId, commentPage, COMMENTS_PAGE_SIZE],
    queryFn: () => listComments(selectedPostId!, commentPage, COMMENTS_PAGE_SIZE),
    enabled: !!selectedPostId && !isNaN(selectedPostId),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (post) {
      upsertPost(post);
    }
  }, [post, upsertPost]);

  useEffect(() => {
    setCommentPage(0);
    setActiveReplyId(null);
    setReplyDrafts({});
  }, [selectedPostId]);

  // ========== Mutations ==========
  const likeMutation = useMutation({
    mutationFn: () => togglePostLike(post!.id),
    onSuccess: ({ liked, likes }) => {
      if (!post) return;
      setPostLikeState(post.id, liked, likes);
      queryClient.setQueryData(['cheerPost', post.id], {
        ...post,
        likedByUser: liked,
        likes,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || '좋아요 처리 중 문제가 발생했습니다.');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(post!.id, content),
    onSuccess: () => {
      if (!post) {
        return;
      }
      setCommentInput('');
      const updatedCount = (commentsData?.totalElements ?? post.comments ?? 0) + 1;
      setPostCommentCount(post.id, updatedCount);
      setCommentPage(0);
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['cheerPost', post.id] });
      toast.success('댓글이 등록되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '댓글 등록 중 문제가 발생했습니다.');
    },
  });

  const commentLikeMutation = useMutation({
    mutationFn: (commentId: number) => toggleCommentLike(commentId),
    onSuccess: () => {
      refetchComments();
    },
    onError: (error: Error) => {
      toast.error(error.message || '댓글 좋아요 처리 중 문제가 발생했습니다.');
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      addReply(post!.id, commentId, content),
    onSuccess: (_, variables) => {
      if (!post) {
        return;
      }
      setReplyDrafts((prev) => ({
        ...prev,
        [variables.commentId]: '',
      }));
      setActiveReplyId(null);
      const updatedCount = (commentsData?.totalElements ?? post.comments ?? 0) + 1;
      setPostCommentCount(post.id, updatedCount);
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['cheerPost', post.id] });
      toast.success('답글이 등록되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '답글 등록 중 문제가 발생했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post!.id),
    onSuccess: () => {
      if (!post) return;
      toast.success('게시글이 삭제되었습니다.');
      removePost(post.id);
      queryClient.invalidateQueries({ queryKey: ['cheerPosts'] });
      navigate('/cheer');
    },
    onError: (error: Error) => {
      toast.error(error.message || '게시글 삭제 중 문제가 발생했습니다.');
    },
  });

  // ========== Computed Values ==========
  const comments = useMemo(() => commentsData?.content ?? [], [commentsData]);
  const totalCommentCount = commentsData?.totalElements ?? post?.comments ?? 0;
  const totalCommentPages = commentsData?.totalPages ?? 0;
  const canPrevCommentPage = commentPage > 0;
  const canNextCommentPage = commentPage + 1 < totalCommentPages;
  
  const sameTeamAsUser = useMemo(() => {
    if (!post) {
      return false;
    }
    // 인증 정보가 로딩 중이면 아직 판단하지 않음
    if (isAuthLoading) {
      return false;
    }
    // 로딩이 완료되었는데 favoriteTeam이 없으면 false
    if (!userFavoriteTeam) {
      return false;
    }
    if (post.teamId) {
      return post.teamId === userFavoriteTeam;
    }
    if (post.teamShortName) {
      return post.teamShortName === userFavoriteTeam;
    }
    return post.team === userFavoriteTeam;
  }, [post, userFavoriteTeam, isAuthLoading]);

  const canInteract = Boolean(!isAuthLoading && userFavoriteTeam && sameTeamAsUser);

  const canLike = isLoggedIn;

  const interactionWarning = useMemo(() => {
    if (!post) return '';
    if (!userFavoriteTeam) {
      return '마이페이지에서 응원 구단을 설정한 후 댓글을 작성할 수 있습니다.';
    }
    if (!sameTeamAsUser) {
      return '다른 팀 게시글에는 댓글을 남길 수 없습니다.';
    }
    return '';
  }, [post, userFavoriteTeam, sameTeamAsUser]);

  // ========== Event Handlers ==========
  const handleLike = () => {
    if (!post) return;
    if (!isLoggedIn) {
      toast.error('좋아요를 누르려면 로그인이 필요합니다.');
      return;
    }
    if (likeMutation.isPending) return;
    likeMutation.mutate();
  };

  const handleCommentSubmit = () => {
    if (!post || !commentInput.trim() || commentMutation.isPending) {
      return;
    }
    if (!canInteract) {
      if (interactionWarning) {
        toast.error(interactionWarning);
      }
      return;
    }
    commentMutation.mutate(commentInput.trim());
  };

  const handleCommentLike = (commentId: number) => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (commentLikeMutation.isPending) {
      return;
    }
    commentLikeMutation.mutate(commentId);
  };

  const handleReplyToggle = (commentId: number) => {
    if (!canInteract) {
      if (interactionWarning) {
        toast.error(interactionWarning);
      }
      return;
    }
    setActiveReplyId((current) => (current === commentId ? null : commentId));
  };

  const handleReplyChange = (commentId: number, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [commentId]: value,
    }));
  };

  const handleReplySubmit = (commentId: number) => {
    if (!post) {
      toast.error('게시글 정보를 찾을 수 없습니다.');
      return;
    }
    const draft = replyDrafts[commentId]?.trim();
    if (!draft || replyMutation.isPending) {
      return;
    }
    if (!canInteract) {
      if (interactionWarning) {
        toast.error(interactionWarning);
      }
      return;
    }
    replyMutation.mutate({ commentId, content: draft });
  };

  const confirmDelete = () => {
    if (!post) return;
    deleteMutation.mutate();
  };

  const handleEdit = () => {
    if (!post) return;
    navigate(`/cheer/edit/${post.id}`);
  };

  const handleBack = () => {
    navigate('/cheer');
  };

  const handleChangeCommentPage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalCommentPages) {
      return;
    }
    setCommentPage(nextPage);
  };

  const handleShare = async () => {
    if (!post) return;

    const shareData = {
      title: `${post.title} - BEGA 응원게시판`,
      text: `${post.author}님의 ${post.team} 응원 글을 확인해보세요!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('공유가 완료되었습니다!');
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('공유 중 오류 발생:', error);
          fallbackShare();
        }
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  // ========== Render ==========
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>응원게시판으로 돌아가기</span>
          </button>
          <Button variant="ghost" onClick={() => refetch()}>
            새로고침
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Error Message */}
          {isError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </div>
          )}

          <div className="space-y-6">
            {/* Post Card */}
            <Card className="rounded-xl bg-white p-8 shadow-sm">
              {/* Loading Skeleton */}
              {isLoading && (
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-1/2 rounded bg-gray-200" />
                      <div className="h-4 w-1/3 rounded bg-gray-100" />
                      <div className="h-3 w-1/4 rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-2/3 rounded bg-gray-100" />
                  <div className="h-48 w-full rounded bg-gray-100" />
                </div>
              )}

              {/* Post Content */}
              {!isLoading && post && (
                <>
                  {/* Post Header */}
                  <div className="mb-6 flex items-center justify-between border-b pb-6">
                    <div className="flex items-center gap-4">
                      <ProfileAvatar
                        src={post.authorProfileImageUrl}
                        alt={post.author}
                        size="lg"
                      />
                      <div className="flex-1">
                        <h2 className="mb-2 text-gray-900">{post.title}</h2>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm text-gray-600">{post.author}</span>
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full"
                            style={{ backgroundColor: '#f3f4f6' }}
                          >
                            <TeamLogo team={post.team} size={24} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{post.timeAgo}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.views?.toLocaleString() ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleShare}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title="공유하기"
                      >
                        <Share2 className="h-5 w-5" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {post.isOwner && (
                            <>
                              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" />
                                수정
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e: Event) => e.preventDefault()}
                                  className="text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  삭제
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <DropdownMenuSeparator />
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Post Body */}
                  <div className="mb-8 whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {post.content}
                  </div>

                  {/* Post Images */}
                  {post.images && post.images.length > 0 && (
                    <div className="mb-8 grid grid-cols-2 gap-3">
                      {post.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Post image ${index + 1}`}
                          className="w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between border-t pt-6">
                    <div className="flex items-center gap-6">
                      <button
                        onClick={handleLike}
                        className="flex items-center gap-2 text-gray-600 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:text-gray-400"
                        disabled={!canLike || likeMutation.isPending}
                      >
                        <Heart
                          className={`h-6 w-6 ${
                            post.likedByUser ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                        <span className="font-medium">{post.likes}</span>
                      </button>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MessageSquare className="h-6 w-6" />
                        <span className="font-medium">{totalCommentCount}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsBookmarked((prev) => !prev)}
                      className="flex items-center gap-2 text-gray-600 transition-colors hover:text-yellow-500"
                    >
                      <Bookmark
                        className={`h-6 w-6 ${
                          isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </Card>

            {/* Comments Card */}
            <Card className="rounded-xl bg-white p-8 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2" style={{ color: '#2d5f4f' }}>
                <MessageSquare className="h-6 w-6" />
                댓글 <span className="ml-1">{totalCommentCount}</span>
              </h3>

              {/* Comment Input */}
              <div className="mb-8 border-b pb-8">
                <div className="flex gap-4">
                  <ProfileAvatar
                    src={useAuthStore.getState().user?.profileImageUrl}
                    alt={useAuthStore.getState().user?.name || '사용자'}
                    size="md"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1">
                    <Textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="댓글을 입력하세요"
                      disabled={!canInteract || commentMutation.isPending}
                      className="min-h-[100px]"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={handleCommentSubmit}
                        className="flex items-center gap-2 text-white"
                        style={{ backgroundColor: '#2d5f4f' }}
                        disabled={
                          !canInteract ||
                          commentMutation.isPending ||
                          commentInput.trim().length === 0
                        }
                      >
                        <Send className="h-4 w-4" />
                        등록
                      </Button>
                    </div>
                  </div>
                </div>
                {interactionWarning && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {interactionWarning}
                  </div>
                )}
              </div>

              {/* Comments Loading */}
              {isCommentsLoading && (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="animate-pulse space-y-2">
                      <div className="h-4 w-1/3 rounded bg-gray-200" />
                      <div className="h-3 w-2/3 rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isCommentsLoading && comments.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-gray-500">
                  아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
                </div>
              )}

              {/* Comments List */}
              {!isCommentsLoading && comments.length > 0 && (
                <div className="space-y-6">
                  {comments.map((comment: CheerComment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      canInteract={canInteract}
                      canLike={canLike}
                      activeReplyId={activeReplyId}
                      replyDraft={replyDrafts[comment.id] ?? ''}
                      isReplyPending={replyMutation.isPending}
                      isCommentLikePending={commentLikeMutation.isPending}
                      onCommentLike={handleCommentLike}
                      onReplyToggle={handleReplyToggle}
                      onReplyChange={handleReplyChange}
                      onReplySubmit={handleReplySubmit}
                      onReplyCancel={() => setActiveReplyId(null)}
                    />
                  ))}
                </div>
              )}

              {/* Fetching Indicator */}
              {isCommentsFetching && !isCommentsLoading && (
                <div className="mt-4 text-sm text-gray-400">댓글을 불러오는 중입니다...</div>
              )}

              {/* Pagination */}
              {totalCommentPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleChangeCommentPage(commentPage - 1)}
                    disabled={!canPrevCommentPage || isCommentsFetching}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  <span className="text-sm text-gray-500">
                    {commentPage + 1} / {totalCommentPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handleChangeCommentPage(commentPage + 1)}
                    disabled={!canNextCommentPage || isCommentsFetching}
                    className="flex items-center gap-2"
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              게시글을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}