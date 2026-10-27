import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import {
  COURSE_DEPTHS,
  COURSE_STATUSES,
  MAX_WEEKS,
  MIN_WEEKS,
  PLACEMENT_LEVELS,
  REPLAN_MODES,
  type PublicCourse,
} from '@ricfey/shared';

const courseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: String, required: true, trim: true, maxlength: 200 },
    depth: { type: String, enum: COURSE_DEPTHS, required: true },
    weeks: { type: Number, required: true, min: MIN_WEEKS, max: MAX_WEEKS },
    minutesPerDay: { type: Number, required: true, min: 10, max: 120, default: 30 },
    daysPerWeek: { type: Number, required: true, min: 1, max: 7, default: 5 },
    status: { type: String, enum: COURSE_STATUSES, required: true },
    title: { type: String, trim: true },
    startedAt: { type: Date },
    /** What the learner paid when they bought the roadmap. Null until bought. */
    creditsPaid: { type: Number, default: null },
    outlineStatus: {
      type: String,
      enum: ['none', 'generating', 'ready', 'failed'],
      default: 'none',
    },
    outlineGenerationStartedAt: { type: Date },
    currentOutlineVersion: { type: Number, default: null },
    approvedOutlineVersion: { type: Number, default: null },
    replanMode: { type: String, enum: REPLAN_MODES, default: 'manual', required: true },
    placement: {
      type: new Schema(
        {
          level: { type: String, enum: PLACEMENT_LEVELS, required: true },
          ability: { type: Number, required: true },
          strongTopics: { type: [String], default: [] },
          weakTopics: { type: [String], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

// "My courses, newest first" and "my active courses".
courseSchema.index({ userId: 1, createdAt: -1 });
courseSchema.index({ userId: 1, status: 1 });

export type Course = InferSchemaType<typeof courseSchema>;
export type CourseDoc = HydratedDocument<Course>;
export const CourseModel = model('Course', courseSchema);

export function toPublicCourse(c: CourseDoc): PublicCourse {
  return {
    id: c.id as string,
    skill: c.skill,
    depth: c.depth,
    weeks: c.weeks,
    minutesPerDay: c.minutesPerDay,
    daysPerWeek: c.daysPerWeek,
    status: c.status,
    title: c.title ?? null,
    placement: c.placement
      ? {
          level: c.placement.level,
          ability: c.placement.ability,
          strongTopics: [...c.placement.strongTopics],
          weakTopics: [...c.placement.weakTopics],
        }
      : null,
    outlineStatus: c.outlineStatus,
    replanMode: c.replanMode,
    approvedOutlineVersion: c.approvedOutlineVersion ?? null,
    creditsPaid: c.creditsPaid ?? null,
    startedAt: c.startedAt?.toISOString() ?? null,
    createdAt: (c.get('createdAt') as Date).toISOString(),
  };
}
