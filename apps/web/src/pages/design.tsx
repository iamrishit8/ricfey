import type { CSSProperties, ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import {
  Blob,
  Book,
  Burst,
  CurvedArrow,
  Flower,
  Smiley,
  Sparkle,
  Spiral,
  Squiggle,
  Star,
} from '@/components/design/graphics';
import {
  ArrowButton,
  Chip,
  Faq,
  Marquee,
  SectionLabel,
  Statement,
} from '@/components/design/parts';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const DIRECTIONS = [
  { id: 'sticker', name: 'A · Sticker Club', blurb: 'Chunky, outlined, playful' },
  { id: 'poster', name: 'B · Big Poster', blurb: 'Bold type, colour blocks' },
  { id: 'garden', name: 'C · Soft Garden', blurb: 'Soft serif, warm, organic' },
] as const;
type Direction = (typeof DIRECTIONS)[number]['id'];

const rot = (deg: number): CSSProperties => ({ '--rot': `${deg}deg` }) as CSSProperties;

function Section({
  label,
  title,
  children,
  className,
  style,
}: {
  label: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={cn('relative px-4 py-20 sm:px-8 sm:py-28', className)} style={style}>
      <div className="mx-auto max-w-6xl">
        <SectionLabel>{label}</SectionLabel>
        <h2 className="dz-head mt-5 max-w-4xl text-[clamp(2.5rem,6.5vw,5.5rem)]">{title}</h2>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}

const COURSES = [
  {
    title: 'Quantum entanglement',
    meta: 'Intermediate · 4 weeks',
    price: 200,
    bg: 'var(--red)',
    fg: 'var(--on-red)',
    tex: 'dz-dots',
    Icon: Sparkle,
    iconFill: 'var(--c3)',
  },
  {
    title: 'Sourdough from zero',
    meta: 'Basic · 2 weeks',
    price: 80,
    bg: 'var(--c3)',
    fg: 'var(--on-c)',
    tex: 'dz-checker',
    Icon: Flower,
    iconFill: 'var(--c4)',
  },
  {
    title: 'SQL joins, properly',
    meta: 'Advanced · 3 weeks',
    price: 270,
    bg: 'var(--green)',
    fg: 'var(--on-green)',
    tex: 'dz-stripes',
    Icon: Star,
    iconFill: 'var(--c3)',
  },
  {
    title: 'Reading music',
    meta: 'Basic · 1 week',
    price: 40,
    bg: 'var(--c5)',
    fg: 'var(--on-c5)',
    tex: 'dz-dots',
    Icon: Book,
    iconFill: 'var(--surface)',
  },
];

const PACKS = [
  { credits: 100, price: 99, bg: 'var(--surface)' },
  { credits: 330, price: 299, bg: 'var(--c5)', fg: 'var(--on-c5)' },
  { credits: 575, price: 499, bg: 'var(--c4)', fg: 'var(--on-c)' },
  { credits: 1200, price: 999, bg: 'var(--c3)', fg: 'var(--on-c)' },
  { credits: 2500, price: 1999, bg: 'var(--green)', fg: 'var(--on-green)', best: true },
];

const FAQ = [
  {
    q: 'What can I learn?',
    a: 'Anything that can be taught in writing: a whole field like quantum physics, or one narrow idea. Tell the chat, pick a depth and a length, and a course is written for you.',
  },
  {
    q: 'How do credits work?',
    a: 'Credits are your money here. You get 100 free. A course has one price, shown before you buy. Pay once and it is yours forever.',
  },
  {
    q: 'Can I skip the wait?',
    a: 'Search the gallery. Every finished course is kept, and a ready-made one costs 60% of a custom one and starts today.',
  },
  {
    q: 'What if I struggle?',
    a: 'Your quiz scores show what needs more work, and the next days are rewritten, on request or automatically. The next 7 days are free.',
  },
];

function CourseCard({
  c,
  className,
  style,
}: {
  c: (typeof COURSES)[number];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <article
      className={cn('dz-card relative flex min-h-80 flex-col overflow-hidden', className)}
      style={{ background: c.bg, color: c.fg, ...style }}
    >
      <div className={cn('h-14 shrink-0 opacity-25', c.tex)} style={{ color: 'var(--ink)' }} />
      <c.Icon
        fill={c.iconFill}
        className="dz-sticker absolute top-5 right-5 size-16"
        style={rot(12)}
      />
      <div className="flex flex-1 flex-col justify-between gap-6 p-6">
        <p className="text-sm font-bold tracking-wider uppercase">{c.meta}</p>
        <h3 className="dz-head dz-card-title" lang="en">
          {c.title}
        </h3>
        <p className="font-mono text-base font-semibold">{c.price} credits</p>
      </div>
    </article>
  );
}

/**
 * Three complete design directions on one page, for the owner to choose from. Everything here
 * reads the tokens in styles/design.css; the rest of the app is untouched.
 */
export function DesignPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('d');
  const direction: Direction = DIRECTIONS.some((d) => d.id === raw)
    ? (raw as Direction)
    : 'sticker';
  const pick = (d: Direction) => {
    const next = new URLSearchParams(params);
    next.set('d', d);
    setParams(next, { replace: true });
  };

  return (
    <div data-design data-direction={direction} className="min-h-screen overflow-x-hidden pb-28">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8">
        <nav className="flex items-center gap-2" aria-label="Main">
          <Chip>Gallery</Chip>
          <Chip className="hidden sm:inline-flex">My courses</Chip>
        </nav>
        <p className="dz-head flex items-center gap-1 text-3xl" style={{ color: 'var(--red)' }}>
          ricfey
          <Sparkle fill="var(--green)" className="size-5" />
        </p>
        <div className="flex items-center gap-2">
          <Chip className="hidden font-mono sm:inline-flex">100 credits</Chip>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-4 pt-8 pb-24 sm:px-8 sm:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative">
            <Chip style={{ background: 'var(--c3)', color: 'var(--on-c)' }}>
              ✺ Courses written for you, in minutes
            </Chip>
            <h1 className="dz-head dz-hero-title mt-6">
              <span style={{ color: 'var(--red)' }}>Learn</span>{' '}
              <span className="dz-accent">anything,</span>
              <br />
              one day{' '}
              <span className="relative inline-block">
                at a time
                <svg
                  aria-hidden
                  viewBox="0 0 300 30"
                  className="dz-swash absolute left-0 w-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M4 20 C 80 4, 200 4, 296 18"
                    style={{
                      stroke: 'var(--green)',
                      strokeWidth: 10,
                      fill: 'none',
                      strokeLinecap: 'round',
                    }}
                  />
                </svg>
              </span>
              .
            </h1>
            <p className="mt-8 max-w-xl text-xl leading-relaxed" style={{ color: 'var(--muted)' }}>
              Tell Ricfey what you want to learn. Get a day-by-day course with a lesson, a task and
              a quiz, that changes with your scores. Pay once, keep it forever.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <ArrowButton>Start learning</ArrowButton>
              <ArrowButton quiet>Browse the gallery</ArrowButton>
            </div>
            <div className="mt-10 flex items-end gap-2">
              <CurvedArrow className="h-14 w-20 -scale-y-100" />
              <p className="dz-hand -mb-2 text-3xl" style={{ color: 'var(--red)' }}>
                yes, even quantum physics
              </p>
            </div>
          </div>

          {/* Collage: fanned course cards and stickers */}
          <div className="relative mx-auto h-[30rem] w-full max-w-md">
            <Blob
              fill="var(--c4)"
              className="dz-spin absolute -top-6 -right-10 size-80 opacity-80"
            />
            <CourseCard
              c={COURSES[2]!}
              className="dz-sticker absolute top-10 -left-4 w-72"
              style={rot(-9)}
            />
            <CourseCard
              c={COURSES[1]!}
              className="dz-sticker absolute top-4 -right-4 w-72"
              style={rot(7)}
            />
            <CourseCard
              c={COURSES[0]!}
              className="dz-sticker absolute top-24 left-10 w-72"
              style={rot(-2)}
            />
            <Burst
              fill="var(--c3)"
              className="dz-sticker dz-float absolute -bottom-2 -left-4 size-36"
              style={rot(-12)}
            >
              <span className="dz-head block text-2xl leading-none">100</span>
              <span className="text-xs font-bold uppercase">free credits</span>
            </Burst>
            <Smiley className="dz-sticker absolute right-2 bottom-6 size-20" style={rot(14)} />
            <Sparkle fill="var(--green)" className="absolute top-0 left-0 size-12 dz-float" />
          </div>
        </div>
      </section>

      <Marquee
        items={[
          'Learn anything',
          'One day at a time',
          'Pay once, keep it forever',
          'Adapts to your scores',
        ]}
        className="-rotate-1 border-y-[length:var(--bw)]"
      />
      <div
        style={{ background: 'var(--red)', color: 'var(--on-red)' }}
        className="-mt-[4.6rem] rotate-1 border-y-[length:var(--bw)] border-[color:var(--ink)]"
      >
        <Marquee
          items={[
            'Quantum physics',
            'Sourdough',
            'SQL',
            'Music theory',
            'Kannada',
            'Personal finance',
            'Astrophysics',
          ]}
        />
      </div>

      {/* How it works */}
      <Section
        label="How it works"
        title={
          <>
            Four steps. <span className="dz-accent">One line.</span>
          </>
        }
      >
        <div className="relative">
          <Squiggle
            className="pointer-events-none absolute -top-10 left-0 hidden w-full lg:block"
            color="var(--green)"
          />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                'Say it',
                'Tell the chat what you want to learn. Broad or narrow.',
                'var(--c3)',
                Burst,
              ],
              [
                'See the plan',
                'A roadmap and one price, before you pay a thing.',
                'var(--c4)',
                Flower,
              ],
              [
                'Learn daily',
                'A lesson, a task, a quiz. Every day free once bought.',
                'var(--c5)',
                Star,
              ],
              [
                'Adapt',
                'Weak topics get more days; strong ones get fewer.',
                'var(--green)',
                Sparkle,
              ],
            ].map(([t, d, color, Shape], i) => {
              const S = Shape as typeof Burst;
              return (
                <li
                  key={t as string}
                  className="dz-card dz-sticker p-6"
                  style={rot(i % 2 ? 2 : -2)}
                >
                  <div className="relative size-20">
                    <S fill={color as string} className="absolute inset-0 size-20" />
                    <span className="dz-head absolute inset-0 grid place-items-center text-3xl">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="dz-head mt-5 text-3xl">{t as string}</h3>
                  <p className="mt-2 text-lg" style={{ color: 'var(--muted)' }}>
                    {d as string}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </Section>

      {/* Statement */}
      <section className="px-4 py-24 sm:px-8 sm:py-32" style={{ background: 'var(--surface)' }}>
        <div className="relative mx-auto max-w-5xl text-center">
          <Spiral
            className="dz-float absolute -top-16 -left-2 size-20 sm:-left-16"
            color="var(--red)"
          />
          <Statement>
            We believe learning sticks when the plan fits the person. So we write each course for
            you, reshape it from your scores, and keep every finished course for the next learner.
          </Statement>
          <Star
            fill="var(--c3)"
            className="dz-float absolute -right-2 -bottom-16 size-16 sm:-right-12"
          />
        </div>
      </section>

      {/* Gallery */}
      <Section
        label="The gallery"
        title={
          <>
            Ready-made.{' '}
            <span className="dz-accent" style={{ color: 'var(--red)' }}>
              40% off.
            </span>
          </>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {COURSES.map((c, i) => (
            <CourseCard
              key={c.title}
              c={c}
              className="dz-sticker"
              style={rot([-3, 2, -1, 3][i]!)}
            />
          ))}
        </div>
      </Section>

      {/* Inside the app */}
      <Section
        label="Inside"
        title={
          <>
            Talk. Learn. <span className="dz-accent">Get it right.</span>
          </>
        }
        style={{ background: 'var(--c5)', color: 'var(--on-c5)' }}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="dz-card grid content-start gap-3 p-6">
            <p className="text-sm font-bold uppercase">The chat</p>
            <p
              className="max-w-[85%] rounded-3xl rounded-bl-md p-4"
              style={{ background: 'var(--paper)' }}
            >
              What do you want to learn?
            </p>
            <p
              className="ml-auto max-w-[85%] rounded-3xl rounded-br-md p-4 font-semibold"
              style={{ background: 'var(--red)', color: 'var(--on-red)' }}
            >
              quantum physics
            </p>
            <p
              className="max-w-[85%] rounded-3xl rounded-bl-md p-4"
              style={{ background: 'var(--paper)' }}
            >
              Big area! Pick a narrower course:
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip style={{ background: 'var(--c3)', color: 'var(--on-c)' }}>The core ideas</Chip>
              <Chip>Entanglement</Chip>
              <Chip>Hands-on</Chip>
            </div>
          </div>

          <div className="dz-card grid content-start gap-3 p-6">
            <p className="text-sm font-bold uppercase">The quiz</p>
            <p className="dz-head text-2xl">A perfect fifth above C?</p>
            <p
              className="dz-chip w-full! justify-between"
              style={{ background: 'color-mix(in oklch, var(--green) 30%, var(--surface))' }}
            >
              <span>
                <span aria-hidden>✓ </span>G
              </span>
              <span className="text-sm">Correct</span>
            </p>
            <p
              className="dz-chip w-full! justify-between"
              style={{ background: 'color-mix(in oklch, var(--red) 25%, var(--surface))' }}
            >
              <span>
                <span aria-hidden>✗ </span>F
              </span>
              <span className="text-sm">Your answer</span>
            </p>
            <p className="dz-chip w-full!">A</p>
            <p className="dz-chip w-full!">D</p>
          </div>

          <div className="dz-card grid content-start gap-4 p-6">
            <p className="text-sm font-bold uppercase">Your progress</p>
            <div className="flex items-end gap-6">
              <div>
                <p className="dz-head text-6xl">6</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  of 20 days
                </p>
              </div>
              <div className="relative">
                <Burst fill="var(--c3)" points={10} className="size-24">
                  <span className="dz-head block text-3xl leading-none">4</span>
                  <span className="text-[0.65rem] font-bold uppercase">day streak</span>
                </Burst>
              </div>
            </div>
            <div className="grid gap-2">
              {[
                ['intervals', 90, 'var(--green)'],
                ['scales', 72, 'var(--c3)'],
                ['rhythm', 45, 'var(--red)'],
              ].map(([t, p, c]) => (
                <div key={t as string}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{t as string}</span>
                    <span>{p as number}%</span>
                  </div>
                  <div
                    className="mt-1 h-4 overflow-hidden rounded-full border-[length:var(--bw)] border-[color:var(--ink)]"
                    style={{ background: 'var(--paper)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p}%`, background: c as string }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Packs */}
      <Section
        label="Credits"
        title={
          <>
            Buy more, <span className="dz-accent">pay less.</span>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {PACKS.map((p, i) => (
            <div
              key={p.credits}
              className="dz-card dz-sticker relative grid gap-2 p-6 text-center"
              style={{
                background: p.bg,
                color: p.fg ?? 'var(--ink)',
                ...rot([-2, 1, -1, 2, -3][i]!),
              }}
            >
              {p.best && (
                <Burst
                  fill="var(--c3)"
                  points={12}
                  className="absolute -top-8 -right-6 size-24 text-[var(--ink)]"
                >
                  <span className="text-xs leading-tight font-black uppercase">Best value</span>
                </Burst>
              )}
              <p className="dz-head dz-pack-num">{p.credits.toLocaleString('en-IN')}</p>
              <p className="text-sm font-bold uppercase">credits</p>
              <p className="mt-3 font-mono text-xl font-bold">₹{p.price.toLocaleString('en-IN')}</p>
              <p className="text-sm">₹{(p.price / p.credits).toFixed(2)} each</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section
        label="Questions"
        title={
          <>
            Things you <span className="dz-accent">might ask</span>
          </>
        }
      >
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="relative hidden h-80 lg:block">
            <Blob fill="var(--c3)" className="absolute inset-0 size-full" />
            <Smiley className="dz-float absolute top-16 left-20 size-40" fill="var(--c4)" />
            <p className="dz-hand absolute right-6 bottom-10 rotate-[-6deg] text-4xl">ask away!</p>
          </div>
          <Faq items={FAQ} />
        </div>
      </Section>

      {/* Footer */}
      <footer
        className="relative overflow-hidden px-4 pt-20 sm:px-8"
        style={{ background: 'var(--red)', color: 'var(--on-red)' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className="dz-head max-w-xl text-[clamp(2.75rem,7vw,5.5rem)]">
              Okay, that&apos;s <span className="dz-accent">enough</span> page.
            </h2>
            <ArrowButton>Start learning</ArrowButton>
          </div>
          <div className="mt-16 flex flex-wrap justify-between gap-6 text-lg font-semibold">
            <p>Written by a model. Checked by humans.</p>
            <p>Made in India · © 2026 Ricfey</p>
          </div>
          <div className="relative mt-8">
            <p
              aria-hidden
              className="dz-head text-[clamp(5rem,25vw,23rem)] leading-[0.78] select-none"
            >
              ricfey
            </p>
            <Flower className="dz-spin absolute top-0 right-[8%] size-[16vw] max-w-40" />
            <Star
              fill="var(--c3)"
              className="dz-float absolute bottom-[30%] left-[42%] size-[9vw] max-w-24"
            />
          </div>
        </div>
      </footer>

      {/* Direction switcher */}
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3">
        <div
          role="radiogroup"
          aria-label="Design direction"
          className="flex max-w-full gap-1 overflow-x-auto rounded-full border-2 p-1.5 shadow-lg"
          style={{ background: 'var(--surface)', borderColor: 'var(--ink)' }}
        >
          {DIRECTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={direction === d.id}
              onClick={() => pick(d.id)}
              title={d.blurb}
              className="h-10 cursor-pointer rounded-full px-4 text-sm font-bold whitespace-nowrap"
              style={
                direction === d.id ? { background: 'var(--ink)', color: 'var(--paper)' } : undefined
              }
            >
              <span className="sm:hidden">{d.name.split(' · ')[1]}</span>
              <span className="hidden sm:inline">{d.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
