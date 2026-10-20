import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const taskAttemptSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: Number, required: true },
    /** The learner's text. Data, never instructions: always delimited in prompts. */
    answer: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: ['grading', 'graded', 'failed'], required: true },
    gradingStartedAt: { type: Date, required: true },
    score: { type: Number, default: null },
    maxScore: { type: Number, required: true },
    feedback: { type: String, default: null },
    missedCriteria: { type: [String], default: [] },
  },
  { timestamps: true },
);

taskAttemptSchema.index({ courseId: 1, day: 1, createdAt: -1 });
taskAttemptSchema.index({ userId: 1, createdAt: -1 });

export type TaskAttempt = InferSchemaType<typeof taskAttemptSchema>;
export type TaskAttemptDoc = HydratedDocument<TaskAttempt>;
export const TaskAttemptModel = model('TaskAttempt', taskAttemptSchema, 'taskAttempts');
