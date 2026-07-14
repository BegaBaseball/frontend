import type { DiaryEntry } from '../../types/diary';
import type { PartyStatus } from '../../types/mate';

export const canShareDiaryToCheer = (
  diary: Pick<DiaryEntry, 'type' | 'ticketVerified'>,
) => diary.type === 'attended' && diary.ticketVerified === true;

export const canSharePartyToCheer = (
  input: { isHost: boolean; status: PartyStatus },
) => input.isHost && input.status === 'PENDING';

interface MateShareActionsInput {
  isHost: boolean;
  status: PartyStatus;
  onShare: () => void;
  onShareToCheer: () => void;
}

interface MateShareAction {
  label: string;
  onClick: () => void;
}

export const buildMateShareActions = ({
  isHost,
  status,
  onShare,
  onShareToCheer,
}: MateShareActionsInput): {
  friend: MateShareAction;
  cheer: MateShareAction | null;
} => ({
  friend: {
    label: '친구에게 공유',
    onClick: onShare,
  },
  cheer: canSharePartyToCheer({ isHost, status })
    ? {
        label: '응원석에 공유',
        onClick: onShareToCheer,
      }
    : null,
});

type LinkedEntryTarget =
  | { kind: 'diary'; id: unknown }
  | { kind: 'party'; id: unknown };

type LinkedPostLookupParams =
  | { diaryId: number; partyId?: never }
  | { diaryId?: never; partyId: number };

interface LinkedPostLookupResult {
  postId?: number | null;
}

interface CheerLinkedEntryActionInput {
  target: LinkedEntryTarget;
  lookup: (params: LinkedPostLookupParams) => Promise<LinkedPostLookupResult>;
  navigate: (path: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: unknown) => void;
}

export interface CheerLinkedEntryAction {
  run(input: CheerLinkedEntryActionInput): Promise<void>;
  invalidate(): void;
}

const isPositiveId = (value: unknown): value is number => (
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

const resolveTarget = (target: LinkedEntryTarget): {
  lookupParams: LinkedPostLookupParams;
  writePath: string;
} | null => {
  if (!isPositiveId(target.id)) return null;
  if (target.kind === 'diary') {
    return {
      lookupParams: { diaryId: target.id },
      writePath: `/cheer/write?postType=CHECKIN&diaryId=${target.id}`,
    };
  }
  return {
    lookupParams: { partyId: target.id },
    writePath: `/cheer/write?postType=RECRUITMENT&partyId=${target.id}`,
  };
};

export const createCheerLinkedEntryAction = (): CheerLinkedEntryAction => {
  let activePromise: Promise<void> | null = null;
  let activeGeneration = 0;

  return {
    invalidate() {
      activeGeneration += 1;
      activePromise = null;
    },
    run(input) {
      if (activePromise) return activePromise;

      const target = resolveTarget(input.target);
      if (!target) {
        input.onError(new Error('INVALID_LINKED_CHEER_ENTRY_ID'));
        return Promise.resolve();
      }

      input.onLoadingChange(true);
      const requestGeneration = ++activeGeneration;
      let nextPromise!: Promise<void>;
      nextPromise = Promise.resolve()
        .then(async () => {
          const result = await input.lookup(target.lookupParams);
          if (requestGeneration !== activeGeneration) return;
          if (result.postId !== null && result.postId !== undefined) {
            if (!isPositiveId(result.postId)) {
              throw new Error('INVALID_LINKED_POST_ID');
            }
            input.navigate(`/cheer/${result.postId}`);
            return;
          }
          input.navigate(target.writePath);
        })
        .catch((error: unknown) => {
          if (requestGeneration === activeGeneration) input.onError(error);
        })
        .finally(() => {
          if (activePromise === nextPromise && requestGeneration === activeGeneration) {
            activePromise = null;
            input.onLoadingChange(false);
          }
        });
      activePromise = nextPromise;
      return nextPromise;
    },
  };
};
