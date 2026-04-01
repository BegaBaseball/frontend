import type { Application, Party } from '../types/mate';

export type InvalidateMatePartyQueriesOptions = {
  includeParty?: boolean;
  includeApplications?: boolean;
  includeMyApplications?: boolean;
  includeCheckIns?: boolean;
  includeMessages?: boolean;
  includeReviews?: boolean;
  includeCollections?: boolean;
  userId?: number | null;
};

export type MatePartyCollectionsUpdateOptions = {
  includeParty?: boolean;
  includePartyLists?: boolean;
  includeMyParties?: boolean;
};

export type MatePartyCollectionsRemoveOptions = {
  includePartyLists?: boolean;
  includeMyParties?: boolean;
};

export type MatePartyUpdater = (party: Party) => Party | null;

export type MatePartyApplicationsUpdater = (applications: Application[]) => Application[];

export type MatePartyApplicationUpdater = (application: Application) => Application | null;
