import type { DaySummary, ProgressView, PublicCourse } from '@ricfey/shared';
import { Link } from 'react-router';
import { ErrorNote, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { indiaDate } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

/** The day to show as "Today": the first open day not yet finished. */
export function todayOf(days: DaySummary[]): DaySummary | undefined {
  return days.find((d) => d.unlocked && !d.completedAt);
}

export function CourseHome({ course }: { course: PublicCourse }) {
  const days = useApi<{ days: DaySummary[] }>(`/courses/${course.id}/days`);
  const progress = useApi<{ progress: ProgressView }>(`/courses/${course.id}/progress`);
  const today = days.data ? todayOf(days.data.days) : undefined;
  const weeks = new Map<number, DaySummary[]>();
  for (const d of days.data?.days ?? []) weeks.set(d.week, [...(weeks.get(d.week) ?? []), d]);
  const p = progress.data?.progress;

  return (
    <section className="grid gap-10">
      <div>
        <Badge variant={course.status === 'completed' ? 'solid' : 'default'}>
          {course.status === 'completed' ? 'Completed' : 'In progress'}
        </Badge>
        <h1 className="mt-4 text-h1 font-medium">{course.title ?? course.skill}</h1>
      </div>

      {days.error && <ErrorNote>{days.error.message}</ErrorNote>}
      {days.loading && <Spinner label="Loading your days…" />}

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Card className="border-brand">
          <CardContent className="grid gap-4">
            <p className="text-small font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Today
            </p>
            {today ? (
              <>
                <p className="font-display text-h2 font-medium">
                  Day {today.day}: {today.title}
                </p>
                <Button size="lg" className="justify-self-start" asChild>
                  <Link to={`/courses/${course.id}/days/${today.day}`}>Start →</Link>
                </Button>
              </>
            ) : course.status === 'completed' ? (
              <p className="text-lead">You finished every day. Well done.</p>
            ) : (
              <p className="text-lead">
                You’re all caught up. The next day opens{' '}
                {days.data?.days.find((d) => !d.unlocked)
                  ? indiaDate(days.data.days.find((d) => !d.unlocked)!.unlockAt)
                  : 'soon'}
                .
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-h1 font-medium">{p ? `${p.daysCompleted}` : '–'}</p>
              <p className="text-small text-muted-foreground">of {p?.daysTotal ?? '–'} days</p>
            </div>
            <div>
              <p className="font-display text-h1 font-medium">{p?.streak.current ?? '–'}</p>
              <p className="text-small text-muted-foreground">day streak</p>
            </div>
            <div>
              <p className="font-display text-h1 font-medium">{p?.streak.longest ?? '–'}</p>
              <p className="text-small text-muted-foreground">longest</p>
            </div>
            <Button variant="link" className="col-span-3 justify-self-center" asChild>
              <Link to={`/courses/${course.id}/progress`}>Scores by topic →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {[...weeks].map(([week, list]) => (
          <div key={week}>
            <h2 className="mb-3 text-h3 font-medium">Week {week}</h2>
            <ol className="grid gap-2">
              {list.map((d) => {
                const row = (
                  <div
                    className={cn(
                      'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3',
                      d.unlocked ? 'hover:bg-muted' : 'opacity-60',
                    )}
                  >
                    <span>
                      <span className="mr-2 font-mono text-small text-muted-foreground">
                        Day {d.day}
                      </span>
                      {d.title}
                    </span>
                    <span className="text-small text-muted-foreground">
                      {d.completedAt
                        ? '✓ Done'
                        : d.unlocked
                          ? d.flagged
                            ? 'Open · flagged'
                            : 'Open'
                          : `Opens ${indiaDate(d.unlockAt)}`}
                    </span>
                  </div>
                );
                return (
                  <li key={d.day}>
                    {d.unlocked ? (
                      <Link to={`/courses/${course.id}/days/${d.day}`}>{row}</Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
