
-- Add start_date and end_date to tasks for calendar/Gantt view
ALTER TABLE public.tasks ADD COLUMN start_date date;
ALTER TABLE public.tasks ADD COLUMN end_date date;
