import type { FastifyBaseLogger } from 'fastify';

/**
 * Runs slow work (LLM generation) after the response is sent. In-process: if the server
 * restarts mid-task, the stale-lock checks in each job let a later request retry.
 */
export interface Background {
  run(name: string, task: () => Promise<void>): void;
}

export class InProcessBackground implements Background {
  constructor(private readonly log: FastifyBaseLogger) {}
  run(name: string, task: () => Promise<void>): void {
    task().catch((err: unknown) => this.log.error({ err, task: name }, 'Background task failed'));
  }
}

/** Tests: run tasks, then `await drain()` to wait for all of them. */
export class RecordingBackground implements Background {
  private readonly tasks: Promise<void>[] = [];
  readonly names: string[] = [];
  run(name: string, task: () => Promise<void>): void {
    this.names.push(name);
    this.tasks.push(task().catch(() => undefined));
  }
  async drain(): Promise<void> {
    while (this.tasks.length) await this.tasks.shift();
  }
}
