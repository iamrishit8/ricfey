import type { CourseOutline, OutlineView, PublicCourse } from '@ricfey/shared';
import { useMemo, useState } from 'react';
import { ErrorNote, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, api, post } from '@/lib/api';
import { useApi } from '@/lib/use-api';

type EditDay = { fromDay: number; title: string; topics: string[] };
type EditWeek = { theme: string; days: EditDay[] };

function toEditable(o: CourseOutline): EditWeek[] {
  return o.weeks.map((w) => ({
    theme: w.theme,
    days: w.days.map((d) => ({ fromDay: d.day, title: d.title, topics: d.topics })),
  }));
}

/** Move a day one step; past the end of a week it moves into the neighbouring week. */
function move(weeks: EditWeek[], wi: number, di: number, dir: -1 | 1): EditWeek[] {
  const next = weeks.map((w) => ({ ...w, days: [...w.days] }));
  const days = next[wi]!.days;
  const [day] = days.splice(di, 1);
  const target = di + dir;
  if (target >= 0 && target <= days.length) days.splice(target, 0, day!);
  else if (dir === -1 && wi > 0) next[wi - 1]!.days.push(day!);
  else if (dir === 1 && wi < next.length - 1) next[wi + 1]!.days.unshift(day!);
  else days.splice(di, 0, day!);
  return next;
}

export function OutlineStep({ course, onDone }: { course: PublicCourse; onDone: () => void }) {
  const url = `/courses/${course.id}/outline`;
  const { data, error, setData, reload } = useApi<{ outline: OutlineView }>(url, {
    pollWhile: (d) => d.outline.status === 'generating' || d.outline.status === 'none',
  });
  const view = data?.outline;
  const [edits, setEdits] = useState<{ version: number; weeks: EditWeek[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const original = useMemo(() => (view?.outline ? toEditable(view.outline) : null), [view]);
  // Edits belong to the version they started from; a new version from the server resets them.
  const weeks = edits && edits.version === view?.version ? edits.weeks : original;
  const dirty = !!weeks && !!original && JSON.stringify(weeks) !== JSON.stringify(original);
  const totalDays = weeks?.reduce((n, w) => n + w.days.length, 0) ?? 0;
  const update = (fn: (w: EditWeek[]) => EditWeek[]) =>
    weeks && view?.version && setEdits({ version: view.version, weeks: fn(weeks) });

  async function save() {
    if (!weeks || !view?.version) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await api<{ outline: OutlineView }>(url, {
        method: 'PUT',
        body: JSON.stringify({
          baseVersion: view.version,
          weeks: weeks.map((w) => ({
            theme: w.theme,
            days: w.days.map((d) => ({ fromDay: d.fromDay, title: d.title })),
          })),
        }),
      });
      setEdits(null);
      setData(res);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not save.');
      if (err instanceof ApiError && err.status === 409) reload();
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!view?.version) return;
    setBusy(true);
    setActionError(null);
    try {
      await post(`${url}/approve`, { version: view.version });
      onDone();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not approve.');
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-8">
      <div className="max-w-3xl">
        <Badge>{course.depth === 'intro' ? 'Step 1 of 1' : 'Step 2 of 2'} · Your plan</Badge>
        <h1 className="mt-4 text-h1 font-medium">
          {view?.outline?.title ?? `Your ${course.skill} course`}
        </h1>
        {view?.outline && (
          <p className="mt-4 text-lead text-muted-foreground">{view.outline.summary}</p>
        )}
        <p className="mt-4 text-small text-muted-foreground">
          Rename, remove or reorder anything, then approve. Lessons are written one day at a time as
          you reach them.
        </p>
      </div>

      {error && <ErrorNote>{error.message}</ErrorNote>}
      {(!view || view.status === 'generating' || view.status === 'none') && (
        <Spinner label="Designing your course outline… (up to a couple of minutes)" />
      )}
      {view?.status === 'failed' && (
        <div className="grid gap-3">
          <ErrorNote>We couldn’t write the outline just now.</ErrorNote>
          <Button
            className="justify-self-start"
            onClick={() => void post(`${url}/retry`).then(reload)}
          >
            Try again
          </Button>
        </div>
      )}

      {weeks && view?.quote && (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="grid gap-6">
            {weeks.map((w, wi) => (
              <Card key={wi}>
                <CardContent className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 font-display text-h3 font-medium">Week {wi + 1}</span>
                    <Input
                      aria-label={`Week ${wi + 1} theme`}
                      value={w.theme}
                      maxLength={120}
                      onChange={(e) =>
                        update((ws) =>
                          ws.map((x, i) => (i === wi ? { ...x, theme: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  {w.days.length === 0 && (
                    <p className="text-small text-muted-foreground">
                      Empty: this week will be dropped when you save.
                    </p>
                  )}
                  <ol className="grid gap-2">
                    {w.days.map((d, di) => (
                      <li
                        key={d.fromDay}
                        className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="grid gap-1.5">
                          <Input
                            aria-label="Day title"
                            value={d.title}
                            maxLength={120}
                            className="h-10"
                            onChange={(e) =>
                              update((ws) =>
                                ws.map((x, i) =>
                                  i === wi
                                    ? {
                                        ...x,
                                        days: x.days.map((y, j) =>
                                          j === di ? { ...y, title: e.target.value } : y,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                          <span className="px-2 font-mono text-xs text-muted-foreground">
                            {d.topics.join(' · ')}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Move up"
                            onClick={() => update((ws) => move(ws, wi, di, -1))}
                          >
                            ↑
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Move down"
                            onClick={() => update((ws) => move(ws, wi, di, 1))}
                          >
                            ↓
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remove day"
                            disabled={totalDays <= 1}
                            onClick={() =>
                              update((ws) =>
                                ws.map((x, i) =>
                                  i === wi ? { ...x, days: x.days.filter((_, j) => j !== di) } : x,
                                ),
                              )
                            }
                          >
                            ✕
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="lg:sticky lg:top-6">
            <CardContent className="grid gap-4">
              <p className="text-small text-muted-foreground">
                Version {view.version}
                {view.versions.length > 1 ? ` of ${view.versions.length}` : ''}
              </p>
              <div>
                <p className="font-display text-h1 font-medium">
                  {dirty ? '—' : view.quote.totalCredits}
                </p>
                <p className="text-small text-muted-foreground">
                  credits for {dirty ? totalDays : view.quote.days} days, paid day by day
                </p>
              </div>
              <p className="text-small text-muted-foreground">{view.quote.formula}.</p>
              {actionError && <ErrorNote>{actionError}</ErrorNote>}
              {dirty ? (
                <div className="grid gap-2">
                  <Button disabled={busy} onClick={() => void save()}>
                    {busy ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button variant="ghost" onClick={() => setEdits(null)}>
                    Discard
                  </Button>
                </div>
              ) : (
                <Button disabled={busy} onClick={() => void approve()}>
                  {busy ? 'Starting…' : 'Approve and start →'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
