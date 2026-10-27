import type { ProgressView } from '@ricfey/shared';
import { Link, useParams } from 'react-router';
import { ErrorNote, Meter, Page, Spinner } from '@/components/page';
import { Card, CardContent } from '@/components/ui/card';
import { useApi } from '@/lib/use-api';

export function ProgressPage() {
  const { id } = useParams();
  const { data, error, loading } = useApi<{ progress: ProgressView }>(`/courses/${id}/progress`);
  const p = data?.progress;
  return (
    <Page narrow>
      <Link
        to={`/courses/${id}`}
        className="text-small text-muted-foreground hover:text-foreground"
      >
        ← Course
      </Link>
      <h1 className="mt-6 text-h1 font-medium">Progress</h1>
      {loading && <Spinner label="Loading…" />}
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {p && (
        <div className="mt-8 grid gap-8">
          <div className="grid grid-cols-3 gap-4">
            {[
              [`${p.daysCompleted}/${p.daysTotal}`, 'days done'],
              [p.streak.current, 'day streak'],
              [p.streak.longest, 'longest streak'],
            ].map(([v, l]) => (
              <Card key={String(l)}>
                <CardContent className="text-center">
                  <p className="font-display text-h1 font-medium">{v}</p>
                  <p className="text-small text-muted-foreground">{l}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <section className="grid gap-4">
            <h2 className="text-h2 font-medium">Score by topic</h2>
            <p className="text-small text-muted-foreground">
              From your latest quiz attempt on each day. Weakest first.
            </p>
            {p.topicScores.length === 0 ? (
              <p className="text-muted-foreground">Take a quiz to see scores here.</p>
            ) : (
              <div className="grid gap-4">
                {p.topicScores.map((t) => (
                  <Meter
                    key={t.topic}
                    label={`${t.topic} (${t.correct}/${t.total})`}
                    value={t.correct}
                    max={t.total}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}
