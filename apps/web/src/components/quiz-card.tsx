import type { QuizQuestion } from '@ricfey/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const LETTERS = 'ABCDEFGH';

export function QuizCard({
  question,
  index,
  total,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && picked === question.answerIndex;

  return (
    <Card>
      <CardHeader>
        <span className="text-small text-muted-foreground">
          Question {index} of {total} · <span className="font-mono text-xs">{question.topic}</span>
        </span>
        <p className="font-display text-h3 font-medium">{question.question}</p>
      </CardHeader>
      <CardContent>
        <fieldset className="grid gap-3" disabled={checked}>
          <legend className="sr-only">Choose one answer</legend>
          {question.options.map((opt, i) => {
            const isAnswer = i === question.answerIndex;
            return (
              <label
                key={opt}
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-3 transition',
                  'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                  !checked && picked === i && 'border-brand bg-brand-soft',
                  !checked && picked !== i && 'hover:bg-muted',
                  checked && isAnswer && 'border-success bg-success/10',
                  checked && picked === i && !isAnswer && 'border-destructive bg-destructive/10',
                )}
              >
                <input
                  type="radio"
                  name={`q-${index}`}
                  className="sr-only"
                  checked={picked === i}
                  onChange={() => setPicked(i)}
                />
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full border font-display text-sm font-semibold',
                    picked === i && !checked && 'border-brand bg-brand text-brand-foreground',
                  )}
                >
                  {LETTERS[i]}
                </span>
                <span>{opt}</span>
              </label>
            );
          })}
        </fieldset>
        {checked && (
          <div
            role="status"
            className={cn(
              'mt-5 rounded-lg border-l-4 bg-muted px-4 py-3',
              correct ? 'border-success' : 'border-destructive',
            )}
          >
            <p className="font-medium">
              {correct ? 'Correct.' : `Not quite. The answer is ${LETTERS[question.answerIndex]}.`}
            </p>
            <p className="mt-1 text-muted-foreground">{question.explanation}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!checked ? (
          <Button disabled={picked === null} onClick={() => setChecked(true)}>
            Check answer
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setPicked(null);
              setChecked(false);
            }}
          >
            Try again
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
