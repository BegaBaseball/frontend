import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

const Layout = lazy(() => import('./Layout'));
const AppQueryProvider = lazy(() => import('./AppQueryProvider'));
const RootEntryRoute = lazy(() => import('./RootEntryRoute'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const AdminRoute = lazy(() => import('./AdminRoute'));
const Home = lazy(() => import('./Home'));
const OffSeasonHomePage = lazy(() => import('./OffSeasonHomePage'));
const OffSeasonListPage = lazy(() => import('./OffSeasonListPage'));
const PublicOnlyAuthRoute = lazy(() => import('./PublicOnlyAuthRoute'));
const Login = lazy(() => import('./Login'));
const SignUp = lazy(() => import('./SignUp'));
const PasswordReset = lazy(() => import('./PasswordReset'));
const PasswordResetConfirm = lazy(() => import('./PasswordResetConfirm'));
const AccountDeletionRecovery = lazy(() => import('./AccountDeletionRecovery'));
const StadiumGuide = lazy(() => import('./StadiumGuide'));
const Prediction = lazy(() => import('./Prediction'));
const Cheer = lazy(() => import('./Cheer'));
const CheerBookmarksPage = lazy(() => import('./CheerBookmarksPage'));
const CheerDetailPage = lazy(() => import('./CheerDetailPage'));
const CheerEditPage = lazy(() => import('./CheerEditPage'));
const MatePage = lazy(() => import('./MatePage'));
const MateCreatePage = lazy(() => import('./MateCreatePage'));
const MateDetail = lazy(() => import('./MateDetail'));
const MateApplyPage = lazy(() => import('./MateApplyPage'));
const MateCheckInPage = lazy(() => import('./MateCheckInPage'));
const MateChatPage = lazy(() => import('./MateChatPage'));
const MateManagePage = lazy(() => import('./MateManagePage'));
const MyPage = lazy(() => import('./MyPage'));
const UserProfilePage = lazy(() => import('./profile/UserProfilePage'));
const AdminPagePage = lazy(() => import('./AdminPagePage'));
const RankingPredictionSharePage = lazy(() => import('./RankingPredictionSharePage'));
const NoticePage = lazy(() => import('./NoticePage'));
const TermsOfService = lazy(() => import('./TermsOfService'));
const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'));
const OAuthCallback = lazy(() => import('./OAuthCallback'));
const TestError = lazy(() => import('./TestError'));
const NotFound = lazy(() => import('./NotFound'));
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyAuthRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/password/reset" element={<PasswordReset />} />
        <Route path="/password/reset/confirm" element={<PasswordResetConfirm />} />
        <Route path="/account/deletion/recovery" element={<AccountDeletionRecovery />} />
      </Route>
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      <Route path="/" element={<RootEntryRoute />} />

      <Route element={<AppQueryProvider />}>
        <Route element={<Layout authenticated={false} />}>
          <Route path="/home" element={<Home />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/offseason" element={<OffSeasonHomePage selectedDate={new Date()} />} />
          <Route path="/offseason/list" element={<OffSeasonListPage />} />
          <Route path="/cheer" element={<Cheer />} />
          <Route path="/cheer/write" element={<Cheer openComposerOnMount />} />
          <Route path="/cheer/:postId" element={<CheerDetailPage />} />
          <Route path="/profile/:handle" element={<UserProfilePage />} />
          <Route path="/predictions/ranking/share/:shareId/:seasonYear" element={<RankingPredictionSharePage />} />
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/stadium" element={<StadiumGuide />} />
        </Route>

        <Route element={<Layout authenticated={true} />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/mate/:id" element={<MateDetail />} />
            <Route path="/mate" element={<MatePage />} />
            <Route path="/cheer/bookmarks" element={<CheerBookmarksPage />} />
            <Route path="/cheer/edit/:postId" element={<CheerEditPage />} />
            <Route path="/mate/create" element={<MateCreatePage />} />
            <Route path="/mate/:id/apply" element={<MateApplyPage />} />
            <Route path="/mate/:id/checkin" element={<MateCheckInPage />} />
            <Route path="/mate/:id/chat" element={<MateChatPage />} />
            <Route path="/mate/:id/manage" element={<MateManagePage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/mypage/:handle" element={<MyPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPagePage />} />
          </Route>
        </Route>
      </Route>

      {import.meta.env.DEV && <Route path="/test/error" element={<TestError />} />}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
