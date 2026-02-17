
-- Disciplines
CREATE TABLE public.disciplines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to disciplines" ON public.disciplines FOR ALL USING (true) WITH CHECK (true);

-- App Users
CREATE TABLE public.app_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  discipline_id uuid REFERENCES public.disciplines(id)
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- Projects
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  job_number text NOT NULL DEFAULT 'xxxxxx-xx',
  discipline_id uuid REFERENCES public.disciplines(id),
  manager_id uuid REFERENCES public.app_users(id),
  sort_order int NOT NULL DEFAULT 0
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

-- Hours
CREATE TABLE public.hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  date date NOT NULL,
  planned_hours numeric NOT NULL DEFAULT 0,
  recorded_hours numeric
);
ALTER TABLE public.hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to hours" ON public.hours FOR ALL USING (true) WITH CHECK (true);

-- Tasks
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  user_id uuid NOT NULL REFERENCES public.app_users(id),
  week_start date NOT NULL,
  is_planned boolean NOT NULL DEFAULT true,
  is_completed boolean NOT NULL DEFAULT false
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- Deadlines
CREATE TABLE public.deadlines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  date date NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  created_by uuid NOT NULL REFERENCES public.app_users(id),
  type text NOT NULL DEFAULT 'personal'
);
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to deadlines" ON public.deadlines FOR ALL USING (true) WITH CHECK (true);
