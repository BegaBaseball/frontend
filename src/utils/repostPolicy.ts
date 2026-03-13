export type RepostErrorCode =
    | 'REPOST_NOT_ALLOWED'
    | 'REPOST_NOT_ALLOWED_BLOCKED'
    | 'REPOST_NOT_ALLOWED_PRIVATE'
    | 'REPOST_CANCEL_NOT_ALLOWED'
    | 'REPOST_QUOTE_NOT_ALLOWED'
    | 'REPOST_NOT_A_REPOST'
    | 'REPOST_SELF_NOT_ALLOWED'
    | 'REPOST_TARGET_NOT_FOUND'
    | 'REPOST_CONFLICT'
    | 'REPOST_CYCLE_DETECTED'
    | string;

export const REPOST_DISABLED_OWNER_MESSAGE = '자신의 글은 리포스트할 수 없습니다.';
export const REPOST_DISABLED_GENERIC_MESSAGE = '이 글은 리포스트할 수 없습니다.';
export const REPOST_QUOTE_DISABLED_REPOSTED_MESSAGE = '리포스트된 글은 인용할 수 없습니다.';
export const REPOST_NOT_ALLOWED_QUOTE_MESSAGE = REPOST_QUOTE_DISABLED_REPOSTED_MESSAGE;
export const REPOST_NOT_ALLOWED_BLOCKED_MESSAGE = '차단된 사용자의 게시글은 리포스트할 수 없습니다.';
export const REPOST_NOT_ALLOWED_PRIVATE_MESSAGE = '비공개 계정의 게시글은 리포스트할 수 없습니다.';
export const REPOST_NOT_A_REPOST_MESSAGE = '리포스트가 아닌 게시글입니다.';
export const REPOST_TARGET_NOT_FOUND_MESSAGE = '요청한 리포스트 대상 게시글을 찾을 수 없습니다.';
export const REPOST_CONFLICT_MESSAGE = '동일한 리포스트 요청이 중복 처리되었습니다.';
export const REPOST_CANCEL_NOT_ALLOWED_MESSAGE = '리포스트를 작성한 사용자만 삭제할 수 있습니다.';
export const REPOST_SELF_NOT_ALLOWED_MESSAGE = '자신의 글은 리포스트할 수 없습니다.';
export const REPOST_CYCLE_DETECTED_MESSAGE = '리포스트 대상이 비정상적으로 설정되어 있습니다.';
export const REPOST_NOT_ALLOWED_GENERIC_MESSAGE = '리포스트 정책에 위배됩니다.';

const normalizeHandle = (value?: string | null) =>
    value?.trim()?.replace(/^@/, '')?.toLowerCase() || '';

const isTargetOwnedByCurrentUser = (
    isPostOwner: boolean,
    targetAuthorId: number | string | null | undefined,
    targetAuthorHandle: string | null | undefined,
    currentUserId: number | null | undefined,
    currentUserHandle: string | null | undefined,
) => {
    if (isPostOwner) return true;

    if (typeof currentUserId === 'number' && typeof targetAuthorId === 'number') {
        if (currentUserId === targetAuthorId) return true;
    }

    const normalizedTargetHandle = normalizeHandle(targetAuthorHandle);
    const normalizedCurrentHandle = normalizeHandle(currentUserHandle);
    if (!normalizedTargetHandle || !normalizedCurrentHandle) {
        return false;
    }

    return normalizedTargetHandle === normalizedCurrentHandle;
};

export interface RepostPolicyInput {
    isPostOwner: boolean;
    isRepostTarget: boolean;
    targetAuthorId?: number | string | null;
    targetAuthorHandle?: string | null;
    currentUserId?: number | null;
    currentUserHandle?: string | null;
}

export interface RepostPolicyDecision {
    canSimpleRepost: boolean;
    canQuoteRepost: boolean;
    repostSimpleUnavailableMessage: string;
    repostQuoteUnavailableMessage: string;
    isSelfPostTarget: boolean;
}

export const getRepostPolicyDecision = (input: RepostPolicyInput): RepostPolicyDecision => {
    const {
        isPostOwner,
        isRepostTarget,
        targetAuthorId,
        targetAuthorHandle,
        currentUserId,
        currentUserHandle,
    } = input;

    const isSelfPostTarget = isTargetOwnedByCurrentUser(
        isPostOwner,
        targetAuthorId,
        targetAuthorHandle,
        currentUserId,
        currentUserHandle,
    );

    const canSimpleRepost = !isSelfPostTarget;

    return {
        canSimpleRepost,
        canQuoteRepost: canSimpleRepost && !isRepostTarget,
        repostSimpleUnavailableMessage: getRepostSimpleUnavailableMessage(isSelfPostTarget),
        repostQuoteUnavailableMessage: isRepostTarget
            ? REPOST_QUOTE_DISABLED_REPOSTED_MESSAGE
            : getRepostSimpleUnavailableMessage(isSelfPostTarget),
        isSelfPostTarget,
    };
};

const REPOST_ERROR_MESSAGES_BY_CODE: Record<string, string> = {
    REPOST_NOT_ALLOWED: REPOST_NOT_ALLOWED_GENERIC_MESSAGE,
    REPOST_NOT_ALLOWED_BLOCKED: REPOST_NOT_ALLOWED_BLOCKED_MESSAGE,
    REPOST_NOT_ALLOWED_PRIVATE: REPOST_NOT_ALLOWED_PRIVATE_MESSAGE,
    REPOST_CANCEL_NOT_ALLOWED: REPOST_CANCEL_NOT_ALLOWED_MESSAGE,
    REPOST_QUOTE_NOT_ALLOWED: REPOST_NOT_ALLOWED_QUOTE_MESSAGE,
    REPOST_NOT_A_REPOST: REPOST_NOT_A_REPOST_MESSAGE,
    REPOST_SELF_NOT_ALLOWED: REPOST_SELF_NOT_ALLOWED_MESSAGE,
    REPOST_TARGET_NOT_FOUND: REPOST_TARGET_NOT_FOUND_MESSAGE,
    REPOST_CONFLICT: REPOST_CONFLICT_MESSAGE,
    REPOST_CYCLE_DETECTED: REPOST_CYCLE_DETECTED_MESSAGE,
};

export const getRepostErrorMessageFromCode = (code: string | undefined, fallback: string): string => {
    if (!code) return fallback;
    return REPOST_ERROR_MESSAGES_BY_CODE[code] ?? fallback;
};

export const getRepostSimpleUnavailableMessage = (isSelfTarget: boolean) => {
    if (isSelfTarget) {
        return REPOST_DISABLED_OWNER_MESSAGE;
    }
    return REPOST_DISABLED_GENERIC_MESSAGE;
};
