const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRPC() {
    const { data, error } = await supabase.rpc('get_active_schema_tables');
    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("Active Tables:", data);
    }
}

testRPC();
