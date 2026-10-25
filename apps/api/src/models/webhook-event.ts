import { Schema, model } from 'mongoose';

/** Webhook events already handled, by the provider's event id, so a redelivery is a no-op. */
const webhookEventSchema = new Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    event: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const WebhookEventModel = model('WebhookEvent', webhookEventSchema, 'webhookEvents');
