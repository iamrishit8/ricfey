import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const courseOutlineSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, required: true },
    source: { type: String, enum: ['generated', 'edited'], required: true },
    // A CourseOutline, always validated with Zod before it is written.
    outline: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

courseOutlineSchema.index({ courseId: 1, version: 1 }, { unique: true });

export type CourseOutlineRow = InferSchemaType<typeof courseOutlineSchema>;
export type CourseOutlineDoc = HydratedDocument<CourseOutlineRow>;
export const CourseOutlineModel = model('CourseOutline', courseOutlineSchema, 'courseOutlines');
