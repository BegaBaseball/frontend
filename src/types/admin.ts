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

export interface AdminGameStatusMismatch {
  gameId: string;
  gameDate: string;
  startTime: string | null;
  rawStatus: string | null;
  normalizedRawStatus: string | null;
  effectiveStatus: string;
  homeScore: number | null;
  awayScore: number | null;
  inningScoreCount: number;
  hasKnownScore: boolean;
  hasInningScores: boolean;
  reasons: string[];
}

export interface AdminGameScoreSyncResult {
  gameId: string;
  homeScore: number | null;
  awayScore: number | null;
  gameStatus: string;
  inningScoreCount: number;
  synced: boolean;
  usedInningScores: boolean;
  winningTeam: string | null;
  winningScore: number | null;
}

export interface AdminGameStatusMismatchBatchResult {
  startDate: string;
  endDate: string;
  totalGames: number;
  mismatchCount: number;
  mismatches: AdminGameStatusMismatch[];
}

export interface AdminGameStatusRepairBatchResult {
  startDate: string;
  endDate: string;
  dryRun: boolean;
  totalGames: number;
  mismatchCount: number;
  repairedCount: number;
  mismatches: AdminGameStatusMismatch[];
  repairedGames: AdminGameScoreSyncResult[];
}

export interface AdminClientErrorDashboardTotals {
  api: number;
  runtime: number;
  feedback: number;
  uniqueFingerprints: number;
  affectedRoutes: number;
}

export interface AdminClientErrorTimeSeriesPoint {
  bucketStart: string;
  api: number;
  runtime: number;
  feedback: number;
}

export interface AdminClientErrorRecentFeedback {
  eventId: string;
  route: string;
  actionTaken: string;
  comment: string;
  occurredAt: string;
}

export interface AdminClientErrorAlertNotification {
  id: number;
  fingerprint: string;
  bucket: 'api' | 'runtime' | 'feedback';
  source: 'api' | 'runtime' | 'unhandled_rejection' | 'unknown';
  channel: 'telegram' | 'slack';
  route: string;
  statusGroup: string;
  observedCount: number;
  thresholdCount: number;
  windowMinutes: number;
  latestEventId: string | null;
  latestMessage: string | null;
  latestOccurredAt: string | null;
  notifiedAt: string;
  deliveryStatus: 'SENT' | 'FAILED';
  failureReason: string | null;
}

export interface AdminClientErrorTopFingerprint {
  fingerprint: string;
  bucket: 'api' | 'runtime' | 'feedback';
  source: 'api' | 'runtime' | 'unhandled_rejection' | 'unknown';
  message: string;
  route: string;
  endpoint: string | null;
  statusGroup: string;
  method: string | null;
  count: number;
  uniqueSessions: number;
  latestEventId: string;
  latestOccurredAt: string;
  latestAlertSentAt: string | null;
  latestAlertChannel: 'telegram' | 'slack' | null;
}

export interface AdminClientErrorEventSummary {
  eventId: string;
  bucket: 'api' | 'runtime' | 'feedback';
  source: 'api' | 'runtime' | 'unhandled_rejection' | 'unknown';
  message: string;
  statusCode: number | null;
  statusGroup: string;
  responseCode: string | null;
  route: string;
  normalizedRoute: string;
  method: string | null;
  endpoint: string | null;
  normalizedEndpoint: string | null;
  fingerprint: string;
  occurredAt: string;
  sessionId: string | null;
  userId: number | null;
  feedbackCount: number;
}

export interface AdminClientErrorEventDetail {
  event: AdminClientErrorEventSummary;
  stack: string | null;
  componentStack: string | null;
  feedback: AdminClientErrorRecentFeedback[];
  sameFingerprintRecentEvents: AdminClientErrorEventSummary[];
}

export interface AdminClientErrorEventPage {
  content: AdminClientErrorEventSummary[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
  first?: boolean;
  empty?: boolean;
  numberOfElements?: number;
}

export interface AdminClientErrorDashboard {
  from: string;
  to: string;
  granularity: 'hour' | 'day';
  totals: AdminClientErrorDashboardTotals;
  timeSeries: AdminClientErrorTimeSeriesPoint[];
  topFingerprints: AdminClientErrorTopFingerprint[];
  recentFeedback: AdminClientErrorRecentFeedback[];
  recentAlerts: AdminClientErrorAlertNotification[];
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

export type AdminCoachAutoBriefOpsWindow = 'today' | 'tomorrow' | 'custom';

export interface AdminCoachAutoBriefOpsSummary {
  loaded_target_count: number;
  selected_target_count: number;
  generated_success_count: number;
  cache_hit_count: number;
  in_progress_count: number;
  failed_count: number;
  unresolved_count: number;
  completed_count: number;
  cache_state_breakdown: Record<string, number>;
  data_quality_breakdown: Record<string, number>;
}

export interface AdminCoachAutoBriefOpsGateThresholds {
  max_unresolved: number;
  max_failed_locked: number;
  max_pending_wait?: number | null;
  max_insufficient_ratio?: number | null;
  min_selected_targets: number;
  fail_on_missing_report: boolean;
}

export interface AdminCoachAutoBriefOpsGateChecks {
  failed: string[];
  warnings: string[];
}

export interface AdminCoachAutoBriefOpsGate {
  verdict: 'PASS' | 'WARN' | 'FAIL';
  thresholds: AdminCoachAutoBriefOpsGateThresholds;
  failed_locked_count: number;
  pending_wait_count: number;
  insufficient_count: number;
  insufficient_ratio: number;
  checks: AdminCoachAutoBriefOpsGateChecks;
}

export interface AdminCoachAutoBriefOpsLatestReport {
  path: string;
  run_started_at?: string | null;
  run_finished_at?: string | null;
  date_window?: string | null;
  unresolved_count: number;
  completed_count: number;
  cache_state_breakdown: Record<string, number>;
  data_quality_breakdown: Record<string, number>;
}

export interface AdminCoachAutoBriefOpsTargetSample {
  game_id: string;
  game_date: string;
  away_team_id: string;
  home_team_id: string;
  stage_label: string;
  game_status_bucket: string;
  cache_key: string;
  cache_state: string;
  data_quality: string;
  headline?: string | null;
  reason?: string | null;
}

export interface AdminCoachAutoBriefOpsHealth {
  window: AdminCoachAutoBriefOpsWindow;
  date_window: string;
  generated_at_utc: string;
  runbook_path: string;
  recommended_command: string;
  summary: AdminCoachAutoBriefOpsSummary;
  gate: AdminCoachAutoBriefOpsGate;
  unresolved_targets: AdminCoachAutoBriefOpsTargetSample[];
  latest_report?: AdminCoachAutoBriefOpsLatestReport | null;
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
