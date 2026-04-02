-- Migration: Add optional message column to demo_requests
-- Allows employers to include a note when requesting a demo.
-- Column is nullable so existing rows are unaffected.
ALTER TABLE "demo_requests" ADD COLUMN IF NOT EXISTS "message" text;
