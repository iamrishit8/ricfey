import {
  REPORT_KINDS,
  TASK_MAX_CHARS,
  type DayProgress,
  type DayView,
  type QuizResult,
} from '@ricfey/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Markdown } from '@/components/markdown';
import { ErrorNote, Page, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, post } from '@/lib/api';
import { indiaDate } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

type DayResponse = { day: DayView; progress: DayProgress };
const LETTERS = 'ABCDEFGH';

export function DayPage() {
  const { id, n } = useParams();
  const url = `/courses/${id}/days/${n}`;
  const { data, error, reload, setData } = useApi<DayResponse>(url, {
    pollWhile: (d) => d.day.status === 'generating' || d.progress.latestTask?.status === 'grading',
  });
  const day = data?.day;

  if (error?.status === 403) {
    const unlockAt = (error.details as { unlockAt?: string } | undefined)?.unlockAt;
    return (
      <Page narrow>
        <h1 className="text-h1 font-medium">Not open yet</h1>
        <p className="mt-4 text-lead text-muted-foreground">
          {error.message}
          {unlockAt ? ` (${indiaDate(unlockAt)})` : ''}
        </p>
        <Button className="mt-8" variant="outline" asChild>
          <Link to={`/courses/${id}`}>Back to the course</Link>
        </Button>
      </Page>
    );
  }

  return (
    <Page narrow>
      <Link
        to={`/courses/${id}`}
        className="text-small text-muted-foreground hover:text-foreground"
      >
        ← Course
      </Link>
      {error && (
        <div className="mt-6">
          <ErrorNote>{error.message}</ErrorNote>
        </div>
      )}
      {day && (
        <header className="mt-6 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="solid">Day {day.day}</Badge>
            {day.content && (
              <span className="text-small text-muted-foreground">
                About {day.content.lesson.estimatedMinutes} minutes
              </span>
            )}
            {day.completedAt && <Badge>✓ Done</Badge>}
          </div>
          <h1 className="text-h1 font-medium">{day.title}</h1>
          <div className="flex flex-wrap gap-2">
            {day.topics.map((t) => (
              <Badge key={t} variant="outline" className="normal-case tracking-normal">
                {t}
              </Badge>
            ))}
          </div>
        </header>
      )}

      {(!day || day.status === 'generating' || !day.content) && !error && (
        <Spinner label="Writing today’s lesson, task and quiz… (up to a couple of minutes)" />
      )}
      {day?.status === 'failed' && (
        <div className="mt-6 grid gap-3">
          <ErrorNote>We couldn’t write this day just now.</ErrorNote>
          <Button className="justify-self-start" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {day?.content && data && (
        <div className="mt-8 grid gap-12">
          {day.flagged && (
            <p
              role="note"
              className="rounded-lg border-l-4 border-brand bg-brand-soft px-4 py-3 text-small"
            >
              Our automatic review found possible problems in this day. It’s shown anyway; please
              flag anything that looks wrong.
            </p>
          )}
          <article>
            <Markdown>{day.content.lesson.markdown}</Markdown>
          </article>
          <TaskSection
            url={url}
            day={day}
            progress={data.progress}
            onChange={(p) => setData({ ...data, progress: p })}
            reload={reload}
          />
          <QuizSection url={url} day={day} progress={data.progress} onSubmitted={reload} />
          <FlagMistake url={url} />
        </div>
      )}
    </Page>
  );
}

function TaskSection({
  url,
  day,
  progress,
  reload,
}: {
  url: string;
  day: DayView;
  progress: DayProgress;
  onChange: (p: DayProgress) => void;
  reload: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t = progress.latestTask;
  const task = day.content!.task;

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await post(`${url}/task`, { answer });
      setAnswer('');
      reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not submit.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4">
      <h2 className="text-h2 font-medium">Practice task</h2>
      <Card>
        <CardContent className="grid gap-4">
          <p className="whitespace-pre-line text-body">{task.prompt}</p>
          <details className="text-small">
            <summary className="cursor-pointer text-muted-foreground">
              How it’s graded ({task.rubric.reduce((s, r) => s + r.points, 0)} points)
            </summary>
            <ul className="mt-2 grid gap-1">
              {task.rubric.map((r) => (
                <li key={r.criterion}>
                  <strong className="font-medium">{r.criterion}</strong> ({r.points}):{' '}
                  {r.description}
                </li>
              ))}
            </ul>
          </details>
          {t && (
            <div
              className={cn(
                'rounded-lg border-l-4 bg-muted px-4 py-3',
                t.status === 'failed' ? 'border-destructive' : 'border-brand',
              )}
              role="status"
            >
              {t.status === 'grading' && <p>Grading your answer…</p>}
              {t.status === 'failed' && (
                <p>
                  We couldn’t grade that answer. It still counts as submitted; you can try again.
                </p>
              )}
              {t.status === 'graded' && (
                <div className="grid gap-2">
                  <p className="font-display text-h3 font-medium">
                    {t.score} / {t.maxScore}
                  </p>
                  <p>{t.feedback}</p>
                  {t.missedCriteria.length > 0 && (
                    <p className="text-small text-muted-foreground">
                      To improve: {t.missedCriteria.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {progress.gradedTaskAttemptsLeft > 0 && t?.status !== 'grading' && (
            <div className="grid gap-2">
              <Label htmlFor="task-answer">{t ? 'Try again' : 'Your answer'}</Label>
              <Textarea
                id="task-answer"
                value={answer}
                maxLength={TASK_MAX_CHARS}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your answer here…"
              />
              <span className="text-small text-muted-foreground">
                {progress.gradedTaskAttemptsLeft}{' '}
                {progress.gradedTaskAttemptsLeft === 1 ? 'attempt' : 'attempts'} left
              </span>
            </div>
          )}
          {err && <ErrorNote>{err}</ErrorNote>}
        </CardContent>
        {progress.gradedTaskAttemptsLeft > 0 && t?.status !== 'grading' && (
          <CardFooter>
            <Button disabled={busy || answer.trim().length < 20} onClick={() => void submit()}>
              {busy ? 'Sending…' : 'Submit for feedback'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </section>
  );
}

function QuizSection({
  url,
  day,
  progress,
  onSubmitted,
}: {
  url: string;
  day: DayView;
  progress: DayProgress;
  onSubmitted: () => void;
}) {
  const questions = day.content!.quiz.questions;
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [retake, setRetake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const shown = retake ? null : (result ?? progress.latestQuiz);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await post<{ result: QuizResult }>(`${url}/quiz`, { answers });
      setResult(res.result);
      setRetake(false);
      onSubmitted();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not submit.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-h2 font-medium">Quiz</h2>
        {shown && (
          <p className="font-display text-h3">
            {shown.score} / {shown.total}
          </p>
        )}
      </div>
      {(shown ? shown.questions : questions).map((q, i) => (
        <Card key={i}>
          <CardHeader>
            <span className="text-small text-muted-foreground">
              Question {i + 1} of {questions.length} ·{' '}
              <span className="font-mono text-xs">{q.topic}</span>
            </span>
            <p className="font-display text-h3 font-medium">{q.question}</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {q.options.map((opt, oi) => {
              const r = shown?.questions[i];
              return (
                <label
                  key={oi}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border px-4 py-3 transition',
                    !r &&
                      'cursor-pointer has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                    !r && answers[i] === oi && 'border-brand bg-brand-soft',
                    !r && answers[i] !== oi && 'hover:bg-muted',
                    r && oi === r.answerIndex && 'border-success bg-success/10',
                    r &&
                      oi === r.yourAnswer &&
                      !r.correct &&
                      'border-destructive bg-destructive/10',
                  )}
                >
                  {!r && (
                    <input
                      type="radio"
                      name={`q${i}`}
                      className="sr-only"
                      checked={answers[i] === oi}
                      onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? oi : x)))}
                    />
                  )}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border font-display text-sm font-semibold">
                    {LETTERS[oi]}
                  </span>
                  <span>{opt}</span>
                </label>
              );
            })}
            {shown && (
              <p className="rounded-lg bg-muted px-4 py-3 text-small">
                <strong className="font-medium">
                  {shown.questions[i]!.correct
                    ? 'Correct. '
                    : `Answer: ${LETTERS[shown.questions[i]!.answerIndex]}. `}
                </strong>
                {shown.questions[i]!.explanation}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      {err && <ErrorNote>{err}</ErrorNote>}
      {shown ? (
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => {
            setAnswers(questions.map(() => null));
            setRetake(true);
            setResult(null);
          }}
        >
          Retake quiz
        </Button>
      ) : (
        <Button
          className="justify-self-start"
          disabled={busy || answers.some((a) => a === null)}
          onClick={() => void submit()}
        >
          {busy ? 'Checking…' : 'Check my answers'}
        </Button>
      )}
    </section>
  );
}

const KIND_LABEL: Record<(typeof REPORT_KINDS)[number], string> = {
  factual_error: 'Something is factually wrong',
  wrong_quiz_answer: 'A quiz answer is wrong',
  unclear: 'Something is unclear',
  other: 'Something else',
};

function FlagMistake({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof REPORT_KINDS)[number]>('factual_error');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setState('sending');
    setErr(null);
    try {
      await post(`${url}/report`, { kind, message });
      setState('sent');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not send.');
      setState('idle');
    }
  }

  if (state === 'sent')
    return (
      <p role="status" className="text-small text-muted-foreground">
        Thanks, your report was saved. We read every one.
      </p>
    );
  if (!open)
    return (
      <Button
        variant="ghost"
        className="justify-self-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        ⚑ Flag a mistake
      </Button>
    );
  return (
    <Card>
      <CardContent className="grid gap-4">
        <h2 className="text-h3 font-medium">Flag a mistake</h2>
        <div className="grid gap-2">
          <Label htmlFor="report-kind">What kind?</Label>
          <Select
            id="report-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            {REPORT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="report-message">What’s wrong, and where?</Label>
          <Textarea
            id="report-message"
            className="min-h-24"
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Question 3 says B, but C is correct because…"
          />
        </div>
        {err && <ErrorNote>{err}</ErrorNote>}
      </CardContent>
      <CardFooter>
        <Button
          disabled={state === 'sending' || message.trim().length < 5}
          onClick={() => void send()}
        >
          {state === 'sending' ? 'Sending…' : 'Send report'}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}
