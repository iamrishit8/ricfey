import {
  COURSE_DEPTHS,
  coursePrice,
  type CourseDepth,
  type GallerySummary,
  type PublicCourse,
  type ReplanMode,
  type TopicCheckView,
} from '@ricfey/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Page } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, api, post } from '@/lib/api';
import { DEPTH_LABEL } from '@/lib/format';
import { cn } from '@/lib/utils';

const DEPTH_BLURB: Record<CourseDepth, string> = {
  basic: 'New to it. Build intuition and vocabulary. No placement quiz.',
  intermediate: 'Use it on real tasks by yourself. A short placement quiz first.',
  advanced: 'Expert-level understanding. A short placement quiz first.',
};
const WEEKS = [1, 2, 4, 6, 8, 12];
const MINUTES = [15, 30, 45, 60, 90];
const ADAPT: Record<ReplanMode, string> = {
  manual: 'When I ask',
  auto: 'Automatically',
};
const DAYS_PER_WEEK = 5;

type Msg = { from: 'bot' | 'me'; text: string };
type Step =
  'topic' | 'checking' | 'pick' | 'gallery' | 'depth' | 'weeks' | 'minutes' | 'adapt' | 'confirm';

/**
 * The intake as a conversation: what do you want to learn, how deep, for how long, how much a
 * day, and how the plan should adapt. A broad topic gets three narrower suggestions. Nothing is
 * charged here; the price is shown and the learner pays only when they buy the roadmap.
 */
export function NewCoursePage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: 'bot',
      text: 'What do you want to learn? Anything works: a whole field like “quantum physics”, or something narrow like “how entanglement works”.',
    },
  ]);
  const [step, setStep] = useState<Step>('topic');
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [matches, setMatches] = useState<GallerySummary[]>([]);
  const [skill, setSkill] = useState('');
  const [depth, setDepth] = useState<CourseDepth>('intermediate');
  const [weeks, setWeeks] = useState(4);
  const [minutes, setMinutes] = useState(30);
  const [replanMode, setReplanMode] = useState<ReplanMode>('manual');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [messages, step]);

  const say = (...m: Msg[]) => setMessages((all) => [...all, ...m]);
  const me = (t: string): Msg => ({ from: 'me', text: t });
  const bot = (t: string): Msg => ({ from: 'bot', text: t });

  async function submitTopic(raw: string) {
    const typed = raw.trim();
    if (typed.length < 2 || busy) return;
    setText('');
    say(me(typed));
    setStep('checking');
    try {
      const { topic } = await post<{ topic: TopicCheckView }>('/intake/topic', { text: typed });
      if (topic.verdict === 'refuse') {
        say(bot(`${topic.reason} What else would you like to learn?`));
        setStep('topic');
        return;
      }
      setSkill(topic.topic);
      if (topic.specificity === 'broad') {
        setOptions(topic.options);
        say(
          bot(
            `“${topic.topic}” is a big area. Pick a narrower course, type your own, or keep it broad.`,
          ),
        );
        setStep('pick');
      } else {
        await offerGalleryOrAskDepth(topic.topic);
      }
    } catch (err) {
      say(bot(err instanceof ApiError ? err.message : 'Something went wrong. Try that again.'));
      setStep('topic');
    }
  }

  /** Before writing a custom course, show any ready-made course on this topic (cheaper, instant). */
  async function offerGalleryOrAskDepth(topic: string) {
    setSkill(topic);
    try {
      const { courses } = await api<{ courses: GallerySummary[] }>(
        `/gallery?q=${encodeURIComponent(topic)}&limit=3`,
      );
      if (courses.length > 0) {
        setMatches(courses);
        say(
          bot(
            courses.length === 1
              ? 'Good news: a ready-made course on this already exists. It costs less and you can start right now. Or I can write a custom one for you.'
              : `Good news: ${courses.length} ready-made courses on this already exist. They cost less and you can start right now. Or I can write a custom one for you.`,
          ),
        );
        setStep('gallery');
        return;
      }
    } catch {
      // The gallery is a convenience: if it can't be reached, carry on with a custom course.
    }
    askDepth(topic);
  }

  function askDepth(topic: string) {
    setSkill(topic);
    say(bot(`Good: ${topic}. How deep do you want to go?`));
    setStep('depth');
  }

  function chooseDepth(d: CourseDepth) {
    setDepth(d);
    say(me(DEPTH_LABEL[d]), bot('For how many weeks?'));
    setStep('weeks');
  }
  function chooseWeeks(w: number) {
    setWeeks(w);
    say(me(`${w} ${w === 1 ? 'week' : 'weeks'}`), bot('How many minutes a day can you give it?'));
    setStep('minutes');
  }
  function chooseMinutes(m: number) {
    setMinutes(m);
    say(
      me(`${m} minutes`),
      bot(
        'Last one. When your quiz scores show a topic needs more work, should I adapt your next days automatically, or only when you ask?',
      ),
    );
    setStep('adapt');
  }
  function chooseAdapt(mode: ReplanMode) {
    setReplanMode(mode);
    const price = coursePrice(weeks * DAYS_PER_WEEK, minutes, depth);
    say(
      me(ADAPT[mode]),
      bot(
        `Here’s the plan: ${skill}, ${DEPTH_LABEL[depth].toLowerCase()}, ${weeks} ${weeks === 1 ? 'week' : 'weeks'}, ${minutes} minutes a day. I’ll design your roadmap now. It’s free to look at; buying it costs about ${price} credits, once, and then it’s yours forever.`,
      ),
    );
    setStep('confirm');
  }

  async function build() {
    setBusy(true);
    try {
      const { course } = await post<{ course: PublicCourse }>('/courses', {
        skill,
        depth,
        weeks,
        minutesPerDay: minutes,
        replanMode,
      });
      void navigate(`/courses/${course.id}`);
    } catch (err) {
      say(bot(err instanceof ApiError ? err.message : 'Something went wrong. Try again.'));
      setBusy(false);
    }
  }

  function restart() {
    setMessages([bot('Okay, from the top. What do you want to learn?')]);
    setStep('topic');
    setOptions([]);
    setText('');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submitTopic(text);
  }

  const canType = step === 'topic' || step === 'pick';
  const price = coursePrice(weeks * DAYS_PER_WEEK, minutes, depth);

  return (
    <Page narrow>
      <h1 className="text-h1 font-medium">
        What do you want to <em className="text-brand">learn</em>?
      </h1>

      <ol aria-live="polite" className="mt-8 grid gap-3">
        {messages.map((m, i) => (
          <li
            key={i}
            className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3',
              m.from === 'bot'
                ? 'rounded-bl-sm bg-muted'
                : 'ml-auto rounded-br-sm bg-brand text-brand-foreground',
            )}
          >
            {m.text}
          </li>
        ))}
        {step === 'checking' && (
          <li className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-muted-foreground">
            Thinking…
          </li>
        )}
      </ol>

      <div className="mt-6 grid gap-3">
        {step === 'pick' && (
          <Chips>
            {options.map((o) => (
              <Chip key={o} onClick={() => void submitTopic(o)}>
                {o}
              </Chip>
            ))}
            <Chip
              variant="outline"
              onClick={() => {
                say(me('Keep it broad'));
                void offerGalleryOrAskDepth(skill);
              }}
            >
              Keep it broad
            </Chip>
          </Chips>
        )}
        {step === 'gallery' && (
          <div className="grid gap-3">
            <ul className="grid gap-2">
              {matches.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/gallery/${m.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 transition hover:bg-brand-soft"
                  >
                    <span>
                      <span className="font-medium">{m.title}</span>
                      <span className="block text-small text-muted-foreground">
                        {DEPTH_LABEL[m.depth]} · {m.weeks} {m.weeks === 1 ? 'week' : 'weeks'} ·{' '}
                        {m.minutesPerDay} min a day
                      </span>
                    </span>
                    <span className="font-mono text-small">{m.priceCredits} credits</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Chips>
              <Chip
                onClick={() => {
                  say(me('Write a custom one'));
                  askDepth(skill);
                }}
              >
                Write a custom one
              </Chip>
            </Chips>
          </div>
        )}
        {step === 'depth' && (
          <div className="grid gap-2 sm:grid-cols-3">
            {COURSE_DEPTHS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => chooseDepth(d)}
                className="rounded-lg border p-4 text-left transition hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <span className="font-display text-h3 font-medium">{DEPTH_LABEL[d]}</span>
                <span className="mt-1 block text-small text-muted-foreground">
                  {DEPTH_BLURB[d]}
                </span>
              </button>
            ))}
          </div>
        )}
        {step === 'weeks' && (
          <Chips>
            {WEEKS.map((w) => (
              <Chip key={w} onClick={() => chooseWeeks(w)}>
                {w} {w === 1 ? 'week' : 'weeks'}
              </Chip>
            ))}
          </Chips>
        )}
        {step === 'minutes' && (
          <Chips>
            {MINUTES.map((m) => (
              <Chip key={m} onClick={() => chooseMinutes(m)}>
                {m} min
              </Chip>
            ))}
          </Chips>
        )}
        {step === 'adapt' && (
          <Chips>
            {(Object.keys(ADAPT) as ReplanMode[]).map((k) => (
              <Chip key={k} onClick={() => chooseAdapt(k)}>
                {ADAPT[k]}
              </Chip>
            ))}
          </Chips>
        )}
        {step === 'confirm' && (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" disabled={busy} onClick={() => void build()}>
              {busy ? 'Designing…' : 'Design my roadmap →'}
            </Button>
            <Button variant="ghost" onClick={restart} disabled={busy}>
              Start over
            </Button>
            <span className="text-small text-muted-foreground">About {price} credits to buy</span>
          </div>
        )}

        {canType && (
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              id="chat-input"
              aria-label="Your message"
              required
              maxLength={200}
              autoComplete="off"
              placeholder={
                step === 'pick'
                  ? 'Or type your own narrower topic'
                  : 'e.g. Python, personal finance, quantum physics'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="submit" disabled={text.trim().length < 2}>
              Send
            </Button>
          </form>
        )}
      </div>
      <div ref={end} />
    </Page>
  );
}

function Chips({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-small font-medium transition hover:bg-brand-soft focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
        variant === 'outline' && 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}
