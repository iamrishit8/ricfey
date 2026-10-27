import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export function LessonCard(props: {
  day: number;
  title: string;
  minutes: number;
  topics: string[];
  children: ReactNode;
  onStart?: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="solid">Day {props.day}</Badge>
          <span className="text-small text-muted-foreground">About {props.minutes} minutes</span>
        </div>
        <h3 className="mt-3 text-h2 font-medium">{props.title}</h3>
        <div className="flex flex-wrap gap-2">
          {props.topics.map((t) => (
            <Badge key={t} variant="outline" className="normal-case tracking-normal">
              {t}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="prose-lesson">{props.children}</CardContent>
      <CardFooter>
        <Button onClick={props.onStart}>Start today’s lesson →</Button>
      </CardFooter>
    </Card>
  );
}
