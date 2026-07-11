import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJsonSource = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const packageJson = JSON.parse(packageJsonSource) as { scripts: Record<string, string> };
const indexHtmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const viteConfigSource = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const bundleGuardSource = readFileSync(new URL('./bundle-guard.mjs', import.meta.url), 'utf8');
const mainEntrySource = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const landingSource = readFileSync(new URL('../src/components/Landing.tsx', import.meta.url), 'utf8');
const coreWebVitalsTelemetrySource = readFileSync(new URL('../src/utils/coreWebVitalsTelemetry.ts', import.meta.url), 'utf8');
const seoHeadSource = readFileSync(new URL('../src/seo/SeoHead.tsx', import.meta.url), 'utf8');
const predictionMatchScheduleDataRuntimeSource = readFileSync(
  new URL('../src/components/prediction/PredictionMatchScheduleDataRuntime.tsx', import.meta.url),
  'utf8',
);
const appRoutesSource = readFileSync(new URL('../src/components/AppRoutes.tsx', import.meta.url), 'utf8');
const rootEntryRouteSource = readFileSync(new URL('../src/components/RootEntryRoute.tsx', import.meta.url), 'utf8');
const rootEntryRouteAuthAwareSource = readFileSync(new URL('../src/components/RootEntryRouteAuthAware.tsx', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8');
const authenticatedLayoutChromeSource = readFileSync(new URL('../src/components/AuthenticatedLayoutChrome.tsx', import.meta.url), 'utf8');
const authenticatedLayoutToasterSource = readFileSync(new URL('../src/components/AuthenticatedLayoutToaster.tsx', import.meta.url), 'utf8');
const authenticatedNotificationSocketBridgeSource = readFileSync(new URL('../src/components/AuthenticatedNotificationSocketBridge.tsx', import.meta.url), 'utf8');
const authBootstrapGateSource = readFileSync(new URL('../src/components/AuthBootstrapGate.tsx', import.meta.url), 'utf8');
const deferredPretendardFontSource = readFileSync(new URL('../src/components/DeferredPretendardFont.tsx', import.meta.url), 'utf8');
const homeApiSource = readFileSync(new URL('../src/api/home.ts', import.meta.url), 'utf8');
const homeCoreApiSource = readFileSync(new URL('../src/api/homeCore.ts', import.meta.url), 'utf8');
const homeRuntimeSource = readFileSync(new URL('../src/components/HomeRuntime.tsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/components/Home.tsx', import.meta.url), 'utf8');
const homeTypesSource = readFileSync(new URL('../src/types/home.ts', import.meta.url), 'utf8');
const homeRouteStateSource = readFileSync(new URL('../src/utils/homeRouteState.ts', import.meta.url), 'utf8');
const homeGameGroupingSource = readFileSync(new URL('../src/utils/homeGameGrouping.ts', import.meta.url), 'utf8');
const homeScheduleClassificationSource = readFileSync(new URL('../src/utils/homeScheduleClassification.ts', import.meta.url), 'utf8');
const homeLoadTelemetrySource = readFileSync(new URL('../src/utils/homeLoadTelemetry.ts', import.meta.url), 'utf8');
const homeFirstLoadAuditSource = readFileSync(new URL('./home-first-load-audit.mjs', import.meta.url), 'utf8');
const homeFirstLoadReportSummarySource = readFileSync(new URL('./home-first-load-report-summary.mjs', import.meta.url), 'utf8');
const homeAuthBridgeSource = readFileSync(new URL('../src/components/home/HomeAuthBridge.tsx', import.meta.url), 'utf8');
const homeQueryProviderSource = readFileSync(new URL('../src/components/home/HomeQueryProvider.tsx', import.meta.url), 'utf8');
const homeRecoveryBannerSource = readFileSync(new URL('../src/components/home/HomeRecoveryBanner.tsx', import.meta.url), 'utf8');
const homeDeferredSurfacesSource = readFileSync(new URL('../src/components/home/HomeDeferredSurfaces.tsx', import.meta.url), 'utf8');
const homeMatchPanelSource = readFileSync(new URL('../src/components/home/HomeMatchPanel.tsx', import.meta.url), 'utf8');
const homeMatchPanelErrorStateSource = readFileSync(new URL('../src/components/home/HomeMatchPanelErrorState.tsx', import.meta.url), 'utf8');
const homeScheduledMatchPanelSource = readFileSync(new URL('../src/components/home/HomeScheduledMatchPanel.tsx', import.meta.url), 'utf8');
const homeGameCardSource = readFileSync(new URL('../src/components/home/HomeGameCard.tsx', import.meta.url), 'utf8');
const gameCardSkeletonSource = readFileSync(new URL('../src/components/home/GameCardSkeleton.tsx', import.meta.url), 'utf8');
const navbarSource = readFileSync(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');
const publicNavbarSource = readFileSync(new URL('../src/components/PublicNavbar.tsx', import.meta.url), 'utf8');
const publicNavbarDmUnreadBadgeSource = readFileSync(new URL('../src/components/PublicNavbarDmUnreadBadge.tsx', import.meta.url), 'utf8');
const cheerMobileBottomNavSource = readFileSync(new URL('../src/components/CheerMobileBottomNav.tsx', import.meta.url), 'utf8');
const cheerFeedRuntimeContentSource = readFileSync(new URL('../src/components/CheerFeedRuntimeContent.tsx', import.meta.url), 'utf8');
const cheerSidebarPanelsSource = readFileSync(new URL('../src/components/CheerSidebarPanels.tsx', import.meta.url), 'utf8');
const uiButtonSource = readFileSync(new URL('../src/components/ui/button.tsx', import.meta.url), 'utf8');
const uiInputSource = readFileSync(new URL('../src/components/ui/input.tsx', import.meta.url), 'utf8');
const uiTextareaSource = readFileSync(new URL('../src/components/ui/textarea.tsx', import.meta.url), 'utf8');
const uiPlainButtonSource = readFileSync(new URL('../src/components/ui/plain-button.tsx', import.meta.url), 'utf8');
const tailwindConfigSource = readFileSync(new URL('../tailwind.config.js', import.meta.url), 'utf8');
const dialogShadowSources = [
  '../src/components/ui/plain-dialog.tsx',
  '../src/components/ReviewDialog.tsx',
  '../src/components/home/HomeSecondaryPanels.tsx',
  '../src/components/MateCreateConfirmDialog.tsx',
  '../src/components/VerificationRequiredDialog.tsx',
  '../src/components/profile/UserListModal.tsx',
  '../src/components/profile/UserProfileModal.tsx',
  '../src/components/profile/BlockButton.tsx',
].map((sourcePath) => readFileSync(new URL(sourcePath, import.meta.url), 'utf8'));

test('keeps coach presentation helpers outside the CoachBriefing chunk', () => {
  assert.match(
    viteConfigSource,
    /id\.includes\('\/src\/utils\/predictionCoachPresentation'\)[\s\S]{0,160}return 'coach-presentation'/,
  );
});

test('keeps coach briefing cache helpers in their existing isolated chunk', () => {
  assert.match(
    viteConfigSource,
    /id\.includes\('\/src\/utils\/coachBriefingCache'\)[\s\S]{0,160}return 'coach-briefing-cache'/,
  );
});

test('keeps coach analysis text helpers outside dialog result runtime', () => {
  assert.match(
    viteConfigSource,
    /id\.includes\('\/src\/utils\/coachAnalysisText'\)[\s\S]{0,160}return 'coach-analysis-text'/,
  );
});

test('preloads the match schedule data chunk before the first Suspense render', () => {
  assert.match(
    predictionMatchScheduleDataRuntimeSource,
    /const predictionMatchScheduleDataContentModule = import\('\.\/PredictionMatchScheduleDataContent'\)/,
  );
  assert.match(
    predictionMatchScheduleDataRuntimeSource,
    /lazy\(\(\) => predictionMatchScheduleDataContentModule\)/,
  );
});

test('keeps hidden landing screenshots below the primary LCP image priority', () => {
  const primaryImage = landingSource.match(/<img\s+src=\{homeScreenshot\}[\s\S]*?\/>/)?.[0];
  const predictionImage = landingSource.match(/<img\s+src=\{predictionScreenshot\}[\s\S]*?\/>/)?.[0];
  const mateImage = landingSource.match(/<img\s+src=\{mateScreenshot\}[\s\S]*?\/>/)?.[0];

  assert.ok(primaryImage);
  assert.ok(predictionImage);
  assert.ok(mateImage);
  assert.ok(primaryImage.includes('loading="eager"'));
  assert.ok(primaryImage.includes("fetchpriority: 'high'"));
  for (const secondaryImage of [predictionImage, mateImage]) {
    assert.ok(secondaryImage.includes('loading="lazy"'));
    assert.ok(secondaryImage.includes("fetchpriority: 'low'"));
    assert.equal(secondaryImage.includes('loading="eager"'), false);
  }
});

test('keeps GA4 network loading off the initial render critical path', () => {
  assert.equal(indexHtmlSource.includes('googletagmanager.com'), false);
  assert.ok(seoHeadSource.includes('script.async = true;'));
  assert.ok(seoHeadSource.includes("window.addEventListener('load', scheduleIdle, { once: true });"));
  assert.ok(seoHeadSource.includes('window.requestIdleCallback(run, { timeout: GA4_IDLE_TIMEOUT_MS });'));
  assert.ok(seoHeadSource.includes('ensureGa4Queue();'));
  assert.ok(seoHeadSource.includes('return scheduleGa4ScriptLoad();'));
});

test('preloads /home route chunks before nested lazy route rendering', () => {
  assert.ok(appRoutesSource.includes("const shouldPreloadInitialHomeRoute = /^\\/home\\/?$/.test(initialPathname);"));
  assert.ok(appRoutesSource.includes('const shouldPreloadInitialPublicLayoutRoute = shouldPreloadInitialHomeRoute || shouldPreloadInitialCheerRoute;'));
  assert.ok(appRoutesSource.includes("const initialLayoutModulePromise = shouldPreloadInitialPublicLayoutRoute ? import('./Layout') : null;"));
  assert.ok(appRoutesSource.includes("const initialHomeModulePromise = shouldPreloadInitialHomeRoute ? import('./Home') : null;"));
  assert.ok(appRoutesSource.includes("void import('./home/HomeMatchPanel');"));
  assert.ok(appRoutesSource.includes("lazy(() => initialHomeModulePromise ?? import('./Home'))"));
  assert.match(
    appRoutesSource,
    /<Route element={<Layout authenticated={false} \/>}>\s*<Route path="\/home" element={<Home \/>} \/>/,
  );
  assert.ok(bundleGuardSource.includes("label: '/home first-load static closure'"));
  assert.ok(bundleGuardSource.includes("'src/components/home/HomeMatchPanel.tsx'"));
  assert.ok(bundleGuardSource.includes('homeFirstLoadStaticClosureResults'));
  assert.ok(bundleGuardSource.includes('maxJsBytes: 290_000'));
  assert.ok(bundleGuardSource.includes("'AppQueryProvider'"));
  assert.ok(bundleGuardSource.includes("'GameCardSkeleton-'"));
  assert.ok(bundleGuardSource.includes("'HomeRecoveryBanner-'"));
  assert.ok(bundleGuardSource.includes("'AuthenticatedLayoutChrome-'"));
  assert.ok(bundleGuardSource.includes("'skeleton-'"));
  assert.ok(bundleGuardSource.includes("'card-'"));
  assert.ok(bundleGuardSource.includes("'button-'"));
  assert.ok(bundleGuardSource.includes("'utils-'"));
  assert.ok(bundleGuardSource.includes("'errorUtils-'"));
  assert.ok(bundleGuardSource.includes("'teams-'"));
  assert.ok(bundleGuardSource.includes("'sonner-'"));
});

test('preloads /cheer route chunks before nested lazy route rendering', () => {
  assert.ok(appRoutesSource.includes("const shouldPreloadInitialCheerRoute = /^\\/cheer(?:\\/write)?\\/?$/.test(initialPathname);"));
  assert.ok(appRoutesSource.includes("const shouldPreloadInitialCheerComposer = /^\\/cheer\\/write\\/?$/.test(initialPathname);"));
  assert.ok(appRoutesSource.includes("const initialAppQueryProviderModulePromise = shouldPreloadInitialCheerRoute ? import('./AppQueryProvider') : null;"));
  assert.ok(appRoutesSource.includes("const initialCheerModulePromise = shouldPreloadInitialCheerRoute ? import('./Cheer') : null;"));
  assert.match(
    appRoutesSource,
    /if \(shouldPreloadInitialCheerRoute\) \{\s*void import\('\.\/CheerRuntime'\);\s*void import\('\.\/CheerFeedRuntimeContent'\);\s*\}/,
  );
  assert.match(
    appRoutesSource,
    /if \(shouldPreloadInitialCheerComposer\) \{\s*void import\('\.\/CheerComposerRuntime'\);\s*\}/,
  );
  assert.equal(appRoutesSource.includes('shouldPreloadInitialCheerSidebar'), false);
  assert.equal(appRoutesSource.includes("void import('./CheerSidebarPanels');"), false);
  assert.ok(appRoutesSource.includes("const AppQueryProvider = lazy(() => initialAppQueryProviderModulePromise ?? import('./AppQueryProvider'));"));
  assert.ok(appRoutesSource.includes("const Cheer = lazy(() => initialCheerModulePromise ?? import('./Cheer'));"));
  assert.match(
    appRoutesSource,
    /<Route path="\/cheer" element={<Cheer \/>} \/>/,
  );
  assert.match(
    appRoutesSource,
    /<Route path="\/cheer\/write" element={<Cheer openComposerOnMount \/>} \/>/,
  );
  const cheerFirstLoadGuard = bundleGuardSource.match(
    /route: '\/cheer first-load',[\s\S]*?\n\s*},\n/,
  )?.[0];
  assert.ok(cheerFirstLoadGuard);
  assert.ok(cheerFirstLoadGuard.includes("'src/components/AppQueryProvider.tsx'"));
  assert.ok(cheerFirstLoadGuard.includes("'src/components/CheerFeedRuntimeContent.tsx'"));
  assert.equal(cheerFirstLoadGuard.includes("'src/components/CheerComposerRuntime.tsx'"), false);
  assert.ok(cheerFirstLoadGuard.includes('maxJsGzipBytes: 155_000'));
  assert.ok(readFileSync(new URL('../src/components/CheerRuntime.tsx', import.meta.url), 'utf8').includes("from './icons/CheerShellIcons';"));
  assert.equal(readFileSync(new URL('../src/components/CheerRuntime.tsx', import.meta.url), 'utf8').includes("from './icons/PublicShellIcons';"), false);
});

test('reserves /cheer feed and sidebar space to prevent CLS', () => {
  assert.ok(cheerFeedRuntimeContentSource.includes('className="min-h-[72svh]"'));
  assert.equal(cheerFeedRuntimeContentSource.includes('lg:min-h-0'), false);
  assert.ok(cheerFeedRuntimeContentSource.includes('className="relative flex min-h-[220px] items-center justify-center"'));
  assert.ok(cheerSidebarPanelsSource.includes('className="min-h-[140px] rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card"'));
  assert.ok(cheerSidebarPanelsSource.includes('className="min-h-[188px] rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card"'));
});

test('defers the below-fold cheer ad slot outside the feed static closure', () => {
  assert.equal(cheerFeedRuntimeContentSource.includes("import AdSlot from './ads/AdSlot';"), false);
  assert.ok(cheerFeedRuntimeContentSource.includes("const AdSlot = lazy(() => import('./ads/AdSlot'));"));
  assert.ok(cheerFeedRuntimeContentSource.includes('<Suspense fallback={null}>'));
});

test('forbids the retired icon vendor chunk from production assets', () => {
  const forbiddenChunkPrefixesSource = bundleGuardSource.match(
    /const forbiddenChunkPrefixes = \[[\s\S]*?\];/,
  )?.[0];
  assert.ok(forbiddenChunkPrefixesSource);
  assert.ok(forbiddenChunkPrefixesSource.includes("'vendor-icons-'"));
  assert.equal(viteConfigSource.includes("return 'vendor-icons';"), false);
});

test('groups tiny /home first-load helpers to reduce pre-card request fanout', () => {
  assert.ok(viteConfigSource.includes("return 'home-first-load-core';"));
  for (const modulePath of [
    '/src/api/homeCore.ts',
    '/src/utils/dateKey.ts',
    '/src/utils/homeSeasonLogic.ts',
    '/src/utils/manualBaseballDataContract.ts',
  ]) {
    assert.ok(viteConfigSource.includes(modulePath));
  }
});

test('keeps root landing preload out of the /home first-load path', () => {
  assert.ok(appRoutesSource.includes("import RootEntryRoute from './RootEntryRoute';"));
  assert.ok(rootEntryRouteSource.includes("const Landing = lazy(() => import('./Landing'));"));
  assert.ok(rootEntryRouteAuthAwareSource.includes("const Landing = lazy(() => import('./Landing'));"));
  assert.equal(rootEntryRouteSource.includes("const landingModulePromise = import('./Landing');"), false);
  assert.equal(rootEntryRouteAuthAwareSource.includes("const landingModulePromise = import('./Landing');"), false);
});

test('defers public home chat chrome outside the first card critical path', () => {
  assert.ok(layoutSource.includes("const HOME_FIRST_CARD_READY_EVENT = 'bega:home-first-card-ready';"));
  assert.ok(layoutSource.includes('const PUBLIC_HOME_CHROME_MIN_DEFER_DELAY_MS = 1200;'));
  assert.ok(layoutSource.includes('const PUBLIC_HOME_CHROME_IDLE_TIMEOUT_MS = 1200;'));
  assert.ok(layoutSource.includes('const PUBLIC_HOME_CHROME_FALLBACK_DELAY_MS = 5000;'));
  assert.ok(layoutSource.includes('const PUBLIC_HOME_FOOTER_FALLBACK_DELAY_MS = 5000;'));
  assert.ok(layoutSource.includes('const PUBLIC_HOME_CHAT_CHROME_DEFER_DELAY_MS = 3200;'));
  assert.ok(layoutSource.includes('const PUBLIC_HOME_CHROME_NAV_READY_STAGE = 1;'));
  assert.ok(layoutSource.includes('const PUBLIC_HOME_CHROME_CHAT_READY_STAGE = 2;'));
  assert.ok(layoutSource.includes("const isPublicHomeRoute = !authenticated && /^\\/home\\/?$/.test(location.pathname);"));
  assert.ok(layoutSource.includes('const shouldMountChatChrome = shouldShowChatLauncher'));
  assert.ok(layoutSource.includes('publicHomeChromeReadyStage >= PUBLIC_HOME_CHROME_CHAT_READY_STAGE'));
  assert.ok(layoutSource.includes('publicHomeChromeReadyStage >= PUBLIC_HOME_CHROME_NAV_READY_STAGE'));
  assert.equal(layoutSource.includes('deferredChromeReadyPathname'), false);
  assert.equal(layoutSource.includes('deferredChatChromeReadyPathname'), false);
  assert.equal(layoutSource.includes("import PublicNavbar from './PublicNavbar';"), false);
  assert.ok(layoutSource.includes("const PublicNavbar = lazy(() => import('./PublicNavbar'));"));
  assert.ok(layoutSource.includes('const shouldMountPublicNavbar = !isPublicHomeRoute'));
  assert.ok(layoutSource.includes('<PublicNavbarFallback />'));
  assert.ok(layoutSource.includes('setPublicHomeChromeReadyStage(0);'));
  assert.ok(layoutSource.includes('setPublicHomeChromeReadyStage((stage) => Math.max(stage, PUBLIC_HOME_CHROME_NAV_READY_STAGE));'));
  assert.ok(layoutSource.includes('setPublicHomeChromeReadyStage(PUBLIC_HOME_CHROME_CHAT_READY_STAGE);'));
  assert.ok(layoutSource.includes('window.addEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);'));
  assert.ok(layoutSource.includes('homeFirstCardReady = (window as HomeFirstCardReadyWindow).__begaHomeFirstCardReadyPathname === location.pathname;'));
  assert.ok(layoutSource.includes('const readyPathname = (window as HomeFirstCardReadyWindow).__begaHomeFirstCardReadyPathname;'));
  assert.ok(layoutSource.includes('if (readyPathname !== location.pathname)'));
  assert.ok(layoutSource.includes('requestChromeWhenReady();'));
  assert.ok(layoutSource.includes('requestChatChromeWhenReady();'));
  assert.ok(layoutSource.includes('}, PUBLIC_HOME_CHROME_MIN_DEFER_DELAY_MS);'));
  assert.ok(layoutSource.includes('}, PUBLIC_HOME_CHAT_CHROME_DEFER_DELAY_MS);'));
  assert.ok(layoutSource.includes('}, PUBLIC_HOME_CHROME_FALLBACK_DELAY_MS);'));
  assert.ok(homeRuntimeSource.includes("const HOME_FIRST_CARD_READY_EVENT = 'bega:home-first-card-ready';"));
  assert.ok(homeRuntimeSource.includes('__begaHomeFirstCardReadyPathname'));
  assert.ok(homeRuntimeSource.includes('window.dispatchEvent(new Event(HOME_FIRST_CARD_READY_EVENT));'));
  assert.ok(layoutSource.includes('<AuthenticatedLayoutChrome enableAuthenticatedServices={authenticated} />'));
  assert.ok(bundleGuardSource.includes('Layout manifest avoids eager public navbar runtime'));
  assert.ok(bundleGuardSource.includes("'PublicNavbar-', 'PublicShellIcons-', 'vendor-query-', 'authStore-', 'useAuthBootstrapUiState-'"));
  assert.ok(bundleGuardSource.includes("'AuthenticatedLayoutChrome-'"));
  assert.ok(bundleGuardSource.includes("'sonner-'"));
});

test('defers public home footer outside the first card critical path', () => {
  assert.equal(layoutSource.includes("import Footer from './Footer';"), false);
  assert.ok(layoutSource.includes("const Footer = lazy(() => import('./Footer'));"));
  assert.ok(layoutSource.includes('setIsFooterRequested(false);'));
  assert.ok(layoutSource.includes('const requestFooterWhenReady = () => {'));
  assert.ok(layoutSource.includes('if (!homeFirstCardReady || hasRequestedFooter)'));
  assert.ok(layoutSource.includes('window.addEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);'));
  assert.ok(layoutSource.includes('requestFooterWhenReady();'));
  assert.ok(layoutSource.includes('}, PUBLIC_HOME_FOOTER_FALLBACK_DELAY_MS);'));
  assert.ok(layoutSource.includes('window.removeEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);'));
});

test('defers Pretendard font loading outside the /home first-card critical path', () => {
  assert.ok(deferredPretendardFontSource.includes("const PRETENDARD_STYLESHEET_HREF = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css';"));
  assert.ok(deferredPretendardFontSource.includes("const HOME_FIRST_CARD_READY_EVENT = 'bega:home-first-card-ready';"));
  assert.ok(deferredPretendardFontSource.includes('const FONT_IDLE_TIMEOUT_MS = 3000;'));
  assert.ok(deferredPretendardFontSource.includes('const HOME_FONT_FALLBACK_DELAY_MS = 5000;'));
  assert.ok(deferredPretendardFontSource.includes('__begaHomeFirstCardReadyPathname'));
  assert.ok(deferredPretendardFontSource.includes('const setWindowTimeout = window.setTimeout.bind(window);'));
  assert.ok(deferredPretendardFontSource.includes('const requestFontWhenReady = () => {'));
  assert.ok(deferredPretendardFontSource.includes('const handleHomeFirstCardReady = () => {'));
  assert.ok(deferredPretendardFontSource.includes('if (readyPathname !== pathname)'));
  assert.ok(deferredPretendardFontSource.includes('window.addEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);'));
  assert.ok(deferredPretendardFontSource.includes('homeFallbackId = setWindowTimeout(requestFontWhenReady, HOME_FONT_FALLBACK_DELAY_MS);'));
  assert.ok(deferredPretendardFontSource.includes('window.removeEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);'));
  assert.equal(deferredPretendardFontSource.includes("const delayMs = pathname === '/home' ? 1800 : 0;"), false);
});

test('keeps authenticated layout realtime and toaster internals out of the chrome shell', () => {
  assert.equal(authenticatedLayoutChromeSource.includes("from '../hooks/useNotificationSocket'"), false);
  assert.equal(authenticatedLayoutChromeSource.includes("from './ui/sonner'"), false);
  assert.equal(authenticatedLayoutChromeSource.includes("import ChatBotFloatingButton from './ChatBotFloatingButton';"), false);
  assert.ok(authenticatedLayoutChromeSource.includes("const AuthenticatedLayoutToaster = lazy(() => import('./AuthenticatedLayoutToaster'));"));
  assert.ok(authenticatedLayoutChromeSource.includes("const AuthenticatedNotificationSocketBridge = lazy(() => import('./AuthenticatedNotificationSocketBridge'));"));
  assert.ok(authenticatedLayoutChromeSource.includes("const ChatBotFloatingButton = lazy(() => import('./ChatBotFloatingButton'));"));
  assert.ok(authenticatedLayoutChromeSource.includes('enableAuthenticatedServices = true'));
  assert.ok(authenticatedLayoutChromeSource.includes('const shouldMountToaster = enableAuthenticatedServices || isChatBotRequested;'));
  assert.ok(authenticatedLayoutChromeSource.includes('enableAuthenticatedServices ? <AuthenticatedNotificationSocketBridge /> : null'));
  assert.ok(authenticatedLayoutToasterSource.includes("import { Toaster } from './ui/sonner';"));
  assert.ok(authenticatedNotificationSocketBridgeSource.includes("import { useNotificationSocket } from '../hooks/useNotificationSocket';"));
  assert.ok(bundleGuardSource.includes('AuthenticatedLayoutChrome manifest avoids eager realtime and toaster internals'));
  assert.ok(bundleGuardSource.includes("'src/hooks/useNotificationSocket.ts'"));
  assert.ok(bundleGuardSource.includes("'src/components/ChatBotFloatingButton.tsx'"));
});

test('defers public navbar DM query runtime outside the navbar shell', () => {
  assert.equal(publicNavbarSource.includes('@tanstack/react-query'), false);
  assert.equal(publicNavbarSource.includes('useQuery({'), false);
  assert.ok(publicNavbarSource.includes("const PublicNavbarDmUnreadBadge = lazy(() => import('./PublicNavbarDmUnreadBadge'));"));
  assert.ok(publicNavbarSource.includes('<PublicNavbarDmUnreadBadge />'));
  assert.ok(publicNavbarDmUnreadBadgeSource.includes("from '@tanstack/react-query'"));
  assert.ok(publicNavbarDmUnreadBadgeSource.includes('QueryClientProvider'));
  assert.ok(publicNavbarDmUnreadBadgeSource.includes('useQuery({'));
  assert.ok(bundleGuardSource.includes('PublicNavbar manifest avoids eager query runtime'));
  assert.ok(bundleGuardSource.includes("'vendor-query-', 'queryClient-'"));
});

test('skips no-op auth bootstrap runtime before loading its chunk on public routes', () => {
  assert.match(authBootstrapGateSource, /shouldMountAuthBootstrapRuntime/);
  assert.match(authBootstrapGateSource, /hasInjectedAuthProfileForTests/);
  assert.match(authBootstrapGateSource, /const LazyAuthBootstrap = lazy\(\(\) => import\('\.\/AuthBootstrap'\)\)/);
  assert.match(authBootstrapGateSource, /if \(shouldSkipAuthBootstrap\(pathname\)\) \{/);
});

test('keeps the /home first-card panel on the home-only card implementation', () => {
  assert.ok(homeMatchPanelSource.includes("import HomeGameCard from './HomeGameCard';"));
  assert.equal(homeMatchPanelSource.includes("from '../GameCard'"), false);
  assert.equal(homeMatchPanelSource.includes('variant="home"'), false);
});

test('defers home ad slot outside the first-card critical path', () => {
  assert.equal(homeRuntimeSource.includes("import AdSlot from './ads/AdSlot';"), false);
  assert.equal(homeRuntimeSource.includes("const LazyAdSlot = lazy(() => import('./ads/AdSlot'));"), false);
  assert.ok(homeRuntimeSource.includes("const LazyHomeDeferredSurfaces = lazy(() => import('./home/HomeDeferredSurfaces'));"));
  assert.ok(homeDeferredSurfacesSource.includes("const LazyAdSlot = lazy(() => import('../ads/AdSlot'));"));
  assert.ok(homeDeferredSurfacesSource.includes('const [shouldMountAdSlot, setShouldMountAdSlot] = useState(false);'));
  assert.ok(homeDeferredSurfacesSource.includes('const HOME_DEFERRED_AD_SLOT_DELAY_MS = 400;'));
  assert.ok(homeDeferredSurfacesSource.includes('HOME_DEFERRED_AD_SLOT_DELAY_MS'));
  assert.ok(homeDeferredSurfacesSource.includes('{shouldMountAdSlot ? ('));
});

test('defers home secondary panels with a real post-card delay before idle work', () => {
  assert.equal(homeRuntimeSource.includes("const LazyHomeSecondaryPanels = lazy(() => import('./home/HomeSecondaryPanelsContainer'));"), false);
  assert.ok(homeRuntimeSource.includes("const LazyHomeDeferredSurfaces = lazy(() => import('./home/HomeDeferredSurfaces'));"));
  assert.ok(homeRuntimeSource.includes('const [isHomeFirstCardReady, setIsHomeFirstCardReady] = useState(false);'));
  assert.ok(homeRuntimeSource.includes('setIsHomeFirstCardReady(false);'));
  assert.ok(homeRuntimeSource.includes('setIsHomeFirstCardReady(true);'));
  assert.ok(homeRuntimeSource.includes('if (!isHomeFirstCardReady)'));
  assert.ok(homeRuntimeSource.includes('const HOME_DEFERRED_SURFACES_DEFER_DELAY_MS = 1800;'));
  assert.ok(homeRuntimeSource.includes('const HOME_DEFERRED_SURFACES_IDLE_TIMEOUT_MS = 1200;'));
  assert.ok(homeRuntimeSource.includes('if (shouldMountDeferredSurfaces)'));
  assert.ok(homeRuntimeSource.includes('if (!isHomeFirstCardReady)'));
  assert.ok(homeRuntimeSource.includes('const mountDeferredSurfaces = () => {'));
  assert.ok(homeRuntimeSource.includes('setShouldMountDeferredSurfaces(true);'));
  assert.ok(homeRuntimeSource.includes('deferredSurfacesIdleCallbackRef.current = window.requestIdleCallback(mountDeferredSurfaces'));
  assert.ok(homeRuntimeSource.includes('}, HOME_DEFERRED_SURFACES_DEFER_DELAY_MS)'));
  assert.ok(homeRuntimeSource.includes('timeout: HOME_DEFERRED_SURFACES_IDLE_TIMEOUT_MS'));
  assert.ok(homeRuntimeSource.includes('[clearDeferredSurfacesMount, isHomeFirstCardReady, shouldMountDeferredSurfaces]'));
  assert.ok(homeRuntimeSource.includes('typedWindow.__begaHomeFirstCardReadyPathname = window.location.pathname;'));
  assert.ok(homeRuntimeSource.includes('if (showCalendar)'));
  assert.equal(homeRuntimeSource.includes('if (showCalendar || shouldMountWelcomeGuide)'), false);
  assert.equal(homeRuntimeSource.includes('shouldMountWelcomeGuide'), false);
  assert.equal(homeRuntimeSource.includes('bega_dont_show_guide'), false);
  assert.equal(homeRuntimeSource.includes('document.body.style.overflow'), false);
  assert.equal(homeRuntimeSource.includes('calendarMonth'), false);
  assert.equal(homeRuntimeSource.includes('calendarDialogTitleId'), false);
  assert.equal(homeRuntimeSource.includes('getCalendarMonth'), false);
  assert.equal(homeRuntimeSource.includes('useId'), false);
  assert.equal(homeRuntimeSource.includes('onNavigate'), false);
  assert.equal(homeSource.includes('onNavigate'), false);
  assert.equal(homeTypesSource.includes('HomeProps'), false);
  assert.ok(homeDeferredSurfacesSource.includes('const [shouldMountWelcomeGuide, setShouldMountWelcomeGuide] = useState(false);'));
  assert.ok(homeDeferredSurfacesSource.includes("localStorage.getItem('bega_dont_show_guide')"));
  assert.ok(homeDeferredSurfacesSource.includes('document.body.style.overflow'));
  assert.ok(homeDeferredSurfacesSource.includes("event.key === 'Escape'"));
  assert.ok(homeDeferredSurfacesSource.includes('const calendarDialogTitleId = useId();'));
  assert.ok(homeDeferredSurfacesSource.includes('const [calendarMonth, setCalendarMonth] = useState(() => getCalendarMonth(selectedDate));'));
  assert.ok(homeDeferredSurfacesSource.includes("import { useNavigate } from 'react-router-dom';"));
  assert.ok(homeDeferredSurfacesSource.includes("onNavigateToCheer={() => navigate('/cheer')}"));
  assert.ok(homeDeferredSurfacesSource.includes("onNavigateToMate={() => navigate('/mate')}"));
  assert.ok(homeDeferredSurfacesSource.includes('onNavigateToCheerPost={(postId) => navigate(`/cheer?postId=${postId}`)}'));
  assert.ok(homeDeferredSurfacesSource.includes('onSelectFeaturedMate={(mate) => navigate(`/mate/${mate.id}`, {'));
  assert.ok(homeDeferredSurfacesSource.includes("const LazyHomeSecondaryPanels = lazy(() => import('./HomeSecondaryPanelsContainer'));"));
  assert.ok(homeDeferredSurfacesSource.includes('<LazyHomeSecondaryPanels'));
  assert.ok(bundleGuardSource.includes('Home route manifest keeps deferred surfaces lazy'));
  assert.ok(bundleGuardSource.includes("'HomeDeferredSurfaces-'"));
});

test('defers home recovery banner outside the first-card static path', () => {
  assert.ok(homeRuntimeSource.includes("const LazyHomeRecoveryBanner = lazy(() => import('./home/HomeRecoveryBanner'));"));
  assert.ok(homeRuntimeSource.includes('<LazyHomeRecoveryBanner'));
  assert.equal(homeRuntimeSource.includes('MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE'), false);
  assert.equal(homeRuntimeSource.includes('data-testid="home-global-recovery"'), false);
  assert.ok(homeRecoveryBannerSource.includes('MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE'));
  assert.ok(homeRecoveryBannerSource.includes('data-testid="home-global-recovery"'));
  assert.ok(bundleGuardSource.includes("'src/components/home/HomeRecoveryBanner.tsx'"));
  assert.ok(bundleGuardSource.includes("'HomeRecoveryBanner-'"));
});

test('defers scheduled home match panel outside the first-card static path', () => {
  assert.ok(homeMatchPanelSource.includes("const LazyHomeScheduledMatchPanel = lazy(() => import('./HomeScheduledMatchPanel'));"));
  assert.ok(homeMatchPanelSource.includes('<LazyHomeScheduledMatchPanel'));
  assert.equal(homeMatchPanelSource.includes("formatSourceDateLabel"), false);
  assert.ok(homeScheduledMatchPanelSource.includes("import { formatSourceDateLabel } from '../../utils/homeSeasonLogic';"));
  assert.ok(homeScheduledMatchPanelSource.includes('data-testid="home-scheduled-secondary-toggle"'));
  assert.ok(homeRuntimeSource.includes('const EMPTY_SCHEDULED_GAME_PARTITIONS'));
  assert.ok(homeRuntimeSource.includes('const hasScheduledPrimaryGame = useMemo('));
  assert.ok(homeRuntimeSource.includes('() => hasPrimaryScheduledGame(scheduledGames)'));
  assert.ok(homeRuntimeSource.includes('activeTabIsScheduled ? partitionScheduledGames(scheduledGames) : EMPTY_SCHEDULED_GAME_PARTITIONS'));
  assert.equal(homeRuntimeSource.includes('() => partitionScheduledGames(scheduledGames)'), false);
  assert.ok(homeRuntimeSource.includes('() => activeTabIsScheduled ? groupGamesBySourceDate(scheduledPrimaryGames, selectedDateKey) : EMPTY_GROUPED_GAMES_BY_SOURCE_DATE'));
  assert.ok(homeRuntimeSource.includes('() => activeTabIsScheduled ? groupGamesBySourceDate(scheduledSecondaryGames, selectedDateKey) : EMPTY_GROUPED_GAMES_BY_SOURCE_DATE'));
  assert.ok(homeRuntimeSource.includes('[activeTabIsScheduled, scheduledPrimaryGames, selectedDateKey]'));
  assert.ok(homeRuntimeSource.includes('[activeTabIsScheduled, scheduledSecondaryGames, selectedDateKey]'));
  assert.ok(homeRuntimeSource.includes('scheduledPrimaryCount: hasScheduledPrimaryGame ? 1 : 0'));
  assert.equal(homeRuntimeSource.includes('scheduledPrimaryCount: scheduledPrimaryGames.length'), false);
  assert.ok(bundleGuardSource.includes("'HomeScheduledMatchPanel-'"));
});

test('defers home match error UI outside the successful first-card static path', () => {
  assert.ok(homeMatchPanelSource.includes("const LazyHomeMatchPanelErrorState = lazy(() => import('./HomeMatchPanelErrorState'));"));
  assert.ok(homeMatchPanelSource.includes('<LazyHomeMatchPanelErrorState'));
  assert.equal(homeMatchPanelSource.includes('HOME_MATCH_ERROR_PANEL_CLASS'), false);
  assert.equal(homeMatchPanelSource.includes('HOME_MATCH_RETRY_BUTTON_CLASS'), false);
  assert.equal(homeMatchPanelSource.includes('HOME_MATCH_REFRESH_ICON_CLASS'), false);
  assert.ok(homeMatchPanelSource.includes('경기 상태를 확인하고 있습니다.'));
  assert.ok(homeMatchPanelErrorStateSource.includes('HOME_MATCH_ERROR_PANEL_CLASS'));
  assert.ok(homeMatchPanelErrorStateSource.includes('HOME_MATCH_RETRY_BUTTON_CLASS'));
  assert.ok(homeMatchPanelErrorStateSource.includes('다시 시도'));
  assert.ok(bundleGuardSource.includes("'HomeMatchPanelErrorState-'"));
});

test('keeps inactive league arrays out of the /home first-card calculation path', () => {
  assert.ok(homeGameGroupingSource.includes('export const summarizeHomeLeagueGames'));
  assert.ok(homeRuntimeSource.includes("import { groupGamesBySourceDate, summarizeHomeLeagueGames } from '../utils/homeGameGrouping';"));
  assert.equal(homeRuntimeSource.includes('partitionGamesByLeague(games)'), false);
  assert.ok(homeRuntimeSource.includes('() => summarizeHomeLeagueGames(games, activeLeagueTab)'));
  assert.ok(homeRuntimeSource.includes('activeStandardGames,'));
  assert.ok(homeRuntimeSource.includes('Math.max(regularSeasonCount, postSeasonCount, koreanSeriesCount)'));
  assert.ok(homeRuntimeSource.includes('regularCount: regularSeasonCount'));
  assert.ok(homeRuntimeSource.includes('postseasonCount: postSeasonCount'));
  assert.ok(homeRuntimeSource.includes('koreanSeriesCount,'));
});

test('keeps GameCardSkeleton outside the /home first-card static path', () => {
  assert.equal(homeRuntimeSource.includes('GameCardSkeleton'), false);
  assert.equal(homeMatchPanelSource.includes('GameCardSkeleton'), false);
  assert.ok(homeRuntimeSource.includes('function HomeMatchPanelFallbackCard'));
  assert.ok(homeRuntimeSource.includes('function HomeMatchPanelSuspenseFallback'));
  assert.equal(homeRuntimeSource.includes('const fallbackCards = useMemo'), false);
  assert.equal(homeRuntimeSource.includes('const matchPanelFallback = ('), false);
  assert.ok(homeRuntimeSource.includes('<HomeMatchPanelSuspenseFallback'));
  assert.ok(homeMatchPanelSource.includes('LoadingCardComponent: ComponentType'));
  assert.ok(homeMatchPanelSource.includes('<LoadingCardComponent key='));
  assert.equal(homeMatchPanelSource.includes('scheduled-loading-card'), false);
  assert.ok(homeMatchPanelSource.includes('예정 경기 화면을 준비하고 있습니다.'));
  assert.ok(homeRuntimeSource.includes('LoadingCardComponent={HomeMatchPanelFallbackCard}'));
  assert.ok(homeScheduledMatchPanelSource.includes("import { GameCardSkeleton } from './GameCardSkeleton';"));
  assert.ok(bundleGuardSource.includes("'src/components/home/GameCardSkeleton.tsx'"));
  assert.ok(bundleGuardSource.includes("'GameCardSkeleton-'"));
});

test('caps /home loading placeholders to the first-card viewport budget', () => {
  assert.ok(homeRuntimeSource.includes('const MIN_LOADING_CARD_COUNT = 5;'));
  assert.ok(homeRuntimeSource.includes('const LOADING_CARD_COUNT_MAX = MIN_LOADING_CARD_COUNT;'));
  assert.ok(homeRuntimeSource.includes('matchLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;'));
  assert.ok(homeRuntimeSource.includes('scheduledLoadingCardCountRef.current = LOADING_CARD_COUNT_MAX;'));
  assert.equal(homeRuntimeSource.includes('const LOADING_CARD_COUNT_MAX = 9;'), false);
});

test('defers home live polling runtime outside the first-card critical path', () => {
  assert.equal(homeRuntimeSource.includes("import { fetchGameLiveSummaries } from '../api/prediction';"), false);
  assert.equal(homeRuntimeSource.includes("from '../utils/liveGame'"), false);
  assert.ok(homeRuntimeSource.includes('const buildHomeLivePollingCandidateKey = ('));
  assert.equal(homeRuntimeSource.includes('[...games, ...scheduledGames]'), false);
  assert.ok(homeRuntimeSource.includes('let candidateKey ='));
  assert.ok(homeRuntimeSource.includes('for (const game of games)'));
  assert.ok(homeRuntimeSource.includes('for (const game of scheduledGames)'));
  assert.ok(homeRuntimeSource.includes('const [shouldResolveHomeLivePollingCandidateKey, setShouldResolveHomeLivePollingCandidateKey] = useState(false);'));
  assert.ok(homeRuntimeSource.includes('setShouldResolveHomeLivePollingCandidateKey(false);'));
  assert.ok(homeRuntimeSource.includes('setShouldResolveHomeLivePollingCandidateKey(true);'));
  assert.ok(homeRuntimeSource.includes('() => shouldResolveHomeLivePollingCandidateKey'));
  assert.ok(homeRuntimeSource.includes("? buildHomeLivePollingCandidateKey(games, scheduledGames, selectedDateKey)"));
  assert.ok(homeRuntimeSource.includes("[games, scheduledGames, selectedDateKey, shouldResolveHomeLivePollingCandidateKey]"));
  assert.equal(homeRuntimeSource.includes('() => buildHomeLivePollingCandidateKey(games, scheduledGames, selectedDateKey)'), false);
  assert.ok(homeRuntimeSource.includes('const HOME_LIVE_POLLING_DEFER_DELAY_MS = 1200;'));
  assert.ok(homeRuntimeSource.includes('const HOME_LIVE_POLLING_IDLE_TIMEOUT_MS = 1200;'));
  assert.ok(homeRuntimeSource.includes('startTimeoutId = globalThis.setTimeout(() =>'));
  assert.ok(homeRuntimeSource.includes('timeout: HOME_LIVE_POLLING_IDLE_TIMEOUT_MS'));
  assert.ok(homeRuntimeSource.includes('window.cancelIdleCallback(startIdleCallbackId);'));
  assert.ok(homeRuntimeSource.includes("import('../utils/liveGame')"));
  assert.ok(homeRuntimeSource.includes("import('../api/prediction')"));
  assert.ok(homeRuntimeSource.includes('selectHomeLivePollingGameIds(games, scheduledGames, selectedDateKey)'));
});

test('defers home load telemetry formatting outside the first-card critical path', () => {
  assert.ok(homeRuntimeSource.includes('const HOME_LOAD_TELEMETRY_IDLE_TIMEOUT_MS = 1800;'));
  assert.ok(homeRuntimeSource.includes("import('../utils/homeLoadTelemetry')"));
  assert.ok(homeRuntimeSource.includes('requestIdleCallback(loadTelemetry'));
  assert.equal(homeRuntimeSource.includes('homeLoadLogContext'), false);
  assert.equal(homeRuntimeSource.includes("console.info('[HomeLoad]'"), false);
  assert.equal(homeRuntimeSource.includes("console.warn('[HomeLoad]'"), false);
  assert.equal(homeRuntimeSource.includes('home_load_completed'), false);
  assert.ok(homeLoadTelemetrySource.includes('homeLoadLogContext'));
  assert.ok(homeLoadTelemetrySource.includes("console.info('[HomeLoad]'"));
  assert.ok(homeLoadTelemetrySource.includes('home_load_completed'));
  assert.ok(homeLoadTelemetrySource.includes('home_load_manual_data_required'));
  assert.ok(bundleGuardSource.includes("'homeLoadTelemetry-'"));
});

test('defers Core Web Vitals RUM outside the initial app entry', () => {
  assert.ok(mainEntrySource.includes("void import('./utils/coreWebVitalsTelemetry')"));
  assert.equal(mainEntrySource.includes("import { startCoreWebVitalsTelemetry }"), false);
  assert.ok(mainEntrySource.includes('if (import.meta.env.PROD)'));
  assert.ok(coreWebVitalsTelemetrySource.includes("from 'web-vitals'"));
  assert.ok(coreWebVitalsTelemetrySource.includes('onLCP'));
  assert.ok(coreWebVitalsTelemetrySource.includes('onCLS'));
  assert.ok(coreWebVitalsTelemetrySource.includes('onINP'));
  assert.equal(coreWebVitalsTelemetrySource.includes('new PerformanceObserver'), false);
  assert.ok(coreWebVitalsTelemetrySource.includes("cwv_lcp"));
  assert.ok(coreWebVitalsTelemetrySource.includes("cwv_cls"));
  assert.ok(coreWebVitalsTelemetrySource.includes("cwv_inp"));
  assert.ok(coreWebVitalsTelemetrySource.includes("normalizeCwvPath"));
  assert.ok(bundleGuardSource.includes("'coreWebVitalsTelemetry-'"));
});

test('keeps public shell icon bundle out of the /home first-card path', () => {
  for (const source of [homeRuntimeSource, homeRecoveryBannerSource, homeMatchPanelSource, homeScheduledMatchPanelSource, homeGameCardSource]) {
    assert.equal(source.includes('PublicShellIcons'), false);
    assert.equal(source.includes('HomeIcons'), false);
  }

  assert.equal(homeRuntimeSource.includes('ChevronLeftIcon'), false);
  assert.equal(homeRuntimeSource.includes('ChevronRightIcon'), false);
  assert.equal(homeRuntimeSource.includes('FlameIcon'), false);
  assert.equal(homeRuntimeSource.includes('SpinnerIcon'), false);
  assert.equal(homeRuntimeSource.includes('HOME_INLINE_SPINNER_CLASS'), false);
  assert.equal(homeRuntimeSource.includes('if (!leagueStartDates)'), false);
  assert.ok(homeRuntimeSource.includes('HOME_CSS_CHEVRON_LEFT_CLASS'));
  assert.ok(homeRuntimeSource.includes('HOME_CSS_CHEVRON_RIGHT_CLASS'));
  assert.ok(homeRuntimeSource.includes('HOME_CSS_FLAME_CLASS'));
  assert.ok(homeRecoveryBannerSource.includes('HOME_RECOVERY_REFRESH_ICON_CLASS'));
  assert.ok(homeMatchPanelErrorStateSource.includes('HOME_MATCH_REFRESH_ICON_CLASS'));
  assert.ok(homeGameCardSource.includes('HOME_GAME_CLOCK_ICON_CLASS'));
  assert.ok(bundleGuardSource.includes('Home route manifest avoids public shell icons'));
  assert.ok(bundleGuardSource.includes('HomeMatchPanel manifest avoids public shell icons'));
  assert.ok(bundleGuardSource.includes("forbiddenImportSubstrings: ['PublicShellIcons-']"));
  assert.ok(bundleGuardSource.includes("'HomeIcons'"));
});

test('defers home team logos outside the HomeMatchPanel static import path', () => {
  assert.equal(homeGameCardSource.includes("import TeamLogo from '../TeamLogo';"), false);
  assert.ok(homeGameCardSource.includes("const LazyTeamLogo = lazy(() => import('../TeamLogo'));"));
  assert.ok(homeGameCardSource.includes('function HomeTeamLogoFallback'));
  assert.ok(homeGameCardSource.includes('shouldMountTeamLogo = true'));
  assert.ok(homeGameCardSource.includes('if (!shouldMount)'));
  assert.ok(homeGameCardSource.includes('return <HomeTeamLogoFallback team={team} label={label} className={className} />;'));
  assert.ok(homeGameCardSource.includes('<Suspense fallback={<HomeTeamLogoFallback'));
  assert.ok(homeRuntimeSource.includes('const [shouldMountHomeTeamLogos, setShouldMountHomeTeamLogos] = useState(false);'));
  assert.ok(homeRuntimeSource.includes('setShouldMountHomeTeamLogos(false);'));
  assert.ok(homeRuntimeSource.includes('setShouldMountHomeTeamLogos(true);'));
  assert.ok(homeRuntimeSource.includes('shouldMountTeamLogos={shouldMountHomeTeamLogos}'));
  assert.ok(homeMatchPanelSource.includes('shouldMountTeamLogos: boolean;'));
  assert.ok(homeMatchPanelSource.includes('shouldMountTeamLogo={shouldMountTeamLogos}'));
  assert.ok(homeScheduledMatchPanelSource.includes('shouldMountTeamLogos: boolean;'));
  assert.ok(homeScheduledMatchPanelSource.includes('shouldMountTeamLogo={shouldMountTeamLogos}'));
  assert.ok(bundleGuardSource.includes('HomeMatchPanel manifest avoids eager team logo'));
  assert.ok(bundleGuardSource.includes("'src/components/TeamLogo.tsx', 'TeamLogo-'"));
});

test('defers home auth runtime and query client outside the first-card static path', () => {
  assert.equal(homeRuntimeSource.includes("from '../store/authStore'"), false);
  assert.equal(homeRuntimeSource.includes("import { queryClient } from '../lib/queryClient';"), false);
  assert.equal(homeRuntimeSource.includes('@tanstack/react-query'), false);
  assert.equal(homeRuntimeSource.includes("import('../lib/queryClient')"), false);
  assert.equal(homeRuntimeSource.includes('getHomeBootstrapQueryOptions'), false);
  assert.equal(homeRuntimeSource.includes('getHomeScopedNavigationQueryOptions'), false);
  assert.equal(homeRuntimeSource.includes('loadHomeQueryClient'), false);
  assert.equal(homeRuntimeSource.includes("const LazyHomeAuthBridge = lazy(() => import('./home/HomeAuthBridge'));"), false);
  assert.equal(homeRuntimeSource.includes('LazyHomeAuthBridge'), false);
  assert.equal(homeRuntimeSource.includes('shouldMountHomeAuthBridge'), false);
  assert.equal(homeRuntimeSource.includes("const LazyHomeQueryProvider = lazy(() => import('./home/HomeQueryProvider'));"), false);
  assert.equal(homeRuntimeSource.includes('<LazyHomeQueryProvider>'), false);
  assert.ok(homeRuntimeSource.includes("const LazyHomeDeferredSurfaces = lazy(() => import('./home/HomeDeferredSurfaces'));"));
  assert.ok(homeDeferredSurfacesSource.includes("const LazyHomeAuthBridge = lazy(() => import('./HomeAuthBridge'));"));
  assert.ok(homeDeferredSurfacesSource.includes("const LazyHomeQueryProvider = lazy(() => import('./HomeQueryProvider'));"));
  assert.ok(homeDeferredSurfacesSource.includes('<LazyHomeQueryProvider>'));
  assert.ok(homeRuntimeSource.includes('fetchHomeBootstrapWithRetry'));
  assert.ok(homeRuntimeSource.includes('fetchHomeScopedNavigation(anchorDate, scope, anchorDate.getFullYear())'));
  assert.ok(homeRuntimeSource.includes('deferredSurfacesTimeoutRef'));
  assert.ok(homeRuntimeSource.includes('deferredSurfacesIdleCallbackRef'));
  assert.ok(homeRuntimeSource.includes('clearDeferredSurfacesMount'));
  assert.ok(homeRuntimeSource.includes('}, HOME_DEFERRED_SURFACES_DEFER_DELAY_MS)'));
  assert.ok(homeRuntimeSource.includes('timeout: HOME_DEFERRED_SURFACES_IDLE_TIMEOUT_MS'));
  assert.ok(homeAuthBridgeSource.includes("from '../../store/authStore'"));
  assert.ok(homeQueryProviderSource.includes("from '@tanstack/react-query'"));
  assert.ok(homeQueryProviderSource.includes("from '../../lib/queryClient'"));
  assert.ok(homeQueryProviderSource.includes('QueryClientProvider'));
  assert.ok(bundleGuardSource.includes('Home route manifest avoids eager auth runtime'));
  assert.ok(bundleGuardSource.includes("'authStore-', 'vendor-zustand-', 'loginRedirect-', 'queryClient-', 'vendor-query-', 'src/api/home.ts'"));
});

test('keeps /home runtime on hook-free home core APIs', () => {
  assert.ok(homeRuntimeSource.includes("} from '../api/homeCore';"));
  assert.equal(homeRuntimeSource.includes("} from '../api/home';"), false);
  assert.equal(homeRuntimeSource.includes('@tanstack/react-query'), false);
  assert.equal(homeRuntimeSource.includes('getHomeBootstrapQueryOptions'), false);
  assert.equal(homeRuntimeSource.includes('getHomeScopedNavigationQueryOptions'), false);
  assert.ok(homeRuntimeSource.includes('fetchHomeScopedNavigation'));
  assert.ok(homeRuntimeSource.includes('shouldRetryHomeBootstrapQuery'));
  assert.equal(homeRuntimeSource.includes("from './ui/button'"), false);
  assert.equal(homeRuntimeSource.includes("from '../utils/errorUtils'"), false);
  assert.ok(homeRuntimeSource.includes("} from '../utils/manualBaseballDataContract';"));
  assert.ok(homeApiSource.includes("import { useQuery } from '@tanstack/react-query';"));
  assert.ok(homeApiSource.includes("} from './homeCore';"));
  assert.equal(homeCoreApiSource.includes('@tanstack/react-query'), false);
  assert.equal(homeCoreApiSource.includes('useQuery'), false);
});

test('keeps /home scheduled classification out of prediction deep-link logic', () => {
  assert.equal(homeRuntimeSource.includes("from '../utils/predictionHomeLogic'"), false);
  assert.ok(homeRuntimeSource.includes("from '../utils/homeScheduleClassification'"));
  assert.ok(homeRuntimeSource.includes('hasPrimaryScheduledGame'));
  assert.ok(homeRuntimeSource.includes('if (hasPrimaryScheduledGame(scheduledGames))'));
  assert.equal(homeRuntimeSource.includes('const { primary: upcomingScheduled } = partitionScheduledGames(scheduledGames);'), false);
  assert.equal(homeMatchPanelSource.includes("from '../../utils/predictionHomeLogic'"), false);
  assert.ok(homeMatchPanelSource.includes("from '../../utils/homeScheduleClassification'"));
  assert.equal(homeRouteStateSource.includes("predictionHomeLogic"), false);
  assert.ok(homeRouteStateSource.includes("from './dateKey'"));
  assert.ok(homeRouteStateSource.includes("from './homeScheduleClassification'"));
  assert.ok(homeScheduleClassificationSource.includes('hasPrimaryScheduledGame'));
  assert.ok(homeScheduleClassificationSource.includes('partitionScheduledGames'));
  assert.ok(homeScheduleClassificationSource.includes('shouldAutoSwitchToScheduled'));
  assert.ok(bundleGuardSource.includes("'predictionHomeLogic'"));
});

test('reports deferred home resources that load before the first game card', () => {
  assert.ok(homeFirstLoadAuditSource.includes('homeDeferredResourcePattern'));
  assert.ok(homeFirstLoadAuditSource.includes('deferredBeforeFirstCardResources'));
  assert.ok(homeFirstLoadAuditSource.includes('preCardScriptResourceCount'));
  assert.ok(homeFirstLoadAuditSource.includes('latestPreCardScriptResponseEndMs'));
  assert.ok(homeFirstLoadAuditSource.includes('criticalResources'));
  assert.ok(homeFirstLoadAuditSource.includes('slowestResources'));
  assert.ok(homeFirstLoadAuditSource.includes('formatCriticalResourceSummary'));
  assert.ok(homeFirstLoadAuditSource.includes('formatDeferredResourceSummary'));
  assert.ok(homeFirstLoadAuditSource.includes('formatMetric(resource.responseEnd)'));
  assert.ok(homeFirstLoadAuditSource.includes('resourcesWithCardTiming'));
  assert.ok(homeFirstLoadAuditSource.includes('cardTiming'));
  assert.ok(homeFirstLoadAuditSource.includes('firstCardDeltaMs'));
  assert.ok(homeFirstLoadAuditSource.includes('entry.responseEnd - firstGameCardAt'));
  assert.ok(homeFirstLoadAuditSource.includes('formatResourceCardTiming'));
  assert.ok(homeFirstLoadAuditSource.includes("'pre-card'"));
  assert.ok(homeFirstLoadAuditSource.includes("'post-card'"));
  assert.ok(homeFirstLoadAuditSource.includes('Math.abs(resource.responseEnd - entry.firstGameCardMs)'));
  assert.ok(homeFirstLoadAuditSource.includes('Critical resources'));
  assert.ok(homeFirstLoadAuditSource.includes('/api/home/bootstrap'));
  assert.ok(homeFirstLoadAuditSource.includes('HomeMatchPanel-'));
  for (const resourceName of [
    'AuthenticatedLayoutChrome-',
    'HomeSecondaryPanels-',
    'HomeSecondaryPanelsContainer-',
    'AdSlot-',
    'liveGame-',
    'sonner-',
    'stomp-',
  ]) {
    assert.ok(homeFirstLoadAuditSource.includes(resourceName));
  }
});

test('annotates home first-load report resources against the current build', () => {
  assert.equal(
    packageJson.scripts['qa:home:first-load:summary:fresh'],
    'node scripts/home-first-load-report-summary.mjs --limit 1 --require-current-build',
  );
  assert.equal(
    packageJson.scripts['qa:home:first-load:summary:fresh:prod'],
    'node scripts/home-first-load-report-summary.mjs --root ../output/playwright/home-first-load-prod --all --require-current-build',
  );
  assert.equal(
    packageJson.scripts['qa:home:first-load:mock:prod:fresh'],
    'npm run qa:home:first-load:mock:prod && npm run qa:home:first-load:summary:fresh:prod',
  );
  assert.ok(packageJson.scripts['gate:home:first-load'].includes('qa:home:first-load:mock:prod:fresh'));
  assert.ok(homeFirstLoadReportSummarySource.includes('defaultDistAssetsRoot'));
  assert.ok(homeFirstLoadReportSummarySource.includes('defaultBuildReportPath'));
  assert.ok(homeFirstLoadReportSummarySource.includes('current exact'));
  assert.ok(homeFirstLoadReportSummarySource.includes('current family'));
  assert.ok(homeFirstLoadReportSummarySource.includes('stale asset'));
  assert.ok(homeFirstLoadReportSummarySource.includes('older-than-current-build'));
  assert.ok(homeFirstLoadReportSummarySource.includes('not fresh runtime proof'));
  assert.ok(homeFirstLoadReportSummarySource.includes('--require-current-build'));
  assert.ok(homeFirstLoadReportSummarySource.includes('evaluateFreshnessGate'));
  assert.ok(homeFirstLoadReportSummarySource.includes('freshnessGate'));
  assert.ok(homeFirstLoadReportSummarySource.includes('candidateFreshness'));
  assert.ok(homeFirstLoadReportSummarySource.includes('rerun home first-load audit before treating this as current-build proof'));
});

test('keeps high-fanout chrome and home card CSS on named Tailwind tokens', () => {
  assert.ok(tailwindConfigSource.includes("'navbar-capsule': 'var(--shadow-navbar-capsule)'"));
  assert.ok(tailwindConfigSource.includes("'home-game-card': '5.5rem minmax(0,1.25fr)"));
  assert.ok(navbarSource.includes('shadow-navbar-capsule'));
  assert.ok(publicNavbarSource.includes('shadow-navbar-capsule'));
  assert.ok(cheerMobileBottomNavSource.includes('shadow-cheer-mobile-chrome'));
  assert.ok(homeMatchPanelSource.includes('lg:grid-cols-home-game-card'));
  assert.equal(homeMatchPanelSource.includes("from '../ui/button'"), false);
  assert.ok(homeGameCardSource.includes('grid-cols-home-game-card'));
  assert.equal(homeGameCardSource.includes("from '../ui/card'"), false);
  assert.equal(homeGameCardSource.includes("from '../../constants/teams'"), false);
  assert.equal(homeGameCardSource.includes("from '../../constants/teamIdentity'"), false);
  assert.equal(homeGameCardSource.includes("from '../../utils/stadiumDisplay'"), false);
  assert.ok(homeGameCardSource.includes('resolveHomeGameTeamFullName'));
  assert.ok(homeGameCardSource.includes('formatHomeGameStadiumLabel'));
  assert.ok(bundleGuardSource.includes("'teamIdentity'"));
  assert.ok(bundleGuardSource.includes("'stadiumDisplay'"));
  assert.equal(homeGameCardSource.includes('featured?:'), false);
  assert.equal(homeGameCardSource.includes('featured ='), false);
  assert.equal(homeGameCardSource.includes('ring-emerald-400/30'), false);
  assert.equal(homeGameCardSource.includes('<Card'), false);
  assert.ok(gameCardSkeletonSource.includes('grid-cols-home-game-card'));
  assert.equal(gameCardSkeletonSource.includes("from '../ui/card'"), false);
  assert.equal(gameCardSkeletonSource.includes("from '../ui/skeleton'"), false);
  assert.ok(gameCardSkeletonSource.includes('function SkeletonBlock'));

  for (const source of [navbarSource, publicNavbarSource, cheerMobileBottomNavSource]) {
    assert.equal(source.includes('shadow-[0_1px_2px_rgba'), false);
    assert.equal(source.includes('shadow-[0_18px_40px'), false);
    assert.equal(source.includes('shadow-[0_20px_50px'), false);
  }

  for (const source of [homeMatchPanelSource, homeGameCardSource, gameCardSkeletonSource]) {
    assert.equal(source.includes('grid-cols-[5.5rem'), false);
  }
});

test('keeps shared focus rings on Tailwind default ring instead of arbitrary 3px rules', () => {
  for (const source of [uiButtonSource, uiInputSource, uiTextareaSource, uiPlainButtonSource]) {
    assert.equal(source.includes('focus-visible:ring-[3px]'), false);
    assert.ok(source.includes('focus-visible:ring'));
  }
});

test('keeps repeated dialog shadows on the shared Tailwind token', () => {
  assert.ok(tailwindConfigSource.includes("dialog: 'var(--shadow-dialog)'"));

  for (const source of dialogShadowSources) {
    assert.equal(source.includes('shadow-[0_28px_80px_-30px_rgba(15,23,42,0.40)]'), false);
  }

  assert.ok(dialogShadowSources.some((source) => source.includes('shadow-dialog')));
});
