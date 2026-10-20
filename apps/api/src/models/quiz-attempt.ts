import { Schema, model, type InferSchemaType } from 'mongoose';

const quizAttemptSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: Number, required: true },
    answers: { type: [Number], required: true },
    results: {
      type: [new Schema({ correct: Boolean, answerIndex: Number, topic: String }, { _id: false })],
      required: true,
    },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

quizAttemptSchema.index({ courseId: 1, day: 1, createdAt: -1 });
quizAttemptSchema.index({ userId: 1, createdAt: -1 });

export type QuizAttempt = InferSchemaType<typeof quizAttemptSchema>;
export const QuizAttemptModel = model('QuizAttempt', quizAttemptSchema, 'quizAttempts');
