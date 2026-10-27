import { COURSE_DEPTHS, type GallerySummary } from '@ricfey/shared';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ErrorNote, Page, Spinner } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DEPTH_LABEL } from '@/lib/format';
import { useApi } from '@/lib/use-api';

export function GalleryCard({ course }: { course: GallerySummary }) {
  return (
    <Card className="transition hover:border-brand">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge>{DEPTH_LABEL[course.depth]}</Badge>
          <Badge variant="outline">
            {course.weeks} {course.weeks === 1 ? 'week' : 'weeks'} · {course.minutesPerDay} min a
            day
          </Badge>
        </div>
        <h2 className="font-display text-h3 font-medium">
          <Link to={`/gallery/${course.id}`} className="after:absolute after:inset-0">
            {course.title}
          </Link>
        </h2>
        <p className="text-small text-muted-foreground">{course.summary}</p>
        <div className="flex items-center justify-between text-small">
          <span className="font-mono">{course.priceCredits} credits</span>
          <span className="text-muted-foreground">
            {course.completions > 0 ? `${course.completions} finished` : 'Ready to start'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Ready-made courses that earlier learners finished. Search, filter, buy at a lower price. */
export function GalleryPage() {
  const [q, setQ] = useState('');
  const [depth, setDepth] = useState('');
  const [submitted, setSubmitted] = useState({ q: '', depth: '' });
  const params = new URLSearchParams();
  if (submitted.q) params.set('q', submitted.q);
  if (submitted.depth) params.set('depth', submitted.depth);
  const { data, error, loading } = useApi<{ courses: GallerySummary[] }>(
    `/gallery${params.size ? `?${params}` : ''}`,
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted({ q: q.trim(), depth });
  }

  return (
    <Page>
      <p className="text-small font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Gallery
      </p>
      <h1 className="mt-4 text-h1 font-medium">Ready-made courses</h1>
      <p className="mt-4 max-w-2xl text-lead text-muted-foreground">
        Every course here was written for a learner and finished by them. Buy one for 60% of the
        price of a custom course and start today. The lessons are fixed.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-wrap gap-2">
        <Input
          aria-label="Search the gallery"
          className="min-w-0 flex-1 basis-60"
          placeholder="Search, e.g. quantum, sourdough, SQL"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          aria-label="Depth"
          className="w-auto"
          value={depth}
          onChange={(e) => setDepth(e.target.value)}
        >
          <option value="">Any depth</option>
          {COURSE_DEPTHS.map((d) => (
            <option key={d} value={d}>
              {DEPTH_LABEL[d]}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      {error && (
        <div className="mt-6">
          <ErrorNote>{error.message}</ErrorNote>
        </div>
      )}
      {loading && <Spinner label="Looking…" />}
      {data && data.courses.length === 0 && (
        <div className="mt-10 grid gap-4">
          <p className="text-lead">
            {submitted.q || submitted.depth
              ? 'Nothing matches that yet.'
              : 'No ready-made courses yet. Finished courses show up here.'}
          </p>
          <Button className="justify-self-start" asChild>
            <Link to="/courses/new">Have one made for you →</Link>
          </Button>
        </div>
      )}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {data?.courses.map((c) => (
          <li key={c.id} className="relative">
            <GalleryCard course={c} />
          </li>
        ))}
      </ul>
    </Page>
  );
}
