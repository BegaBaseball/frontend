import type {
  LinkedContent,
  LinkedPostLookup,
  LinkedPostLookupParams,
} from '../../api/cheerApi';
import type { LinkedPostTarget } from './CheerPresentation';

const isPositiveLinkedId = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

const toLinkedLookupParams = (target: unknown): LinkedPostLookupParams | null => {
  if (!target || typeof target !== 'object') return null;
  const candidate = target as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (
    candidate.postType === 'CHECKIN'
    && isPositiveLinkedId(candidate.diaryId)
    && candidate.partyId === undefined
    && keys.length === 2
    && keys.includes('postType')
    && keys.includes('diaryId')
  ) {
    return { diaryId: candidate.diaryId };
  }
  if (
    candidate.postType === 'RECRUITMENT'
    && candidate.diaryId === undefined
    && isPositiveLinkedId(candidate.partyId)
    && keys.length === 2
    && keys.includes('postType')
    && keys.includes('partyId')
  ) {
    return { partyId: candidate.partyId };
  }
  return null;
};

export interface LinkedComposerRouteLoadOptions {
  requested: boolean;
  target: LinkedPostTarget | null;
  lookup: (params: LinkedPostLookupParams) => Promise<LinkedPostLookup>;
  onLoadingChange: (isLoading: boolean) => void;
  onExistingPost: (postId: number) => void;
  onNewPreview: (preview: LinkedContent) => void;
  onInvalidTarget: () => void;
  onError: (error: unknown) => void;
}

export interface LinkedComposerRouteLoader {
  load(options: LinkedComposerRouteLoadOptions): Promise<void>;
  invalidate(): void;
}

export const createLinkedComposerRouteLoader = (): LinkedComposerRouteLoader => {
  let handledKey: string | null = null;
  let activeRequest = 0;
  let activeLoad: {
    requestKey: string;
    requestId: number;
    options: LinkedComposerRouteLoadOptions;
    promise: Promise<void>;
  } | null = null;

  const invalidate = () => {
    handledKey = null;
    activeRequest += 1;
    activeLoad = null;
  };

  return {
    invalidate,
    load(options): Promise<void> {
      const { requested, target } = options;
      if (!requested) {
        invalidate();
        return Promise.resolve();
      }

      const params = toLinkedLookupParams(target);
      const requestKey = params
        ? ('diaryId' in params ? `CHECKIN:${params.diaryId}` : `RECRUITMENT:${params.partyId}`)
        : 'INVALID';
      if (handledKey === requestKey) {
        if (activeLoad?.requestKey === requestKey) activeLoad.options = options;
        return activeLoad?.promise ?? Promise.resolve();
      }
      handledKey = requestKey;
      const requestId = ++activeRequest;

      if (!params || !target) {
        options.onInvalidTarget();
        return Promise.resolve();
      }

      const load = {
        requestKey,
        requestId,
        options,
        promise: Promise.resolve(),
      };
      activeLoad = load;
      options.onLoadingChange(true);
      load.promise = (async () => {
        try {
          const result = await options.lookup(params);
          if (requestId !== activeRequest || activeLoad !== load) return;
          if (result.postId !== null && result.postId !== undefined) {
            if (!isPositiveLinkedId(result.postId)) {
              throw new Error('INVALID_LINKED_POST_ID');
            }
            load.options.onExistingPost(result.postId);
            return;
          }
          if (!result.preview || result.preview.kind !== target.postType) {
            throw new Error('INVALID_LINKED_POST_PREVIEW');
          }
          load.options.onNewPreview(result.preview);
        } catch (error) {
          if (requestId === activeRequest && activeLoad === load) load.options.onError(error);
        } finally {
          if (requestId === activeRequest && activeLoad === load) {
            load.options.onLoadingChange(false);
            activeLoad = null;
          }
        }
      })();
      return load.promise;
    },
  };
};
