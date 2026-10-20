// The whole learner journey in a real browser, against the dev servers with LLM_PROVIDER=fake.
//   bun run e2e:learner -- <api-log-file> [screenshot-dir]
// Signs in, creates a course, takes placement, edits + approves the outline, opens Today,
// submits the task and quiz, flags a mistake, checks progress. Screens are checked at 390px.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { openBrowser } from './cdp';

const [LOG, OUT = 'e2e-shots'] = process.argv.slice(2);
if (!LOG)
  throw new Error('usage: bun tools/browser/learner-e2e.ts <api-log-file> [screenshot-dir]');
const WEB = 'http://localhost:5173';
await mkdir(OUT, { recursive: true });

const b = await openBrowser(1280, 900);
const phone = await openBrowser(390, 844);
const step = (s: string) => console.info('✓', s);
const text = () => b.evaluate<string>('document.body.innerText');
let shotNo = 0;
async function shot(name: string) {
  const file = join(OUT, `${String(++shotNo).padStart(2, '0')}-${name}`);
  await b.screenshot(`${file}.png`, true);
  // Same page at phone width, sharing the session cookie, to catch overflow.
  const url = await b.evaluate<string>('location.href');
  await phone.goto(url);
  await Bun.sleep(400);
  if (await phone.overflows()) throw new Error(`horizontal overflow at 390px on ${url}`);
  await phone.screenshot(`${file}-phone.png`, true);
}

try {
  // Sign in (both browsers)
  const email = `learner-${Date.now()}@example.com`;
  for (const browser of [b, phone]) {
    await browser.goto(`${WEB}/login`);
    await browser.fill('#email', email);
    await browser.click('Email me a sign-in link');
    await browser.waitFor(`document.body.innerText.includes('Check your inbox')`);
    await Bun.sleep(300);
    const line = (await Bun.file(LOG).text())
      .split('\n')
      .filter((l) => l.includes('[dev] Magic link for l***@example.com'))
      .at(-1)!;
    await browser.goto(line.match(/(http:\/\/localhost:5173\/auth\/magic\?token=[\w-]+)/)![1]!);
    await browser.waitFor(`document.body.innerText.includes('Your courses')`);
  }
  step('signed in; dashboard shows "Your courses"');
  await shot('dashboard-empty');

  // Intake
  await b.click('Start a new course');
  await b.waitFor(`!!document.querySelector('#skill')`);
  await b.fill('#skill', 'Music theory');
  await b.evaluate(`document.querySelector('input[value=working]').click()`);
  await shot('intake');
  await b.click('Build my course');
  await b.waitFor(`document.body.innerText.includes('starting point')`);
  step('course created; placement shown');

  // Placement: answer until done
  let answered = 0;
  for (; answered < 14; answered++) {
    await b.waitFor(
      `document.body.innerText.includes('Question ') || document.body.innerText.includes('Your starting level')`,
    );
    if ((await text()).includes('Your starting level')) break;
    if (answered === 0) await shot('placement-question');
    await b.evaluate(`document.querySelector('fieldset label').click()`);
    await b.click('Next');
    await b.waitFor(`!document.body.innerText.includes('Saving…')`);
  }
  if (answered < 8 || answered > 12) throw new Error(`placement asked ${answered} questions`);
  step(`placement finished after ${answered} questions`);
  await shot('placement-result');
  await b.click('See my outline');

  // Outline: rename a day, move one, save, approve
  await b.waitFor(`document.body.innerText.includes('Approve and start')`, 15000);
  await shot('outline');
  await b.fill('input[aria-label="Day title"]', 'My renamed first day');
  await b.evaluate(`document.querySelectorAll('button[aria-label="Move down"]')[0].click()`);
  await b.waitFor(`document.body.innerText.includes('Save changes')`);
  await b.click('Save changes');
  await b.waitFor(`document.body.innerText.includes('Version 2')`);
  const firstTitle = await b.evaluate<string>(
    `document.querySelectorAll('input[aria-label="Day title"]')[1].value`,
  );
  if (firstTitle !== 'My renamed first day')
    throw new Error(`rename/move not saved: ${firstTitle}`);
  step('outline edited (rename + move) and saved as version 2');
  await b.click('Approve and start');
  // innerText applies CSS text-transform, so the uppercase label reads "TODAY".
  await b.waitFor(
    `/today/i.test(document.body.innerText) && document.body.innerText.includes('Start →')`,
  );
  step('outline approved; course home shows Today');
  await shot('course-home');

  // Today → day page
  await b.click('Start →');
  await b.waitFor(`document.body.innerText.includes('Practice task')`, 20000);
  if (await b.evaluate<boolean>(`document.body.innerHTML.includes('answerIndex')`))
    throw new Error('answers leaked into the page');
  step('day 1 generated and shown (lesson, task, quiz); no answers in the page');
  await shot('day-lesson');

  // Task
  await b.fill(
    '#task-answer',
    'I would compare the intervals by counting semitones, then check the chord against the scale.',
  );
  await b.click('Submit for feedback');
  await b.waitFor(
    `/\\d+ \\/ \\d+/.test(document.querySelector('[role=status]')?.innerText ?? '')`,
    15000,
  );
  step(
    'task graded: ' +
      (await b.evaluate<string>(
        `document.querySelector('[role=status]').innerText.split('\\n')[0]`,
      )),
  );

  // Quiz: pick the first option everywhere
  const qCount = await b.evaluate<number>(
    `document.querySelectorAll('input[type=radio][name^=q]').length / 4`,
  );
  for (let i = 0; i < qCount; i++)
    await b.evaluate(`document.querySelector('input[name=q${i}]').parentElement.click()`);
  await b.click('Check my answers');
  await b.waitFor(`document.body.innerText.includes('Retake quiz')`);
  step(
    'quiz checked: ' +
      (await b.evaluate<string>(
        `[...document.querySelectorAll('h2')].find((h) => h.innerText === 'Quiz').parentElement.querySelector('p').innerText`,
      )),
  );
  await shot('day-graded');

  // Flag a mistake
  await b.click('Flag a mistake');
  await b.fill('#report-message', 'Question 2 looks wrong to me.');
  await b.click('Send report');
  await b.waitFor(`document.body.innerText.includes('your report was saved')`);
  step('mistake flagged');

  // Progress
  await b.goto(
    `${(await b.evaluate<string>('location.href')).replace(/\/days\/\d+$/, '')}/progress`,
  );
  await b.waitFor(`document.body.innerText.includes('Score by topic')`);
  const prog = await text();
  const done = prog.match(/(\d+)\/(\d+)\s*days done/);
  if (!done || done[1] !== '1')
    throw new Error(`progress should show 1 day done, got: ${done?.[0]}`);
  step(`progress: ${done[0]}, topic score shown`);
  await shot('progress');
  if (b.errors.length || phone.errors.length)
    console.info('page errors:', [...b.errors, ...phone.errors]);
} catch (e) {
  console.info('✗', (e as Error).message);
  await b.screenshot(join(OUT, 'FAIL.png'));
  process.exitCode = 1;
} finally {
  b.close();
  phone.close();
}
