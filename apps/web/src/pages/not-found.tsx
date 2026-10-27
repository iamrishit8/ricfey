import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-32 sm:px-8">
      <h1 className="text-h1 font-medium">This page took a day off.</h1>
      <Button className="mt-8" asChild>
        <Link to="/">Back home</Link>
      </Button>
    </main>
  );
}
