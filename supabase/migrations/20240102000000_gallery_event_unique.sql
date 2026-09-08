-- Phase 7: Ensure one gallery per event
-- Add unique constraint on event_id in galleries table

-- First, clean up any duplicate galleries (keep the oldest per event)
WITH ranked AS (
  SELECT id, event_id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC) AS rn
  FROM public.galleries
)
DELETE FROM public.galleries
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint
ALTER TABLE public.galleries
  ADD CONSTRAINT galleries_event_id_unique UNIQUE (event_id);
