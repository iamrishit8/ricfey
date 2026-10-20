import { createBrowserRouter, Outlet } from 'react-router';
import { RequireAuth } from '@/components/require-auth';
import { SiteHeader } from '@/components/site-header';
import { CoursePage } from '@/pages/course';
import { DayPage } from '@/pages/day';
import { NewCoursePage } from '@/pages/new-course';
import { ProgressPage } from '@/pages/progress';
import { TodayPage } from '@/pages/today';
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
      {
        path: '/courses/new',
        element: (
          <RequireAuth>
            <NewCoursePage />
          </RequireAuth>
        ),
      },
      {
        path: '/courses/:id',
        element: (
          <RequireAuth>
            <CoursePage />
          </RequireAuth>
        ),
      },
      {
        path: '/courses/:id/today',
        element: (
          <RequireAuth>
            <TodayPage />
          </RequireAuth>
        ),
      },
      {
        path: '/courses/:id/days/:n',
        element: (
          <RequireAuth>
            <DayPage />
          </RequireAuth>
        ),
      },
      {
        path: '/courses/:id/progress',
        element: (
          <RequireAuth>
            <ProgressPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
