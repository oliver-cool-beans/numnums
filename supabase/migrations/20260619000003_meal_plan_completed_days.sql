-- Track which day slots a user has marked as complete, independently of recipe identity.
-- This allows the same recipe appearing on two days to be completed separately.
ALTER TABLE user_meal_plans
  ADD COLUMN completed_days TEXT[] NOT NULL DEFAULT '{}';
