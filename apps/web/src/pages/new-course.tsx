import { COURSE_DEPTHS, type CourseDepth, type PublicCourse } from '@ricfey/shared';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ErrorNote, Page } from '@/components/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ApiError, post } from '@/lib/api';
import { cn } from '@/lib/utils';

const DEPTHS: Record<CourseDepth, { title: string; body: string }> = {
  intro: { title: 'Intro', body: 'New to it. Build intuition and vocabulary. No placement quiz.' },
  working: {
    title: 'Working',
    body: 'Use it on real tasks by yourself. Short placement quiz first.',
  },
  deep: { title: 'Deep', body: 'Expert-level understanding. Short placement quiz first.' },
};
const MINUTES = [10, 15, 20, 30, 45, 60, 90, 120];

export function NewCoursePage() {
  const navigate = useNavigate();
  const [skill, setSkill] = useState('');
  const [depth, setDepth] = useState<CourseDepth>('working');
  const [weeks, setWeeks] = useState(4);
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { course } = await post<{ course: PublicCourse }>('/courses', {
        skill,
        depth,
        weeks,
        minutesPerDay: minutes,
      });
      void navigate(`/courses/${course.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <Page narrow>
      <h1 className="text-h1 font-medium">
        What do you want to <em className="text-brand">learn</em>?
      </h1>
      <form onSubmit={onSubmit} className="mt-10 grid gap-8">
        <div className="grid gap-2">
          <Label htmlFor="skill">Skill or subject</Label>
          <Input
            id="skill"
            required
            maxLength={120}
            placeholder="e.g. Python, personal finance, music theory"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          />
        </div>

        <fieldset className="grid gap-3">
          <legend className="mb-1 text-small font-medium">How deep?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {COURSE_DEPTHS.map((d) => (
              <label
                key={d}
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                  depth === d ? 'border-brand bg-brand-soft' : 'hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="depth"
                  value={d}
                  checked={depth === d}
                  onChange={() => setDepth(d)}
                  className="sr-only"
                />
                <span className="font-display text-h3 font-medium">{DEPTHS[d].title}</span>
                <span className="mt-1 block text-small text-muted-foreground">
                  {DEPTHS[d].body}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="weeks">For how long?</Label>
            <Select id="weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? 'week' : 'weeks'}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="minutes">Minutes a day</Label>
            <Select
              id="minutes"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-small text-muted-foreground">
          Five learning days a week. Each day: a lesson, a short task and a quiz.
        </p>

        {error && <ErrorNote>{error}</ErrorNote>}
        <Button
          type="submit"
          size="lg"
          disabled={busy || skill.trim().length < 2}
          className="justify-self-start"
        >
          {busy ? 'Creating…' : 'Build my course →'}
        </Button>
      </form>
    </Page>
  );
}
