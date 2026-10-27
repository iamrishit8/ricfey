import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DAY_STATUSES } from '@ricfey/shared';

const courseDaySchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: Number, required: true },
    week: { type: Number, required: true },
    title: { type: String, required: true },
    objectives: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    /** The calendar date (India time) on which this day opens even if the previous isn't done. */
    unlockAt: { type: Date, required: true },
    status: { type: String, enum: DAY_STATUSES, default: 'locked', required: true },
    generationStartedAt: { type: Date },
    // DayContent, validated with Zod before it is written. Null until generated.
    content: { type: Schema.Types.Mixed, default: null },
    selfCheck: {
      type: new Schema(
        {
          verdict: String,
          coversObjectives: Boolean,
          quizConsistent: Boolean,
          issues: [String],
          attempts: Number,
        },
        { _id: false },
      ),
      default: null,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

courseDaySchema.index({ courseId: 1, day: 1 }, { unique: true });
courseDaySchema.index({ userId: 1, courseId: 1 });

export type CourseDay = InferSchemaType<typeof courseDaySchema>;
export type CourseDayDoc = HydratedDocument<CourseDay>;
export const CourseDayModel = model('CourseDay', courseDaySchema, 'courseDays');
