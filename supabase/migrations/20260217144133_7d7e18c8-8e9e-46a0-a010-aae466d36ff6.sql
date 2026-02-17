
-- Create stickers table for the Sticker Wall (Panel 0)
CREATE TABLE public.stickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- Allow full access (matching existing app pattern)
CREATE POLICY "Allow full access to stickers"
ON public.stickers
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_sticker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_stickers_updated_at
BEFORE UPDATE ON public.stickers
FOR EACH ROW
EXECUTE FUNCTION public.update_sticker_updated_at();
