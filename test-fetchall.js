const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://qefmeivpjyaukbwadgaz.supabase.co', 'sb_publishable_-wsts8Q7fKRYZiDV4n2vMg_-R7Ud3l7');

async function testFetchAll() {
    const [taskzRes, cyclezRes, teamsRes, commentsRes, activityRes] = await Promise.all([
        supabase.from('taskz').select('*').order('created_at', { ascending: false }),
        supabase.from('cyclez').select('*').order('start_date', { ascending: false }),
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('task_comments').select('*').order('created_at', { ascending: false }),
        supabase.from('task_activity').select('*').order('timestamp', { ascending: false })
    ]);
    
    console.log('taskz error:', taskzRes.error);
    console.log('cyclez error:', cyclezRes.error);
    console.log('teams error:', teamsRes.error);
    console.log('comments error:', commentsRes.error);
    console.log('activity error:', activityRes.error);
}

testFetchAll();
