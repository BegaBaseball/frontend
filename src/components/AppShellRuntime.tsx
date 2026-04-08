import { lazy } from 'react';
import ScrollToTop from './ScrollToTop';
import AuthBootstrap from './AuthBootstrap';
import SeoHead from '../seo/SeoHead';

const AppRoutes = lazy(() => import('./AppRoutes'));

export default function AppShellRuntime() {
  return (
    <>
      <ScrollToTop />
      <AuthBootstrap />
      <SeoHead />
      <AppRoutes />
    </>
  );
}
