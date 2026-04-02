-- Add booking-request notification type to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking-request';

-- Create booking_requests table for in-app provider booking requests
CREATE TABLE IF NOT EXISTS "booking_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "member_id" text NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "provider_id" text NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
  "member_email" text NOT NULL,
  "contact_email" text,
  "requested_modality" text,
  "message" text NOT NULL,
  "note" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "booking_requests_member_idx" ON "booking_requests" ("member_id");
CREATE INDEX IF NOT EXISTS "booking_requests_provider_idx" ON "booking_requests" ("provider_id");
CREATE INDEX IF NOT EXISTS "booking_requests_created_at_idx" ON "booking_requests" ("created_at");
