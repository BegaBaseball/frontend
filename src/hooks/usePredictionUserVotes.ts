import { useCallback, useState } from 'react';
import { fetchAllUserVotesBulk as fetchAllUserVotesBulkAPI } from '../api/prediction';
import { parseError } from '../utils/errorUtils';
import {
  isCancelLikeError,
  type UserVoteRecord,
} from './predictionHookShared';

const USER_VOTE_BATCH_TTL_MS = 30 * 1000;

const predictionUserVoteRequests = new Map<string, Promise<UserVoteRecord>>();
const predictionUserVoteCache = new Map<string, { votes: UserVoteRecord; fetchedAt: number }>();

type UsePredictionUserVotesParams = {
  userId?: number | string | null;
};

export const usePredictionUserVotes = ({ userId }: UsePredictionUserVotesParams) => {
  const [userVote, setUserVote] = useState<UserVoteRecord>({});
  const currentUserVoteKey = userId || 'anonymous';

  const fetchAndCacheUserVotes = useCallback(async (
    gameIds: string[],
    requestKeySuffix: string,
    requestGuard?: number | (() => boolean)
  ) => {
    const isStale = () => {
      if (typeof requestGuard === 'function') {
        return requestGuard();
      }
      if (typeof requestGuard === 'number') {
        return false;
      }
      return false;
    };

    const normalizedIds = Array.from(new Set(gameIds.filter(Boolean))).sort();
    if (!normalizedIds.length) {
      return;
    }

    const cacheKey = `${currentUserVoteKey}:${requestKeySuffix}:${normalizedIds.join('|')}`;
    const now = Date.now();
    const cachedBatch = predictionUserVoteCache.get(cacheKey);

    if (cachedBatch && now - cachedBatch.fetchedAt < USER_VOTE_BATCH_TTL_MS) {
      setUserVote((prev) => {
        const nextVotes = { ...prev };
        Object.entries(cachedBatch.votes).forEach(([key, value]) => {
          nextVotes[key] = value;
        });
        return nextVotes;
      });
      return;
    }

    const existingRequest = predictionUserVoteRequests.get(cacheKey);
    const inFlight = existingRequest || fetchAllUserVotesBulkAPI(normalizedIds).finally(() => {
      predictionUserVoteRequests.delete(cacheKey);
    });

    predictionUserVoteRequests.set(cacheKey, inFlight);

    try {
      const userVotes = await inFlight;
      if (isStale()) {
        return;
      }
      if (Object.keys(userVotes).length > 0) {
        predictionUserVoteCache.set(cacheKey, {
          votes: userVotes,
          fetchedAt: Date.now(),
        });
      }
      setUserVote((prev) => ({
        ...prev,
        ...userVotes,
      }));
    } catch (error) {
      if (isCancelLikeError(error)) {
        return;
      }
      const parsedError = parseError(error);
      console.error('[prediction] 내 투표 조회 실패', parsedError.message || error);
      if (isStale()) {
        return;
      }

      setUserVote((prev) => {
        const nextVotes = { ...prev };
        normalizedIds.forEach((id) => {
          if (nextVotes[id] === undefined) {
            nextVotes[id] = null;
          }
        });
        return nextVotes;
      });
    }
  }, [currentUserVoteKey]);

  return {
    userVote,
    setUserVote,
    fetchAndCacheUserVotes,
  };
};
