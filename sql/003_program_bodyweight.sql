-- =====================================================
-- AI GymTracker — Migration 003: bodyweight base flag
-- Run once in Supabase SQL Editor (existing projects).
-- Lets pull-ups/dips show "bodyweight + Xkg added" to Claude.
-- =====================================================

ALTER TABLE program
  ADD COLUMN IF NOT EXISTS is_bodyweight_base BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE program
SET is_bodyweight_base = TRUE
WHERE exercise_name = 'pull_ups' AND workout_type = 'back';
