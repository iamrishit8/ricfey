import { createBrowserRouter, Outlet } from 'react-router';
import { SiteHeader } from '@/components/site-header';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { MagicPage } from '@/pages/magic';
import { NotFoundPage } from '@/pages/not-found';
import { StyleguidePage } from '@/pages/styleguide';

function Layout() {
  return (
    <>
      <SiteHeader />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/magic', element: <MagicPage /> },
      { path: '/styleguide', element: <StyleguidePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
