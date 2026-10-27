import type { PlacementView, PublicCourse } from '@ricfey/shared';
import { useState } from 'react';
import { ErrorNote, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ApiError, post } from '@/lib/api';
import { LEVEL_LABEL } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

export function PlacementStep({ course, onDone }: { course: PublicCourse; onDone: () => void }) {
  const url = `/courses/${course.id}/placement`;
  const { data, error, setData, reload } = useApi<{ placement: PlacementView }>(url, {
    pollWhile: (d) => d.placement.status === 'generating',
  });
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const p = data?.placement;

  async function submit() {
    if (!p?.question || picked === null) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await post<{ placement: PlacementView }>(`${url}/answer`, {
        questionId: p.question.id,
        answerIndex: picked,
      });
      setData(res);
      setPicked(null);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong.');
      if (err instanceof ApiError && err.status === 409) reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid max-w-2xl gap-6">
      <div>
        <Badge>Step 1 of 2 · Placement</Badge>
        <h1 className="mt-4 text-h1 font-medium">
          Let’s find your <em className="text-brand">starting point</em>.
        </h1>
        <p className="mt-4 text-lead text-muted-foreground">
          8 to 12 questions. They get harder when you’re right and easier when you’re not. Guessing
          is fine; “I don’t know” is useful information too.
        </p>
      </div>
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {!p || p.status === 'generating' ? (
        <Spinner label="Writing your placement questions… (up to a couple of minutes)" />
      ) : p.status === 'failed' ? (
        <div className="grid gap-3">
          <ErrorNote>We couldn’t build the quiz just now.</ErrorNote>
          <Button
            className="justify-self-start"
            onClick={() => void post(`${url}/retry`).then(reload)}
          >
            Try again
          </Button>
        </div>
      ) : p.status === 'completed' && p.result ? (
        <Card>
          <CardContent className="grid gap-4">
            <p className="text-small text-muted-foreground">Your starting level</p>
            <p className="font-display text-h1 font-medium">{LEVEL_LABEL[p.result.level]}</p>
            {p.result.strongTopics.length > 0 && <p>Strong: {p.result.strongTopics.join(', ')}</p>}
            {p.result.weakTopics.length > 0 && <p>To work on: {p.result.weakTopics.join(', ')}</p>}
            <p className="text-muted-foreground">
              We’re writing your outline now, shaped by these results.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={onDone}>See my outline →</Button>
          </CardFooter>
        </Card>
      ) : p.question ? (
        <Card>
          <CardHeader>
            <span className="text-small text-muted-foreground">
              Question {p.answered + 1} · usually {p.minQuestions}–{p.maxQuestions}
            </span>
            <p className="font-display text-h3 font-medium">{p.question.question}</p>
          </CardHeader>
          <CardContent>
            <fieldset className="grid gap-3">
              <legend className="sr-only">Choose one answer</legend>
              {p.question.options.map((opt, i) => (
                <label
                  key={`${p.question!.id}-${i}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-3 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                    picked === i ? 'border-brand bg-brand-soft' : 'hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="placement"
                    className="sr-only"
                    checked={picked === i}
                    onChange={() => setPicked(i)}
                  />
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border font-display text-sm font-semibold">
                    {'ABCDE'[i]}
                  </span>
                  <span>{opt}</span>
                </label>
              ))}
            </fieldset>
            {submitError && (
              <div className="mt-4">
                <ErrorNote>{submitError}</ErrorNote>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button disabled={picked === null || busy} onClick={() => void submit()}>
              {busy ? 'Saving…' : 'Next →'}
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </section>
  );
}
