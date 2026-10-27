import type { FastifyError, FastifyInstance } from 'fastify';
import type { ApiFailure } from '@ricfey/shared';
import { AppError } from '../lib/errors';

/** The single place errors become HTTP responses. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | AppError, req, reply) => {
    if (err instanceof AppError) {
      const body: ApiFailure = {
        success: false,
        error: { code: err.code, message: err.message, details: err.details },
      };
      return reply.status(err.statusCode).send(body);
    }

    // Fastify's own client errors (malformed JSON, body too large). Messages are generic.
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      const body: ApiFailure = {
        success: false,
        error: { code: 'BAD_REQUEST', message: err.message },
      };
      return reply.status(err.statusCode).send(body);
    }

    // Unknown error: log it in full, tell the client nothing about internals.
    req.log.error({ err }, 'Unhandled error');
    const body: ApiFailure = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    };
    return reply.status(500).send(body);
  });

  app.setNotFoundHandler((req, reply) => {
    const body: ApiFailure = {
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found` },
    };
    return reply.status(404).send(body);
  });
}
