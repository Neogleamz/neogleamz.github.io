const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('full_landed_costs')
    .select('neogleamz_name, neogleamz_product, parcel_no, item_uuid')
    .in('item_uuid', [
      '16ea87e0-b246-4254-8a9b-46c512448d61'
    ]);
  
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

run();
