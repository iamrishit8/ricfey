import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PLACEMENT_LEVELS } from '@ricfey/shared';

const bankItemSchema = new Schema(
  {
    qid: { type: String, required: true },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answerIndex: { type: Number, required: true },
    difficulty: { type: Number, required: true },
    topic: { type: String, required: true },
  },
  { _id: false },
);

const historySchema = new Schema(
  {
    qid: { type: String, required: true },
    difficulty: { type: Number, required: true },
    target: { type: Number, required: true },
    topic: { type: String, required: true },
    answerIndex: { type: Number, required: true },
    correct: { type: Boolean, required: true },
  },
  { _id: false },
);

const placementSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['generating', 'ready', 'failed', 'completed'], required: true },
    generationStartedAt: { type: Date },
    bank: { type: [bankItemSchema], default: [] },
    history: { type: [historySchema], default: [] },
    /** The question currently shown; an answer must name it (guards double submits). */
    currentQid: { type: String, default: null },
    currentTarget: { type: Number, default: 3 },
    result: {
      type: new Schema(
        {
          level: { type: String, enum: PLACEMENT_LEVELS, required: true },
          ability: { type: Number, required: true },
          strongTopics: [String],
          weakTopics: [String],
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

placementSchema.index({ courseId: 1 }, { unique: true });
placementSchema.index({ userId: 1 });

export type Placement = InferSchemaType<typeof placementSchema>;
export type PlacementDoc = HydratedDocument<Placement>;
export const PlacementModel = model('Placement', placementSchema);
