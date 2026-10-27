import type { CreditsView, GalleryDetail } from '@ricfey/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { NoCredits } from '@/components/no-credits';
import { ErrorNote, Page, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError, post } from '@/lib/api';
import { DEPTH_LABEL } from '@/lib/format';
import { useApi } from '@/lib/use-api';

export function GalleryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error } = useApi<{ course: GalleryDetail }>(`/gallery/${id}`);
  const credits = useApi<{ credits: CreditsView }>('/credits');
  const [busy, setBusy] = useState(false);
  const [buyError, setBuyError] = useState<ApiError | null>(null);
  const c = data?.course;
  const balance = credits.data?.credits.balance ?? null;

  async function buy() {
    setBusy(true);
    setBuyError(null);
    try {
      const { course } = await post<{ course: { id: string } }>(`/gallery/${id}/buy`);
      void navigate(`/courses/${course.id}`);
    } catch (err) {
      setBuyError(
        err instanceof ApiError ? err : new ApiError(0, 'INTERNAL_ERROR', 'Something went wrong.'),
      );
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_CREDITS') credits.reload();
      setBusy(false);
    }
  }

  return (
    <Page>
      <Link to="/gallery" className="text-small text-muted-foreground hover:text-foreground">
        ← Gallery
      </Link>
      {error && (
        <div className="mt-6">
          <ErrorNote>{error.message}</ErrorNote>
        </div>
      )}
      {!c && !error && <Spinner label="Loading…" />}
      {c && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>{DEPTH_LABEL[c.depth]}</Badge>
              <Badge variant="outline">
                {c.weeks} {c.weeks === 1 ? 'week' : 'weeks'} · {c.minutesPerDay} min a day
              </Badge>
            </div>
            <h1 className="mt-4 text-h1 font-medium">{c.title}</h1>
            <p className="mt-4 text-lead text-muted-foreground">{c.summary}</p>

            <h2 className="mt-10 text-h3 font-medium">The roadmap</h2>
            <div className="mt-4 grid gap-6">
              {c.outline.weeks.map((w) => (
                <div key={w.week}>
                  <h3 className="font-medium">
                    Week {w.week}: {w.theme}
                  </h3>
                  <ol className="mt-2 grid gap-2">
                    {w.days.map((d) => (
                      <li key={d.day} className="rounded-lg border px-4 py-3">
                        <span className="mr-2 font-mono text-small text-muted-foreground">
                          Day {d.day}
                        </span>
                        {d.title}
                        <span className="mt-1 block text-small text-muted-foreground">
                          {d.topics.join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          <Card className="h-fit lg:sticky lg:top-6">
            <CardContent className="grid gap-4">
              <div>
                <p className="font-display text-h1 font-medium">{c.priceCredits}</p>
                <p className="text-small text-muted-foreground">
                  credits, one time, for {c.days} days. Yours forever.
                </p>
              </div>
              <p className="text-small text-muted-foreground">
                You have {balance ?? '–'} credits. The lessons are already written and fixed, so the
                plan can’t be re-planned.
              </p>
              {buyError?.code === 'INSUFFICIENT_CREDITS' ? (
                <NoCredits details={buyError.details} />
              ) : (
                buyError && <ErrorNote>{buyError.message}</ErrorNote>
              )}
              {c.ownedCourseId ? (
                <Button asChild>
                  <Link to={`/courses/${c.ownedCourseId}`}>Open my copy →</Link>
                </Button>
              ) : balance !== null && balance < c.priceCredits ? (
                <Button asChild>
                  <Link to="/credits">Get {c.priceCredits - balance} more credits →</Link>
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => void buy()}>
                  {busy ? 'Buying…' : `Buy for ${c.priceCredits} credits →`}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Page>
  );
}
