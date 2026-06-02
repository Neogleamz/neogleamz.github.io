CREATE TABLE IF NOT EXISTS public.label_templates (
    id text PRIMARY KEY,
    name text NOT NULL,
    "widthIn" numeric,
    "heightIn" numeric,
    elements jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;

-- Grant standard public access for the application
CREATE POLICY "Enable read access for all users" ON public.label_templates FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.label_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.label_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON public.label_templates FOR DELETE USING (true);
