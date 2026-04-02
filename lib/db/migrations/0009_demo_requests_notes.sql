-- Migration 0009: Add notes column to demo_requests for internal admin notes
ALTER TABLE "demo_requests" ADD COLUMN IF NOT EXISTS "notes" text;
