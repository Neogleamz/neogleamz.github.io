const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('task_comments').select('*').limit(1);
    if (error) {
        console.error('Error fetching task_comments:', error);
    } else {
        console.log('Columns in task_comments (from sample data):', data.length > 0 ? Object.keys(data[0]) : 'No data, columns unknown from select *');
    }
}
checkSchema();
