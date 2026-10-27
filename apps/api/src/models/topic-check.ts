import { Schema, model } from 'mongoose';

/**
 * Topics already judged for a learner, so a course can only be started on a topic that passed
 * the check (the chat page and a direct API call go through the same gate) and a topic is
 * never judged twice. `key` is the normalised topic.
 */
const topicCheckSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true },
    verdict: { type: String, enum: ['ok', 'refuse'], required: true },
    reason: { type: String, default: '' },
    /** Where the approval came from: a model check, or an option the model itself offered. */
    via: { type: String, enum: ['check', 'option'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

topicCheckSchema.index({ userId: 1, key: 1 }, { unique: true });
// Judgements expire after a day, so a changed policy applies and the table stays small.
topicCheckSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const TopicCheckModel = model('TopicCheck', topicCheckSchema, 'topicChecks');
