// Screenshot a page at an exact viewport width and report horizontal overflow.
//   bun run shot -- <url> <out.png> [width=390] [height=844]
import { openBrowser } from './cdp';

const [url, out, w = '390', h = '844'] = process.argv.slice(2);
if (!url || !out)
  throw new Error('usage: bun tools/browser/shot.ts <url> <out.png> [width] [height]');
const b = await openBrowser(Number(w), Number(h));
try {
  await b.goto(url);
  await Bun.sleep(700);
  const overflow = await b.overflows();
  console.info(
    `${url} at ${w}px${overflow ? '  ← HORIZONTAL OVERFLOW' : ': no horizontal overflow'}`,
  );
  await b.screenshot(out, true);
  if (b.errors.length) console.info('page errors:', b.errors);
  if (overflow) process.exitCode = 1;
} finally {
  b.close();
}
