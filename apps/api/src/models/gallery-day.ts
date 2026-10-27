import { Schema, model } from 'mongoose';

/** One finished day of a gallery course: the lesson, task and quiz exactly as a learner got them. */
const galleryDaySchema = new Schema(
  {
    galleryId: { type: Schema.Types.ObjectId, ref: 'GalleryCourse', required: true },
    day: { type: Number, required: true },
    week: { type: Number, required: true },
    title: { type: String, required: true },
    objectives: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    // DayContent, validated before it was first stored.
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

galleryDaySchema.index({ galleryId: 1, day: 1 }, { unique: true });

export const GalleryDayModel = model('GalleryDay', galleryDaySchema, 'galleryDays');
