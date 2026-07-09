import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const componentsRoot = path.dirname(fileURLToPath(import.meta.url));

const focusFiles = [
  'home/HomeMatchPanel.tsx',
  'home/HomeScheduledMatchPanel.tsx',
  'HomeRuntime.tsx',
  'prediction/PredictionRuntime.tsx',
  'prediction/PredictionRankingTab.tsx',
  'prediction/PredictionStatsPanel.tsx',
  'Mate.tsx',
  'MatePage.tsx',
  'MateListControlsRuntime.tsx',
  'MateCheckInStatusRuntime.tsx',
  'MateCheckInOverviewRuntime.tsx',
  'MateChatViewRuntime.tsx',
  'MateManageOverviewRuntime.tsx',
] as const;

const authFlowFiles = [
  'ui/auth-primitives.tsx',
  'auth/AuthLayout.tsx',
  'auth/auth-layout.css',
  'Login.tsx',
  'SignUp.tsx',
  'PasswordReset.tsx',
  'PasswordResetConfirm.tsx',
  'AccountDeletionRecovery.tsx',
] as const;

const landingHeaderFiles = [
  'ui/page-primitives.tsx',
  'Landing.tsx',
  'Landing.css',
  'LandingFeaturesRuntime.tsx',
] as const;

const threeCardRhythmFiles = [
  'Landing.tsx',
  'OffSeasonHomePrimaryRuntime.tsx',
  'OffSeasonHomeHighlightsRuntime.tsx',
  'AdminPageDataRuntime.tsx',
] as const;

const summaryLayoutFiles = [
  'prediction/PredictionStatsPanel.tsx',
  'MateCheckInStatusRuntime.tsx',
  'MateCheckInOverviewRuntime.tsx',
  'MateChatViewRuntime.tsx',
  'MateManageOverviewRuntime.tsx',
] as const;

const adminVisualDebtFiles = [
  'AdminPageRuntimeContent.tsx',
  'AdminPageDataRuntime.tsx',
  'admin/AdminAiReleaseDecisionRuntime.tsx',
  'admin/AdminCoachAutoBriefOpsPanel.tsx',
  'admin/AdminDeletePlaceDialogContent.tsx',
  'admin/AdminPanelPrimitives.tsx',
  'admin/AdminPlaceDialogContent.tsx',
  'admin/AdminRoleChangeDialogContent.tsx',
  'admin/AdminStadiumsPanel.tsx',
  'admin/MatesAdminPanel.tsx',
  'admin/OffseasonMovementAdminDialogs.tsx',
  'admin/OffseasonMovementAdminPanel.tsx',
  'admin/OffseasonMovementAdminPanelContent.tsx',
  'admin/OffseasonMovementAdminResultsRuntime.tsx',
  'admin/PostsAdminPanel.tsx',
  'admin/StatCard.tsx',
  'admin/UsersAdminPanel.tsx',
  'admin/adminPageTabs.ts',
  'admin/clientErrorAdminShared.ts',
] as const;

const navGlassChromeFiles = [
  'Navbar.tsx',
  'PublicNavbar.tsx',
] as const;

const solidChromeFiles = [
  'auth/auth-layout.css',
  'LoadingSpinner.tsx',
  'Landing.css',
] as const;

const placeholderCopyFiles = [
  'SignUp.tsx',
  'ReportModal.tsx',
  'admin/OffseasonMovementAdminDialogs.tsx',
  'admin/AdminGameStatusRepairPanel.tsx',
  'admin/AdminPlaceDialogContent.tsx',
] as const;

const typographyHierarchyLockFiles = [
  'admin/OffseasonMovementAdminDialogs.tsx',
  'admin/OffseasonMovementAdminPanelContent.tsx',
  'admin/OffseasonMovementAdminResultsRuntime.tsx',
  'admin/AdminGameStatusRepairPanel.tsx',
  'MateManageApplicationsRuntime.tsx',
  'MateManageContentRuntime.tsx',
  'MateApply.tsx',
  'MateCheckIn.tsx',
  'MateCheckInActionRuntime.tsx',
] as const;

const adminMotionLockFiles = [
  'AdminPage.tsx',
  'AdminPageRuntimeContent.tsx',
  'AdminPageDataRuntime.tsx',
  'admin/StatCard.tsx',
  'admin/OffseasonMovementAdminResultsRuntime.tsx',
  'admin/PostsAdminPanel.tsx',
  'admin/UsersAdminPanel.tsx',
  'admin/MatesAdminPanel.tsx',
  'admin/AdminStadiumsPanel.tsx',
] as const;

const consistencyLockFiles = [
  'AdminPage.tsx',
  'AdminPageRuntimeContent.tsx',
  'AdminPageDataRuntime.tsx',
  'admin/StatCard.tsx',
  '../utils/mateFlowUi.ts',
  'MateApply.tsx',
  'MateManageApplicationsRuntime.tsx',
  'MateManageContentRuntime.tsx',
  'MateCheckIn.tsx',
] as const;

const inlineSvgAllowedFiles = new Set([
  'Login.tsx',
  'CoachBriefingContentCardRuntime.tsx',
  'design-slop-guard.test.ts',
  'admin/ClientErrorTrendChart.tsx',
  'common/QrCodeSvg.tsx',
  'daejeon/DaejeonSeatMapSvg.tsx',
  'daegu/DaeguSeatMapSvg.tsx',
  'gocheok/GocheokFacilityGuide.tsx',
  'gocheok/GocheokSeatMapSvg.tsx',
  'gwangju/GwangjuSeatMapEditor.tsx',
  'gwangju/GwangjuSeatMapSvg.tsx',
  'incheon/IncheonSeatMapSvg.tsx',
  'jamsil/JamsilBaseballField.tsx',
  'jamsil/JamsilSeatMapSvg.tsx',
  'jamsil/JamsilSunOverlay.tsx',
  'mypage/AccountSettingsSection.tsx',
  'prediction/PredictionMatchPreviewTab.tsx',
  'prediction/PredictionMatchTabEmptyState.tsx',
  'prediction/PredictionStatsPanel.tsx',
  'sajik/SajikSeatMap.test.ts',
  'sajik/SajikSeatMapEditor.tsx',
  'sajik/SajikSeatMapSvg.tsx',
  'suwon/SuwonSeatMapSvg.tsx',
  'changwon/ChangwonSeatMapSvg.tsx',
  'DaejeonStadiumUxAuditContract.test.ts',
  'StadiumGuideRuntimeSeatMaps.test.ts',
]);

function readComponent(relativePath: string) {
  return fs.readFileSync(path.join(componentsRoot, relativePath), 'utf8');
}

function collectSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(path.relative(componentsRoot, fullPath).split(path.sep).join('/'));
    }
  }

  return files.sort();
}

test('focused user surfaces avoid decorative uppercase tracking labels', () => {
  const decorativeMicroLabelPattern = new RegExp(['uppercase', '\\s+', 'tracking'].join(''));

  for (const relativePath of focusFiles) {
    assert.doesNotMatch(
      readComponent(relativePath),
      decorativeMicroLabelPattern,
      `${relativePath} should use normal metadata labels instead of decorative uppercase tracking`,
    );
  }
});

test('focused user surfaces do not reintroduce visible dash flourishes', () => {
  const typographicDashPattern = /[\u2013\u2014]/;

  for (const relativePath of focusFiles) {
    assert.doesNotMatch(
      readComponent(relativePath),
      typographicDashPattern,
      `${relativePath} should avoid typographic dash flourishes in visible copy`,
    );
  }
});

test('summary surfaces avoid equal three-card and four-card strips', () => {
  const equalStripTokens = [
    ['grid', 'cols', '3'].join('-'),
    ['sm:grid', 'cols', '3'].join('-'),
    ['xl:grid', 'cols', '4'].join('-'),
  ];

  for (const relativePath of summaryLayoutFiles) {
    const source = readComponent(relativePath);
    for (const token of equalStripTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should avoid equal summary strip token ${token}`,
      );
    }
  }
});

test('home and prediction headers use context labels instead of eyebrow fields', () => {
  const retiredField = 'eye' + 'brow';

  for (const relativePath of [
    'home/HomeMatchPanel.tsx',
    'home/HomeScheduledMatchPanel.tsx',
    'prediction/PredictionRuntime.tsx',
    'prediction/PredictionRankingTab.tsx',
  ]) {
    assert.ok(
      !readComponent(relativePath).includes(retiredField),
      `${relativePath} should not model product headers as eyebrow blocks`,
    );
  }
});

test('auth and landing headers do not expose generic eyebrow or kicker contracts', () => {
  const retiredField = 'eye' + 'brow';
  const retiredClassTokens = [
    ['auth', 'eye' + 'brow'].join('-'),
    ['ds', 'kicker'].join('-'),
  ];

  for (const relativePath of [...authFlowFiles, ...landingHeaderFiles]) {
    const source = readComponent(relativePath);
    assert.ok(
      !source.includes(retiredField),
      `${relativePath} should not expose an eyebrow prop or field`,
    );
    for (const token of retiredClassTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should not use retired ${token} styling`,
      );
    }
  }
});

test('auth flow copy avoids template micro-labels', () => {
  const retiredAuthLabels = [
    'Account Access',
    'New Account',
    'Password Recovery',
    'Check Your Inbox',
    'Reset Password',
    'Password Updated',
    'Recovery Complete',
    'Recovery Link',
  ];

  for (const relativePath of authFlowFiles) {
    const source = readComponent(relativePath);
    for (const label of retiredAuthLabels) {
      assert.ok(
        !source.includes(label),
        `${relativePath} should not render template auth label ${label}`,
      );
    }
  }
});

test('marketing and highlight surfaces avoid equal three-card rhythm', () => {
  const equalThreeColumnTokens = [
    ['grid', 'cols', '3'].join('-'),
    ['sm:grid', 'cols', '3'].join('-'),
    ['md:grid', 'cols', '3'].join('-'),
    ['lg:grid', 'cols', '3'].join('-'),
  ];
  const equalThreeItemPattern = /\[[^\]]*0,\s*1,\s*2[^\]]*\]\.map/;

  for (const relativePath of threeCardRhythmFiles) {
    const source = readComponent(relativePath);
    for (const token of equalThreeColumnTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should use asymmetric composition instead of ${token}`,
      );
    }
    assert.doesNotMatch(
      source,
      equalThreeItemPattern,
      `${relativePath} should not render three equal placeholder cards`,
    );
  }
});

test('admin operational surfaces avoid AI-purple and decorative glass tokens', () => {
  const retiredLiteralTokens = [
    'fuchsia',
    'purple',
    'violet',
    'bg-gradient-to-r',
    'bg-gradient-to-br',
    'backdrop-blur',
    'blur-3xl',
    'data:image/svg',
  ];
  const coloredGlowPattern = /shadow-(?:amber|emerald|sky|cyan|teal|rose|red|orange|fuchsia|purple|violet|indigo)-500\//;

  for (const relativePath of adminVisualDebtFiles) {
    const source = readComponent(relativePath);
    for (const token of retiredLiteralTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should not use retired admin visual token ${token}`,
      );
    }
    assert.doesNotMatch(
      source,
      coloredGlowPattern,
      `${relativePath} should avoid colored glow shadows in admin operational surfaces`,
    );
  }
});

test('glass chrome stays limited to the top navigation capsule', () => {
  for (const relativePath of navGlassChromeFiles) {
    const source = readComponent(relativePath);
    const blurCount = source.match(/backdrop-blur/g)?.length ?? 0;
    assert.equal(
      blurCount,
      1,
      `${relativePath} should keep glass only on the top navigation capsule`,
    );
    assert.ok(
      !source.includes('backdrop-saturate'),
      `${relativePath} should not add extra glass treatment to secondary chrome`,
    );
    assert.ok(
      !source.includes('shadow-mobile-chrome'),
      `${relativePath} should keep mobile bottom navigation on a solid surface`,
    );
  }
});

test('auth loading and landing chrome use solid surfaces instead of repeated glass', () => {
  const retiredGlassTokens = [
    'backdrop-filter',
    'backdrop-blur',
    'backdrop-saturate',
    'bg-card/70',
    'bg-white/85',
    'shadow-mobile-chrome',
    'blur-3xl',
    'surface-shadow-strong',
    'bg-gradient-to-r from-primary',
  ];

  for (const relativePath of solidChromeFiles) {
    const source = readComponent(relativePath);
    for (const token of retiredGlassTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should not use repeated glass chrome token ${token}`,
      );
    }
  }
});

test('visible placeholder copy avoids generic names and example domains', () => {
  const retiredPlaceholderTokens = [
    'Jane Doe',
    'John Doe',
    '홍길동',
    '김철수',
    '테스트유저',
    '테스트 유저',
    '@username',
    'example@email.com',
    'example.com',
    'tickets.example.com',
    'ops-team',
    '02-1234-5678',
    '37.123456',
    '126.987654',
  ];

  for (const relativePath of placeholderCopyFiles) {
    const source = readComponent(relativePath);
    for (const token of retiredPlaceholderTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should not expose generic placeholder token ${token}`,
      );
    }
  }
});

test('locked operational flows avoid decorative micro-label typography', () => {
  const retiredTypographyTokens = [
    'uppercase tracking',
    'tracking-[0.16em]',
    'tracking-[0.18em]',
    'tracking-wide',
    'tracking-wider',
    'tracking-widest',
    'text-3xl font-black',
    'text-4xl font-black',
    'Decision Queue',
    'Next Action',
    'Secondary Controls',
    'Check-In Credential',
    'Visible Rows',
    'Summary Filled',
    'Source Linked',
    'Structured Coverage',
    'Failed Rows',
  ];

  for (const relativePath of typographyHierarchyLockFiles) {
    const source = readComponent(relativePath);
    for (const token of retiredTypographyTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should not reintroduce decorative typography token ${token}`,
      );
    }
  }
});

test('admin operational motion stays targeted and reduced-motion aware', () => {
  const retiredMotionTokens = [
    'animate-fade-in-up',
    'animationDelay',
    'transition-all',
    'hover:scale',
    'active:scale',
  ];

  for (const relativePath of adminMotionLockFiles) {
    const source = readComponent(relativePath);
    for (const token of retiredMotionTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should not reintroduce broad or staggered motion token ${token}`,
      );
    }

    for (const line of source.split('\n')) {
      if (/animate-(spin|pulse|ping)/.test(line)) {
        assert.ok(
          line.includes('motion-reduce:animate-none'),
          `${relativePath} animated status feedback should respect reduced motion: ${line.trim()}`,
        );
      }
    }
  }
});

test('admin and mate surfaces keep consistency lock tokens out', () => {
  const retiredConsistencyTokens = [
    'bg-gradient-radial',
    'bg-gradient-to-br',
    'bg-[radial-gradient',
    'shadow-amber-500',
    'opacity-[0.03]',
    '<svg',
    'rounded-20',
    'rounded-22',
    'rounded-14',
    'rounded-2xl',
    'rounded-3xl',
    'rounded-[',
    'bg-[#',
    'dark:bg-[#',
    'text-[#',
    'border-[#',
    'bg-white/95',
    'dark:bg-card/95',
    'backdrop-blur',
    'ADMIN CONTROL',
    'BEGA Platform Management Dashboard',
    'BEGA Platform Admin Dashboard',
  ];

  for (const relativePath of consistencyLockFiles) {
    const source = readComponent(relativePath);
    for (const token of retiredConsistencyTokens) {
      assert.ok(
        !source.includes(token),
        `${relativePath} should not reintroduce consistency drift token ${token}`,
      );
    }
  }
});

test('inline svg stays limited to brand logos, charts, QR, seat maps, and fixtures', () => {
  for (const relativePath of collectSourceFiles(componentsRoot)) {
    const source = readComponent(relativePath);
    if (!source.includes('<svg') && !source.includes('<path')) {
      continue;
    }

    assert.ok(
      inlineSvgAllowedFiles.has(relativePath),
      `${relativePath} should use the app icon family instead of hand-rolled SVG`,
    );
  }
});
