
-- Create assignments table to track which users are assigned to which projects per week
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, week_start)
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Allow full access (matching existing pattern - no auth in this app)
CREATE POLICY "Allow full access to assignments"
ON public.assignments
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for common queries
CREATE INDEX idx_assignments_user_week ON public.assignments(user_id, week_start);
CREATE INDEX idx_assignments_project_week ON public.assignments(project_id, week_start);
