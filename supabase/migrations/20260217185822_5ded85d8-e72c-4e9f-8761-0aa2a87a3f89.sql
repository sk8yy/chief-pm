
-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

-- Insert Sample Project workspace with a known ID
INSERT INTO public.workspaces (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Sample Project');

-- Add workspace_id to all 8 tables (nullable first)
ALTER TABLE public.disciplines ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.app_users ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.hours ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.tasks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.stickers ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.deadlines ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.assignments ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);

-- Backfill all existing rows
UPDATE public.disciplines SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.app_users SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.projects SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.hours SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.tasks SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.stickers SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.deadlines SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.assignments SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- Make NOT NULL
ALTER TABLE public.disciplines ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.app_users ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.hours ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.stickers ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.deadlines ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.assignments ALTER COLUMN workspace_id SET NOT NULL;
