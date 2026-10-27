import { describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CourseOutlineSchema, DayContentSchema } from '@ricfey/shared';

describe('gen:sample --provider fake (end to end)', () => {
  test('writes outline, day 1 and usage files that parse', async () => {
    const out = await mkdtemp(join(tmpdir(), 'ricfey-sample-'));
    try {
      const proc = Bun.spawn(
        [
          'bun',
          join(import.meta.dir, 'gen-sample.ts'),
          '--skill',
          'Personal finance',
          '--weeks',
          '2',
          '--provider',
          'fake',
          '--out',
          out,
        ],
        { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, GEMINI_API_KEY: '' } },
      );
      expect(await proc.exited).toBe(0);
      const dir = join(out, 'personal-finance', 'fake');
      expect((await readdir(dir)).sort()).toEqual([
        'day-01.json',
        'day-01.md',
        'outline.json',
        'outline.md',
        'usage.json',
      ]);
      const outline = CourseOutlineSchema.parse(await Bun.file(join(dir, 'outline.json')).json());
      expect(outline.weeks).toHaveLength(2);
      DayContentSchema.parse(await Bun.file(join(dir, 'day-01.json')).json());
      const usage = await Bun.file(join(dir, 'usage.json')).json();
      expect(usage.calls.map((c: { purpose: string }) => c.purpose)).toEqual([
        'course_outline',
        'day_content',
      ]);
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
});
