const fs = require('fs');
const path = require('path');

const migrationsDir = 'supabase/migrations';
const files = fs.readdirSync(migrationsDir);

const allTables = new Set();
for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const regex = /CREATE TABLE IF NOT EXISTS (?:public\.)?([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        allTables.add(match[1]);
    }
}

const APP_TABLES = [
    'full_landed_costs', 'product_recipes', 'inventory_consumption', 'work_orders',
    'production_sops', 'sales_ledger', 'storefront_aliases', 'print_queue', 'app_settings',
    'socialz_audience', 'pack_ship_sops', 'sop_archives', 'raw_orders', 'raw_parcel_summary',
    'raw_parcel_items'
];

const IGNORED_TABLES = [
    'label_designs', 'teams', 'team_members', 'cyclez', 'taskz',
    'task_dependencies', 'task_comments', 'task_activity', 'task_templates',
    'template_subtasks', 'inventory_snapshots', 'projectz', 'tagz',
    'inventory_adjustments_log', 'label_templates', 'production_wos'
];

console.log("Total tables found in migrations:", allTables.size);

const unhandled = [];
for (const table of allTables) {
    if (!APP_TABLES.includes(table) && !IGNORED_TABLES.includes(table)) {
        unhandled.push(table);
    }
}

console.log("Tables NOT in APP_TABLES or IGNORED_TABLES:", unhandled);
