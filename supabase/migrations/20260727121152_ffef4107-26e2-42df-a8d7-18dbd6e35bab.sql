ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS reminder_timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS reminder_frequency text NOT NULL DEFAULT 'custom_days',
  ADD COLUMN IF NOT EXISTS reminder_times jsonb NOT NULL DEFAULT '{}'::jsonb;