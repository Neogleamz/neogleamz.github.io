const fs = require('fs');

const appTables = [
    { tableName: 'app_settings', sheetName: 'App_Settings', conflictKey: 'setting_key' },
    { tableName: 'cyclez', sheetName: 'Cyclez', conflictKey: 'id' },
    { tableName: 'full_landed_costs', sheetName: 'Master_Ledger', conflictKey: 'parcel_no, di_item_id' },
    { tableName: 'inventory_adjustments_log', sheetName: 'Inventory_Adjustments_Log', conflictKey: 'id' },
    { tableName: 'inventory_consumption', sheetName: 'Inventory', conflictKey: 'item_uuid' },
    { tableName: 'inventory_snapshots', sheetName: 'Inventory_Snapshots', conflictKey: 'id' },
    { tableName: 'label_designs', sheetName: 'Label_Designs', conflictKey: 'id' },
    { tableName: 'label_templates', sheetName: 'Label_Templates', conflictKey: 'id' },
    { tableName: 'pack_ship_sops', sheetName: 'Pack_Ship_SOPs', conflictKey: 'recipe_item_uuid' },
    { tableName: 'print_queue', sheetName: 'Print_Queue', conflictKey: 'id' },
    { tableName: 'product_recipes', sheetName: 'Recipes', conflictKey: 'product_item_uuid' },
    { tableName: 'production_sops', sheetName: 'SOPs', conflictKey: 'product_item_uuid' },
    { tableName: 'projectz', sheetName: 'Projectz', conflictKey: 'id' },
    { tableName: 'raw_orders', sheetName: 'Raw_Orders', conflictKey: 'di_item_id' },
    { tableName: 'raw_parcel_items', sheetName: 'Raw_Parcel_Items', conflictKey: 'parcel_no, di_item_id' },
    { tableName: 'raw_parcel_summary', sheetName: 'Raw_Parcel_Summary', conflictKey: 'parcel_no' },
    { tableName: 'sales_ledger', sheetName: 'Sales_Ledger', conflictKey: 'id' },
    { tableName: 'socialz_audience', sheetName: 'Socialz_Users', conflictKey: 'name' },
    { tableName: 'sop_archives', sheetName: 'SOP_Archives', conflictKey: 'id' },
    { tableName: 'storefront_aliases', sheetName: 'Storefront_Aliases', conflictKey: 'storefront_sku' },
    { tableName: 'tagz', sheetName: 'Tagz', conflictKey: 'id' },
    { tableName: 'task_activity', sheetName: 'Task_Activity', conflictKey: 'id' },
    { tableName: 'task_comments', sheetName: 'Task_Comments', conflictKey: 'id' },
    { tableName: 'taskz', sheetName: 'Taskz', conflictKey: 'id' },
    { tableName: 'teams', sheetName: 'Teams', conflictKey: 'id' },
    { tableName: 'tipz', sheetName: 'Tipz', conflictKey: 'id' },
    { tableName: 'work_orders', sheetName: 'Work_Orders', conflictKey: 'wo_id' }
];

const ignoredTables = [
    'registered_groups', 'shared_scenes', 'sk8lytz_app_settings', 'parsed_session_stats', 
    'crew_members', 'crew_memberships', 'user_profiles', 'crew_sessions', 'push_tokens', 
    'crews', 'admin_audit_logs', 'user_saved_presets', 'daemon_status', 'registered_devices', 
    'custom_builder_presets', 'led_diagnostics', 'sk8lytz_picks', 'remote_debug_logs', 
    'skate_sessions', 'product_catalog', 'telemetry_errors', 'spatial_ref_sys', 
    'telemetry_snapshots', 'discovered_devices_telemetry', 'skate_spots', 'hardware_blacklist', 
    'feature_flags', 'user_lifetime_stats', 'device_group_members', 'production_wos',
    'team_members', 'task_dependencies', 'task_templates', 'template_subtasks'
];

let appTablesStr = 'const APP_TABLES = [\n' + appTables.map(t => `    { tableName: '${t.tableName}', sheetName: '${t.sheetName}', conflictKey: '${t.conflictKey}' }`).join(',\n') + '\n];';
let ignoredTablesStr = 'const IGNORED_TABLES = [\n    ' + ignoredTables.map(t => `'${t}'`).join(', ') + '\n];';

let content = fs.readFileSync('d:/GitHub/neogleamz.github.io/assets/js/system-tools-module.js', 'utf8');

// The original arrays are between lines 1472 and 1537. We will use a regex to replace them entirely.
const regex = /const APP_TABLES = \[[\s\S]*?\];\s*const IGNORED_TABLES = \[[\s\S]*?\];/;
content = content.replace(regex, `${appTablesStr}\n\n${ignoredTablesStr}`);

fs.writeFileSync('d:/GitHub/neogleamz.github.io/assets/js/system-tools-module.js', content, 'utf8');
