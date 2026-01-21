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

// 시간 변환 유틸리티
function formatTimeAgo(createdAt: string): string {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}일 전`;
}

// API 인터페이스 정의 (프론트엔드 사용용)
export interface CheerPost {
    id: number;
    team: string;
    teamColor: string;
    title: string;
    content?: string;
    author: string;
    authorId: number;
    authorHandle?: string;
    authorProfileImageUrl?: string;
    authorTeamId?: string;
    timeAgo: string;
    comments: number;
    likes: number;
    views: number;
    isHot: boolean;
    likedByUser?: boolean;
    isBookmarked?: boolean; // 추가됨
    images?: string[];
    imageUploadFailed?: boolean;
    isOwner?: boolean;
    postType: string;
}

export interface LikeToggleResponse {
    liked: boolean;
    likes: number;
}

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
export async function fetchPosts(teamId?: string, page = 0, size = 20, postType?: string, sort = 'createdAt,desc') {
    const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sort: sort
    });

    if (teamId && teamId !== 'all') {
        params.append('teamId', teamId);
    }
    if (postType) {
        params.append('postType', postType);
    }

    const response = await api.get(`/cheer/posts?${params.toString()}`);
    return transformPostPage(response.data);
}

// 특정 사용자 게시글 조회 (핸들 기준)
export async function fetchUserPostsByHandle(handle: string, page = 0, size = 20) {
    const response = await api.get(`/cheer/user/${handle}/posts?page=${page}&size=${size}`);
    return transformPostPage(response.data);
}

// 데이터 변환 헬퍼
function transformPostPage(data: any) {
    // 데이터 변환
    const content = data.content.map((post: any) => ({
        id: post.id,
        team: post.teamId,
        teamColor: teamColors[post.teamId] || '#2d5f4f',
        title: post.title,
        author: post.author,
        authorId: post.authorId,
        authorHandle: post.authorHandle,
        authorProfileImageUrl: post.authorProfileImageUrl,
        authorTeamId: post.authorTeamId,
        timeAgo: formatTimeAgo(post.createdAt),
        comments: post.comments,
        likes: post.likes,
        views: post.views,
        isHot: post.isHot,
        postType: post.postType,
        images: post.imageUrls,
        isOwner: post.isOwner,
        likedByUser: post.liked,
        isBookmarked: post.bookmarkedByMe ?? post.isBookmarked ?? false,
    }));

    return {
        content,
        last: data.last,
        totalPages: data.totalPages,
        totalElements: data.totalElements,
        number: data.number
    };
}

// 게시글 상세 조회
export async function fetchPostDetail(id: number): Promise<CheerPost> {
    const response = await api.get(`/cheer/posts/${id}`);
    const post = response.data;

    return {
        id: post.id,
        team: post.teamId,
        teamColor: teamColors[post.teamId] || '#2d5f4f',
        title: post.title,
        content: post.content,
        author: post.author,
        authorId: post.authorId, // Map from response
        authorProfileImageUrl: post.authorProfileImageUrl,
        authorTeamId: post.authorTeamId,
        timeAgo: formatTimeAgo(post.createdAt),
        comments: post.comments,
        likes: post.likes,
        views: post.views,
        likedByUser: post.liked,
        isBookmarked: post.bookmarkedByMe ?? post.isBookmarked ?? false,
        images: post.imageUrls,
        isOwner: post.isOwner,
        isHot: false, // 상세에서는 굳이 필요없을 수 있음
        postType: post.postType
    };
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
    return response.data;
}

// 게시글 수정
export async function updatePost(id: number, data: {
    title: string;
    content: string;
}) {
    const response = await api.put(`/cheer/posts/${id}`, data);
    return response.data;
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
