// Browser check of the login flow against running dev servers (API in dev mode, Vite on :5173).
//   bun run e2e:login -- <path to the API's log file>
// The API must print magic links (no RESEND_API_KEY), and its output must go to that file.
import { openBrowser } from './cdp';

const LOG = process.argv[2];
if (!LOG) throw new Error('usage: bun tools/browser/login-e2e.ts <api-log-file>');
const WEB = 'http://localhost:5173';
const email = `e2e-${Date.now()}@example.com`;
const b = await openBrowser();
const step = (s: string) => console.info('✓', s);
try {
  await b.goto(`${WEB}/login`);
  await b.fill('#email', email);
  await b.click('Email me a sign-in link');
  await b.waitFor(`document.body.innerText.includes('Check your inbox')`);
  step('login form submitted, "Check your inbox" shown');

  await Bun.sleep(300);
  const lines = (await Bun.file(LOG).text())
    .split('\n')
    .filter((l) => l.includes('[dev] Magic link for e***@example.com'));
  const link = lines.at(-1)!.match(/(http:\/\/localhost:5173\/auth\/magic\?token=[\w-]+)/)![1]!;
  step('magic link taken from the API console');

  await b.goto(link);
  await b.waitFor(`location.pathname === '/' && document.body.innerText.includes('Signed in as')`);
  step('landed on / showing "Signed in as …"');

  await b.send('Network.enable');
  const { cookies } = await b.send('Network.getCookies', { urls: [WEB] });
  const c = cookies.find((x: { name: string }) => x.name === 'ricfey_session');
  step(`cookie ricfey_session: httpOnly=${c.httpOnly} secure=${c.secure} sameSite=${c.sameSite}`);
  const jsSees = await b.evaluate<string>('document.cookie');
  step(`document.cookie visible to JS: "${jsSees}" (httpOnly hides the session)`);

  await b.goto(link);
  await b.waitFor(`location.pathname === '/login'`);
  step(
    `reusing the link → ${await b.evaluate<string>('location.pathname + location.search')}, shows: "${await b.evaluate<string>(`document.querySelector('[role=alert]')?.innerText`)}"`,
  );

  await b.goto(`${WEB}/`);
  await b.click('Sign out');
  await b.waitFor(`document.body.innerText.includes('Start learning')`);
  const me = await b.evaluate<number>(`fetch('/api/auth/me').then((r) => r.status)`);
  step(`signed out; /api/auth/me now ${me}`);
  if (b.errors.length) console.info('page errors:', b.errors);
} catch (e) {
  console.info('✗', (e as Error).message);
  await b.screenshot('e2e-login-fail.png');
  console.info('  screenshot: e2e-login-fail.png');
  process.exitCode = 1;
} finally {
  b.close();
}
