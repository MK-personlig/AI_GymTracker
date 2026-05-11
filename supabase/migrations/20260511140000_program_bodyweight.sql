-- AI GymTracker: program bodyweight base flag (BW + added load)
ALTER TABLE program
  ADD COLUMN IF NOT EXISTS is_bodyweight_base BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE program
SET is_bodyweight_base = TRUE
WHERE exercise_name = 'pull_ups' AND workout_type = 'back';
