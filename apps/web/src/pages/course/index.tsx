import type { PublicCourse } from '@ricfey/shared';
import { useParams } from 'react-router';
import { ErrorNote, Page, Spinner } from '@/components/page';
import { useApi } from '@/lib/use-api';
import { CourseHome } from './home';
import { OutlineStep } from './outline';
import { PlacementStep } from './placement';

/** One URL per course; what it shows follows the course status. */
export function CoursePage() {
  const { id } = useParams();
  const { data, error, reload } = useApi<{ course: PublicCourse }>(`/courses/${id}`);
  const course = data?.course;
  return (
    <Page>
      {error && <ErrorNote>{error.status === 404 ? 'Course not found.' : error.message}</ErrorNote>}
      {!course && !error && <Spinner label="Loading…" />}
      {course?.status === 'placement' && <PlacementStep course={course} onDone={reload} />}
      {course?.status === 'outline' && <OutlineStep course={course} onDone={reload} />}
      {(course?.status === 'active' || course?.status === 'completed') && (
        <CourseHome course={course} />
      )}
    </Page>
  );
}
