CREATE TABLE shopify_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_event_id TEXT UNIQUE NOT NULL,
    topic TEXT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shopify_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read shopify webhook logs"
ON shopify_webhook_logs
FOR SELECT
TO authenticated
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shopify_webhook_logs;
