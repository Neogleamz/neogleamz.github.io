-- Migration to enable Supabase Realtime for the print_queue table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'print_queue'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE print_queue;
    END IF;
END $$;
