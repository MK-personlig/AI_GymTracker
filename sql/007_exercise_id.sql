-- Link program rows to exercise_library
-- Nullable so existing rows aren't broken
ALTER TABLE program ADD COLUMN IF NOT EXISTS exercise_id text REFERENCES exercise_library(id);
