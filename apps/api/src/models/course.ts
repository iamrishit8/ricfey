import { Schema, model, type InferSchemaType } from 'mongoose';
import { COURSE_DEPTHS, COURSE_STATUSES, MAX_WEEKS, MIN_WEEKS } from '@ricfey/shared';

const courseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: String, required: true, trim: true, maxlength: 200 },
    depth: { type: String, enum: COURSE_DEPTHS, required: true },
    weeks: { type: Number, required: true, min: MIN_WEEKS, max: MAX_WEEKS },
    status: { type: String, enum: COURSE_STATUSES, default: 'draft', required: true },
    title: { type: String, trim: true },
    startedAt: { type: Date },
    // The generated outline and days arrive in C3, once their Zod schemas exist.
  },
  { timestamps: true },
);

// "My courses, newest first" and "my active courses".
courseSchema.index({ userId: 1, createdAt: -1 });
courseSchema.index({ userId: 1, status: 1 });

export type Course = InferSchemaType<typeof courseSchema>;
export const CourseModel = model('Course', courseSchema);
