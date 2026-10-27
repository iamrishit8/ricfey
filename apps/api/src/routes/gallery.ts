import type { FastifyInstance } from 'fastify';
import { GalleryQuerySchema } from '@ricfey/shared';
import { requireUser } from '../auth/session';
import { buyGalleryCourse, galleryDetail, searchGallery } from '../gallery/service';
import { ok } from '../lib/response';
import { validate } from '../lib/validate';
import { toPublicCourse } from '../models/course';

export async function galleryRoutes(
  app: FastifyInstance,
  opts: { now: () => Date },
): Promise<void> {
  /** Search or browse ready-made courses. `q` is ranked by relevance, exact skill matches first. */
  app.get('/gallery', async (req) => {
    await requireUser(req, opts.now());
    return ok({ courses: await searchGallery(validate(GalleryQuerySchema, req.query)) });
  });

  app.get('/gallery/:id', async (req) => {
    const user = await requireUser(req, opts.now());
    return ok({ course: await galleryDetail((req.params as { id: string }).id, user._id) });
  });

  /** Pay the fixed gallery price once; the learner gets their own copy and keeps it forever. */
  app.post('/gallery/:id/buy', async (req, reply) => {
    const user = await requireUser(req, opts.now());
    const course = await buyGalleryCourse(user._id, (req.params as { id: string }).id, opts.now());
    return reply.code(201).send(ok({ course: toPublicCourse(course) }));
  });
}
