-- Create inventory_adjustments_log table for forensic audits
CREATE TABLE IF NOT EXISTS inventory_adjustments_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_key TEXT NOT NULL,
    operator_id UUID,
    operator_email TEXT,
    previous_stock NUMERIC(12,2) NOT NULL,
    counted_stock NUMERIC(12,2) NOT NULL,
    delta NUMERIC(12,2) NOT NULL,
    avg_unit_cost NUMERIC(12,2) NOT NULL,
    valuation_impact NUMERIC(12,2) NOT NULL,
    reason_code TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE inventory_adjustments_log ENABLE ROW LEVEL SECURITY;

-- Add standard authenticated policy
CREATE POLICY "Allow authenticated read and insert" ON inventory_adjustments_log
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
