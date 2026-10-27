import { z } from 'zod';

/** The only user fields the API ever returns, and only to that user. */
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export const MagicLinkRequestSchema = z.object({
  // Normalise first, then validate: "  Asha@Example.com " is a valid address.
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(20).max(200),
});
