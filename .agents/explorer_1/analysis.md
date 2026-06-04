# Backup Pipeline Analysis: `system-tools-module.js`

## 1. Observation
- `executeExport` (line 1472) currently executes 15 hardcoded `await addSheet('table_name', 'Sheet_Name')` calls.
- `commitLiveRestore` (line 1612) relies on a massive 15-branch `if/else` chain mapping `sheetName` back to `tableName` and defining a `conflictKey`, as well as applying JSON parsing logic.
- Both operations lack a centralized configuration map, making schema expansions tedious and error-prone.

## 2. Logic Chain
- **Defining Static Arrays:** By defining an `APP_TABLES` array containing object maps (`{ tableName, sheetName, conflictKey }`) and an `IGNORED_TABLES` array for elements like `spatial_ref_sys`, we centralize the pipeline's metadata.
- **Dynamic Iteration:** Refactoring `executeExport` to loop over `APP_TABLES` and `get_active_schema_tables` eliminates redundant code. Using `get_active_schema_tables` via an RPC enables the pipeline to detect new tables dynamically.
- **Table Parsing:** The `addSheet` and `commitLiveRestore` functions can still conditionally format specific tables (`product_recipes`, `work_orders`, etc.) while dynamically determining the sheet name and conflict key directly from `APP_TABLES`.
- **RPC Migration:** A `SECURITY DEFINER` function querying `pg_class` filters safely to only ordinary base tables (`relkind = 'r'`) in the `public` namespace.

## 3. Recommended Code Changes

### Step 3a: Define Configuration Arrays
Place these globally or within the module scope:
```javascript
const APP_TABLES = [
    { tableName: 'full_landed_costs', sheetName: 'Master_Ledger', conflictKey: 'parcel_no, di_item_id' },
    { tableName: 'product_recipes', sheetName: 'Recipes', conflictKey: 'product_name' },
    { tableName: 'inventory_consumption', sheetName: 'Inventory', conflictKey: 'item_key' },
    { tableName: 'work_orders', sheetName: 'Work_Orders', conflictKey: 'wo_id' },
    { tableName: 'production_sops', sheetName: 'SOPs', conflictKey: 'product_name' },
    { tableName: 'sales_ledger', sheetName: 'Sales_Ledger', conflictKey: 'id' },
    { tableName: 'storefront_aliases', sheetName: 'Storefront_Aliases', conflictKey: 'storefront_sku' },
    { tableName: 'print_queue', sheetName: 'Print_Queue', conflictKey: 'id' },
    { tableName: 'app_settings', sheetName: 'App_Settings', conflictKey: 'id' },
    { tableName: 'socialz_audience', sheetName: 'Socialz_Users', conflictKey: 'name' },
    { tableName: 'pack_ship_sops', sheetName: 'Pack_Ship_SOPs', conflictKey: 'internal_recipe_name' },
    { tableName: 'sop_archives', sheetName: 'SOP_Archives', conflictKey: 'id' },
    { tableName: 'raw_orders', sheetName: 'Raw_Orders', conflictKey: 'di_item_id' },
    { tableName: 'raw_parcel_summary', sheetName: 'Raw_Parcel_Summary', conflictKey: 'parcel_no' },
    { tableName: 'raw_parcel_items', sheetName: 'Raw_Parcel_Items', conflictKey: 'parcel_no, di_item_id' }
];

const IGNORED_TABLES = ['spatial_ref_sys'];
```

### Step 3b: Refactor `executeExport`
Replace the hardcoded `addSheet` block in `executeExport`:
```javascript
        // Fetch active schema tables to guarantee we catch new migrations
        const { data: dbTables, error: rpcErr } = await supabaseClient.rpc('get_active_schema_tables');
        if (rpcErr) throw rpcErr;

        // Iterate dynamically
        for (const tblObj of dbTables) {
            const tblName = tblObj.table_name;
            if (IGNORED_TABLES.includes(tblName)) continue;
            
            // Map custom sheet names, fallback to raw table name
            const mapObj = APP_TABLES.find(t => t.tableName === tblName);
            const sheetName = mapObj ? mapObj.sheetName : tblName;
            
            await addSheet(tblName, sheetName);
        }
```
*(The `addSheet` logic itself remains as-is, successfully preserving the `if(tableName === '...'){}` object serialization logic.)*

### Step 3c: Refactor `commitLiveRestore` mappings
Update the logic mapping inside `commitLiveRestore`:
```javascript
            let tableName = sheetName; 
            let conflictKey = 'id'; 
            let parsedData = rawData;
            
            const mapObj = APP_TABLES.find(t => t.sheetName === sheetName);
            if (mapObj) {
                tableName = mapObj.tableName;
                conflictKey = mapObj.conflictKey;
            }

            // Specific JSON deserialization logic
            if (tableName === 'product_recipes') { 
                parsedData = rawData.map(r => ({ ...r, components: JSON.parse(r.components || '[]') })); 
            } else if (tableName === 'work_orders') { 
                parsedData = rawData.map(r => ({ ...r, wip_state: JSON.parse(r.wip_state || '{}'), routing: JSON.parse(r.routing || '{}') })); 
            } else if (tableName === 'production_sops') {
                parsedData = rawData.map(r => ({ ...r, steps: JSON.parse(r.steps || '[]') }));
            } else if (tableName === 'pack_ship_sops') {
                parsedData = rawData.map(r => ({ ...r, instruction_json: typeof r.instruction_json === 'string' && r.instruction_json.startsWith('{') ? JSON.parse(r.instruction_json) : r.instruction_json }));
            } else if (tableName === 'sop_archives') {
                parsedData = rawData.map(r => ({ ...r, telemetry_json: typeof r.telemetry_json === 'string' && r.telemetry_json.startsWith('[') ? JSON.parse(r.telemetry_json) : r.telemetry_json }));
            }
```

## 4. Supabase SQL Migration
```sql
CREATE OR REPLACE FUNCTION public.get_active_schema_tables()
RETURNS TABLE (table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.relname::text
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r' -- Ordinary base tables only
  ORDER BY c.relname;
END;
$$;
```
