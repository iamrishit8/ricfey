import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowButton } from '@/components/design/arrow-button';
import { Faq } from '@/components/design/faq';
import { Marquee } from '@/components/design/marquee';
import { Pill, SectionLabel } from '@/components/design/pill';
import { Squiggle } from '@/components/design/squiggle';
import { Statement } from '@/components/design/statement';
import { Wordmark } from '@/components/design/wordmark';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

function Section({
  label,
  title,
  note,
  children,
}: {
  label: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t px-4 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>{label}</SectionLabel>
        <h2 className="mt-6 max-w-3xl text-4xl sm:text-6xl">{title}</h2>
        {note && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{note}</p>}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

const SWATCHES: Array<[string, string, string]> = [
  ['Paper', 'bg-background', 'the page'],
  ['White', 'bg-card', 'cards, pills'],
  ['Ink', 'bg-foreground', 'text'],
  ['Red', 'bg-brand', 'brand, buttons, links'],
  ['Red tint', 'bg-brand-tint', 'unfilled statements'],
  ['Red soft', 'bg-brand-soft', 'selected, hover'],
  ['Green', 'bg-green', 'progress, correct'],
  ['Green soft', 'bg-green-soft', 'success background'],
  ['Pill', 'bg-pill', 'the black buttons'],
];

const FAQ = [
  {
    q: 'What can I learn?',
    a: 'Anything that can be taught in writing: a whole field like quantum physics, or one narrow idea. Tell the chat, pick a depth and a length, and a course is written for you.',
  },
  {
    q: 'How do credits work?',
    a: 'Credits are your money here. You get 100 free. A course has one price in credits, shown before you buy. Pay once and it is yours forever.',
  },
  {
    q: 'What if I would rather not wait for a custom course?',
    a: 'Search the gallery. Every finished course is kept, and a ready-made one costs 60% of a custom one and starts today.',
  },
  {
    q: 'Does the plan change if I struggle?',
    a: 'Yes. Your quiz scores show what needs more work, and the next days can be rewritten, on request or automatically. The next 7 days are free.',
  },
];

function Bubble({ me, children }: { me?: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        'max-w-[85%] rounded-3xl px-5 py-3 text-lg',
        me ? 'ml-auto rounded-br-md bg-brand text-brand-foreground' : 'rounded-bl-md bg-card',
      )}
    >
      {children}
    </p>
  );
}

/**
 * The proposal for the new look. Everything here is styled by design.css under
 * data-design="v2"; the rest of the app is untouched until this is approved.
 */
export function DesignPage() {
  return (
    <div data-design="v2" className="min-h-screen">
      {/* Header: pills left, wordmark centre, balance and call to action right. */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8">
        <nav className="flex items-center gap-2" aria-label="Main">
          <Pill>
            <Link to="/gallery">Gallery</Link>
          </Pill>
          <Pill className="hidden sm:inline-flex">
            <Link to="/">My courses</Link>
          </Pill>
        </nav>
        <p className="font-statement text-2xl font-extrabold tracking-tight text-brand">ricfey</p>
        <div className="flex items-center gap-2">
          <Pill className="hidden font-mono sm:inline-flex">100 credits</Pill>
          <ThemeToggle />
          <ArrowButton className="hidden h-11 sm:inline-flex">New course</ArrowButton>
        </div>
      </header>

      <main>
        <section className="px-4 pt-10 pb-20 sm:px-8 sm:pt-20">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>Design proposal</SectionLabel>
            <h1 className="mt-6 text-[clamp(3.5rem,13vw,11rem)]">
              Learn
              <br />
              anything.
            </h1>
            <p className="mt-8 max-w-2xl text-xl text-muted-foreground">
              This page is the whole look in one place: colours, three typefaces, buttons, cards,
              the chat, the quiz, motion. Switch light and dark with the moon. Nothing else in the
              app has changed yet. Tell me what to keep, change or drop.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ArrowButton>Start learning</ArrowButton>
              <ArrowButton className="bg-card text-card-foreground">Browse the gallery</ArrowButton>
            </div>
          </div>
        </section>

        <Marquee>Learn anything • One day at a time • Pay once, keep it forever</Marquee>

        <Section
          label="Colour"
          title="Red, green, white"
          note="Red is the brand: buttons, links, the fill of big statements. Green only means progress and correct. Paper and white carry the rest. The dark theme keeps the same roles."
        >
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {SWATCHES.map(([name, cls, use]) => (
              <li key={name}>
                <div className={cn('h-28 rounded-3xl border', cls)} />
                <p className="mt-2 font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground">{use}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          label="Type"
          title="Three voices"
          note="Anton for headlines in capitals. Bricolage Grotesque for statements and sub-headings. Inter Tight for everything you read, including lessons."
        >
          <div className="grid gap-10 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase">Anton · headlines</p>
              <p className="d-display mt-3 text-7xl">Selected works</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase">Bricolage Grotesque · statements</p>
              <p className="d-statement mt-3 text-5xl font-bold">
                We believe a course should fit you.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase">Inter Tight · reading</p>
              <p className="mt-3 text-lg leading-relaxed">
                A variable is a label attached to a value. Assign with <code>=</code>, read it back
                by name. Today you will store numbers, do arithmetic and read input, then check what
                you learned with five questions.
              </p>
            </div>
          </div>
        </Section>

        <section className="border-t px-4 py-16 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>Statement</SectionLabel>
            <div className="mx-auto mt-10 max-w-5xl text-center">
              <Statement>
                We believe learning works when the plan fits the person. So we write each course for
                you, adjust it from your scores, and keep every finished course for the next
                learner.
              </Statement>
            </div>
          </div>
        </section>

        <Section
          label="Controls"
          title="Buttons and pills"
          note="The black pill with a round red arrow is the one main action on a screen. Everything else is quieter."
        >
          <div className="flex flex-wrap items-center gap-4">
            <ArrowButton>Buy for 200 credits</ArrowButton>
            <button className="h-12 cursor-pointer rounded-full bg-brand px-7 font-medium text-brand-foreground">
              Red button
            </button>
            <button className="h-12 cursor-pointer rounded-full bg-green px-7 font-medium text-green-foreground">
              Green button
            </button>
            <button className="h-12 cursor-pointer rounded-full border border-foreground px-7 font-medium">
              Outline
            </button>
            <button className="h-12 cursor-pointer rounded-full bg-muted px-7 font-medium">
              Quiet
            </button>
            <button disabled className="h-12 rounded-full bg-muted px-7 font-medium opacity-50">
              Disabled
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Pill>Basic</Pill>
            <Pill className="bg-brand-soft">Intermediate</Pill>
            <Pill className="bg-green-soft">12 finished</Pill>
            <Pill className="font-mono">100 credits</Pill>
            <span className="text-sm text-muted-foreground">
              Keyboard focus shows a red ring on every control.
            </span>
          </div>
        </Section>

        <Section
          label="Cards"
          title="Big, rounded, calm"
          note="Course cards are colour panels with a huge title; there are no stock photos to maintain."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                'bg-brand text-brand-foreground',
                'Quantum entanglement',
                'Intermediate · 4 weeks',
                '200',
              ],
              ['bg-green text-green-foreground', 'Sourdough baking', 'Basic · 2 weeks', '80'],
              ['bg-pill text-pill-foreground', 'SQL joins', 'Advanced · 3 weeks', '270'],
            ].map(([tone, title, meta, price]) => (
              <article
                key={title}
                className={cn('flex min-h-80 flex-col justify-between rounded-[2rem] p-7', tone)}
              >
                <p className="text-sm font-semibold uppercase opacity-80">{meta}</p>
                <h3
                  className="d-display text-5xl uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {title}
                </h3>
                <p className="font-mono">{price} credits</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[2rem] bg-card p-7">
              <p className="text-sm font-semibold uppercase text-muted-foreground">Today</p>
              <p className="d-statement mt-3 text-3xl">Day 3: Reading a sheet of music</p>
              <div className="mt-6">
                <ArrowButton>Start</ArrowButton>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-[2rem] bg-card p-7 text-center">
              {[
                ['6', 'of 20 days'],
                ['4', 'day streak'],
                ['9', 'longest'],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-5xl">{n}</p>
                  <p className="text-sm text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          label="Chat"
          title="Talk, don't fill in forms"
          note="The intake is a conversation: free text for the topic, chips for the rest."
        >
          <div className="mx-auto grid max-w-2xl gap-3 rounded-[2rem] bg-muted p-6">
            <Bubble>What do you want to learn?</Bubble>
            <Bubble me>quantum physics</Bubble>
            <Bubble>
              That is a big area. Pick a narrower course, type your own, or keep it broad.
            </Bubble>
            <div className="flex flex-wrap gap-2">
              {['The core ideas', 'Hands-on practice', 'A first deep dive'].map((c) => (
                <button
                  key={c}
                  className="h-10 cursor-pointer rounded-full border bg-card px-5 text-sm font-medium hover:border-brand"
                >
                  Quantum physics: {c.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section
          label="Quiz"
          title="Right is green, wrong is red"
          note="Colour is never the only signal: each answer also carries a word and an icon."
        >
          <div className="max-w-2xl rounded-[2rem] bg-card p-7">
            <p className="d-statement text-2xl">Which note is a perfect fifth above C?</p>
            <ul className="mt-5 grid gap-2">
              <li className="rounded-full border border-green bg-green-soft px-5 py-3">
                <span aria-hidden>✓ </span>G{' '}
                <span className="text-sm text-muted-foreground">Correct</span>
              </li>
              <li className="rounded-full border border-brand bg-brand-soft px-5 py-3">
                <span aria-hidden>✗ </span>F{' '}
                <span className="text-sm text-muted-foreground">Your answer</span>
              </li>
              <li className="rounded-full border px-5 py-3">A</li>
              <li className="rounded-full border px-5 py-3">D</li>
            </ul>
          </div>
        </Section>

        <Section label="How it works" title="Four steps, one line">
          <div className="relative">
            <Squiggle />
            <ol className="mt-8 grid gap-6 sm:grid-cols-4">
              {[
                ['Say it', 'Tell the chat what you want to learn.'],
                ['See the plan', 'A roadmap and one price, before you pay.'],
                ['Learn daily', 'A lesson, a task, a quiz. Free once bought.'],
                ['Adapt', 'Weak topics get more days; strong ones fewer.'],
              ].map(([t, d], i) => (
                <li key={t}>
                  <p className="font-display text-5xl text-brand">{i + 1}</p>
                  <p className="d-statement mt-2 text-xl">{t}</p>
                  <p className="text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section label="Questions" title="Things you might ask">
          <div className="max-w-3xl">
            <Faq items={FAQ} />
          </div>
        </Section>

        <Section
          label="Motion"
          title="Quiet, and optional"
          note="Statements fill as you scroll, the marquee drifts, the arrow turns, the squiggle draws itself once. If your device asks for reduced motion, all of it stops and the final state is shown."
        >
          <ul className="grid list-disc gap-1 pl-5 text-lg">
            <li>No motion carries meaning on its own.</li>
            <li>Nothing flashes; nothing moves faster than a second except button presses.</li>
            <li>Every control works with the keyboard and shows a focus ring.</li>
          </ul>
        </Section>
      </main>

      <footer className="overflow-hidden bg-brand px-4 pt-14 text-brand-foreground sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2
            className="d-display max-w-xl text-6xl uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Okay, that is enough page
          </h2>
          <div className="mt-8">
            <ArrowButton>Start learning</ArrowButton>
          </div>
          <div className="mt-20 flex flex-wrap justify-between gap-6 text-lg">
            <p>Handmade by humans. Well, mostly by a model.</p>
            <p>© 2026 Ricfey</p>
          </div>
          <Wordmark className="mt-6 -mb-[0.1em] text-brand-foreground/90" />
        </div>
      </footer>
    </div>
  );
}
