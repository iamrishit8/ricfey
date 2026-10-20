import type { DaySummary } from '@ricfey/shared';
import { Navigate, useParams } from 'react-router';
import { ErrorNote, Page, Spinner } from '@/components/page';
import { useApi } from '@/lib/use-api';
import { todayOf } from './course/home';

/** /courses/:id/today → the first open, unfinished day (or the course page if none). */
export function TodayPage() {
  const { id } = useParams();
  const { data, error } = useApi<{ days: DaySummary[] }>(`/courses/${id}/days`);
  if (error)
    return (
      <Page>
        <ErrorNote>{error.message}</ErrorNote>
      </Page>
    );
  if (!data)
    return (
      <Page>
        <Spinner label="Finding today…" />
      </Page>
    );
  const today = todayOf(data.days);
  return <Navigate to={today ? `/courses/${id}/days/${today.day}` : `/courses/${id}`} replace />;
}
