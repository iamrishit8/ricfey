import type { FastifyBaseLogger } from 'fastify';
import { maskEmail } from '../lib/crypto';

export interface Mailer {
  sendMagicLink(to: string, url: string): Promise<void>;
}

/** Development only: print the link instead of emailing it. Refused in production by env rules. */
export class ConsoleMailer implements Mailer {
  constructor(private readonly log: FastifyBaseLogger) {}
  async sendMagicLink(to: string, url: string): Promise<void> {
    this.log.info(`[dev] Magic link for ${maskEmail(to)}: ${url}`);
  }
}

/** Resend REST API: https://resend.com/docs/api-reference/emails/send-email [UNVERIFIED: no key yet] */
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async sendMagicLink(to: string, url: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        subject: 'Your Ricfey sign-in link',
        text: `Sign in to Ricfey:\n\n${url}\n\nThis link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
      }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
  }
}

/** For tests: remembers what would have been sent. */
export class RecordingMailer implements Mailer {
  readonly sent: Array<{ to: string; url: string }> = [];
  async sendMagicLink(to: string, url: string): Promise<void> {
    this.sent.push({ to, url });
  }
}
