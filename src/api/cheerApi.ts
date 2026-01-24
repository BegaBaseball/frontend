import { formatTimeAgo } from '../utils/time';
import api from './axios';

// 팀 색상 매핑
const teamColors: Record<string, string> = {
    'LG': '#C30452',
    'KT': '#000000',
    'SSG': '#CE0E2D',
    'NC': '#315288',
    'Doosan': '#131230',
    'KIA': '#EA0029',
    'Lotte': '#041E42',
    'Samsung': '#074CA1',
    'Hanwha': '#FF6600',
    'Kiwoom': '#820024',
    'ALLSTAR1': '#0F172A', // Slate-900 for Admin/Notice
};

const teamNames: Record<string, string> = {
    'LG': 'LG 트윈스',
    'KT': 'KT 위즈',
    'SSG': 'SSG 랜더스',
    'NC': 'NC 다이노스',
    'Doosan': '두산 베어스',
    'KIA': 'KIA 타이거즈',
    'Lotte': '롯데 자이언츠',
    'Samsung': '삼성 라이온즈',
    'Hanwha': '한화 이글스',
    'Kiwoom': '키움 히어로즈',
    'ALLSTAR1': '공지사항',
};

export function getTeamNameById(teamId: string | null): string {
    if (!teamId) return '전체';
    if (teamId === 'all') return '전체';
    return teamNames[teamId] || teamId;
}



// API 인터페이스 정의 (프론트엔드 사용용)
export interface CheerAuthor {
    id: number;
    handle: string;
    profileImageUrl?: string;
    teamId?: string;
}

export interface CheerPost {
    id: number;
    teamId: string;
    team: string; // compatibility
    postType: 'NORMAL' | 'NOTICE' | 'CHEER' | 'FREE';
    author: string; // Changed from CheerAuthor to string (display name)
    authorId: number;
    authorHandle: string;
    authorProfileImageUrl?: string;
    authorTeamId?: string;
    title: string;
    content: string;
    timeAgo: string; // Added for compatibility
    teamColor: string; // Added for compatibility
    likeCount: number;
    commentCount: number;
    repostCount: number;
    views: number;
    isHot: boolean;
    createdAt: string;
    updatedAt: string;
    liked: boolean;
    likedByUser: boolean; // compatibility
    bookmarked: boolean;
    isBookmarked: boolean; // compatibility
    isOwner: boolean;
    repostedByMe: boolean;
    imageUrls?: string[];
    images?: string[]; // compatibility
    comments: number; // Changed from any[] to number (count)
    likes: number; // Changed from number | undefined to number
    imageUploadFailed?: boolean; // Added
    // 리포스트 관련 필드
    repostOfId?: number;           // 원본 게시글 ID (리포스트인 경우)
    repostType?: RepostType;       // 'SIMPLE' | 'QUOTE' | undefined(원본)
    originalPost?: EmbeddedPost;   // 원본 게시글 임베드 정보
    originalDeleted?: boolean;     // 원본 삭제 여부
}

// ... (PageResponse, PostSummaryRes, etc. - skipping unrelated parts if possible, but replace_file_content needs contiguous block)

export interface PageResponse<T> {
    content: T[];
    last: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export type PostSummaryRes = CheerPost;

export interface FetchPostsParams {
    teamId?: string | null;
    postType?: 'NORMAL' | 'NOTICE' | null;
    page?: number;
    size?: number;
    sort?: string;
}

export interface SearchPostsParams {
    q: string;
    teamId?: string | null;
    page?: number;
    size?: number;
    sort?: string;
}

export interface LikeToggleResponse {
    liked: boolean;
    likes: number;
}

export interface RepostToggleResponse {
    reposted: boolean;
    count: number;
}

// 임베드된 원본 게시글 정보 (리포스트에서 표시용)
export interface EmbeddedPost {
    id: number;
    teamId: string;
    teamColor: string;
    title: string;
    content: string;  // 100자 미리보기
    author: string;
    authorHandle: string;
    authorProfileImageUrl?: string;
    createdAt: string;
    imageUrls: string[];
    deleted: boolean;  // 삭제 여부
    likeCount?: number;
    commentCount?: number;
    repostCount?: number;
}

// 리포스트 타입
export type RepostType = 'SIMPLE' | 'QUOTE';

export interface Comment {
    id: number;
    author: string;
    content: string;
    timeAgo: string;
    likes?: number;
    likeCount?: number;
    likedByMe?: boolean;
    authorProfileImageUrl?: string;
    authorHandle?: string;
    replies?: Comment[];
    authorEmail?: string; // Added for ownership check
}

// === API 함수들 ===

// 게시글 목록 조회
export const fetchPosts = async (params: FetchPostsParams = {}): Promise<PageResponse<CheerPost>> => {
    const { teamId, postType, page = 0, size = 20, sort } = params;
    const searchParams = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
    });

    if (teamId && teamId !== 'all') searchParams.append('teamId', teamId);
    if (postType) searchParams.append('postType', postType);
    if (sort) searchParams.append('sort', sort);

    const response = await api.get(`/cheer/posts?${searchParams.toString()}`);
    return transformPostPage(response.data);
};

// 인기 게시글 목록 조회
export const fetchHotPosts = async (params: FetchPostsParams = {}): Promise<PageResponse<CheerPost>> => {
    const { page = 0, size = 20 } = params;
    const response = await api.get(`/cheer/posts/hot?page=${page}&size=${size}`);
    return transformPostPage(response.data);
};

// 팔로우한 유저들의 게시글 조회 (팔로우 피드)
export const fetchFollowingPosts = async (params: FetchPostsParams = {}): Promise<PageResponse<CheerPost>> => {
    const { page = 0, size = 20 } = params;
    const response = await api.get(`/cheer/posts/following?page=${page}&size=${size}`);
    return transformPostPage(response.data);
};

export const searchPosts = async (params: SearchPostsParams): Promise<PageResponse<CheerPost>> => {
    const { q, teamId, page = 0, size = 20, sort } = params;
    const searchParams = new URLSearchParams({
        q,
        page: page.toString(),
        size: size.toString(),
    });

    if (teamId && teamId !== 'all') searchParams.append('teamId', teamId);
    if (sort) searchParams.append('sort', sort);

    const response = await api.get(`/cheer/posts/search?${searchParams.toString()}`);
    return transformPostPage(response.data);
};

// 특정 사용자 게시글 조회 (핸들 기준)
export async function fetchUserPostsByHandle(handle: string, page = 0, size = 20): Promise<PageResponse<CheerPost>> {
    const response = await api.get(`/cheer/user/${handle}/posts?page=${page}&size=${size}`);
    return transformPostPage(response.data);
}

// 데이터 변환 헬퍼
function transformPost(post: any): CheerPost {
    return {
        id: post.id,
        teamId: post.teamId,
        team: post.teamId, // compatibility
        teamColor: teamColors[post.teamId] || '#2d5f4f',
        title: post.title,
        content: post.content,
        author: post.author, // Assuming post.author is string from backend PostSummaryRes
        authorId: post.authorId,
        authorHandle: post.authorHandle || '',
        authorProfileImageUrl: post.authorProfileImageUrl,
        authorTeamId: post.authorTeamId,
        timeAgo: formatTimeAgo(post.createdAt),
        comments: post.comments || 0, // Now number
        likes: post.likes || 0,
        likeCount: post.likeCount || post.likes || 0,
        commentCount: post.commentCount || post.comments || 0,
        repostCount: post.repostCount || 0,
        views: post.views,
        liked: post.liked ?? false,
        likedByUser: post.liked ?? false,
        bookmarked: post.bookmarkedByMe ?? post.isBookmarked ?? false,
        isBookmarked: post.bookmarkedByMe ?? post.isBookmarked ?? false,
        images: post.imageUrls || [],
        imageUrls: post.imageUrls || [],
        isOwner: post.isOwner ?? false,
        repostedByMe: post.repostedByMe ?? false,
        isHot: post.isHot ?? false,
        postType: post.postType,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        imageUploadFailed: post.imageUploadFailed,
        // 리포스트 관련 필드
        repostOfId: post.repostOfId,
        repostType: post.repostType,
        originalPost: post.originalPost ? transformEmbeddedPost(post.originalPost) : undefined,
        originalDeleted: post.originalDeleted ?? false
    };
}

// 임베드된 원본 게시글 변환
function transformEmbeddedPost(post: any): EmbeddedPost {
    return {
        id: post.id,
        teamId: post.teamId,
        teamColor: post.teamColor || teamColors[post.teamId] || '#2d5f4f',
        title: post.title || '',
        content: post.content || '',
        author: post.author,
        authorHandle: post.authorHandle,
        authorProfileImageUrl: post.authorProfileImageUrl,
        createdAt: post.createdAt,
        imageUrls: post.imageUrls || [],
        deleted: post.deleted ?? false
    };
}

function transformPostPage(data: any) {
    return {
        content: data.content.map(transformPost),
        last: data.last,
        totalPages: data.totalPages,
        totalElements: data.totalElements,
        size: data.size,
        number: data.number
    };
}

// 게시글 상세 조회
export async function fetchPostDetail(id: number): Promise<CheerPost> {
    const response = await api.get(`/cheer/posts/${id}`);
    return transformPost(response.data);
}

// 게시글 작성
export async function createPost(data: {
    teamId: string;
    title: string;
    content: string;
    postType?: string;
}) {
    const response = await api.post('/cheer/posts', {
        ...data,
        postType: data.postType || 'CHEER'
    });
    return transformPost(response.data);
}

// 게시글 수정
export async function updatePost(id: number, data: {
    title: string;
    content: string;
}) {
    const response = await api.put(`/cheer/posts/${id}`, data);
    return transformPost(response.data);
}

// 게시글 삭제
export async function deletePost(id: number) {
    await api.delete(`/cheer/posts/${id}`);
}

// 좋아요 토글
export async function toggleLike(postId: number): Promise<LikeToggleResponse> {
    const response = await api.post(`/cheer/posts/${postId}/like`);
    return response.data;
}

// 댓글 목록 조회
export async function fetchComments(postId: number, page = 0, size = 20) {
    const response = await api.get(`/cheer/posts/${postId}/comments?page=${page}&size=${size}`);
    const data = response.data;

    const transformComment = (c: any): any => ({
        id: c.id,
        author: c.author,
        authorEmail: c.authorEmail,
        authorTeamId: c.authorTeamId,
        authorProfileImageUrl: c.authorProfileImageUrl,
        authorHandle: c.authorHandle,
        content: c.content,
        timeAgo: formatTimeAgo(c.createdAt),
        likeCount: c.likeCount,
        likedByMe: c.likedByMe,
        replies: c.replies ? c.replies.map(transformComment) : []
    });

    return {
        ...data,
        content: data.content.map(transformComment)
    };
}

// 댓글 작성
export async function createComment(postId: number, content: string) {
    const response = await api.post(`/cheer/posts/${postId}/comments`, { content });
    return response.data;
}

// 댓글 삭제
export async function deleteComment(commentId: number) {
    await api.delete(`/cheer/comments/${commentId}`);
}

// 댓글 좋아요 토글
export async function toggleCommentLike(commentId: number): Promise<LikeToggleResponse> {
    const response = await api.post(`/cheer/comments/${commentId}/like`);
    return response.data;
}

// 북마크 토글
export async function toggleBookmark(postId: number) {
    const response = await api.post(`/cheer/posts/${postId}/bookmark`);
    return response.data;
}

// 재게시 (Repost) 토글 - 단순 리포스트
export async function toggleRepost(postId: number): Promise<RepostToggleResponse> {
    const response = await api.post(`/cheer/posts/${postId}/repost`);
    return response.data;
}

// 인용 리포스트 생성
export async function createQuoteRepost(postId: number, content: string): Promise<CheerPost> {
    const response = await api.post(`/cheer/posts/${postId}/quote`, { content });
    return transformPost(response.data);
}

export enum ReportReason {
    SPAM = 'SPAM',
    INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
    ABUSIVE_LANGUAGE = 'ABUSIVE_LANGUAGE',
    ADVERTISEMENT = 'ADVERTISEMENT',
    OTHER = 'OTHER',
}

export const ReportReasonLabels: Record<ReportReason, string> = {
    [ReportReason.SPAM]: '스팸/홍보',
    [ReportReason.INAPPROPRIATE_CONTENT]: '부적절한 콘텐츠',
    [ReportReason.ABUSIVE_LANGUAGE]: '욕설/비하 발언',
    [ReportReason.ADVERTISEMENT]: '상업적 광고',
    [ReportReason.OTHER]: '기타',
};

export async function reportPost(postId: number, reason: ReportReason, description?: string): Promise<void> {
    await api.post(`/cheer/posts/${postId}/report`, { reason, description });
}

// 이미지 업로드
export async function uploadPostImages(postId: number, files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append('files', file);
    });

    const response = await api.post(`/cheer/posts/${postId}/images`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        skipGlobalErrorHandler: true, // 직접 에러 처리 (글 작성 실패 메시지 커스텀)
    } as any);
    return response.data; // 업로드된 이미지 URL 목록 반환
}

// 이미지 삭제
export async function deleteImage(postId: number, imageUrl: string): Promise<void> {
    // URL에서 파일명 추출 로직이 필요할 수 있음 (백엔드 구현에 따라 다름)
    // 현재 백엔드 API 명세상 이미지 ID나 파일명을 받는 것으로 추정됨.
    // 여기서는 쿼리 파라미터로 imageUrl을 보내는 방식으로 구현하거나,
    // 백엔드가 imageUrl 전체를 받는지 확인 필요. 리소스/삭제 API가 RESTful하다면 DELETE /images/{id} 일수도 있음.
    // ImageController를 확인했을 때, 별도 삭제 API가 명확하지 않다면
    // 게시글 수정 시 이미지 목록을 업데이트하는 방식을 사용할 수도 있음.

    // 일단 ImageController를 다시 확인해보니 `deleteImage(@PathVariable Long imageId)` 같은 게 있다면 그걸 써야 함.
    // 현재는 API 명세를 모르므로, useCheerEdit에서 처리하거나, backend의 ImageController를 확인해야 함.
    // ImageController를 확인해 본 결과(이전 세션), DELETE /api/images/{imageId} 같은 게 있을 수 있음.

    // 임시로 구현하지 않음. 서비스 코드(useCheerEdit)에서 처리하도록 유도.
}

// 이미지 단건 삭제 (ID 기반)
export async function deleteImageById(imageId: number): Promise<void> {
    await api.delete(`/cheer/images/${imageId}`);
}

export interface PostImageDto {
    id: number;
    storagePath: string;
    mimeType: string;
    bytes: number;
    isThumbnail: boolean;
    url: string; // Added field
}

// 게시글 이미지 목록 조회 (ID 포함)
export async function fetchPostImages(postId: number): Promise<PostImageDto[]> {
    const response = await api.get(`/cheer/posts/${postId}/images`);
    return response.data;
}
// Cheer Battle Status
export interface CheerBattleStatus {
    stats: Record<string, number>;
    myVote: string | null;
}

export async function getCheerBattleStatus(gameId: string): Promise<CheerBattleStatus> {
    const response = await api.get(`/cheer/battle/${gameId}/status`);
    return response.data;
}
