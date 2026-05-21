const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local from the workspace root
const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
});

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing Supabase URL or Service Role Key!");
    process.exit(1);
}

const supabase = createClient(url, key);

async function simulateArchiveSOPSnapshot(orderId, sku, recipeName, capturedTelemetry) {
    console.log(`\n--- Simulating archiveSOPSnapshot for order: ${orderId}, recipe: ${recipeName} ---`);
    try {
        // Fetch the live SOP at the moment of sign-off
        const { data: sopData, error: fetchErr } = await supabase
            .from('pack_ship_sops')
            .select('instruction_json, required_box_sku')
            .eq('internal_recipe_name', recipeName)
            .single();

        if (fetchErr) {
            console.log("Fetch pack_ship_sops returned error (expected for legacy/ignored recipes):", fetchErr.message);
        }
        
        console.log("sopData value:", sopData);

        const telemetryData = capturedTelemetry || [];

        // Check if JSON parsing of instruction_json fails if sopData is present
        let sopSnapshot = null;
        if (sopData) {
            try {
                sopSnapshot = JSON.parse(sopData.instruction_json || '{}');
            } catch (err) {
                console.error("JSON parsing of instruction_json failed:", err.message);
                sopSnapshot = sopData.instruction_json;
            }
        }

        const payload = {
            order_id: orderId,
            internal_recipe_name: recipeName,
            qa_passed_at: new Date().toISOString(),
            packer_telemetry: telemetryData,
            sop_snapshot: sopSnapshot,
            required_box_sku: sopData ? (sopData.required_box_sku || '') : ''
        };

        console.log("Attempting insert into sop_archives with payload:", JSON.stringify(payload, null, 2));

        const { data, error: insertErr } = await supabase
            .from('sop_archives')
            .insert(payload)
            .select();

        if (insertErr) {
            console.error("Insert failed with status 400 or other database rejection:", insertErr);
        } else {
            console.log("Insert succeeded!", data);
            // Clean up
            await supabase.from('sop_archives').delete().eq('order_id', orderId);
            console.log("Cleaned up test row.");
        }
    } catch(e) {
        console.error("Simulated execution caught critical error:", e);
    }
}

async function run() {
    // Test case 1: MISC_APPAREL (legacy/ignored)
    await simulateArchiveSOPSnapshot('#1004', 'MISC_APPAREL', 'MISC_APPAREL', []);
    
    // Test case 2: Ignored with null recipeName (as seen in some logs)
    await simulateArchiveSOPSnapshot('#1004', 'null', null, []);
}

run();
