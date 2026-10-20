import type { Types } from 'mongoose';
import { AppError } from '../lib/errors';
import { parseId } from '../lib/ids';
import { CourseModel, type CourseDoc } from '../models/course';

/**
 * The only way routes load a course: by id AND owner. Someone else's course is a 404,
 * not a 403, so ids can't be probed for existence.
 */
export async function loadOwnCourse(userId: Types.ObjectId, rawId: unknown): Promise<CourseDoc> {
  const course = await CourseModel.findOne({ _id: parseId(rawId), userId });
  if (!course) throw new AppError('NOT_FOUND', 'Course not found');
  return course;
}
