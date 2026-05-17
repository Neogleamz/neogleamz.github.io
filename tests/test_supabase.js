const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('taskz').update({ is_archived: false }).in('id', ['9f5393af-4228-431e-ad2e-a7303ca94804']);
    console.log("Update error with is_archived:", error);
    
    const { data: d2, error: e2 } = await supabase.from('taskz').select('*').limit(1);
    console.log("Task columns:", Object.keys(d2[0]));
}
run();
