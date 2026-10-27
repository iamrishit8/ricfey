import type { CourseOutline, DayContent } from '@ricfey/shared';

/** Human-readable outline for review. */
export function renderOutlineMd(o: CourseOutline): string {
  const weeks = o.weeks.map(
    (w) =>
      `## Week ${w.week}: ${w.theme}\n\n` +
      w.days
        .map(
          (d) =>
            `**Day ${d.day}: ${d.title}**  \n` +
            `Topics: ${d.topics.map((t) => `\`${t}\``).join(', ')}\n\n` +
            d.objectives.map((x) => `- ${x}`).join('\n'),
        )
        .join('\n\n'),
  );
  return `# ${o.title}\n\n_Depth: ${o.depth}_\n\n${o.summary}\n\n${weeks.join('\n\n')}\n`;
}

/** Human-readable day: lesson, task with rubric, quiz with answers. */
export function renderDayMd(d: DayContent): string {
  const letters = 'ABCDEFGH';
  const rubric = d.task.rubric
    .map((r) => `| ${r.criterion} | ${r.description} | ${r.points} |`)
    .join('\n');
  const quiz = d.quiz.questions
    .map(
      (q, i) =>
        `**${i + 1}. ${q.question}** _(topic: \`${q.topic}\`)_\n\n` +
        q.options.map((opt, j) => `- ${letters[j]}. ${opt}`).join('\n') +
        `\n\n> Answer: **${letters[q.answerIndex]}**. ${q.explanation}`,
    )
    .join('\n\n');
  return [
    `# Day ${d.day}: ${d.title}`,
    `_About ${d.lesson.estimatedMinutes} minutes_`,
    '---',
    d.lesson.markdown,
    '---',
    '## Practice task',
    d.task.prompt,
    '| Criterion | What good looks like | Points |\n| --- | --- | --- |\n' + rubric,
    '---',
    '## Quiz',
    quiz,
    '',
  ].join('\n\n');
}
