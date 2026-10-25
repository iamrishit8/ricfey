import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { REPLAN_STATUSES } from '@ricfey/shared';

const replanSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: REPLAN_STATUSES, required: true },
    /** True while generating or proposed. A partial unique index allows one open re-plan per course. */
    open: { type: Boolean },
    trigger: { type: String, enum: ['learner', 'auto'], required: true },
    generationStartedAt: { type: Date, required: true },
    baseOutlineVersion: { type: Number, required: true },
    appliedOutlineVersion: { type: Number, default: null },
    /** Outline entries of the days being rewritten, as they were. */
    before: { type: Schema.Types.Mixed, required: true },
    /** Rewritten entries (validated with Zod), null until generated. */
    after: { type: Schema.Types.Mixed, default: null },
    rationale: { type: String, default: null },
    weakTopics: { type: [String], default: [] },
    strongTopics: { type: [String], default: [] },
    quality: { type: Schema.Types.Mixed, default: null },
    /** Days completed when the re-plan was requested; decides the price. */
    daysCompletedAtRequest: { type: Number, required: true },
    priceCredits: { type: Number, required: true },
  },
  { timestamps: true },
);

replanSchema.index(
  { courseId: 1 },
  { unique: true, partialFilterExpression: { open: true }, name: 'one_open_replan_per_course' },
);
replanSchema.index({ courseId: 1, createdAt: -1 });

export type Replan = InferSchemaType<typeof replanSchema>;
export type ReplanDoc = HydratedDocument<Replan>;
export const ReplanModel = model('Replan', replanSchema, 'replans');
