import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

const Layout = lazy(() => import('./Layout'));
const AppQueryProvider = lazy(() => import('./AppQueryProvider'));
const RootEntryRoute = lazy(() => import('./RootEntryRoute'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const AdminRoute = lazy(() => import('./AdminRoute'));
const Home = lazy(() => import('./Home'));
const OffSeasonHome = lazy(() => import('./OffSeasonHome'));
const OffSeasonList = lazy(() => import('./OffSeasonList'));
const Login = lazy(() => import('./Login'));
const SignUp = lazy(() => import('./SignUp'));
const PasswordReset = lazy(() => import('./PasswordReset'));
const PasswordResetConfirm = lazy(() => import('./PasswordResetConfirm'));
const AccountDeletionRecovery = lazy(() => import('./AccountDeletionRecovery'));
const StadiumGuide = lazy(() => import('./StadiumGuide'));
const Prediction = lazy(() => import('./Prediction'));
const Cheer = lazy(() => import('./Cheer'));
const CheerBookmarks = lazy(() => import('./CheerBookmarks'));
const CheerDetail = lazy(() => import('./CheerDetail'));
const CheerEdit = lazy(() => import('./CheerEdit'));
const Mate = lazy(() => import('./Mate'));
const MateCreate = lazy(() => import('./MateCreate'));
const MateDetail = lazy(() => import('./MateDetail'));
const MateApply = lazy(() => import('./MateApply'));
const MateCheckIn = lazy(() => import('./MateCheckIn'));
const MateChat = lazy(() => import('./MateChat'));
const MateManage = lazy(() => import('./MateManage'));
const MyPage = lazy(() => import('./MyPage'));
const UserProfile = lazy(() => import('./profile/UserProfile'));
const AdminPage = lazy(() => import('./AdminPage'));
const RankingPredictionShare = lazy(() => import('./RankingPredictionShare'));
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
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/password/reset" element={<PasswordReset />} />
      <Route path="/password/reset/confirm" element={<PasswordResetConfirm />} />
      <Route path="/account/deletion/recovery" element={<AccountDeletionRecovery />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      <Route path="/" element={<RootEntryRoute />} />

      <Route element={<AppQueryProvider />}>
        <Route element={<Layout authenticated={false} />}>
          <Route path="/home" element={<Home />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/offseason" element={<OffSeasonHome selectedDate={new Date()} />} />
          <Route path="/offseason/list" element={<OffSeasonList />} />
          <Route path="/cheer" element={<Cheer />} />
          <Route path="/cheer/write" element={<Cheer openComposerOnMount />} />
          <Route path="/cheer/:postId" element={<CheerDetail />} />
          <Route path="/profile/:handle" element={<UserProfile />} />
          <Route path="/predictions/ranking/share/:shareId/:seasonYear" element={<RankingPredictionShare />} />
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/stadium" element={<StadiumGuide />} />
        </Route>

        <Route element={<Layout authenticated={true} />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/mate/:id" element={<MateDetail />} />
            <Route path="/mate" element={<Mate />} />
            <Route path="/cheer/bookmarks" element={<CheerBookmarks />} />
            <Route path="/cheer/edit/:postId" element={<CheerEdit />} />
            <Route path="/mate/create" element={<MateCreate />} />
            <Route path="/mate/:id/apply" element={<MateApply />} />
            <Route path="/mate/:id/checkin" element={<MateCheckIn />} />
            <Route path="/mate/:id/chat" element={<MateChat />} />
            <Route path="/mate/:id/manage" element={<MateManage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/mypage/:handle" element={<MyPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      {import.meta.env.DEV && <Route path="/test/error" element={<TestError />} />}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
