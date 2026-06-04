const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: flcData } = await supabase.from('full_landed_costs').select('*').order('created_at', { ascending: false });

  let catalogCache = {};
  
  if(flcData) {
      flcData.forEach(r => {
          let nn = String(r.neogleamz_name||"").trim();
          let np = String(r.neogleamz_product||"").trim();
          let inam = String(r.item_name||"Unknown").trim();
          let sp = String(r.specification||"").trim();
          let k = nn ? `${nn}:::${np}:::(Grouped Raw Items):::(Mixed Specs)` : `:::${np}:::${inam}:::${sp}`;
          
          if(!catalogCache[k]) {
              catalogCache[k] = { 
                  nn: nn, np: np, in: inam, sp: sp
              };
          }
      });
  }

  const k1 = "Glowz Silicone:::Glowz:::(Grouped Raw Items):::(Mixed Specs)";
  console.log("Catalog Cache for " + k1 + ":");
  console.log(catalogCache[k1]);
}
run();
