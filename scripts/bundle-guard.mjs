import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_BUDGET_GRACE_BYTES,
  DEFAULT_BUDGET_GRACE_RATIO,
  getBudgetGraceLimitBytes,
  getBudgetMissingStatus,
  getBudgetOverageBytes,
  isBudgetWithinLimit,
} from './lib/bundle-budget-policy.mjs';
import { detectReactDevArtifacts } from './lib/react-dev-artifact-policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const clientAssetsDir = path.join(distDir, 'assets');
const workerDistDir = path.join(distDir, 'begabaseball_frontend');
const workerAssetsDir = path.join(workerDistDir, 'assets');
const clientManifestPath = path.join(distDir, '.vite', 'client-manifest.json');
const defaultReportPath = path.join(projectRoot, 'reports', 'bundle-guard-report.json');

const args = process.argv.slice(2);
let reportPath = defaultReportPath;

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--report') {
    reportPath = path.resolve(projectRoot, args[index + 1] || '');
    index += 1;
  }
}

if (!fs.existsSync(clientAssetsDir)) {
  console.error('[bundle-guard] dist/assets directory not found. Run build first.');
  process.exit(1);
}

const listFiles = (directory) => {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory)
    .filter((name) => fs.statSync(path.join(directory, name)).isFile())
    .sort();
};

const findMatchingFile = (directory, filePattern) =>
  listFiles(directory).find((file) => filePattern.test(file)) ?? null;

const clientFiles = listFiles(clientAssetsDir);
const workerFiles = listFiles(workerAssetsDir);
const clientManifest = fs.existsSync(clientManifestPath)
  ? JSON.parse(fs.readFileSync(clientManifestPath, 'utf-8'))
  : null;

const forbiddenChunkPrefixes = [
  'vendor-calendar-',
  'vendor-charts-',
  'vendor-dnd-',
  'vendor-emoji-',
  'vendor-form-',
  'vendor-markdown-',
  'vendor-motion-',
  'vendor-network-',
  'vendor-qr-',
  'vendor-state-',
  'vendor-styles-',
  'vendor-theme-',
  'vendor-toast-',
  'vendor-ui-',
  'vendor-upload-',
  'axios-',
];

const sizeBudgets = [
  { label: 'global CSS', directory: clientAssetsDir, filePattern: /^index-.*\.css$/, maxBytes: 255_500 },
  { label: 'vendor-react-core', directory: clientAssetsDir, filePattern: /^vendor-react-core-.*\.js$/, maxBytes: 345_000 },
  { label: 'vendor-router', directory: clientAssetsDir, filePattern: /^vendor-router-.*\.js$/, maxBytes: 50_000 },
  { label: 'vendor-zustand', directory: clientAssetsDir, filePattern: /^vendor-zustand-.*\.js$/, maxBytes: 8_000, optionalMissing: true },
  { label: 'vendor-query', directory: clientAssetsDir, filePattern: /^vendor-query-.*\.js$/, maxBytes: 60_000 },
  { label: 'vendor-realtime', directory: clientAssetsDir, filePattern: /^vendor-realtime-.*\.js$/, maxBytes: 30_000 },
  { label: 'vendor-virtual', directory: clientAssetsDir, filePattern: /^vendor-virtual-.*\.js$/, maxBytes: 20_000 },
  { label: 'Prediction route', directory: clientAssetsDir, filePattern: /^Prediction-.*\.js$/, maxBytes: 105_000 },
  { label: 'RankingPrediction route', directory: clientAssetsDir, filePattern: /^RankingPrediction-.*\.js$/, maxBytes: 19_000 },
  { label: 'PredictionMatchInteractive shell', directory: clientAssetsDir, filePattern: /^PredictionMatchInteractiveRuntime-.*\.js$/, maxBytes: 7_000 },
  { label: 'PredictionMatchInteractive data runtime', directory: clientAssetsDir, filePattern: /^PredictionMatchInteractiveDataRuntime-.*\.js$/, maxBytes: 56_000 },
  { label: 'PredictionMatchInteractive view shell', directory: clientAssetsDir, filePattern: /^PredictionMatchInteractiveView-.*\.js$/, maxBytes: 8_000 },
  { label: 'PredictionMatchInteractive content runtime', directory: clientAssetsDir, filePattern: /^PredictionMatchInteractiveContentRuntime-.*\.js$/, maxBytes: 20_000 },
  { label: 'PredictionMatchVoteController shell', directory: clientAssetsDir, filePattern: /^PredictionMatchVoteController-.*\.js$/, maxBytes: 4_000 },
  { label: 'PredictionMatchVoteController runtime', directory: clientAssetsDir, filePattern: /^PredictionMatchVoteControllerRuntime-.*\.js$/, maxBytes: 20_000 },
  { label: 'PredictionMatchTab route', directory: clientAssetsDir, filePattern: /^PredictionMatchTab-.*\.js$/, maxBytes: 13_000 },
  { label: 'PredictionMatchDetailPanel route', directory: clientAssetsDir, filePattern: /^PredictionMatchDetailPanel-.*\.js$/, maxBytes: 11_000 },
  { label: 'AdvancedMatchCard shell', directory: clientAssetsDir, filePattern: /^AdvancedMatchCard-.*\.js$/, maxBytes: 24_000 },
  { label: 'AdvancedMatchCard content runtime', directory: clientAssetsDir, filePattern: /^AdvancedMatchCardContentRuntime-.*\.js$/, maxBytes: 45_000 },
  { label: 'PredictionStatsPanel route', directory: clientAssetsDir, filePattern: /^PredictionStatsPanel-.*\.js$/, maxBytes: 13_000 },
  { label: 'Home route', directory: clientAssetsDir, filePattern: /^Home-.*\.js$/, maxBytes: 47_000 },
  { label: 'LeaderboardPage route', directory: clientAssetsDir, filePattern: /^LeaderboardPage-.*\.js$/, maxBytes: 35_000 },
  { label: 'OffSeasonHome page shell', directory: clientAssetsDir, filePattern: /^OffSeasonHomePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'OffSeasonList page shell', directory: clientAssetsDir, filePattern: /^OffSeasonListPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'OffSeasonHome runtime', directory: clientAssetsDir, filePattern: /^OffSeasonHome-.*\.js$/, maxBytes: 8_000 },
  { label: 'OffSeasonHome primary runtime', directory: clientAssetsDir, filePattern: /^OffSeasonHomePrimaryRuntime-.*\.js$/, maxBytes: 20_000 },
  { label: 'OffSeasonHome highlights runtime', directory: clientAssetsDir, filePattern: /^OffSeasonHomeHighlightsRuntime-.*\.js$/, maxBytes: 47_000 },
  { label: 'StadiumGuide route', directory: clientAssetsDir, filePattern: /^StadiumGuide-.*\.js$/, maxBytes: 26_000 },
  { label: 'AuthenticatedStadiumFavoriteToggle route', directory: clientAssetsDir, filePattern: /^AuthenticatedStadiumFavoriteToggle-.*\.js$/, maxBytes: 4_000 },
  { label: 'AccountDeletionRecovery route', directory: clientAssetsDir, filePattern: /^AccountDeletionRecovery-.*\.js$/, maxBytes: 10_000 },
  { label: 'Login route', directory: clientAssetsDir, filePattern: /^Login-.*\.js$/, maxBytes: 19_000 },
  { label: 'SignUp route', directory: clientAssetsDir, filePattern: /^SignUp-.*\.js$/, maxBytes: 23_000 },
  { label: 'PasswordReset route', directory: clientAssetsDir, filePattern: /^PasswordReset-.*\.js$/, maxBytes: 9000 },
  { label: 'PasswordResetConfirm route', directory: clientAssetsDir, filePattern: /^PasswordResetConfirm-.*\.js$/, maxBytes: 15_000 },
  { label: 'OAuthCallback route', directory: clientAssetsDir, filePattern: /^OAuthCallback-.*\.js$/, maxBytes: 4_000 },
  { label: 'NoticePage route', directory: clientAssetsDir, filePattern: /^NoticePage-.*\.js$/, maxBytes: 9_000 },
  { label: 'MyPage page shell', directory: clientAssetsDir, filePattern: /^MyPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MyPage runtime', directory: clientAssetsDir, filePattern: /^MyPageRuntime-.*\.js$/, maxBytes: 19_000 },
  { label: 'MyPage sidebar runtime', directory: clientAssetsDir, filePattern: /^MyPageSidebarRuntime-.*\.js$/, maxBytes: 12_000, optionalMissing: true },
  { label: 'MyPage view runtime', directory: clientAssetsDir, filePattern: /^MyPageViewRuntime-.*\.js$/, maxBytes: 7_000 },
  { label: 'MyPage season log runtime', directory: clientAssetsDir, filePattern: /^MyPageSeasonLogRuntime-.*\.js$/, maxBytes: 22_000, optionalMissing: true },
  { label: 'MyPage settings home runtime', directory: clientAssetsDir, filePattern: /^MyPageSettingsHomeRuntime-.*\.js$/, maxBytes: 8_000, optionalMissing: true },
  { label: 'UserProfile page shell', directory: clientAssetsDir, filePattern: /^UserProfilePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'UserProfile runtime', directory: clientAssetsDir, filePattern: /^UserProfile-.*\.js$/, maxBytes: 29_000 },
  { label: 'UserProfileModal route', directory: clientAssetsDir, filePattern: /^UserProfileModal-.*\.js$/, maxBytes: 14_000 },
  { label: 'UserListModal route', directory: clientAssetsDir, filePattern: /^UserListModal-.*\.js$/, maxBytes: 12_000 },
  { label: 'ProfileEditSection shell', directory: clientAssetsDir, filePattern: /^ProfileEditSection-.*\.js$/, maxBytes: 5_000 },
  { label: 'ProfileEditSection runtime', directory: clientAssetsDir, filePattern: /^ProfileEditSectionRuntime-.*\.js$/, maxBytes: 27_000 },
  { label: 'ProfileEdit profile runtime', directory: clientAssetsDir, filePattern: /^ProfileEditProfileRuntime-.*\.js$/, maxBytes: 26_000 },
  { label: 'Diaryform shell', directory: clientAssetsDir, filePattern: /^Diaryform-.*\.js$/, maxBytes: 4_500 },
  { label: 'Diaryform runtime', directory: clientAssetsDir, filePattern: /^DiaryformRuntime-.*\.js$/, maxBytes: 36_000 },
  { label: 'DiaryEditMode runtime', directory: clientAssetsDir, filePattern: /^DiaryEditModeRuntime-.*\.js$/, maxBytes: 28_000 },
  { label: 'AccountSettingsSection route', directory: clientAssetsDir, filePattern: /^AccountSettingsSection-.*\.js$/, maxBytes: 16_000 },
  { label: 'AccountSettings security runtime', directory: clientAssetsDir, filePattern: /^AccountSettingsSecurityRuntime-.*\.js$/, maxBytes: 23_000 },
  { label: 'AccountSettings advanced runtime', directory: clientAssetsDir, filePattern: /^AccountSettingsAdvancedRuntime-.*\.js$/, maxBytes: 24_000 },
  { label: 'Mate page shell', directory: clientAssetsDir, filePattern: /^MatePage-.*\.js$/, maxBytes: 7000 },
  { label: 'Mate runtime', directory: clientAssetsDir, filePattern: /^Mate-.*\.js$/, maxBytes: 25_000 },
  { label: 'Mate results runtime', directory: clientAssetsDir, filePattern: /^MateResultsRuntime-.*\.js$/, maxBytes: 19_000 },
  { label: 'Mate guide runtime', directory: clientAssetsDir, filePattern: /^MateGuidePanelRuntime-.*\.js$/, maxBytes: 4_000 },
  { label: 'MateCreate page shell', directory: clientAssetsDir, filePattern: /^MateCreatePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateCreate runtime', directory: clientAssetsDir, filePattern: /^MateCreate-.*\.js$/, maxBytes: 35_000 },
  { label: 'MateCreate ticket step', directory: clientAssetsDir, filePattern: /^MateCreateTicketStep-.*\.js$/, maxBytes: 12_000 },
  { label: 'MateCreate match step', directory: clientAssetsDir, filePattern: /^MateCreateMatchStep-.*\.js$/, maxBytes: 15_000 },
  { label: 'MateCreate seat step', directory: clientAssetsDir, filePattern: /^MateCreateSeatStep-.*\.js$/, maxBytes: 18_000 },
  { label: 'MateCreate description step', directory: clientAssetsDir, filePattern: /^MateCreateDescriptionStep-.*\.js$/, maxBytes: 6000 },
  { label: 'MateCreate confirm dialog', directory: clientAssetsDir, filePattern: /^MateCreateConfirmDialog-.*\.js$/, maxBytes: 13_000 },
  { label: 'MateApply page shell', directory: clientAssetsDir, filePattern: /^MateApplyPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateApply runtime', directory: clientAssetsDir, filePattern: /^MateApply-.*\.js$/, maxBytes: 31_000 },
  { label: 'MateDetailRuntime route', directory: clientAssetsDir, filePattern: /^MateDetailRuntime-.*\.js$/, maxBytes: 35_000 },
  { label: 'MateDetail info sections', directory: clientAssetsDir, filePattern: /^MateDetailInfoSections-.*\.js$/, maxBytes: 8_300 },
  { label: 'MateDetail action section', directory: clientAssetsDir, filePattern: /^MateDetailActionSection-.*\.js$/, maxBytes: 14_000 },
  { label: 'MateDetail reviews section', directory: clientAssetsDir, filePattern: /^MateDetailReviewsSection-.*\.js$/, maxBytes: 6000 },
  { label: 'MateDetail QR runtime', directory: clientAssetsDir, filePattern: /^MateDetailQrRuntime-.*\.js$/, maxBytes: 22_000 },
  { label: 'MateManage page shell', directory: clientAssetsDir, filePattern: /^MateManagePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateManage runtime', directory: clientAssetsDir, filePattern: /^MateManage-.*\.js$/, maxBytes: 18_000 },
  { label: 'MateManage overview runtime', directory: clientAssetsDir, filePattern: /^MateManageOverviewRuntime-.*\.js$/, maxBytes: 20_000 },
  { label: 'MateManage content runtime', directory: clientAssetsDir, filePattern: /^MateManageContentRuntime-.*\.js$/, maxBytes: 27_000 },
  { label: 'MateChat page shell', directory: clientAssetsDir, filePattern: /^MateChatPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateChat runtime', directory: clientAssetsDir, filePattern: /^MateChat-.*\.js$/, maxBytes: 16_000 },
  { label: 'MateChat view runtime', directory: clientAssetsDir, filePattern: /^MateChatViewRuntime-.*\.js$/, maxBytes: 21_000 },
  { label: 'MateChat composer panel', directory: clientAssetsDir, filePattern: /^MateChatComposerPanel-.*\.js$/, maxBytes: 7000 },
  { label: 'MateCheckIn page shell', directory: clientAssetsDir, filePattern: /^MateCheckInPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateCheckIn runtime', directory: clientAssetsDir, filePattern: /^MateCheckIn-.*\.js$/, maxBytes: 16_000 },
  { label: 'MateCheckIn content runtime', directory: clientAssetsDir, filePattern: /^MateCheckInContentRuntime-.*\.js$/, maxBytes: 20_000 },
  { label: 'MateCheckIn roster runtime', directory: clientAssetsDir, filePattern: /^MateCheckInRosterRuntime-.*\.js$/, maxBytes: 14_000 },
  { label: 'MateCheckIn action runtime', directory: clientAssetsDir, filePattern: /^MateCheckInActionRuntime-.*\.js$/, maxBytes: 14_000 },
  { label: 'MateCheckIn status runtime', directory: clientAssetsDir, filePattern: /^MateCheckInStatusRuntime-.*\.js$/, maxBytes: 18_000 },
  { label: 'ReviewDialog route', directory: clientAssetsDir, filePattern: /^ReviewDialog-.*\.js$/, maxBytes: 8000 },
  { label: 'TicketUploadModal route', directory: clientAssetsDir, filePattern: /^TicketUploadModal-.*\.js$/, maxBytes: 15_000 },
  { label: 'CheerRuntime route', directory: clientAssetsDir, filePattern: /^CheerRuntime-.*\.js$/, maxBytes: 24_000 },
  { label: 'Cheer composer runtime', directory: clientAssetsDir, filePattern: /^CheerComposerRuntime-.*\.js$/, maxBytes: 18_000 },
  { label: 'Cheer feed runtime', directory: clientAssetsDir, filePattern: /^CheerFeedRuntimeContent-.*\.js$/, maxBytes: 20_000 },
  { label: 'CheerDetail page shell', directory: clientAssetsDir, filePattern: /^CheerDetailPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'CheerDetail runtime', directory: clientAssetsDir, filePattern: /^CheerDetail-.*\.js$/, maxBytes: 14_000 },
  { label: 'CheerDetail content runtime', directory: clientAssetsDir, filePattern: /^CheerDetailContent-.*\.js$/, maxBytes: 18_000 },
  { label: 'CheerDetail article runtime', directory: clientAssetsDir, filePattern: /^CheerDetailArticleRuntime-.*\.js$/, maxBytes: 31_000 },
  { label: 'CheerCard route', directory: clientAssetsDir, filePattern: /^CheerCard-.*\.js$/, maxBytes: 30_000 },
  { label: 'CommentModal route', directory: clientAssetsDir, filePattern: /^CommentModal-.*\.js$/, maxBytes: 11_000 },
  { label: 'ReportModal route', directory: clientAssetsDir, filePattern: /^ReportModal-.*\.js$/, maxBytes: 10_000 },
  { label: 'QuoteRepostEditor route', directory: clientAssetsDir, filePattern: /^QuoteRepostEditor-.*\.js$/, maxBytes: 8000 },
  { label: 'CheerBookmarks page shell', directory: clientAssetsDir, filePattern: /^CheerBookmarksPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'CheerBookmarks runtime', directory: clientAssetsDir, filePattern: /^CheerBookmarks-.*\.js$/, maxBytes: 14_000 },
  { label: 'CheerEdit page shell', directory: clientAssetsDir, filePattern: /^CheerEditPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'CheerEdit runtime', directory: clientAssetsDir, filePattern: /^CheerEdit-.*\.js$/, maxBytes: 19_000 },
  { label: 'NotificationPanel route', directory: clientAssetsDir, filePattern: /^NotificationPanel-.*\.js$/, maxBytes: 31_000 },
  { label: 'CoachBriefing shell', directory: clientAssetsDir, filePattern: /^CoachBriefing-.*\.js$/, maxBytes: 18_300 },
  { label: 'CoachBriefing content runtime', directory: clientAssetsDir, filePattern: /^CoachBriefingContentRuntime-.*\.js$/, maxBytes: 8_000 },
  { label: 'CoachBriefing auto runtime', directory: clientAssetsDir, filePattern: /^CoachBriefingAutoRuntime-.*\.js$/, maxBytes: 12_000 },
  { label: 'CoachBriefing cache util', directory: clientAssetsDir, filePattern: /^coach-briefing-cache-.*\.js$/, maxBytes: 4_000 },
  { label: 'CoachAnalysisDialog shell', directory: clientAssetsDir, filePattern: /^CoachAnalysisDialog-.*\.js$/, maxBytes: 8000 },
  { label: 'CoachAnalysisDialog runtime', directory: clientAssetsDir, filePattern: /^CoachAnalysisDialogRuntime-.*\.js$/, maxBytes: 24_000 },
  { label: 'CoachAnalysisDialog result runtime', directory: clientAssetsDir, filePattern: /^CoachAnalysisDialogResultRuntime-.*\.js$/, maxBytes: 22_000 },
  { label: 'CoachAnalysisResultView (lazy)', directory: clientAssetsDir, filePattern: /^CoachAnalysisResultView-.*\.js$/, maxBytes: 85_000 },
  { label: 'CoachMarkdown (lazy on detail expand)', directory: clientAssetsDir, filePattern: /^CoachMarkdown-.*\.js$/, maxBytes: 210_000 },
  { label: 'FollowButton route', directory: clientAssetsDir, filePattern: /^FollowButton-.*\.js$/, maxBytes: 8000 },
  { label: 'BlockButton route', directory: clientAssetsDir, filePattern: /^BlockButton-.*\.js$/, maxBytes: 8000 },
  { label: 'BlockedUsersSection route', directory: clientAssetsDir, filePattern: /^BlockedUsersSection-.*\.js$/, maxBytes: 9000 },
  { label: 'RankingPredictionShare page shell', directory: clientAssetsDir, filePattern: /^RankingPredictionSharePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'RankingPredictionShare runtime', directory: clientAssetsDir, filePattern: /^RankingPredictionShare-.*\.js$/, maxBytes: 5_000 },
  { label: 'AdminPage page shell', directory: clientAssetsDir, filePattern: /^AdminPagePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'AdminPage shell', directory: clientAssetsDir, filePattern: /^AdminPage-.*\.js$/, maxBytes: 9000 },
  { label: 'AdminPage runtime', directory: clientAssetsDir, filePattern: /^AdminPageRuntimeContent-.*\.js$/, maxBytes: 21_000 },
  { label: 'AdminPage data runtime', directory: clientAssetsDir, filePattern: /^AdminPageDataRuntime-.*\.js$/, maxBytes: 23_000 },
  { label: 'Admin community runtime', directory: clientAssetsDir, filePattern: /^AdminCommunityRuntime-.*\.js$/, maxBytes: 8_000 },
  { label: 'Admin moderation runtime', directory: clientAssetsDir, filePattern: /^AdminModerationRuntime-.*\.js$/, maxBytes: 12_000 },
  { label: 'AdminStadiums runtime', directory: clientAssetsDir, filePattern: /^AdminStadiumsRuntime-.*\.js$/, maxBytes: 6_000 },
  { label: 'AdminAiOperations runtime', directory: clientAssetsDir, filePattern: /^AdminAiOperationsRuntime-.*\.js$/, maxBytes: 6_000 },
  { label: 'AdminAiOperations panel runtime', directory: clientAssetsDir, filePattern: /^AdminAiOperationsPanelRuntime-.*\.js$/, maxBytes: 4_000 },
  { label: 'AdminCoachAutoBriefOps panel runtime', directory: clientAssetsDir, filePattern: /^AdminCoachAutoBriefOpsPanelRuntime-.*\.js$/, maxBytes: 29_000 },
  { label: 'AdminAiReleaseDecision runtime', directory: clientAssetsDir, filePattern: /^AdminAiReleaseDecisionRuntime-.*\.js$/, maxBytes: 53_000 },
  { label: 'UsersAdminPanel route', directory: clientAssetsDir, filePattern: /^UsersAdminPanel-.*\.js$/, maxBytes: 16_000 },
  { label: 'PostsAdminPanel route', directory: clientAssetsDir, filePattern: /^PostsAdminPanel-.*\.js$/, maxBytes: 12_000 },
  { label: 'MatesAdminPanel route', directory: clientAssetsDir, filePattern: /^MatesAdminPanel-.*\.js$/, maxBytes: 11_000 },
  { label: 'AdminReportsPanel route', directory: clientAssetsDir, filePattern: /^AdminReportsPanel-.*\.js$/, maxBytes: 14_000 },
  { label: 'ClientErrorAdminPanel route', directory: clientAssetsDir, filePattern: /^ClientErrorAdminPanel-.*\.js$/, maxBytes: 40_000 },
  { label: 'ClientErrorAdmin insights runtime', directory: clientAssetsDir, filePattern: /^ClientErrorAdminInsightsRuntime-.*\.js$/, maxBytes: 12_000 },
  { label: 'ClientErrorAdmin detail runtime', directory: clientAssetsDir, filePattern: /^ClientErrorAdminDetailRuntime-.*\.js$/, maxBytes: 16_000 },
  { label: 'OffseasonMovementAdminPanel route', directory: clientAssetsDir, filePattern: /^OffseasonMovementAdminPanel-.*\.js$/, maxBytes: 18_000 },
  { label: 'OffseasonMovementAdminPanel content', directory: clientAssetsDir, filePattern: /^OffseasonMovementAdminPanelContent-.*\.js$/, maxBytes: 25_000 },
  { label: 'OffSeasonList runtime', directory: clientAssetsDir, filePattern: /^OffSeasonList-.*\.js$/, maxBytes: 37_000 },
  { label: 'OffseasonDesktopTable route', directory: clientAssetsDir, filePattern: /^OffseasonDesktopTable-.*\.js$/, maxBytes: 25_000 },
  { label: 'OffseasonMobileCards route', directory: clientAssetsDir, filePattern: /^OffseasonMobileCards-.*\.js$/, maxBytes: 12_000 },
  { label: 'OffseasonInsightsPanel route', directory: clientAssetsDir, filePattern: /^OffseasonInsightsPanel-.*\.js$/, maxBytes: 15_000 },
  { label: 'OffseasonMovementDetailPanel route', directory: clientAssetsDir, filePattern: /^OffseasonMovementDetailPanel-.*\.js$/, maxBytes: 20_000 },
  { label: 'ChatBot shell', directory: clientAssetsDir, filePattern: /^ChatBot-.*\.js$/, maxBytes: 5_000 },
  { label: 'ChatBot runtime', directory: clientAssetsDir, filePattern: /^ChatBotRuntime-.*\.js$/, maxBytes: 15_000 },
  { label: 'ChatBot authenticated panel', directory: clientAssetsDir, filePattern: /^ChatBotAuthenticatedPanel-.*\.js$/, maxBytes: 8_000 },
  { label: 'ChatBot session runtime', directory: clientAssetsDir, filePattern: /^ChatBotSessionRuntime-.*\.js$/, maxBytes: 6_000 },
  { label: 'ChatBot session state runtime', directory: clientAssetsDir, filePattern: /^ChatBotSessionStateRuntime-.*\.js$/, maxBytes: 37_000 },
  { label: 'ChatBot conversation runtime', directory: clientAssetsDir, filePattern: /^ChatBotConversationRuntime-.*\.js$/, maxBytes: 9_000 },
  { label: 'auth session chunk', directory: clientAssetsDir, filePattern: /^auth-.*\.js$/, maxBytes: 3_000 },
  { label: 'worker entry', directory: workerDistDir, filePattern: /^index\.js$/, maxBytes: 25_000 },
];

const routeDependencyGuards = [
  {
    label: 'Home direct deps',
    directory: clientAssetsDir,
    filePattern: /^Home-.*\.js$/,
    forbiddenSubstrings: ['./vendor-network-', './axios-'],
  },
  {
    label: 'Home secondary panels direct deps',
    directory: clientAssetsDir,
    filePattern: /^HomeSecondaryPanelsContainer-.*\.js$/,
    forbiddenSubstrings: ['./vendor-network-', './axios-'],
  },
  {
    label: 'OffSeasonHome page shell direct deps',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHomePage-.*\.js$/,
    forbiddenSubstrings: ['./vendor-query-', './vendor-network-', './axios-'],
  },
  {
    label: 'OffSeasonHome runtime direct deps',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHome-.*\.js$/,
    forbiddenSubstrings: ['./vendor-network-', './axios-'],
  },
  {
    label: 'OffSeasonHome primary runtime direct deps',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHomePrimaryRuntime-.*\.js$/,
    forbiddenSubstrings: ['./vendor-query-', './vendor-network-', './axios-'],
  },
  {
    label: 'OffSeasonHome highlights runtime direct deps',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHomeHighlightsRuntime-.*\.js$/,
    forbiddenSubstrings: ['./vendor-query-', './vendor-network-', './axios-'],
  },
  {
    label: 'OffSeasonList page shell direct deps',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonListPage-.*\.js$/,
    forbiddenSubstrings: ['./vendor-query-', './vendor-network-', './axios-'],
  },
  {
    label: 'RankingPredictionShare direct deps',
    directory: clientAssetsDir,
    filePattern: /^RankingPredictionShare-.*\.js$/,
    forbiddenSubstrings: ['./vendor-network-', './axios-'],
  },
];

const manifestImportGuards = [
  {
    label: 'Layout manifest avoids eager public navbar runtime',
    directory: clientAssetsDir,
    filePattern: /^Layout-.*\.js$/,
    forbiddenImportSubstrings: ['PublicNavbar-', 'PublicShellIcons-', 'vendor-query-', 'authStore-', 'useAuthBootstrapUiState-'],
  },
  {
    label: 'PublicNavbar manifest avoids eager query runtime',
    directory: clientAssetsDir,
    filePattern: /^PublicNavbar-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'queryClient-'],
  },
  {
    label: 'Home route manifest avoids public shell icons',
    directory: clientAssetsDir,
    filePattern: /^Home-.*\.js$/,
    forbiddenImportSubstrings: ['PublicShellIcons-'],
  },
  {
    label: 'Home route manifest avoids eager auth runtime',
    directory: clientAssetsDir,
    filePattern: /^Home-.*\.js$/,
    forbiddenImportSubstrings: ['authStore-', 'vendor-zustand-', 'loginRedirect-', 'queryClient-', 'vendor-query-', 'src/api/home.ts'],
  },
  {
    label: 'Home route manifest keeps deferred surfaces lazy',
    directory: clientAssetsDir,
    filePattern: /^Home-.*\.js$/,
    forbiddenImportSubstrings: [
      'AdSlot-',
      'HomeAuthBridge-',
      'HomeQueryProvider-',
      'HomeSecondaryPanelsContainer-',
      'HomeSecondaryPanels-',
      'src/components/ads/AdSlot.tsx',
      'src/components/home/HomeAuthBridge.tsx',
      'src/components/home/HomeQueryProvider.tsx',
      'src/components/home/HomeSecondaryPanelsContainer.tsx',
      'src/components/home/HomeSecondaryPanels.tsx',
    ],
  },
  {
    label: 'HomeMatchPanel manifest avoids public shell icons',
    directory: clientAssetsDir,
    filePattern: /^HomeMatchPanel-.*\.js$/,
    forbiddenImportSubstrings: ['PublicShellIcons-'],
  },
  {
    label: 'HomeMatchPanel manifest avoids eager team logo',
    directory: clientAssetsDir,
    filePattern: /^HomeMatchPanel-.*\.js$/,
    forbiddenImportSubstrings: ['src/components/TeamLogo.tsx', 'TeamLogo-'],
  },
  {
    label: 'AuthenticatedLayoutChrome manifest avoids eager realtime and toaster internals',
    directory: clientAssetsDir,
    filePattern: /^AuthenticatedLayoutChrome-.*\.js$/,
    forbiddenImportSubstrings: [
      'authStore-',
      'notificationStore-',
      'realtimeAuth-',
      'stomp-',
      'sonner-',
      'vendor-realtime-',
      'src/hooks/useNotificationSocket.ts',
      'src/components/ChatBotFloatingButton.tsx',
      'ChatBotFloatingButton-',
    ],
  },
  {
    label: 'OffSeasonHome page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHomePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'OffSeasonHome runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHome-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'OffSeasonHome primary runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHomePrimaryRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'OffSeasonHome highlights runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHomeHighlightsRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'OffSeasonList page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonListPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'OffSeasonList runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonList-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdminPage page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminPagePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'AdminPage shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'AdminPage runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminPageRuntimeContent-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdminPage data runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminPageDataRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'Admin community runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminCommunityRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'Admin moderation runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminModerationRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdminStadiums runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminStadiumsRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdminAiOperations runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminAiOperationsRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'UsersAdminPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^UsersAdminPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PostsAdminPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PostsAdminPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MatesAdminPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MatesAdminPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdminReportsPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminReportsPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ClientErrorAdminPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ClientErrorAdminPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ClientErrorAdmin insights runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ClientErrorAdminInsightsRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ClientErrorAdmin detail runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ClientErrorAdminDetailRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'OffseasonMovementAdminPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffseasonMovementAdminPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'OffseasonMovementAdminPanel content manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffseasonMovementAdminPanelContent-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'OffseasonDesktopTable manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffseasonDesktopTable-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'OffseasonMobileCards manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffseasonMobileCards-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'OffseasonInsightsPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffseasonInsightsPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'OffseasonMovementDetailPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffseasonMovementDetailPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'RankingPrediction manifest imports',
    directory: clientAssetsDir,
    filePattern: /^RankingPrediction-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchTab manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchTab-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchDetailPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchDetailPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionStatsPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionStatsPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'LeaderboardPage manifest imports',
    directory: clientAssetsDir,
    filePattern: /^LeaderboardPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'StadiumGuide manifest imports',
    directory: clientAssetsDir,
    filePattern: /^StadiumGuide-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AuthenticatedStadiumFavoriteToggle manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AuthenticatedStadiumFavoriteToggle-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AccountDeletionRecovery manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AccountDeletionRecovery-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'Login manifest imports',
    directory: clientAssetsDir,
    filePattern: /^Login-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'SignUp manifest imports',
    directory: clientAssetsDir,
    filePattern: /^SignUp-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PasswordReset manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PasswordReset-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PasswordResetConfirm manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PasswordResetConfirm-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'OAuthCallback manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OAuthCallback-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'NoticePage manifest imports',
    directory: clientAssetsDir,
    filePattern: /^NoticePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MyPage page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MyPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MyPage view runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MyPageViewRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'UserProfile page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^UserProfilePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'UserProfile runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^UserProfile-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'UserProfileModal manifest imports',
    directory: clientAssetsDir,
    filePattern: /^UserProfileModal-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'UserListModal manifest imports',
    directory: clientAssetsDir,
    filePattern: /^UserListModal-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ProfileEditSection shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ProfileEditSection-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'ProfileEditSection runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ProfileEditSectionRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ProfileEdit profile runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ProfileEditProfileRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'Diaryform shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^Diaryform-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'Diaryform runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^DiaryformRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'DiaryEditMode runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^DiaryEditModeRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'AccountSettingsSection manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AccountSettingsSection-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AccountSettings security runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AccountSettingsSecurityRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AccountSettings advanced runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AccountSettingsAdvancedRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'Mate page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MatePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateCreate page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreatePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateCreate runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreate-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCreate ticket step manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreateTicketStep-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCreate match step manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreateMatchStep-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCreate seat step manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreateSeatStep-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCreate description step manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreateDescriptionStep-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCreate confirm dialog manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreateConfirmDialog-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'Mate runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^Mate-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', 'stadiumData-', 'seatIcons-'],
  },
  {
    label: 'Mate results runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateResultsRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'Mate guide runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateGuidePanelRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateApply page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateApplyPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateApply runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateApply-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateDetailRuntime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateDetailRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateDetail info sections manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateDetailInfoSections-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateDetail action section manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateDetailActionSection-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateDetail reviews section manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateDetailReviewsSection-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateDetail QR runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateDetailQrRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateManage page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateManagePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateManage runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateManage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateManage overview runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateManageOverviewRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateManage content runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateManageContentRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateChat page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateChatPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateChat runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateChat-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateChat view runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateChatViewRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateChat composer panel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateChatComposerPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateCheckIn page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCheckInPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateCheckIn runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCheckIn-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCheckIn content runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCheckInContentRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'MateCheckIn roster runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCheckInRosterRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'MateCheckIn action runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCheckInActionRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCheckIn status runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCheckInStatusRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ReviewDialog manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ReviewDialog-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'TicketUploadModal manifest imports',
    directory: clientAssetsDir,
    filePattern: /^TicketUploadModal-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerRuntime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', 'src/components/CheerCard.tsx', 'src/components/ads/AdSlot.tsx'],
  },
  {
    label: 'Cheer composer runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerComposerRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'Cheer feed runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerFeedRuntimeContent-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerDetail page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerDetailPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'CheerDetail runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerDetail-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerDetail content runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerDetailContent-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerDetail article runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerDetailArticleRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerCard manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerCard-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CommentModal manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CommentModal-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ReportModal manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ReportModal-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'QuoteRepostEditor manifest imports',
    directory: clientAssetsDir,
    filePattern: /^QuoteRepostEditor-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerBookmarks page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerBookmarksPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'CheerBookmarks runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerBookmarks-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerEdit page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerEditPage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'CheerEdit runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerEdit-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'NotificationPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^NotificationPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CoachBriefing shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachBriefing-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'CoachBriefing content runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachBriefingContentRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'CoachBriefing auto runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachBriefingAutoRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CoachAnalysisDialog shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachAnalysisDialog-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'CoachAnalysisDialog runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachAnalysisDialogRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CoachAnalysisDialog result runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachAnalysisDialogResultRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'PredictionMatchInteractive shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchInteractiveRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'PredictionMatchInteractive data runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchInteractiveDataRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchInteractive view shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchInteractiveView-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchInteractive content runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchInteractiveContentRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchVoteController shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchVoteController-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchVoteController runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchVoteControllerRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdvancedMatchCard shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdvancedMatchCard-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdvancedMatchCard content runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdvancedMatchCardContentRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'RankingPredictionShare page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^RankingPredictionSharePage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'RankingPredictionShare runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^RankingPredictionShare-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ChatBot shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ChatBot-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'ChatBot runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ChatBotRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'AdminAiOperations runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminAiOperationsRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AdminAiOperations panel runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminAiOperationsPanelRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'ChatBot authenticated panel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ChatBotAuthenticatedPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'ChatBot session runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ChatBotSessionRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ChatBot session state runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ChatBotSessionStateRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'ChatBot conversation runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ChatBotConversationRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-', '_privateClient-', '_sse-'],
  },
  {
    label: 'auth session manifest imports',
    directory: clientAssetsDir,
    filePattern: /^auth-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'FollowButton manifest imports',
    directory: clientAssetsDir,
    filePattern: /^FollowButton-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'BlockButton manifest imports',
    directory: clientAssetsDir,
    filePattern: /^BlockButton-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'BlockedUsersSection manifest imports',
    directory: clientAssetsDir,
    filePattern: /^BlockedUsersSection-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
];

const homeFirstLoadStaticClosureGuards = [
  {
    label: '/home first-load static closure',
    entrypoints: [
      'index.html',
      'src/components/Layout.tsx',
      'src/components/Home.tsx',
      'src/components/home/HomeMatchPanel.tsx',
    ],
    maxJsBytes: 290_000,
    forbiddenImportSubstrings: [
      'AppQueryProvider',
      'AuthenticatedLayoutChrome-',
      'PublicNavbar-',
      'PublicShellIcons-',
      'authStore-',
      'vendor-zustand-',
      'loginRedirect-',
      'queryClient-',
      'sonner-',
      'vendor-query-',
      'src/api/home.ts',
      'src/components/home/HomeRecoveryBanner.tsx',
      'src/components/home/HomeDeferredSurfaces.tsx',
      'src/components/home/GameCardSkeleton.tsx',
      'src/components/TeamLogo.tsx',
      'HomeDeferredSurfaces-',
      'TeamLogo-',
      'HomeRecoveryBanner-',
      'GameCardSkeleton-',
      'HomeMatchPanelErrorState-',
      'homeLoadTelemetry-',
      'skeleton-',
      'card-',
      'button-',
      'utils-',
      'errorUtils-',
      'teams-',
      'predictionHomeLogic',
      'teamIdentity',
      'stadiumDisplay',
      'HomeScheduledMatchPanel-',
      'HomeIcons',
    ],
  },
];

const forbiddenMatches = [
  ...clientFiles
    .filter((file) => forbiddenChunkPrefixes.some((prefix) => file.startsWith(prefix)))
    .map((file) => ({ location: 'client', file })),
  ...workerFiles
    .filter((file) => file.startsWith('vendor-'))
    .map((file) => ({ location: 'worker', file })),
];

const budgetResults = sizeBudgets.map((budget) => {
  const candidateFile = findMatchingFile(budget.directory, budget.filePattern);

  if (!candidateFile) {
    const status = getBudgetMissingStatus({ optionalMissing: budget.optionalMissing });

    return {
      label: budget.label,
      maxBytes: budget.maxBytes,
      ok: Boolean(budget.optionalMissing),
      reason: 'missing',
      status,
    };
  }

  const filePath = path.join(budget.directory, candidateFile);
  const sizeBytes = fs.statSync(filePath).size;
  const graceBytes = budget.graceBytes ?? DEFAULT_BUDGET_GRACE_BYTES;
  const graceRatio = budget.graceRatio ?? DEFAULT_BUDGET_GRACE_RATIO;
  const overageBytes = getBudgetOverageBytes({ sizeBytes, maxBytes: budget.maxBytes });
  const graceLimitBytes = getBudgetGraceLimitBytes({
    maxBytes: budget.maxBytes,
    graceBytes,
    graceRatio,
  });

  return {
    label: budget.label,
    file: path.relative(projectRoot, filePath),
    maxBytes: budget.maxBytes,
    ok: isBudgetWithinLimit({
      sizeBytes,
      maxBytes: budget.maxBytes,
      graceBytes,
      graceRatio,
    }),
    sizeBytes,
    overageBytes,
    graceBytes,
    graceRatio,
    graceLimitBytes,
  };
});

const dependencyGuardResults = routeDependencyGuards.map((guard) => {
  const candidateFile = findMatchingFile(guard.directory, guard.filePattern);

  if (!candidateFile) {
    return {
      label: guard.label,
      ok: false,
      reason: 'missing',
      forbiddenSubstrings: guard.forbiddenSubstrings,
    };
  }

  const filePath = path.join(guard.directory, candidateFile);
  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const violations = guard.forbiddenSubstrings.filter((substring) => fileContents.includes(substring));

  return {
    label: guard.label,
    file: path.relative(projectRoot, filePath),
    ok: violations.length === 0,
    forbiddenSubstrings: guard.forbiddenSubstrings,
    violations,
  };
});

const manifestImportGuardResults = manifestImportGuards.map((guard) => {
  const candidateFile = findMatchingFile(guard.directory, guard.filePattern);

  if (!candidateFile) {
    return {
      label: guard.label,
      ok: false,
      reason: 'missing',
      forbiddenImportSubstrings: guard.forbiddenImportSubstrings,
    };
  }

  if (!clientManifest) {
    return {
      label: guard.label,
      file: path.relative(projectRoot, path.join(guard.directory, candidateFile)),
      ok: false,
      reason: 'missing_manifest',
      forbiddenImportSubstrings: guard.forbiddenImportSubstrings,
    };
  }

  const manifestFile = `assets/${candidateFile}`;
  const manifestEntry = Object.values(clientManifest).find((entry) => entry?.file === manifestFile);

  if (!manifestEntry) {
    return {
      label: guard.label,
      file: path.relative(projectRoot, path.join(guard.directory, candidateFile)),
      ok: false,
      reason: 'missing_manifest_entry',
      forbiddenImportSubstrings: guard.forbiddenImportSubstrings,
    };
  }

  const imports = Array.isArray(manifestEntry.imports) ? manifestEntry.imports : [];
  const violations = imports.filter((chunk) => (
    guard.forbiddenImportSubstrings.some((substring) => chunk.includes(substring))
  ));

  return {
    label: guard.label,
    file: path.relative(projectRoot, path.join(guard.directory, candidateFile)),
    ok: violations.length === 0,
    forbiddenImportSubstrings: guard.forbiddenImportSubstrings,
    violations,
  };
});

const getManifestEntryJsSize = (entry) => {
  if (!entry?.file || !entry.file.endsWith('.js')) {
    return 0;
  }

  const filePath = path.join(distDir, entry.file);
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
};

const resolveManifestEntryKey = (manifest, key) => {
  if (manifest?.[key]) {
    return key;
  }

  const baseName = path.basename(key, path.extname(key));
  if (!baseName) {
    return null;
  }

  const matches = Object.entries(manifest || {})
    .filter(([entryKey, entry]) => (
      entry?.name === baseName
      || entry?.file?.startsWith(`assets/${baseName}-`)
      || entryKey.startsWith(`_${baseName}-`)
    ))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return matches[0]?.[0] ?? null;
};

const collectManifestStaticClosure = (manifest, entrypoints) => {
  const includedKeys = new Set();
  const missingEntrypoints = [];
  const missingImports = [];

  const visit = (key, parent = null) => {
    const resolvedKey = resolveManifestEntryKey(manifest, key);

    if (resolvedKey && includedKeys.has(resolvedKey)) {
      return;
    }

    const entry = resolvedKey ? manifest?.[resolvedKey] : null;
    if (!entry) {
      if (parent) {
        missingImports.push({ key, parent });
      } else {
        missingEntrypoints.push(key);
      }
      return;
    }

    includedKeys.add(resolvedKey);
    (Array.isArray(entry.imports) ? entry.imports : []).forEach((importKey) => visit(importKey, resolvedKey));
  };

  entrypoints.forEach((entrypoint) => visit(entrypoint));

  return {
    includedKeys: [...includedKeys].sort(),
    missingEntrypoints,
    missingImports,
  };
};

const homeFirstLoadStaticClosureResults = homeFirstLoadStaticClosureGuards.map((guard) => {
  if (!clientManifest) {
    return {
      label: guard.label,
      ok: false,
      reason: 'missing_manifest',
      entrypoints: guard.entrypoints,
      maxJsBytes: guard.maxJsBytes,
      forbiddenImportSubstrings: guard.forbiddenImportSubstrings,
    };
  }

  const closure = collectManifestStaticClosure(clientManifest, guard.entrypoints);
  const includedFiles = closure.includedKeys
    .map((key) => {
      const entry = clientManifest[key];
      return entry?.file ? { key, file: entry.file, sizeBytes: getManifestEntryJsSize(entry) } : null;
    })
    .filter(Boolean);
  const totalJsBytes = includedFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  const violations = includedFiles.flatMap(({ key, file }) => (
    guard.forbiddenImportSubstrings
      .filter((substring) => key.includes(substring) || file.includes(substring))
      .map((substring) => ({ key, file, substring }))
  ));
  const overageBytes = Math.max(0, totalJsBytes - guard.maxJsBytes);

  return {
    label: guard.label,
    ok: closure.missingEntrypoints.length === 0
      && closure.missingImports.length === 0
      && violations.length === 0
      && overageBytes === 0,
    entrypoints: guard.entrypoints,
    maxJsBytes: guard.maxJsBytes,
    totalJsBytes,
    overageBytes,
    includedKeys: closure.includedKeys,
    includedFiles,
    missingEntrypoints: closure.missingEntrypoints,
    missingImports: closure.missingImports,
    forbiddenImportSubstrings: guard.forbiddenImportSubstrings,
    violations,
  };
});

const devArtifactResults = [
  { label: 'client JS assets', directory: clientAssetsDir },
  { label: 'worker JS assets', directory: workerAssetsDir },
  { label: 'worker root JS', directory: workerDistDir },
].flatMap((target) => (
  listFiles(target.directory)
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const filePath = path.join(target.directory, file);
      const matches = detectReactDevArtifacts(fs.readFileSync(filePath, 'utf-8'));

      return {
        label: target.label,
        file: path.relative(projectRoot, filePath),
        ok: matches.length === 0,
        matches,
      };
    })
));

const failures = [
  ...forbiddenMatches.map((match) => ({
    message: `forbidden ${match.location} chunk reappeared: ${match.file}`,
    type: 'forbidden_chunk',
  })),
  ...devArtifactResults
    .filter((result) => !result.ok)
    .map((result) => ({
      message: `${result.file} contains React dev artifact(s): ${result.matches.join(', ')}`,
      type: 'react_dev_artifact',
    })),
  ...budgetResults
    .filter((result) => !result.ok)
    .map((result) => ({
      message: result.reason === 'missing'
        ? `expected chunk missing for budget "${result.label}"`
        : `${result.label} exceeded budget (${result.sizeBytes} > ${result.maxBytes} + grace ${result.graceLimitBytes})`,
      type: 'budget',
    })),
  ...dependencyGuardResults
    .filter((result) => !result.ok)
    .map((result) => ({
      message: result.reason === 'missing'
        ? `expected chunk missing for dependency guard "${result.label}"`
        : `${result.label} imported forbidden dependency (${result.violations.join(', ')})`,
      type: 'dependency_guard',
    })),
  ...manifestImportGuardResults
    .filter((result) => !result.ok)
    .map((result) => ({
      message: result.reason === 'missing'
        ? `expected chunk missing for manifest import guard "${result.label}"`
        : result.reason === 'missing_manifest'
          ? `client manifest missing for manifest import guard "${result.label}"`
          : result.reason === 'missing_manifest_entry'
            ? `manifest entry missing for manifest import guard "${result.label}"`
            : `${result.label} imported forbidden manifest dependency (${result.violations.join(', ')})`,
      type: 'manifest_import_guard',
    })),
  ...homeFirstLoadStaticClosureResults
    .filter((result) => !result.ok)
    .map((result) => ({
      message: result.reason === 'missing_manifest'
        ? `client manifest missing for static closure guard "${result.label}"`
        : result.missingEntrypoints.length > 0
          ? `${result.label} missing entrypoint(s): ${result.missingEntrypoints.join(', ')}`
          : result.missingImports.length > 0
            ? `${result.label} missing import(s): ${result.missingImports.map((item) => `${item.key} from ${item.parent}`).join(', ')}`
            : result.violations.length > 0
              ? `${result.label} included forbidden chunk(s): ${result.violations.map((item) => `${item.file} matched ${item.substring}`).join(', ')}`
              : `${result.label} exceeded static closure budget (${result.totalJsBytes} > ${result.maxJsBytes})`,
      type: 'home_first_load_static_closure',
    })),
];

const report = {
  generatedAt: new Date().toISOString(),
  clientAssetsDirectory: path.relative(projectRoot, clientAssetsDir),
  workerAssetsDirectory: fs.existsSync(workerAssetsDir)
    ? path.relative(projectRoot, workerAssetsDir)
    : null,
  forbiddenChunkPrefixes,
  forbiddenMatches,
  devArtifactResults,
  budgetResults,
  dependencyGuardResults,
  manifestImportGuardResults,
  homeFirstLoadStaticClosureResults,
  ok: failures.length === 0,
  failures,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

const reportRelativePath = path.relative(projectRoot, reportPath);

if (failures.length > 0) {
  console.error(`[bundle-guard] failed. report=${reportRelativePath}`);
  failures.forEach((failure) => console.error(`- ${failure.message}`));
  process.exit(1);
}

console.log(`[bundle-guard] ok. checked ${budgetResults.length} budgets. report=${reportRelativePath}`);
