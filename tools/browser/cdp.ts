/* eslint-disable @typescript-eslint/no-explicit-any -- DevTools protocol messages are untyped JSON */
// Minimal Chrome DevTools Protocol helper for scripted browser checks (needs Google Chrome).
// Used by tools/browser/*.ts. Not part of `bun test`: run them against the dev servers.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export async function openBrowser(width = 1280, height = 900) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = Bun.spawn(
    [
      CHROME,
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${join(tmpdir(), `ricfey-chrome-${port}`)}`,
      'about:blank',
    ],
    { stderr: 'ignore', stdout: 'ignore' },
  );
  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 50 && !target; i++) {
    await Bun.sleep(200);
    try {
      target = (
        (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as Array<{
          type: string;
          webSocketDebuggerUrl: string;
        }>
      ).find((t) => t.type === 'page');
    } catch {
      // Chrome not listening yet; retry.
    }
  }
  if (!target) throw new Error('chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map<number, (v: any) => void>();
  const listeners: Array<(m: any) => void> = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)!(m.result ?? { error: m.error });
      pending.delete(m.id);
    } else listeners.forEach((f) => f(m));
  };
  const send = (method: string, params: object = {}) =>
    new Promise<any>((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 768,
  });
  const errors: string[] = [];
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown')
      errors.push(
        m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text,
      );
  });
  const evaluate = async <T = unknown>(expression: string): Promise<T> => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result?.value as T;
  };
  return {
    send,
    evaluate,
    errors,
    async goto(url: string) {
      const loaded = new Promise<void>((r) =>
        listeners.push((m) => m.method === 'Page.loadEventFired' && r()),
      );
      await send('Page.navigate', { url });
      await loaded;
      await Bun.sleep(800);
    },
    /** Wait until `expression` is truthy (polls). */
    async waitFor(expression: string, ms = 8000) {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (await evaluate(`!!(${expression})`)) return;
        await Bun.sleep(150);
      }
      throw new Error(`timed out waiting for: ${expression}`);
    },
    /** Type into an input the way React sees it (native setter + input event). */
    async fill(selector: string, value: string) {
      await evaluate(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`,
      );
    },
    async click(selectorOrText: string) {
      await evaluate(
        `(() => { const s = ${JSON.stringify(selectorOrText)}; const el = document.querySelector(s) ?? [...document.querySelectorAll('button,a,label')].find((e) => e.textContent.trim().includes(s)); if (!el) throw new Error('no element: ' + s); el.click(); })()`,
      );
    },
    async screenshot(out: string, fullPage = false) {
      const dims = await evaluate<{ w: number; h: number }>(
        '({ w: innerWidth, h: Math.min(document.documentElement.scrollHeight, 8000) })',
      );
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: fullPage,
        clip: fullPage ? { x: 0, y: 0, width: dims.w, height: dims.h, scale: 1 } : undefined,
      });
      await Bun.write(out, Buffer.from(shot.data, 'base64'));
    },
    /** True when the page is wider than the viewport (a phone-layout bug). */
    async overflows() {
      return evaluate<boolean>('document.documentElement.scrollWidth > innerWidth');
    },
    close() {
      ws.close();
      proc.kill();
    },
  };
}
