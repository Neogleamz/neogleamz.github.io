-- Add wip_state to print_queue for Layerz timers
ALTER TABLE public.print_queue
ADD COLUMN IF NOT EXISTS wip_state JSONB DEFAULT '{}'::jsonb;
