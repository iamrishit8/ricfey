import type { ProgressView } from '@ricfey/shared';
import type { CourseDoc } from '../models/course';
import { CourseDayModel } from '../models/course-day';
import { QuizAttemptModel } from '../models/quiz-attempt';
import { streaks } from './streak';

export async function courseProgress(course: CourseDoc, now: Date): Promise<ProgressView> {
  const filter = { courseId: course._id, userId: course.userId };
  const [days, attempts] = await Promise.all([
    CourseDayModel.find(filter).select({ day: 1, completedAt: 1 }).lean(),
    QuizAttemptModel.find(filter).sort({ createdAt: -1 }).lean(),
  ]);

  // Topic scores use each day's latest quiz attempt, so retaking a quiz updates them.
  const latestPerDay = new Map<number, (typeof attempts)[number]>();
  for (const a of attempts) if (!latestPerDay.has(a.day)) latestPerDay.set(a.day, a);
  const topics = new Map<string, { correct: number; total: number }>();
  for (const a of latestPerDay.values()) {
    for (const r of a.results) {
      const t = topics.get(r.topic!) ?? { correct: 0, total: 0 };
      t.total += 1;
      if (r.correct) t.correct += 1;
      topics.set(r.topic!, t);
    }
  }

  const completions = days.flatMap((d) => (d.completedAt ? [d.completedAt] : []));
  return {
    daysTotal: days.length,
    daysCompleted: completions.length,
    topicScores: [...topics]
      .map(([topic, t]) => ({ topic, ...t, percent: Math.round((t.correct / t.total) * 100) }))
      .sort((a, b) => a.percent - b.percent || a.topic.localeCompare(b.topic)),
    streak: streaks(completions, now),
  };
}
