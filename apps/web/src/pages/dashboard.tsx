import type { PublicCourse } from '@ricfey/shared';
import { Link } from 'react-router';
import { ErrorNote, Page, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DEPTH_LABEL } from '@/lib/format';
import { useApi } from '@/lib/use-api';

const STATUS_LABEL: Record<PublicCourse['status'], string> = {
  placement: 'Placement quiz',
  outline: 'Review outline',
  active: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

export function DashboardPage() {
  const { data, error, loading } = useApi<{ courses: PublicCourse[] }>('/courses');
  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-h1 font-medium">
          Your <em className="text-brand">courses</em>
        </h1>
        <Button asChild>
          <Link to="/courses/new">Start a new course</Link>
        </Button>
      </div>
      <div className="mt-10">
        {loading && <Spinner label="Loading your courses…" />}
        {error && <ErrorNote>{error.message}</ErrorNote>}
        {data && data.courses.length === 0 && (
          <Card>
            <CardContent>
              <p className="text-lead">
                No courses yet. Pick anything you can learn through reading and practice.
              </p>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {data?.courses.map((c) => (
            <Link
              key={c.id}
              to={`/courses/${c.id}`}
              className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Card className="h-full transition group-hover:border-brand">
                <CardContent className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={c.status === 'active' ? 'solid' : 'default'}>
                      {STATUS_LABEL[c.status]}
                    </Badge>
                    <Badge variant="outline">{DEPTH_LABEL[c.depth]}</Badge>
                  </div>
                  <h2 className="text-h3 font-medium">{c.title ?? c.skill}</h2>
                  <p className="text-small text-muted-foreground">
                    {c.weeks} {c.weeks === 1 ? 'week' : 'weeks'} · {c.minutesPerDay} min a day
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Page>
  );
}
