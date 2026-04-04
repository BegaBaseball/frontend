import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  { label: 'vendor-react-core', directory: clientAssetsDir, filePattern: /^vendor-react-core-.*\.js$/, maxBytes: 170_000 },
  { label: 'vendor-router', directory: clientAssetsDir, filePattern: /^vendor-router-.*\.js$/, maxBytes: 50_000 },
  { label: 'vendor-query', directory: clientAssetsDir, filePattern: /^vendor-query-.*\.js$/, maxBytes: 45_000 },
  { label: 'vendor-realtime', directory: clientAssetsDir, filePattern: /^vendor-realtime-.*\.js$/, maxBytes: 30_000 },
  { label: 'Prediction route', directory: clientAssetsDir, filePattern: /^Prediction-.*\.js$/, maxBytes: 105_000 },
  { label: 'RankingPrediction route', directory: clientAssetsDir, filePattern: /^RankingPrediction-.*\.js$/, maxBytes: 12_000 },
  { label: 'PredictionMatchRuntime shell', directory: clientAssetsDir, filePattern: /^PredictionMatchRuntimeContent-.*\.js$/, maxBytes: 5_000 },
  { label: 'PredictionMatchSchedule shell', directory: clientAssetsDir, filePattern: /^PredictionMatchScheduleRuntime-.*\.js$/, maxBytes: 5_000 },
  { label: 'PredictionMatchSchedule data runtime', directory: clientAssetsDir, filePattern: /^PredictionMatchScheduleDataRuntime-.*\.js$/, maxBytes: 38_000 },
  { label: 'PredictionMatchTab route', directory: clientAssetsDir, filePattern: /^PredictionMatchTab-.*\.js$/, maxBytes: 10_000 },
  { label: 'PredictionMatchDetailPanel route', directory: clientAssetsDir, filePattern: /^PredictionMatchDetailPanel-.*\.js$/, maxBytes: 9_000 },
  { label: 'PredictionStatsPanel route', directory: clientAssetsDir, filePattern: /^PredictionStatsPanel-.*\.js$/, maxBytes: 7_000 },
  { label: 'Home route', directory: clientAssetsDir, filePattern: /^Home-.*\.js$/, maxBytes: 40_000 },
  { label: 'LeaderboardPage route', directory: clientAssetsDir, filePattern: /^LeaderboardPage-.*\.js$/, maxBytes: 35_000 },
  { label: 'OffSeasonHome page shell', directory: clientAssetsDir, filePattern: /^OffSeasonHomePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'OffSeasonList page shell', directory: clientAssetsDir, filePattern: /^OffSeasonListPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'OffSeasonHome runtime', directory: clientAssetsDir, filePattern: /^OffSeasonHome-.*\.js$/, maxBytes: 30_000 },
  { label: 'StadiumGuide route', directory: clientAssetsDir, filePattern: /^StadiumGuide-.*\.js$/, maxBytes: 26_000 },
  { label: 'AuthenticatedStadiumFavoriteToggle route', directory: clientAssetsDir, filePattern: /^AuthenticatedStadiumFavoriteToggle-.*\.js$/, maxBytes: 4_000 },
  { label: 'AccountDeletionRecovery route', directory: clientAssetsDir, filePattern: /^AccountDeletionRecovery-.*\.js$/, maxBytes: 7_000 },
  { label: 'Login route', directory: clientAssetsDir, filePattern: /^Login-.*\.js$/, maxBytes: 12_000 },
  { label: 'SignUp route', directory: clientAssetsDir, filePattern: /^SignUp-.*\.js$/, maxBytes: 13_000 },
  { label: 'PasswordReset route', directory: clientAssetsDir, filePattern: /^PasswordReset-.*\.js$/, maxBytes: 7_000 },
  { label: 'PasswordResetConfirm route', directory: clientAssetsDir, filePattern: /^PasswordResetConfirm-.*\.js$/, maxBytes: 9_000 },
  { label: 'OAuthCallback route', directory: clientAssetsDir, filePattern: /^OAuthCallback-.*\.js$/, maxBytes: 4_000 },
  { label: 'NoticePage route', directory: clientAssetsDir, filePattern: /^NoticePage-.*\.js$/, maxBytes: 9_000 },
  { label: 'UserProfile page shell', directory: clientAssetsDir, filePattern: /^UserProfilePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'UserProfile runtime', directory: clientAssetsDir, filePattern: /^UserProfile-.*\.js$/, maxBytes: 16_000 },
  { label: 'UserProfileModal route', directory: clientAssetsDir, filePattern: /^UserProfileModal-.*\.js$/, maxBytes: 8_000 },
  { label: 'UserListModal route', directory: clientAssetsDir, filePattern: /^UserListModal-.*\.js$/, maxBytes: 7_000 },
  { label: 'ProfileEditSection route', directory: clientAssetsDir, filePattern: /^ProfileEditSection-.*\.js$/, maxBytes: 26_000 },
  { label: 'Diaryform route', directory: clientAssetsDir, filePattern: /^Diaryform-.*\.js$/, maxBytes: 33_000 },
  { label: 'AccountSettingsSection route', directory: clientAssetsDir, filePattern: /^AccountSettingsSection-.*\.js$/, maxBytes: 26_000 },
  { label: 'Mate page shell', directory: clientAssetsDir, filePattern: /^MatePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'Mate runtime', directory: clientAssetsDir, filePattern: /^Mate-.*\.js$/, maxBytes: 24_000 },
  { label: 'MateCreate page shell', directory: clientAssetsDir, filePattern: /^MateCreatePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateCreate runtime', directory: clientAssetsDir, filePattern: /^MateCreate-.*\.js$/, maxBytes: 35_000 },
  { label: 'MateCreate ticket step', directory: clientAssetsDir, filePattern: /^MateCreateTicketStep-.*\.js$/, maxBytes: 6_000 },
  { label: 'MateCreate match step', directory: clientAssetsDir, filePattern: /^MateCreateMatchStep-.*\.js$/, maxBytes: 7_000 },
  { label: 'MateCreate seat step', directory: clientAssetsDir, filePattern: /^MateCreateSeatStep-.*\.js$/, maxBytes: 11_000 },
  { label: 'MateCreate description step', directory: clientAssetsDir, filePattern: /^MateCreateDescriptionStep-.*\.js$/, maxBytes: 4_000 },
  { label: 'MateCreate confirm dialog', directory: clientAssetsDir, filePattern: /^MateCreateConfirmDialog-.*\.js$/, maxBytes: 6_000 },
  { label: 'MateApply page shell', directory: clientAssetsDir, filePattern: /^MateApplyPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateApply runtime', directory: clientAssetsDir, filePattern: /^MateApply-.*\.js$/, maxBytes: 22_000 },
  { label: 'MateDetailRuntime route', directory: clientAssetsDir, filePattern: /^MateDetailRuntime-.*\.js$/, maxBytes: 35_000 },
  { label: 'MateDetail overview section', directory: clientAssetsDir, filePattern: /^MateDetailOverviewSection-.*\.js$/, maxBytes: 6_000 },
  { label: 'MateDetail action section', directory: clientAssetsDir, filePattern: /^MateDetailActionSection-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateDetail reviews section', directory: clientAssetsDir, filePattern: /^MateDetailReviewsSection-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateDetail QR runtime', directory: clientAssetsDir, filePattern: /^MateDetailQrRuntime-.*\.js$/, maxBytes: 19_000 },
  { label: 'MateManage page shell', directory: clientAssetsDir, filePattern: /^MateManagePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateManage runtime', directory: clientAssetsDir, filePattern: /^MateManage-.*\.js$/, maxBytes: 33_000 },
  { label: 'MateChat page shell', directory: clientAssetsDir, filePattern: /^MateChatPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateChat runtime', directory: clientAssetsDir, filePattern: /^MateChat-.*\.js$/, maxBytes: 30_000 },
  { label: 'MateCheckIn page shell', directory: clientAssetsDir, filePattern: /^MateCheckInPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'MateCheckIn runtime', directory: clientAssetsDir, filePattern: /^MateCheckIn-.*\.js$/, maxBytes: 29_000 },
  { label: 'ReviewDialog route', directory: clientAssetsDir, filePattern: /^ReviewDialog-.*\.js$/, maxBytes: 6_000 },
  { label: 'TicketUploadModal route', directory: clientAssetsDir, filePattern: /^TicketUploadModal-.*\.js$/, maxBytes: 8_000 },
  { label: 'CheerRuntime route', directory: clientAssetsDir, filePattern: /^CheerRuntime-.*\.js$/, maxBytes: 24_000 },
  { label: 'Cheer feed runtime', directory: clientAssetsDir, filePattern: /^CheerFeedRuntimeContent-.*\.js$/, maxBytes: 12_000 },
  { label: 'CheerDetail page shell', directory: clientAssetsDir, filePattern: /^CheerDetailPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'CheerDetail runtime', directory: clientAssetsDir, filePattern: /^CheerDetail-.*\.js$/, maxBytes: 39_000 },
  { label: 'CheerCard route', directory: clientAssetsDir, filePattern: /^CheerCard-.*\.js$/, maxBytes: 20_000 },
  { label: 'CommentModal route', directory: clientAssetsDir, filePattern: /^CommentModal-.*\.js$/, maxBytes: 7_000 },
  { label: 'ReportModal route', directory: clientAssetsDir, filePattern: /^ReportModal-.*\.js$/, maxBytes: 6_000 },
  { label: 'QuoteRepostEditor route', directory: clientAssetsDir, filePattern: /^QuoteRepostEditor-.*\.js$/, maxBytes: 6_000 },
  { label: 'CheerBookmarks page shell', directory: clientAssetsDir, filePattern: /^CheerBookmarksPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'CheerBookmarks runtime', directory: clientAssetsDir, filePattern: /^CheerBookmarks-.*\.js$/, maxBytes: 9_000 },
  { label: 'CheerEdit page shell', directory: clientAssetsDir, filePattern: /^CheerEditPage-.*\.js$/, maxBytes: 5_000 },
  { label: 'CheerEdit runtime', directory: clientAssetsDir, filePattern: /^CheerEdit-.*\.js$/, maxBytes: 12_000 },
  { label: 'NotificationPanel route', directory: clientAssetsDir, filePattern: /^NotificationPanel-.*\.js$/, maxBytes: 18_000 },
  { label: 'CoachBriefing route', directory: clientAssetsDir, filePattern: /^CoachBriefing-.*\.js$/, maxBytes: 32_000 },
  { label: 'CoachAnalysisDialog route', directory: clientAssetsDir, filePattern: /^CoachAnalysisDialog-.*\.js$/, maxBytes: 36_000 },
  { label: 'FollowButton route', directory: clientAssetsDir, filePattern: /^FollowButton-.*\.js$/, maxBytes: 5_000 },
  { label: 'BlockButton route', directory: clientAssetsDir, filePattern: /^BlockButton-.*\.js$/, maxBytes: 5_000 },
  { label: 'BlockedUsersSection route', directory: clientAssetsDir, filePattern: /^BlockedUsersSection-.*\.js$/, maxBytes: 5_000 },
  { label: 'RankingPredictionShare page shell', directory: clientAssetsDir, filePattern: /^RankingPredictionSharePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'RankingPredictionShare runtime', directory: clientAssetsDir, filePattern: /^RankingPredictionShare-.*\.js$/, maxBytes: 5_000 },
  { label: 'AdminPage page shell', directory: clientAssetsDir, filePattern: /^AdminPagePage-.*\.js$/, maxBytes: 5_000 },
  { label: 'AdminPage shell', directory: clientAssetsDir, filePattern: /^AdminPage-.*\.js$/, maxBytes: 6_000 },
  { label: 'AdminPage runtime', directory: clientAssetsDir, filePattern: /^AdminPageRuntimeContent-.*\.js$/, maxBytes: 40_000 },
  { label: 'AdminStadiums runtime', directory: clientAssetsDir, filePattern: /^AdminStadiumsRuntime-.*\.js$/, maxBytes: 16_000 },
  { label: 'AdminAiOperations runtime', directory: clientAssetsDir, filePattern: /^AdminAiOperationsRuntime-.*\.js$/, maxBytes: 32_000 },
  { label: 'UsersAdminPanel route', directory: clientAssetsDir, filePattern: /^UsersAdminPanel-.*\.js$/, maxBytes: 8_000 },
  { label: 'PostsAdminPanel route', directory: clientAssetsDir, filePattern: /^PostsAdminPanel-.*\.js$/, maxBytes: 6_000 },
  { label: 'MatesAdminPanel route', directory: clientAssetsDir, filePattern: /^MatesAdminPanel-.*\.js$/, maxBytes: 6_000 },
  { label: 'AdminReportsPanel route', directory: clientAssetsDir, filePattern: /^AdminReportsPanel-.*\.js$/, maxBytes: 7_000 },
  { label: 'ClientErrorAdminPanel route', directory: clientAssetsDir, filePattern: /^ClientErrorAdminPanel-.*\.js$/, maxBytes: 24_000 },
  { label: 'OffseasonMovementAdminPanel route', directory: clientAssetsDir, filePattern: /^OffseasonMovementAdminPanel-.*\.js$/, maxBytes: 35_000 },
  { label: 'OffSeasonList runtime', directory: clientAssetsDir, filePattern: /^OffSeasonList-.*\.js$/, maxBytes: 37_000 },
  { label: 'OffseasonDesktopTable route', directory: clientAssetsDir, filePattern: /^OffseasonDesktopTable-.*\.js$/, maxBytes: 22_000 },
  { label: 'OffseasonMobileCards route', directory: clientAssetsDir, filePattern: /^OffseasonMobileCards-.*\.js$/, maxBytes: 12_000 },
  { label: 'OffseasonInsightsPanel route', directory: clientAssetsDir, filePattern: /^OffseasonInsightsPanel-.*\.js$/, maxBytes: 10_000 },
  { label: 'OffseasonMovementDetailPanel route', directory: clientAssetsDir, filePattern: /^OffseasonMovementDetailPanel-.*\.js$/, maxBytes: 12_000 },
  { label: 'ChatBot shell', directory: clientAssetsDir, filePattern: /^ChatBot-.*\.js$/, maxBytes: 5_000 },
  { label: 'ChatBot runtime', directory: clientAssetsDir, filePattern: /^ChatBotRuntime-.*\.js$/, maxBytes: 10_000 },
  { label: 'ChatBot authenticated panel', directory: clientAssetsDir, filePattern: /^ChatBotAuthenticatedPanel-.*\.js$/, maxBytes: 32_000 },
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
    label: 'OffSeasonHome page shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHomePage-.*\.js$/,
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
    label: 'OffseasonMovementAdminPanel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^OffseasonMovementAdminPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
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
    label: 'PredictionMatchRuntime shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchRuntimeContent-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchSchedule shell manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchScheduleRuntime-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-query-', 'vendor-network-', '_axios-'],
  },
  {
    label: 'PredictionMatchSchedule data runtime manifest imports',
    directory: clientAssetsDir,
    filePattern: /^PredictionMatchScheduleDataRuntime-.*\.js$/,
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
    label: 'ProfileEditSection manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ProfileEditSection-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'Diaryform manifest imports',
    directory: clientAssetsDir,
    filePattern: /^Diaryform-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'AccountSettingsSection manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AccountSettingsSection-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
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
    label: 'MateDetail overview section manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateDetailOverviewSection-.*\.js$/,
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
    label: 'CoachBriefing manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachBriefing-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CoachAnalysisDialog manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CoachAnalysisDialog-.*\.js$/,
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
    label: 'ChatBot authenticated panel manifest imports',
    directory: clientAssetsDir,
    filePattern: /^ChatBotAuthenticatedPanel-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
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
    return {
      label: budget.label,
      maxBytes: budget.maxBytes,
      ok: Boolean(budget.optionalMissing),
      reason: 'missing',
    };
  }

  const filePath = path.join(budget.directory, candidateFile);
  const sizeBytes = fs.statSync(filePath).size;

  return {
    label: budget.label,
    file: path.relative(projectRoot, filePath),
    maxBytes: budget.maxBytes,
    ok: sizeBytes <= budget.maxBytes,
    sizeBytes,
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

const failures = [
  ...forbiddenMatches.map((match) => ({
    message: `forbidden ${match.location} chunk reappeared: ${match.file}`,
    type: 'forbidden_chunk',
  })),
  ...budgetResults
    .filter((result) => !result.ok)
    .map((result) => ({
      message: result.reason === 'missing'
        ? `expected chunk missing for budget "${result.label}"`
        : `${result.label} exceeded budget (${result.sizeBytes} > ${result.maxBytes})`,
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
];

const report = {
  generatedAt: new Date().toISOString(),
  clientAssetsDirectory: path.relative(projectRoot, clientAssetsDir),
  workerAssetsDirectory: fs.existsSync(workerAssetsDir)
    ? path.relative(projectRoot, workerAssetsDir)
    : null,
  forbiddenChunkPrefixes,
  forbiddenMatches,
  budgetResults,
  dependencyGuardResults,
  manifestImportGuardResults,
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
