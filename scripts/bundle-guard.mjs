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
  'vendor-qr-',
  'vendor-state-',
  'vendor-styles-',
  'vendor-theme-',
  'vendor-toast-',
  'vendor-ui-',
  'vendor-upload-',
];

const sizeBudgets = [
  { label: 'vendor-react-core', directory: clientAssetsDir, filePattern: /^vendor-react-core-.*\.js$/, maxBytes: 170_000 },
  { label: 'vendor-router', directory: clientAssetsDir, filePattern: /^vendor-router-.*\.js$/, maxBytes: 50_000 },
  { label: 'vendor-query', directory: clientAssetsDir, filePattern: /^vendor-query-.*\.js$/, maxBytes: 45_000 },
  { label: 'vendor-network', directory: clientAssetsDir, filePattern: /^vendor-network-.*\.js$/, maxBytes: 45_000 },
  { label: 'vendor-realtime', directory: clientAssetsDir, filePattern: /^vendor-realtime-.*\.js$/, maxBytes: 30_000 },
  { label: 'Prediction route', directory: clientAssetsDir, filePattern: /^Prediction-.*\.js$/, maxBytes: 105_000 },
  { label: 'RankingPrediction route', directory: clientAssetsDir, filePattern: /^RankingPrediction-.*\.js$/, maxBytes: 12_000 },
  { label: 'PredictionMatchTab route', directory: clientAssetsDir, filePattern: /^PredictionMatchTab-.*\.js$/, maxBytes: 10_000 },
  { label: 'PredictionMatchDetailPanel route', directory: clientAssetsDir, filePattern: /^PredictionMatchDetailPanel-.*\.js$/, maxBytes: 9_000 },
  { label: 'PredictionStatsPanel route', directory: clientAssetsDir, filePattern: /^PredictionStatsPanel-.*\.js$/, maxBytes: 7_000 },
  { label: 'Home route', directory: clientAssetsDir, filePattern: /^Home-.*\.js$/, maxBytes: 40_000 },
  { label: 'LeaderboardPage route', directory: clientAssetsDir, filePattern: /^LeaderboardPage-.*\.js$/, maxBytes: 35_000 },
  { label: 'OffSeasonHome route', directory: clientAssetsDir, filePattern: /^OffSeasonHome-.*\.js$/, maxBytes: 30_000 },
  { label: 'OffSeasonList route', directory: clientAssetsDir, filePattern: /^OffSeasonList-.*\.js$/, maxBytes: 45_000 },
  { label: 'StadiumGuide route', directory: clientAssetsDir, filePattern: /^StadiumGuide-.*\.js$/, maxBytes: 26_000 },
  { label: 'AccountDeletionRecovery route', directory: clientAssetsDir, filePattern: /^AccountDeletionRecovery-.*\.js$/, maxBytes: 7_000 },
  { label: 'Login route', directory: clientAssetsDir, filePattern: /^Login-.*\.js$/, maxBytes: 12_000 },
  { label: 'SignUp route', directory: clientAssetsDir, filePattern: /^SignUp-.*\.js$/, maxBytes: 13_000 },
  { label: 'PasswordReset route', directory: clientAssetsDir, filePattern: /^PasswordReset-.*\.js$/, maxBytes: 7_000 },
  { label: 'PasswordResetConfirm route', directory: clientAssetsDir, filePattern: /^PasswordResetConfirm-.*\.js$/, maxBytes: 9_000 },
  { label: 'OAuthCallback route', directory: clientAssetsDir, filePattern: /^OAuthCallback-.*\.js$/, maxBytes: 4_000 },
  { label: 'NoticePage route', directory: clientAssetsDir, filePattern: /^NoticePage-.*\.js$/, maxBytes: 9_000 },
  { label: 'UserProfile route', directory: clientAssetsDir, filePattern: /^UserProfile-.*\.js$/, maxBytes: 16_000 },
  { label: 'UserProfileModal route', directory: clientAssetsDir, filePattern: /^UserProfileModal-.*\.js$/, maxBytes: 8_000 },
  { label: 'UserListModal route', directory: clientAssetsDir, filePattern: /^UserListModal-.*\.js$/, maxBytes: 7_000 },
  { label: 'ProfileEditSection route', directory: clientAssetsDir, filePattern: /^ProfileEditSection-.*\.js$/, maxBytes: 26_000 },
  { label: 'Diaryform route', directory: clientAssetsDir, filePattern: /^Diaryform-.*\.js$/, maxBytes: 33_000 },
  { label: 'AccountSettingsSection route', directory: clientAssetsDir, filePattern: /^AccountSettingsSection-.*\.js$/, maxBytes: 26_000 },
  { label: 'MateCreate route', directory: clientAssetsDir, filePattern: /^MateCreate-.*\.js$/, maxBytes: 42_000 },
  { label: 'MateApply route', directory: clientAssetsDir, filePattern: /^MateApply-.*\.js$/, maxBytes: 22_000 },
  { label: 'MateDetailRuntime route', directory: clientAssetsDir, filePattern: /^MateDetailRuntime-.*\.js$/, maxBytes: 43_000 },
  { label: 'MateManage route', directory: clientAssetsDir, filePattern: /^MateManage-.*\.js$/, maxBytes: 33_000 },
  { label: 'MateChat route', directory: clientAssetsDir, filePattern: /^MateChat-.*\.js$/, maxBytes: 30_000 },
  { label: 'MateCheckIn route', directory: clientAssetsDir, filePattern: /^MateCheckIn-.*\.js$/, maxBytes: 29_000 },
  { label: 'ReviewDialog route', directory: clientAssetsDir, filePattern: /^ReviewDialog-.*\.js$/, maxBytes: 6_000 },
  { label: 'TicketUploadModal route', directory: clientAssetsDir, filePattern: /^TicketUploadModal-.*\.js$/, maxBytes: 8_000 },
  { label: 'CheerRuntime route', directory: clientAssetsDir, filePattern: /^CheerRuntime-.*\.js$/, maxBytes: 36_000 },
  { label: 'CheerDetail route', directory: clientAssetsDir, filePattern: /^CheerDetail-.*\.js$/, maxBytes: 39_000 },
  { label: 'CheerCard route', directory: clientAssetsDir, filePattern: /^CheerCard-.*\.js$/, maxBytes: 20_000 },
  { label: 'CommentModal route', directory: clientAssetsDir, filePattern: /^CommentModal-.*\.js$/, maxBytes: 7_000 },
  { label: 'ReportModal route', directory: clientAssetsDir, filePattern: /^ReportModal-.*\.js$/, maxBytes: 6_000 },
  { label: 'QuoteRepostEditor route', directory: clientAssetsDir, filePattern: /^QuoteRepostEditor-.*\.js$/, maxBytes: 6_000 },
  { label: 'CheerBookmarks route', directory: clientAssetsDir, filePattern: /^CheerBookmarks-.*\.js$/, maxBytes: 9_000 },
  { label: 'CheerEdit route', directory: clientAssetsDir, filePattern: /^CheerEdit-.*\.js$/, maxBytes: 12_000 },
  { label: 'FollowButton route', directory: clientAssetsDir, filePattern: /^FollowButton-.*\.js$/, maxBytes: 5_000 },
  { label: 'BlockButton route', directory: clientAssetsDir, filePattern: /^BlockButton-.*\.js$/, maxBytes: 5_000 },
  { label: 'BlockedUsersSection route', directory: clientAssetsDir, filePattern: /^BlockedUsersSection-.*\.js$/, maxBytes: 5_000 },
  { label: 'RankingPredictionShare route', directory: clientAssetsDir, filePattern: /^RankingPredictionShare-.*\.js$/, maxBytes: 5_000 },
  { label: 'AdminPage route', directory: clientAssetsDir, filePattern: /^AdminPage-.*\.js$/, maxBytes: 50_000 },
  { label: 'UsersAdminPanel route', directory: clientAssetsDir, filePattern: /^UsersAdminPanel-.*\.js$/, maxBytes: 8_000 },
  { label: 'PostsAdminPanel route', directory: clientAssetsDir, filePattern: /^PostsAdminPanel-.*\.js$/, maxBytes: 6_000 },
  { label: 'MatesAdminPanel route', directory: clientAssetsDir, filePattern: /^MatesAdminPanel-.*\.js$/, maxBytes: 6_000 },
  { label: 'AdminReportsPanel route', directory: clientAssetsDir, filePattern: /^AdminReportsPanel-.*\.js$/, maxBytes: 7_000 },
  { label: 'ClientErrorAdminPanel route', directory: clientAssetsDir, filePattern: /^ClientErrorAdminPanel-.*\.js$/, maxBytes: 24_000 },
  { label: 'OffseasonMovementAdminPanel route', directory: clientAssetsDir, filePattern: /^OffseasonMovementAdminPanel-.*\.js$/, maxBytes: 35_000 },
  { label: 'ChatBot route', directory: clientAssetsDir, filePattern: /^ChatBot-.*\.js$/, maxBytes: 52_000 },
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
    label: 'OffSeasonHome direct deps',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonHome-.*\.js$/,
    forbiddenSubstrings: ['./vendor-network-', './axios-'],
  },
  {
    label: 'OffSeasonList direct deps',
    directory: clientAssetsDir,
    filePattern: /^OffSeasonList-.*\.js$/,
    forbiddenSubstrings: ['./vendor-network-', './axios-'],
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
    label: 'AdminPage manifest imports',
    directory: clientAssetsDir,
    filePattern: /^AdminPage-.*\.js$/,
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
    label: 'UserProfile manifest imports',
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
    label: 'MateCreate manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateCreate-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateApply manifest imports',
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
    label: 'MateManage manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateManage-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateChat manifest imports',
    directory: clientAssetsDir,
    filePattern: /^MateChat-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'MateCheckIn manifest imports',
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
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerDetail manifest imports',
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
    label: 'CheerBookmarks manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerBookmarks-.*\.js$/,
    forbiddenImportSubstrings: ['vendor-network-', '_axios-'],
  },
  {
    label: 'CheerEdit manifest imports',
    directory: clientAssetsDir,
    filePattern: /^CheerEdit-.*\.js$/,
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
      ok: false,
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
