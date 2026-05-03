const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://qefmeivpjyaukbwadgaz.supabase.co', 'sb_publishable_-wsts8Q7fKRYZiDV4n2vMg_-R7Ud3l7');

async function test() {
    console.log('Testing connection...');
    const { data: selectData, error: selectError } = await supabase.from('teams').select('*');
    console.log('Select Result:', selectData, selectError);
    
    const { data: insertData, error: insertError } = await supabase.from('teams').insert([{ name: 'Test Team' }]).select();
    console.log('Insert Result:', insertData, insertError);
}

test();
