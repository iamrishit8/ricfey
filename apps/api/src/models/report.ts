import { Schema, model } from 'mongoose';
import { REPORT_KINDS } from '@ricfey/shared';

/** "Flag a mistake": a learner's report about one day's content. Read by humans, never by a model. */
const reportSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: Number, required: true },
    kind: { type: String, enum: REPORT_KINDS, required: true },
    message: { type: String, required: true, maxlength: 2000 },
    excerpt: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  },
  { timestamps: true },
);

reportSchema.index({ courseId: 1, day: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

export const ReportModel = model('Report', reportSchema, 'reports');
