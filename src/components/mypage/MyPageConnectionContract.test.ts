import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

test('마이페이지 배지 도감은 기존 다이어리 통계 API 기반 뷰로 연결된다', () => {
  const profileTypesSource = readSource('src/types/profile.ts');
  const useMyPageSource = readSource('src/hooks/useMyPage.ts');
  const viewRuntimeSource = readSource('src/components/mypage/MyPageViewRuntime.tsx');
  const sidebarMoreSource = readSource('src/components/mypage/MyPageSidebarMoreRuntime.tsx');
  const badgeCatalogSource = readSource('src/components/mypage/BadgesSection.tsx');
  const diaryApiSource = readSource('src/api/diary.ts');

  assert.match(profileTypesSource, /\|\s+'badges'/);
  assert.match(useMyPageSource, /'badges'/);
  assert.match(viewRuntimeSource, /lazy\(\(\) => import\('\.\/BadgesSection'\)\)/);
  assert.match(viewRuntimeSource, /viewMode === 'badges'/);
  assert.match(sidebarMoreSource, /onSetViewMode\('badges'\)/);
  assert.match(badgeCatalogSource, /useDiaryStatistics\(\)/);
  assert.match(badgeCatalogSource, /<BadgeShowcase earnedBadges=\{earnedBadges\} \/>/);
  assert.match(diaryApiSource, /privateGet<DiaryStatistics>\('\/diary\/statistics'\)/);
});

test('마이페이지 알림은 기존 알림 패널 API 흐름으로 연결된다', () => {
  const profileTypesSource = readSource('src/types/profile.ts');
  const useMyPageSource = readSource('src/hooks/useMyPage.ts');
  const viewRuntimeSource = readSource('src/components/mypage/MyPageViewRuntime.tsx');
  const sidebarMoreSource = readSource('src/components/mypage/MyPageSidebarMoreRuntime.tsx');
  const alertsSectionSource = readSource('src/components/mypage/AlertsSection.tsx');
  const notificationPanelSource = readSource('src/components/NotificationPanel.tsx');
  const notificationApiSource = readSource('src/utils/notificationApi.ts');

  assert.match(profileTypesSource, /\|\s+'alerts'/);
  assert.match(useMyPageSource, /'alerts'/);
  assert.match(viewRuntimeSource, /lazy\(\(\) => import\('\.\/AlertsSection'\)\)/);
  assert.match(viewRuntimeSource, /viewMode === 'alerts'/);
  assert.match(sidebarMoreSource, /onSetViewMode\('alerts'\)/);
  assert.match(alertsSectionSource, /<NotificationPanel \/>/);
  assert.match(notificationPanelSource, /notificationApi\.getNotifications\(\)/);
  assert.match(notificationApiSource, /\/notifications\/my/);
  assert.doesNotMatch(notificationApiSource, /SERVER_BASE_URL/);
  assert.doesNotMatch(notificationApiSource, /fallbackRequest/);
});

test('마이페이지 계정 설정은 auth providers 백엔드 흐름으로 연결된다', () => {
  const profileTypesSource = readSource('src/types/profile.ts');
  const useMyPageSource = readSource('src/hooks/useMyPage.ts');
  const viewRuntimeSource = readSource('src/components/mypage/MyPageViewRuntime.tsx');
  const profileEditSource = readSource('src/components/mypage/ProfileEditSectionRuntime.tsx');
  const accountSettingsSource = readSource('src/components/mypage/AccountSettingsSection.tsx');
  const profileApiSource = readSource('src/api/profile.ts');
  const mypageControllerSource = readSource('../bega_backend/BEGA_PROJECT/src/main/java/com/example/mypage/controller/MypageController.java');

  assert.match(profileTypesSource, /\|\s+'accountSettings'/);
  assert.match(useMyPageSource, /'accountSettings'/);
  assert.match(viewRuntimeSource, /viewMode === 'accountSettings'/);
  assert.match(profileEditSource, /LazyAccountSettingsSection/);
  assert.match(accountSettingsSource, /getConnectedProviders/);
  assert.match(accountSettingsSource, /unlinkProvider/);
  assert.match(profileApiSource, /privateGet<ApiEnvelope<UserProviderDto\[\]>>\('\/auth\/providers'\)/);
  assert.match(profileApiSource, /privateDelete<ApiEnvelope<never>>\(`\/auth\/providers\/\$\{encodeURIComponent\(provider\)\}`\)/);
  assert.match(mypageControllerSource, /@GetMapping\("\/providers"\)/);
  assert.match(mypageControllerSource, /@DeleteMapping\("\/providers\/\{provider\}"\)/);
});

test('/mypage/:handle은 공개 프로필 전용 /profile/:handle로만 리다이렉트된다', () => {
  const appRoutesSource = readSource('src/components/AppRoutes.tsx');
  const profilePublicApiSource = readSource('src/api/profilePublic.ts');
  const userControllerSource = readSource('../bega_backend/BEGA_PROJECT/src/main/java/com/example/auth/controller/UserController.java');

  assert.match(appRoutesSource, /path="\/profile\/:handle"\s+element=\{<UserProfilePage \/>\}/);
  assert.match(appRoutesSource, /path="\/mypage\/:handle"\s+element=\{<LegacyMyPageProfileRedirect \/>\}/);
  assert.match(appRoutesSource, /<Navigate to=\{`\/profile\/\$\{normalizedHandle\}`\} replace \/>/);
  assert.doesNotMatch(appRoutesSource, /path="\/mypage\/:handle"\s+element=\{<UserProfilePage \/>\}/);
  assert.match(profilePublicApiSource, /\/users\/profile\/\$\{encodeURIComponent\(handle\)\}/);
  assert.match(userControllerSource, /@GetMapping\("\/profile\/\{handle\}"\)/);
});
