import type { QuizQuestion } from '@ricfey/shared';
import type { ReactNode } from 'react';
import { LessonCard } from '@/components/lesson-card';
import { QuizCard } from '@/components/quiz-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-t py-14 sm:py-20">
      <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-h1 font-medium">{title}</h2>
        {note && <p className="max-w-md text-small text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const TYPE_SCALE = [
  { name: 'display', cls: 'text-display font-display font-medium', sample: 'Learn anything.' },
  { name: 'h1', cls: 'text-h1 font-display font-medium', sample: 'Week one: foundations' },
  { name: 'h2', cls: 'text-h2 font-display font-medium', sample: 'Variables and types' },
  { name: 'h3', cls: 'text-h3 font-display font-medium', sample: 'A common mistake' },
  {
    name: 'lead',
    cls: 'text-lead',
    sample: 'Today you will store numbers, do arithmetic and read input.',
  },
  {
    name: 'body',
    cls: 'text-body',
    sample: 'A variable is a label attached to a value. Assign with =, read it back by name.',
  },
  {
    name: 'small',
    cls: 'text-small text-muted-foreground',
    sample: 'About 25 minutes · 5 quiz questions',
  },
];

const SWATCHES = [
  ['background', 'bg-background'],
  ['foreground', 'bg-foreground'],
  ['card', 'bg-card'],
  ['muted', 'bg-muted'],
  ['muted-foreground', 'bg-muted-foreground'],
  ['border', 'bg-border'],
  ['brand', 'bg-brand'],
  ['brand-soft', 'bg-brand-soft'],
  ['success', 'bg-success'],
  ['destructive', 'bg-destructive'],
] as const;

const ACCENTS = [
  { n: '1', name: 'Vermilion', note: 'Warm, energetic, editorial. Chosen.' },
  { n: '2', name: 'Cobalt', note: 'Calm, trustworthy, a little corporate.' },
  { n: '3', name: 'Forest', note: 'Quiet, grown-up, bookish.' },
];

const SAMPLE_QUESTION: QuizQuestion = {
  question: 'You have price = 4500 and quantity = 3. Which line stores the total?',
  options: [
    'total = "price * quantity"',
    'total = price * quantity',
    'price * quantity = total',
    'total == price * quantity',
  ],
  answerIndex: 1,
  explanation:
    'Assignment puts the value on the right into the name on the left. Option A stores text, C is backwards, and D compares instead of assigning.',
  topic: 'variables',
};

export function StyleguidePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
      <header className="pb-14 pt-8 sm:pt-14">
        <Badge>Design system</Badge>
        <h1 className="mt-6 text-display font-medium">
          Style<em className="text-brand">guide</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lead text-muted-foreground">
          Fraunces for headings, Inter for reading, lots of room. Every colour is a CSS variable in{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">src/styles/tokens.css</code>
          ; dark mode is the second token set (toggle above).
        </p>
      </header>

      <Section id="type" title="Type scale">
        <div className="grid gap-8">
          {TYPE_SCALE.map((t) => (
            <div key={t.name} className="grid gap-2 sm:grid-cols-[8rem_1fr] sm:items-baseline">
              <code className="text-small text-muted-foreground">{t.name}</code>
              <p className={t.cls}>{t.sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="colours" title="Colours">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="grid gap-2">
              <div className={`h-20 rounded-lg border ${cls}`} />
              <code className="text-small text-muted-foreground">--{name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="accents"
        title="Accent options"
        note="Option 1 is live. To switch, change --brand in tokens.css to --accent-2 or --accent-3. One line."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {ACCENTS.map((a) => (
            <div key={a.n} data-accent={a.n}>
              <Card
                className={
                  a.n === '1' ? 'ring-2 ring-brand ring-offset-4 ring-offset-background' : ''
                }
              >
                <CardContent className="grid gap-5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-h3 font-medium">
                      {a.n} · {a.name}
                    </span>
                    {a.n === '1' && <Badge variant="solid">Chosen</Badge>}
                  </div>
                  <div className="h-16 rounded-lg bg-brand" />
                  <p className="text-small text-muted-foreground">{a.note}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm">Start lesson</Button>
                    <Badge>Day 3</Badge>
                  </div>
                  <p className="font-display text-h3">
                    One day at a <em className="text-brand">time</em>.
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </Section>

      <Section id="buttons" title="Buttons & inputs">
        <div className="grid gap-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default badge</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="solid">Solid</Badge>
          </div>
          <div className="max-w-sm">
            <Input placeholder="you@example.com" />
          </div>
        </div>
      </Section>

      <Section id="lesson" title="Lesson card">
        <LessonCard
          day={1}
          title="Variables, numbers and input"
          minutes={25}
          topics={['variables', 'numeric-types', 'input']}
        >
          <p>
            Every script starts by holding data, doing arithmetic on it, and asking the user for
            details. Today you build that foundation.
          </p>
          <h2>Storing data</h2>
          <p>
            A variable is a label attached to a value. You assign with <code>=</code>:
          </p>
          <pre>
            <code>{`item_name = "Office Chair"\nunit_price = 4500\nquantity = 3`}</code>
          </pre>
          <ul>
            <li>Names use lowercase and underscores.</li>
            <li>The value on the right is stored under the name on the left.</li>
          </ul>
        </LessonCard>
      </Section>

      <Section id="quiz" title="Quiz card" note="Interactive: pick an answer and check it.">
        <div className="max-w-2xl">
          <QuizCard question={SAMPLE_QUESTION} index={1} total={5} />
        </div>
      </Section>
    </main>
  );
}
