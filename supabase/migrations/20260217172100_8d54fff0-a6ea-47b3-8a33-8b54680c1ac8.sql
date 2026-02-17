
-- Add category column to deadlines table
ALTER TABLE public.deadlines ADD COLUMN category text NOT NULL DEFAULT 'due';

-- Auto-categorize existing deadlines based on name text
UPDATE public.deadlines SET category = 
  CASE 
    WHEN lower(name) LIKE '%internal%' OR lower(name) LIKE '%team meeting%' OR lower(name) LIKE '%standup%' OR lower(name) LIKE '%sync%' THEN 'internal_meeting'
    WHEN lower(name) LIKE '%external%' OR lower(name) LIKE '%client meeting%' OR lower(name) LIKE '%client call%' OR lower(name) LIKE '%presentation%' THEN 'external_meeting'
    WHEN lower(name) LIKE '%submit%' OR lower(name) LIKE '%submission%' OR lower(name) LIKE '%deliver%' OR lower(name) LIKE '%hand over%' OR lower(name) LIKE '%handover%' THEN 'submission'
    ELSE 'due'
  END;
