import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { COURSE_DEPTHS } from '@ricfey/shared';

/**
 * A finished custom course offered to other learners. Written by the model, so it has no author:
 * nothing about the learner who took it first (identity, answers, scores) is stored here.
 */
const galleryCourseSchema = new Schema(
  {
    skill: { type: String, required: true },
    /** Normalised skill + depth + weeks + minutes: only one course per variant is published. */
    variantKey: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    depth: { type: String, enum: COURSE_DEPTHS, required: true },
    weeks: { type: Number, required: true },
    daysPerWeek: { type: Number, required: true },
    minutesPerDay: { type: Number, required: true },
    totalDays: { type: Number, required: true },
    /** Every topic tag in the roadmap, for search. */
    topics: { type: [String], default: [] },
    /** The final approved roadmap (a CourseOutline, validated before it was stored). */
    outline: { type: Schema.Types.Mixed, required: true },
    priceCredits: { type: Number, required: true },
    status: { type: String, enum: ['live', 'hidden'], default: 'live', required: true },
    completions: { type: Number, default: 0 },
    buyers: { type: Number, default: 0 },
    sourceCourseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  },
  { timestamps: true },
);

galleryCourseSchema.index({ variantKey: 1 }, { unique: true });
galleryCourseSchema.index({ status: 1, completions: -1, createdAt: -1 });
galleryCourseSchema.index(
  { skill: 'text', title: 'text', topics: 'text', summary: 'text' },
  { weights: { skill: 10, title: 5, topics: 3, summary: 1 }, name: 'gallery_text' },
);

export type GalleryCourse = InferSchemaType<typeof galleryCourseSchema>;
export type GalleryCourseDoc = HydratedDocument<GalleryCourse>;
export const GalleryCourseModel = model('GalleryCourse', galleryCourseSchema, 'galleryCourses');
