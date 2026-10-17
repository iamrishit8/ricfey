/**
 * Generate a course outline and day 1 for review and cost measurement.
 *   bun run gen:sample -- --skill "Python" --depth working --weeks 4 [--model gemini-3.5-flash-lite]
 *   bun run gen:sample -- --skill "Python" --provider fake      (offline, placeholder content)
 * Writes docs/samples/<skill>/<model>/{outline.json,outline.md,day-01.json,day-01.md,usage.json}.
 */
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { COURSE_DEPTHS, MAX_WEEKS, MIN_WEEKS, type CourseOutline } from '@ricfey/shared';
import { loadEnv, loadLlmEnv } from '../src/config/env';
import { connectDb, disconnectDb } from '../src/db/connect';
import type { SampleUsage } from '../src/llm/cost';
import { generateDay, generateOutline } from '../src/llm/course-generator';
import { createGeminiProvider } from '../src/llm/factory';
import { FakeProvider } from '../src/llm/fake-provider';
import { fixtureDay, fixtureOutline } from '../src/llm/fake-fixtures';
import type { CourseRequest } from '../src/llm/prompts';
import { renderDayMd, renderOutlineMd } from '../src/llm/render';
import type { LlmCallRecord, LlmProvider, LlmUsageStore } from '../src/llm/types';
import { InMemoryLlmUsageStore, MongoLlmUsageStore } from '../src/llm/usage-store';

const REPO_ROOT = resolve(import.meta.dir, '../../..');

const Args = z.object({
  skill: z.string().min(1, '--skill is required'),
  depth: z.enum(COURSE_DEPTHS).default('working'),
  weeks: z.coerce.number().int().min(MIN_WEEKS).max(MAX_WEEKS).default(4),
  daysPerWeek: z.coerce.number().int().min(1).max(7).default(5),
  provider: z.enum(['gemini', 'fake']).default('gemini'),
  model: z.string().optional(),
  out: z.string().default(join(REPO_ROOT, 'docs/samples')),
});

/** Forwards to the real store and keeps a copy of each record for usage.json. */
class TeeStore implements LlmUsageStore {
  readonly records: LlmCallRecord[] = [];
  constructor(private readonly inner: LlmUsageStore) {}
  async record(call: LlmCallRecord) {
    this.records.push(call);
    await this.inner.record(call);
  }
  todayTotals(now: Date) {
    return this.inner.todayTotals(now);
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      skill: { type: 'string' },
      depth: { type: 'string' },
      weeks: { type: 'string' },
      'days-per-week': { type: 'string' },
      provider: { type: 'string' },
      model: { type: 'string' },
      out: { type: 'string' },
    },
  });
  const parsed = Args.safeParse({ ...values, daysPerWeek: values['days-per-week'] });
  if (!parsed.success) {
    console.error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
    return 2;
  }
  const args = parsed.data;
  const llmEnv = loadLlmEnv();
  const req: CourseRequest = {
    skill: args.skill,
    depth: args.depth,
    weeks: args.weeks,
    daysPerWeek: args.daysPerWeek,
  };

  let tee: TeeStore;
  let llm: LlmProvider;
  let usingDb = false;
  if (args.provider === 'fake') {
    tee = new TeeStore(new InMemoryLlmUsageStore());
    const outline = fixtureOutline(req);
    llm = new FakeProvider({ usage: tee, caps: { maxCallsPerDay: 1e9, maxTokensPerDay: 1e12 } }, [
      JSON.stringify(outline),
      JSON.stringify(fixtureDay(outline, 1)),
    ]);
  } else {
    const env = loadEnv(); // real runs log to llmCalls, so MongoDB is required
    tee = new TeeStore(new MongoLlmUsageStore());
    llm = createGeminiProvider(llmEnv, tee, args.model ?? llmEnv.GEMINI_MODEL); // throws if no key
    await connectDb(env.MONGODB_URI, { autoIndex: true });
    usingDb = true;
  }

  const dir = join(args.out, slug(args.skill), slug(llm.model));
  await mkdir(dir, { recursive: true });
  console.info(
    `Generating "${args.skill}" (${args.depth}, ${args.weeks}w × ${args.daysPerWeek}d) with ${llm.name}/${llm.model}`,
  );

  let exitCode = 0;
  try {
    const outline: CourseOutline = (await generateOutline(llm, req)).data;
    await Bun.write(join(dir, 'outline.json'), JSON.stringify(outline, null, 2) + '\n');
    await Bun.write(join(dir, 'outline.md'), renderOutlineMd(outline));
    console.info('  outline written');

    const day = (await generateDay(llm, outline, 1)).data;
    await Bun.write(join(dir, 'day-01.json'), JSON.stringify(day, null, 2) + '\n');
    await Bun.write(join(dir, 'day-01.md'), renderDayMd(day));
    console.info('  day 1 written');
  } catch (err) {
    const e = err as Error;
    const cause = e.cause instanceof Error ? `\n  cause: ${e.cause.message}` : '';
    console.error(`  FAILED: ${e.message}${cause}`);
    exitCode = 1;
  } finally {
    // Written even on failure: failed attempts are billed too.
    const usage: SampleUsage = {
      ...req,
      provider: llm.name,
      model: llm.model,
      generatedAt: new Date().toISOString(),
      calls: tee.records.map((r) => ({
        purpose: r.purpose,
        attempt: r.attempt,
        status: r.status,
        tokensIn: r.tokensIn,
        tokensOut: r.tokensOut,
        tokensThinking: r.tokensThinking,
        latencyMs: r.latencyMs,
      })),
    };
    await Bun.write(join(dir, 'usage.json'), JSON.stringify(usage, null, 2) + '\n');
    for (const c of usage.calls) {
      console.info(
        `  ${c.purpose} #${c.attempt} ${c.status}: in ${c.tokensIn}, out ${c.tokensOut} (thinking ${c.tokensThinking}), ${c.latencyMs} ms`,
      );
    }
    console.info(`  → ${dir}`);
    if (usingDb) await disconnectDb();
  }
  return exitCode;
}

try {
  process.exit(await main());
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
