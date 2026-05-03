const fs = require('fs');

async function getOpenApi() {
    const env = fs.readFileSync('.env.local', 'utf-8');
    const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
    
    if (!urlMatch || !keyMatch) return;
    
    const url = urlMatch[1].trim();
    const key = keyMatch[1].trim();

    const res = await fetch(url + '/rest/v1/?apikey=' + key);
    const data = await res.json();
    
    let schema = null;
    if (data.definitions && data.definitions.task_comments) {
        schema = data.definitions.task_comments.properties;
    } else if (data.components && data.components.schemas && data.components.schemas.task_comments) {
        schema = data.components.schemas.task_comments.properties;
    }
    
    if (schema) {
        console.log("task_comments schema:");
        console.log(JSON.stringify(schema, null, 2));
    } else {
        console.log("Could not find task_comments schema.");
    }
}
getOpenApi();
