-- Beyond Meet Database Schema Migration
-- Generated from Prisma Schema
-- Execute this in Supabase SQL Editor

-- ============================================
-- 1. Create ENUM Types
-- ============================================

CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "OnlineStatus" AS ENUM ('ONLINE', 'OFFLINE', 'IN_CALL');
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "MatchType" AS ENUM ('DIRECT', 'RANDOM');
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'RINGING', 'ONGOING', 'COMPLETED', 'MISSED', 'REJECTED', 'FAILED');
CREATE TYPE "CallEventType" AS ENUM (
  'CALL_INITIATED',
  'CALL_RINGING',
  'CALL_ACCEPTED',
  'CALL_REJECTED',
  'CALL_STARTED',
  'CALL_ENDED',
  'CAMERA_SWITCHED',
  'BACKGROUND_BLUR_ENABLED',
  'BACKGROUND_CHANGED',
  'AUDIO_MUTED',
  'VIDEO_DISABLED',
  'POOR_NETWORK',
  'CONNECTION_LOST'
);
CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID');

-- ============================================
-- 2. Create Tables
-- ============================================

-- Users Table
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "email" TEXT UNIQUE NOT NULL,
  "password_hash" TEXT NOT NULL,
  "nickname" VARCHAR(50) NOT NULL,
  "birth_date" TIMESTAMP(3) NOT NULL,
  "gender" "Gender" NOT NULL,
  "country" VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
  "bio" VARCHAR(200),
  "profile_photos" TEXT[] NOT NULL DEFAULT '{}',
  "interests" TEXT[] NOT NULL DEFAULT '{}',

  -- Matching filter settings
  "preferred_gender" "Gender" NOT NULL,
  "min_age" INTEGER NOT NULL,
  "max_age" INTEGER NOT NULL,
  "preferred_countries" TEXT[] NOT NULL DEFAULT '{}',

  -- Status management
  "online_status" "OnlineStatus" NOT NULL DEFAULT 'OFFLINE',
  "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Notification settings
  "push_enabled" BOOLEAN NOT NULL DEFAULT true,

  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Match Sessions Table
CREATE TABLE "match_sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id_1" TEXT NOT NULL,
  "user_id_2" TEXT NOT NULL,
  "channel_name" TEXT UNIQUE NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
  "match_type" "MatchType" NOT NULL,
  "start_time" TIMESTAMP(3),
  "end_time" TIMESTAMP(3),
  "duration" INTEGER, -- seconds
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "match_sessions_user_id_1_fkey" FOREIGN KEY ("user_id_1") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "match_sessions_user_id_2_fkey" FOREIGN KEY ("user_id_2") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Call Records Table
CREATE TABLE "call_records" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "session_id" TEXT NOT NULL,
  "caller_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
  "start_time" TIMESTAMP(3),
  "end_time" TIMESTAMP(3),
  "duration" INTEGER, -- seconds
  "quality" INTEGER, -- 1-5 scale
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "call_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "match_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "call_records_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "call_records_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Call Events Table
CREATE TABLE "call_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "session_id" TEXT NOT NULL,
  "event_type" "CallEventType" NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "call_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "match_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Friendships Table
CREATE TABLE "friendships" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "friend_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "friendships_user_id_friend_id_key" UNIQUE ("user_id", "friend_id")
);

-- Block List Table
CREATE TABLE "block_list" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "blocked_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "block_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "block_list_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "block_list_user_id_blocked_user_id_key" UNIQUE ("user_id", "blocked_user_id")
);

-- Device Tokens Table
CREATE TABLE "device_tokens" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "user_id" TEXT NOT NULL,
  "token" TEXT UNIQUE NOT NULL,
  "platform" "Platform" NOT NULL,
  "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Invite Codes Table
CREATE TABLE "invite_codes" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "code" VARCHAR(20) UNIQUE NOT NULL,
  "max_uses" INTEGER NOT NULL DEFAULT 1,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invite Code Usage Table
CREATE TABLE "invite_code_usage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "invite_code_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invite_code_usage_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "invite_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "invite_code_usage_invite_code_id_user_id_key" UNIQUE ("invite_code_id", "user_id")
);

-- ============================================
-- 3. Create Indexes for Performance
-- ============================================

-- Users indexes
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_online_status_idx" ON "users"("online_status");
CREATE INDEX "users_gender_idx" ON "users"("gender");
CREATE INDEX "users_country_idx" ON "users"("country");

-- Match sessions indexes
CREATE INDEX "match_sessions_user_id_1_idx" ON "match_sessions"("user_id_1");
CREATE INDEX "match_sessions_user_id_2_idx" ON "match_sessions"("user_id_2");
CREATE INDEX "match_sessions_status_idx" ON "match_sessions"("status");
CREATE INDEX "match_sessions_channel_name_idx" ON "match_sessions"("channel_name");

-- Call records indexes
CREATE INDEX "call_records_session_id_idx" ON "call_records"("session_id");
CREATE INDEX "call_records_caller_id_idx" ON "call_records"("caller_id");
CREATE INDEX "call_records_receiver_id_idx" ON "call_records"("receiver_id");
CREATE INDEX "call_records_status_idx" ON "call_records"("status");

-- Call events indexes
CREATE INDEX "call_events_session_id_idx" ON "call_events"("session_id");
CREATE INDEX "call_events_event_type_idx" ON "call_events"("event_type");
CREATE INDEX "call_events_timestamp_idx" ON "call_events"("timestamp");

-- Friendships indexes
CREATE INDEX "friendships_user_id_idx" ON "friendships"("user_id");
CREATE INDEX "friendships_friend_id_idx" ON "friendships"("friend_id");

-- Block list indexes
CREATE INDEX "block_list_user_id_idx" ON "block_list"("user_id");
CREATE INDEX "block_list_blocked_user_id_idx" ON "block_list"("blocked_user_id");

-- Device tokens indexes
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");
CREATE INDEX "device_tokens_token_idx" ON "device_tokens"("token");

-- Invite codes indexes
CREATE INDEX "invite_codes_code_idx" ON "invite_codes"("code");
CREATE INDEX "invite_codes_is_active_idx" ON "invite_codes"("is_active");

-- ============================================
-- 4. Create Functions for Auto-Update Timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Insert Initial Invite Codes (Beta Test)
-- ============================================

-- Create 20 invite codes for beta testing
INSERT INTO "invite_codes" ("code", "max_uses", "is_active")
VALUES
  ('BETA2025-001', 1, true),
  ('BETA2025-002', 1, true),
  ('BETA2025-003', 1, true),
  ('BETA2025-004', 1, true),
  ('BETA2025-005', 1, true),
  ('BETA2025-006', 1, true),
  ('BETA2025-007', 1, true),
  ('BETA2025-008', 1, true),
  ('BETA2025-009', 1, true),
  ('BETA2025-010', 1, true),
  ('BETA2025-011', 1, true),
  ('BETA2025-012', 1, true),
  ('BETA2025-013', 1, true),
  ('BETA2025-014', 1, true),
  ('BETA2025-015', 1, true),
  ('BETA2025-016', 1, true),
  ('BETA2025-017', 1, true),
  ('BETA2025-018', 1, true),
  ('BETA2025-019', 1, true),
  ('BETA2025-020', 1, true);

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
