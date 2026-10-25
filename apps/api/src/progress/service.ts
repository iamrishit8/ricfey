import type { ProgressView } from '@ricfey/shared';
import type { CourseDoc } from '../models/course';
import { CourseDayModel } from '../models/course-day';
import { QuizAttemptModel } from '../models/quiz-attempt';
import { streaks } from './streak';

type TopicScore = ProgressView['topicScores'][number];

/** Percent right per quiz topic, weakest first, from each day's latest quiz attempt. */
export async function topicScores(course: CourseDoc): Promise<TopicScore[]> {
  const attempts = await QuizAttemptModel.find({ courseId: course._id, userId: course.userId })
    .sort({ createdAt: -1 })
    .lean();
  // Each day's latest attempt only, so retaking a quiz updates the scores.
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

  return [...topics]
    .map(([topic, t]) => ({ topic, ...t, percent: Math.round((t.correct / t.total) * 100) }))
    .sort((a, b) => a.percent - b.percent || a.topic.localeCompare(b.topic));
}

export async function courseProgress(course: CourseDoc, now: Date): Promise<ProgressView> {
  const [days, scores] = await Promise.all([
    CourseDayModel.find({ courseId: course._id, userId: course.userId })
      .select({ day: 1, completedAt: 1 })
      .lean(),
    topicScores(course),
  ]);
  const completions = days.flatMap((d) => (d.completedAt ? [d.completedAt] : []));
  return {
    daysTotal: days.length,
    daysCompleted: completions.length,
    topicScores: scores,
    streak: streaks(completions, now),
  };
}
