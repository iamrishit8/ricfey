import type {
  MasteryView,
  OutlineDay,
  PublicCourse,
  ReplanMode,
  ReplanPolicy,
  ReplanView,
} from '@ricfey/shared';
import { useState } from 'react';
import { NoCredits } from '@/components/no-credits';
import { ErrorNote, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api, ApiError, post } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

type ReplanState = { replan: ReplanView | null; policy: ReplanPolicy };

const MODES: Record<ReplanMode, { title: string; body: string }> = {
  manual: { title: 'When I ask', body: 'You see the proposed change and decide.' },
  auto: { title: 'Automatically', body: 'After a finished day with weak topics.' },
};

/**
 * Weak and strong topics, the re-plan mode, and the latest re-plan: ask for one, watch it
 * generate, then compare old and new days and accept or reject.
 */
export function ReplanPanel({
  course,
  onApplied,
}: {
  course: PublicCourse;
  onApplied: () => void;
}) {
  const mastery = useApi<{ mastery: MasteryView }>(`/courses/${course.id}/mastery`);
  const state = useApi<ReplanState>(`/courses/${course.id}/replan`, {
    pollWhile: (d) => d.replan?.status === 'generating',
  });
  const [mode, setMode] = useState<ReplanMode>(course.replanMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function act(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
      state.reload();
    } catch (err) {
      setError(
        err instanceof ApiError ? err : new ApiError(0, 'INTERNAL_ERROR', 'Something went wrong.'),
      );
    } finally {
      setBusy(false);
    }
  }

  const changeMode = (next: ReplanMode) =>
    act(
      () =>
        api(`/courses/${course.id}/settings`, {
          method: 'PATCH',
          body: JSON.stringify({ replanMode: next }),
        }),
      () => setMode(next),
    );

  const m = mastery.data?.mastery;
  const replan = state.data?.replan;
  const policy = state.data?.policy;
  const open = replan?.status === 'generating' || replan?.status === 'proposed';
  const price = policy?.priceNow ?? 0;

  return (
    <Card>
      <CardContent className="grid gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-h3 font-medium">Adapt your plan</h2>
          {policy && (
            <p className="text-small text-muted-foreground">
              Looks {policy.horizon} days ahead ·{' '}
              {price === 0 ? `free for your first ${policy.freeDays} days` : `${price} credits`}
            </p>
          )}
        </div>

        {m && m.topics.length > 0 ? (
          <div className="grid gap-2 text-small">
            <TopicRow label="Needs work" topics={m.weakTopics} tone="weak" />
            <TopicRow label="Strong" topics={m.strongTopics} tone="strong" />
          </div>
        ) : (
          <p className="text-small text-muted-foreground">
            Take a quiz first. Your scores decide what to change.
          </p>
        )}

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-small font-medium">Re-plan</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(MODES) as ReplanMode[]).map((k) => (
              <label
                key={k}
                className={cn(
                  'cursor-pointer rounded-lg border p-3 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                  mode === k ? 'border-brand bg-brand-soft' : 'hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="replanMode"
                  value={k}
                  checked={mode === k}
                  disabled={busy}
                  onChange={() => void changeMode(k)}
                  className="sr-only"
                />
                <span className="font-medium">{MODES[k].title}</span>
                <span className="block text-small text-muted-foreground">{MODES[k].body}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error?.code === 'INSUFFICIENT_CREDITS' ? (
          <NoCredits details={error.details} />
        ) : (
          error && <ErrorNote>{error.message}</ErrorNote>
        )}
        {state.error && <ErrorNote>{state.error.message}</ErrorNote>}

        {replan?.status === 'generating' && <Spinner label="Rethinking your next days…" />}

        {replan?.status === 'proposed' && replan.after && (
          <div className="grid gap-4">
            {replan.rationale && <p className="text-lead">{replan.rationale}</p>}
            <DayDiff before={replan.before} after={replan.after} />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={busy}
                onClick={() =>
                  void act(
                    () => post(`/courses/${course.id}/replan/${replan.id}/accept`),
                    onApplied,
                  )
                }
              >
                Use the new plan{replan.priceCredits ? ` · ${replan.priceCredits} credits` : ''}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void act(() => post(`/courses/${course.id}/replan/${replan.id}/reject`))
                }
              >
                Keep my plan
              </Button>
            </div>
          </div>
        )}

        {replan && !open && <LastResult replan={replan} />}

        {!open && policy && (
          <Button
            variant={m?.weakTopics.length ? 'default' : 'outline'}
            className="justify-self-start"
            disabled={busy || policy.replannableDays.length === 0}
            onClick={() => void act(() => post(`/courses/${course.id}/replan`))}
          >
            {policy.replannableDays.length === 0
              ? 'No upcoming days to adapt'
              : `Adapt days ${policy.replannableDays[0]}–${policy.replannableDays.at(-1)} →`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TopicRow({
  label,
  topics,
  tone,
}: {
  label: string;
  topics: string[];
  tone: 'weak' | 'strong';
}) {
  if (topics.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="w-24 text-muted-foreground">{label}</span>
      {topics.map((t) => (
        <Badge key={t} variant={tone === 'weak' ? 'default' : 'outline'}>
          {t}
        </Badge>
      ))}
    </p>
  );
}

function DayDiff({ before, after }: { before: OutlineDay[]; after: OutlineDay[] }) {
  return (
    <ol className="grid gap-2">
      {after.map((d, i) => {
        const old = before[i];
        const changed = !old || old.title !== d.title || old.topics.join() !== d.topics.join();
        return (
          <li
            key={d.day}
            className={cn('rounded-lg border px-4 py-3', changed && 'border-brand bg-brand-soft')}
          >
            <span className="mr-2 font-mono text-small text-muted-foreground">Day {d.day}</span>
            {changed && old && <s className="mr-2 text-muted-foreground">{old.title}</s>}
            <span className="font-medium">{d.title}</span>
            <span className="mt-1 block text-small text-muted-foreground">
              {d.topics.join(' · ')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function LastResult({ replan }: { replan: ReplanView }) {
  const text: Partial<Record<ReplanView['status'], string>> = {
    applied:
      replan.trigger === 'auto'
        ? `Your plan was adapted automatically: days ${replan.before[0]?.day}–${replan.before.at(-1)?.day} now focus on ${replan.weakTopics.join(', ')}.`
        : 'Your new plan is in place.',
    rejected: 'You kept your plan.',
    stale: 'That proposal expired because you opened one of its days. Ask again for a fresh one.',
    failed: 'The last re-plan could not be made. Try again in a moment.',
  };
  const t = text[replan.status];
  return t ? <p className="text-small text-muted-foreground">{t}</p> : null;
}
