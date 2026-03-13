// types/admin.ts
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  favoriteTeam: string | null;
  createdAt: string;
  postCount: number;
  role: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalMates: number;
}

export interface AdminPost {
  id: number;
  team: string;
  content: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  views: number;
  isHot: boolean;
}

export interface AdminMate {
  id: number;
  teamId: string;
  title: string;
  stadium: string;
  gameDate: string;
  currentMembers: number;
  maxMembers: number;
  status: string;
  createdAt: string;
  hostName: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
}

export interface AdminReport {
  id: number;
  postId: number | null;
  postPreview: string | null;
  reporterId: number | null;
  reporterHandle: string | null;
  reason: string | null;
  description: string | null;
  status: string | null;
  adminAction: string | null;
  adminMemo: string | null;
  handledBy: number | null;
  handledAt: string | null;
  evidenceUrl: string | null;
  requestedAction: string | null;
  appealStatus: string | null;
  appealReason: string | null;
  appealCount: number | null;
  createdAt: string;
}

export interface AdminReportPage {
  content: AdminReport[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
}

export interface AdminReportFilters {
  status: string;
  reason: string;
  fromDate: string;
  toDate: string;
}

export interface AdminSeatView {
  id: number;
  diaryId: number;
  userId: number;
  photoUrl: string;
  storagePath: string;
  sourceType: string;
  aiSuggestedLabel: string | null;
  aiConfidence: number | null;
  aiReason: string | null;
  userSelected: boolean;
  moderationStatus: string | null;
  adminLabel: string | null;
  adminMemo: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  rewardGranted: boolean;
  stadium: string;
  section: string | null;
  block: string | null;
  seatRow: string | null;
  seatNumber: string | null;
  diaryDate: string | null;
  ticketVerified: boolean;
  ticketVerifiedAt: string | null;
}

export interface AdminSeatViewFilters {
  moderationStatus: string;
  stadium: string;
  aiSuggestedLabel: string;
  adminLabel: string;
  ticketVerified: string;
}

export interface AdminApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AdminOffseasonMovement {
  id: number;
  movementDate: string;
  section: string;
  teamCode: string;
  playerName: string;
  summary?: string | null;
  details?: string | null;
  contractTerm?: string | null;
  contractValue?: string | null;
  optionDetails?: string | null;
  counterpartyTeam?: string | null;
  counterpartyDetails?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  announcedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminOffseasonMovementPayload {
  movementDate: string;
  section: string;
  teamCode: string;
  playerName: string;
  summary?: string;
  details?: string;
  contractTerm?: string;
  contractValue?: string;
  optionDetails?: string;
  counterpartyTeam?: string;
  counterpartyDetails?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  announcedAt?: string;
}

export interface ReleaseDecisionPreset {
  scenario: string;
  task_prompt: string;
  seed_paths: string[];
  allowed_roots: string[];
}

export interface ReleaseDecisionEvidenceItem {
  claim: string;
  source: string;
  excerpt: string;
}

export interface ReleaseDecisionToolTraceItem {
  tool_name: string;
  arguments: Record<string, unknown>;
  result_preview: string;
}

export interface ReleaseDecisionDraft {
  title: string;
  decision: 'GO' | 'NO_GO' | 'PENDING';
  summary: string;
  blockers: string[];
  risks: string[];
  next_actions: string[];
  evidence: ReleaseDecisionEvidenceItem[];
  confidence: 'low' | 'medium' | 'high';
}

export interface ReleaseDecisionRunResult {
  scenario: string;
  model: string;
  task_prompt: string;
  seed_paths: string[];
  generated_at_utc: string;
  response_id?: string | null;
  raw_response_text: string;
  draft: ReleaseDecisionDraft;
  tool_trace: ReleaseDecisionToolTraceItem[];
}

export interface ReleaseDecisionDraftResponse {
  result: ReleaseDecisionRunResult;
  markdown: string;
}

export interface ReleaseDecisionEvalCase {
  case_id: string;
  scenario: string;
  expected_decision: 'GO' | 'NO_GO' | 'PENDING';
  required_keywords: string[];
  required_sources: string[];
}

export interface ReleaseDecisionEvalResult {
  case_id: string;
  status: 'PASS' | 'FAIL';
  decision_ok: boolean;
  keyword_hits: Record<string, boolean>;
  source_hits: Record<string, boolean>;
  missing_keywords: string[];
  missing_sources: string[];
}

export interface ReleaseDecisionEvaluateResponse {
  case: ReleaseDecisionEvalCase;
  evaluation: ReleaseDecisionEvalResult;
}

export interface ReleaseDecisionArtifactSummary {
  artifact_id: string;
  scenario: string;
  decision: 'GO' | 'NO_GO' | 'PENDING';
  eval_status?: 'PASS' | 'FAIL' | null;
  saved_at_utc: string;
  markdown_filename: string;
  json_filename: string;
}

export interface ReleaseDecisionArtifactRecord {
  artifact_id: string;
  saved_at_utc: string;
  scenario: string;
  task_prompt?: string | null;
  seed_paths: string[];
  allowed_roots: string[];
  draft_response: ReleaseDecisionRunResult;
  markdown: string;
  evaluation?: ReleaseDecisionEvaluateResponse | null;
}
