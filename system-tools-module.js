// --- 12. PARSERS & FILE SYNC ---
function setModuleStatus(id, m, t) { try{let e=document.getElementById(id); e.innerText=m; e.className=`mod-status ${t}`;}catch(x){} }

// Safe event listener binding
const orderFilesEl = document.getElementById('orderFiles');
if (orderFilesEl) orderFilesEl.addEventListener('change', async(e)=>{if(e.target.files.length>0) await runFileImport(e.target, 'orders');});
const parcelFilesEl = document.getElementById('parcelFiles');
if (parcelFilesEl) parcelFilesEl.addEventListener('change', async(e)=>{if(e.target.files.length>0) await runFileImport(e.target, 'parcels');});

function importTrace(msg, isErr=false) {
    let t = document.getElementById('importzProgressTerminal');
    if(t) {
        let line = document.createElement('div');
        line.style.color = isErr ? '#ef4444' : '#38bdf8';
        line.style.paddingBottom = '3px';
        line.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        line.innerText = `> ${msg}`;
        t.appendChild(line);
        t.parentElement.scrollTop = t.parentElement.scrollHeight;
    }
}

async function runFileImport(inputNode, type) {
    if(!inputNode.files.length) return;
    let term = document.getElementById('importzProgressTerminal'); if(term) term.innerHTML = "";
    importTrace(`INITIALIZING IMPORT PROTOCOL: [${type.toUpperCase()}]`, false);
    importTrace(`Loaded ${inputNode.files.length} payload file(s) into memory matrix.`);
    let statId = type === 'orders' ? 'statusOrders' : 'statusParcels';
    setSysProgress(20, 'working'); setModuleStatus(statId, "⏳ Parsing...", "mod-working"); inputNode.disabled = true;
    try {
        let resObj = type === 'orders' ? await extractOrders(inputNode.files) : await extractParcels(inputNode.files);
        if (resObj.count > 0) {
            importTrace(`Data successfully extracted globally! Detected ${resObj.count} valid dictionary instances.`);
            importTrace(`Transmitting [${resObj.table}] insertion payload -> supabaseClient...`);
            sysLog(`Pushing ${resObj.count} items...`); setSysProgress(80, 'working');
            const {error} = await supabaseClient.from(resObj.table).upsert(resObj.data, {onConflict: resObj.conflict}); if(error) throw new Error(error.message);
            if (resObj.data2) { 
                importTrace(`Secondary relation payload found! Transmitting [${resObj.table2}] insertion payload...`);
                const {error2} = await supabaseClient.from(resObj.table2).upsert(resObj.data2, {onConflict: resObj.conflict2}); if(error2) throw new Error(error2.message); 
            }
            importTrace(`Upload Cycle Completed Successfully! Local data sync triggered.`);
            setSysProgress(100, 'success'); setModuleStatus(statId, `✅ Synced!`, 'mod-success'); inputNode.value = ""; setTimeout(()=>{setSysProgress(0,'working');syncAndCalculate();}, 1000);
        } else { 
            importTrace(`HALT WARNING: Zero valid DOM items located in the payload targets.`, true);
            setSysProgress(100, 'error'); setModuleStatus(statId, "❌ No data.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'),3000); }
    } catch(e) { 
        importTrace(`CRITICAL FAULT: ${e.message}`, true);
        sysLog(e.message, true); setSysProgress(100, 'error'); setModuleStatus(statId, "❌ Error.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'),3000); 
    }
    inputNode.disabled = false;
}

async function extractOrders(files) {
    let a = [];
    for(let f of files) {
        const d = new DOMParser().parseFromString(await f.text(), 'text/html');
        Array.from(d.querySelectorAll('tbody, table, .order-list-item')).filter(el=>el.innerText.includes("Order No：")).forEach(b => {
            let bt = b.innerText; let oNo = (bt.match(/DO\d+/)||["N/A"])[0]; let dt = (bt.match(/\d{4}-\d{2}-\d{2}/)||[""])[0]; 
            let oTot = bt.match(/Total Amount:.*?[￥$]\s*([\d.]+)/i)?parseFloat(bt.match(/Total Amount:.*?[￥$]\s*([\d.]+)/i)[1]):0; 
            let post = bt.match(/Postage Inclusive:.*?[￥$]\s*([\d.]+)/i)?parseFloat(bt.match(/Postage Inclusive:.*?[￥$]\s*([\d.]+)/i)[1]):0;
            let trs = Array.from(b.querySelectorAll('tr')).filter(r=>r.innerText.match(/DI\d+/)); let tq=0; let tBaseCost = 0;
            trs.forEach(r=>{ let cs=r.querySelectorAll('td'); if(cs.length>=3) { let q = parseInt(cs[2].innerText.replace(/[^0-9]/g,''))||1; let upMatch = r.innerText.match(/(?:US \$|CN ￥)\s*([\d.]+)/); let up = upMatch ? parseFloat(upMatch[1]) : 0; tq += q; tBaseCost += (up * q); } });
            let hiddenFee = oTot - tBaseCost; if (hiddenFee < 0) hiddenFee = 0; let feePerItem = tq > 0 ? (hiddenFee / tq) : 0;
            trs.forEach(r => {
                let m = r.innerText.match(/DI\d+/); if(m && !r.innerText.includes("Order No：")){
                    let id = m[0], pn = ""; 
                    for (let l of Array.from(r.querySelectorAll('a'))) {
                        let t = l.getAttribute('title'), x = l.innerText.trim();
                        if (t && t.length > 10) { pn = t; break; }
                        if (x && x.length > 15 && !x.includes("DI26") && !x.toLowerCase().includes("superbuy") && !x.toLowerCase().includes("contact")) { pn = x; break; }
                    }
                    if(!pn || pn.toLowerCase().includes("product-img")) Array.from(r.querySelectorAll('img')).forEach(i=>{let a=i.getAttribute('alt'); if(a&&a.length>10&&!a.includes("代购商品")){pn=a;return;}});
                    pn = pn.replace('代购商品','').trim(); let sm = r.innerText.match(/(?:Specification model|specification|Product specifications|model|Color|size|power|Light color|Applicable Model)[：:]\s*([^\n\t\r]+)/i);
                    let sp = sm ? sm[1].trim().replace(/(?:Specification model|specification|Product specifications|model|Color|size|power|Light color|Applicable Model)[：:]/gi,'').trim() : "";
                    pn = pn.replace(/(?:Specification model|specification|Product specifications|model|Color|size|power|Light color|Applicable Model)[：:].*/i,'').trim(); if(sp&&pn.includes(sp)) pn=pn.replace(sp,'').trim(); pn=pn.replace(/[-\s,：:]+$/,'').trim();
                    let tId = r.innerText.match(/(?:ALIBABA|TB|Order):([\d-]+)/i)?r.innerText.match(/(?:ALIBABA|TB|Order):([\d-]+)/i)[1]:""; 
                    let up = r.innerText.match(/(?:US \$|CN ￥)\s*([\d.]+)/)?parseFloat(r.innerText.match(/(?:US \$|CN ￥)\s*([\d.]+)/)[1]):0; 
                    let q = parseInt(r.querySelectorAll('td')[2]?.innerText.replace(/[^0-9]/g,''))||1;
                    let uclp = up + feePerItem;
                    a.push({di_item_id:id, order_date:dt, order_no:oNo, alibaba_order:tId, item_name:pn, specification:sp, unit_price:up, quantity:q, postage:post, order_total:oTot, unit_china_landed_price:uclp});
                }
            });
        });
    } return { count: a.length, table: 'raw_orders', conflict: 'di_item_id', data: a };
}

async function extractParcels(files) {
    let sum=[], itm=[];
    for(let f of files) {
        const d = new DOMParser().parseFromString(await f.text(), 'text/html'); const bt = d.body.textContent.replace(/\s+/g,' ');
        let pm = bt.match(/PN\d{11}/); if(!pm) continue; let pNo = pm[0];
        let am = bt.match(/Actual Paid\s*:\s*US \$\s*([\d.]+)/); if(!am) continue; let aP = parseFloat(am[1]); let ab = bt.split(/Actual Paid\s*:\s*US \$\s*[\d.]+/)[1]||""; let aW = ab.match(/Actual Chargeable Weight\s*(\d+)\s*g/)?parseInt(ab.match(/Actual Chargeable Weight\s*(\d+)\s*g/)[1]):0;
        let xc = (n, isD=false) => { let m=ab.match(new RegExp(isD?`${n}\\s*-\\s*US \\$\\s*([\\d.]+)`:`${n}\\s*US \\$\\s*([\\d.]+)`,'i')); return m?parseFloat(m[1]):0; };
        sum.push({ parcel_no:pNo, actual_paid:aP, actual_chargeable_weight_g:aW, actual_shipping_fee:xc("Actual Shipping Fee"), first_tier_cost:xc("1st"), second_tier_cost:xc("2nd"), custom_clearance_fee:xc("Custom Clearance Fee"), remote_area_surcharge:xc("Remote area surcharge"), fuel_surcharge:xc("Fuel Surcharge"), operating_cost:xc("Operating Cost"), tax:xc("Tax"), insurance:xc("Insurance"), storage_fee:xc("Storage Fee"), epe_loose_filling:xc("EPE Loose Filling"), corner_protector:xc("Corner Protector"), moister_barrier_bag:xc("Moister-Barrier Bag"), packing_video:xc("Whole-Process Packing Video"), one_percent_discount:xc("1% Discount",true), points_discount:xc("Points Discount",true), coupon_discount:xc("Coupon Discount",true), discount_code:xc("Discount code Discount",true) });
        d.querySelectorAll('table').forEach(t=>{
            if(t.rows[0]&&t.rows[0].textContent.toLowerCase().includes('item name')&&t.rows[0].textContent.toLowerCase().includes('operation')) {
                let cb=[], cbw=0; const pb=()=>{ if(cb.length>0){ let tq=cb.reduce((s,i)=>s+i.q,0); if(tq===0) tq=1; cb.forEach(i=>itm.push({parcel_no:pNo, di_item_id:i.d, item_name:i.n, specification:i.s, quantity:i.q, total_dist_weight_g:Math.round(cbw*(i.q/tq)), unit_weight_g:Math.round((cbw*(i.q/tq))/(i.q||1)*100)/100})); cb=[]; } };
                for(let j=1; j<t.rows.length; j++){
                    let cs=t.rows[j].cells; if(cs.length>=3){
                        let rn=cs[0]?cs[0].textContent.replace(/View Inspection/g,'').replace(/\s+/g,' ').trim():''; if(!rn) continue;
                        let dc=rn.match(/DI\d{11}/)?rn.match(/DI\d{11}/)[0]:''; let rw=dc?rn.replace(dc,'').trim():rn;
                        let sl="specification|Color|model|Product specifications|Specification model|size|power|Light color|Applicable Model"; let sm=rw.match(new RegExp(`(?:${sl})[：:]\\s*(.*)`,'i'));
                        let sp=sm?sm[1].trim():''; let fn=sm?rw.replace(new RegExp(`(?:${sl})[：:]\\s*(.*)`,'i'),'').trim():rw; sp=sp.replace(new RegExp(`(?:${sl})[：:]`,'gi'),'').trim(); if(sp&&fn.includes(sp)) fn=fn.replace(sp,'').trim(); fn=fn.replace(/[-\s,：:]+$/,'').trim();
                        let q=parseInt(cs[1]?cs[1].textContent.trim():0)||0; let pw=parseInt(cs[2]?cs[2].textContent.trim():'');
                        if(!isNaN(pw)){pb(); cbw=pw; cb.push({d:dc,n:fn,s:sp,q:q});} else cb.push({d:dc,n:fn,s:sp,q:q});
                    }
                } pb();
            }
        });
    } return { count: sum.length, table: 'raw_parcel_summary', conflict: 'parcel_no', data: sum, table2: 'raw_parcel_items', conflict2: 'parcel_no, di_item_id', data2: itm };
}

async function syncAndCalculate() {
    const btnCalc = document.getElementById('btnCalc'); if(btnCalc) btnCalc.disabled = true;
    setMasterStatus("⚙️ Downloading data...", "mod-working"); sysLog("Sync/Calc..."); setSysProgress(20, 'working');
    try {
        const [oR, sR, iR, eR] = await Promise.all([ supabaseClient.from('raw_orders').select('*'), supabaseClient.from('raw_parcel_summary').select('*'), supabaseClient.from('raw_parcel_items').select('*'), supabaseClient.from('full_landed_costs').select('parcel_no, di_item_id, neogleamz_name, neogleamz_product, quantity, lot_multiplier') ]);
        if(oR.error) throw new Error(oR.error.message); if(sR.error) throw new Error(sR.error.message); if(iR.error) throw new Error(iR.error.message);
        if(!iR.data||iR.data.length===0) { sysLog("No raw items.", true); setSysProgress(0, 'working'); if(btnCalc) btnCalc.disabled=false; return; }
        sysLog("Calculating Math..."); setSysProgress(60, 'working'); setMasterStatus("🧮 Calculating...", "mod-working");
        let eM={}; if(eR.data) eR.data.forEach(r => eM[`${r.parcel_no}_${r.di_item_id}`]=r);
        let oM={}; (oR.data||[]).forEach(o => oM[o.di_item_id]=o); let sM={}; (sR.data||[]).forEach(s => sM[s.parcel_no]=s);
        let pT={}; iR.data.forEach(i => { if(!pT[i.parcel_no]) pT[i.parcel_no]={w:0}; pT[i.parcel_no].w += Number(i.total_dist_weight_g)||0; });
        let dI=[];
        iR.data.forEach(i => {
            let pN=i.parcel_no, d=i.di_item_id; let o=oM[d]||{}, s=sM[pN]||{}, e=eM[`${pN}_${d}`]||{};
            let q=e.quantity||i.quantity||1; let mult = e.lot_multiplier || 1; let up=Number(o.unit_price)||0; let uclp=Number(o.unit_china_landed_price)||up; let tw=Number(i.total_dist_weight_g)||0; let psc=Number(s.actual_paid)||0; let ptw=pT[pN].w||1;
            let uws = q > 0 ? ((tw / ptw) * psc / q) : 0; 
            let fuc = uclp + uws;
            let roundedUws = Math.round(uws * 10000) / 10000;
            let roundedFuc = Math.round(fuc * 10000) / 10000;
            let roundedTotal = Math.round(fuc * q * 100) / 100;
            
            dI.push({ parcel_no:pN, di_item_id:d, item_name:i.item_name||o.item_name||"", specification:i.specification||o.specification||"", quantity:q, lot_multiplier:mult, neogleamz_name:e.neogleamz_name||'', neogleamz_product:e.neogleamz_product||'', total_dist_weight_g:tw, unit_weight_g:i.unit_weight_g, order_date:o.order_date, order_no:o.order_no, alibaba_order:o.alibaba_order, order_unit_price:up, order_postage:o.postage, order_total:o.order_total, unit_china_landed_price:uclp, actual_paid:s.actual_paid, actual_chargeable_weight_g:s.actual_chargeable_weight_g, actual_shipping_fee:s.actual_shipping_fee, first_tier_cost:s.first_tier_cost, second_tier_cost:s.second_tier_cost, custom_clearance_fee:s.custom_clearance_fee, remote_area_surcharge:s.remote_area_surcharge, fuel_surcharge:s.fuel_surcharge, operating_cost:s.operating_cost, tax:s.tax, insurance:s.insurance, storage_fee:s.storage_fee, epe_loose_filling:s.epe_loose_filling, corner_protector:s.corner_protector, moister_barrier_bag:s.moister_barrier_bag, packing_video:s.packing_video, one_percent_discount:s.one_percent_discount, points_discount:s.points_discount, coupon_discount:s.coupon_discount, discount_code:s.discount_code, unit_ship_weight:roundedUws, final_cost_weight:roundedFuc, total_cost_weight:roundedTotal });
        });
        sysLog(`Pushing ${dI.length} rows...`); setSysProgress(80, 'working');
        const {error} = await supabaseClient.from('full_landed_costs').upsert(dI, {onConflict:'parcel_no, di_item_id'}); if(error) throw new Error(error.message);
        if(typeof loadData === 'function') await loadData(); setSysProgress(100, 'success'); setMasterStatus(`✅ Calculated!`, "mod-success"); setTimeout(()=>{setSysProgress(0,'working');}, 3000);
    } catch (error) { setSysProgress(100, 'error'); sysLog(error.message, true); setMasterStatus("❌ Calc Error.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'), 3000); }
    if(btnCalc) btnCalc.disabled = false;
}

// --- 13. NEW BACKUP & RESTORE SYSTEM ---
function openBackupModal() {
    document.getElementById('backupModal').style.display = 'flex';
    document.getElementById('restorePreview').style.display = 'none';
    document.getElementById('importBackupFile').value = '';
}

function closeBackupModal() { document.getElementById('backupModal').style.display = 'none'; }

async function executeExport() {
    try {
        setMasterStatus("Exporting...", "mod-working"); sysLog("Exporting full system backup...");
        const wb = XLSX.utils.book_new();
        async function addSheet(tableName, sheetName) {
            const { data, error } = await supabaseClient.from(tableName).select('*');
            if (error) throw error;
            let exportData = data;
            if (tableName === 'product_recipes') {
                exportData = data.map(r => ({ product_name: r.product_name, components: JSON.stringify(r.components), labor_time_mins: r.labor_time_mins, labor_rate_hr: r.labor_rate_hr, msrp: r.msrp, wholesale_price: r.wholesale_price, is_subassembly: r.is_subassembly }));
            } else if (tableName === 'production_sops') {
                exportData = data.map(r => ({ product_name: r.product_name, steps: JSON.stringify(r.steps) }));
            } else if (tableName === 'work_orders') {
                exportData = data.map(r => ({ ...r, wip_state: JSON.stringify(r.wip_state), routing: JSON.stringify(r.routing || {}) }));
            } else if (tableName === 'pack_ship_sops') {
                exportData = data.map(r => ({ ...r, instruction_json: typeof r.instruction_json === 'object' ? JSON.stringify(r.instruction_json) : r.instruction_json }));
            } else if (tableName === 'sop_archives') {
                exportData = data.map(r => ({ ...r, telemetry_json: typeof r.telemetry_json === 'object' ? JSON.stringify(r.telemetry_json) : r.telemetry_json }));
            }
            const ws = XLSX.utils.json_to_sheet(exportData); XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        await addSheet('full_landed_costs', 'Master_Ledger');
        await addSheet('product_recipes', 'Recipes');
        await addSheet('inventory_consumption', 'Inventory');
        await addSheet('work_orders', 'Work_Orders');
        await addSheet('production_sops', 'SOPs');
        await addSheet('sales_ledger', 'Sales_Ledger');
        await addSheet('storefront_aliases', 'Storefront_Aliases');
        await addSheet('print_queue', 'Print_Queue');
        await addSheet('app_settings', 'App_Settings');
        await addSheet('socialz_audience', 'Socialz_Users');
        await addSheet('pack_ship_sops', 'Pack_Ship_SOPs');
        await addSheet('sop_archives', 'SOP_Archives');
        await addSheet('raw_orders', 'Raw_Orders');
        await addSheet('raw_parcel_summary', 'Raw_Parcel_Summary');
        await addSheet('raw_parcel_items', 'Raw_Parcel_Items');
        const now = new Date(); const dateStr = now.toISOString().split('T')[0]; const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        XLSX.writeFile(wb, `Neogleamz_Full_Backup_${dateStr}_${timeStr}.xlsx`);
        setMasterStatus("Export Complete!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
    } catch (e) { sysLog(e.message, true); setMasterStatus("Export Error", "mod-error"); }
}

let pendingRestoreData = {};
function handleFileSelect(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
        pendingRestoreData = {}; let html = '';
        workbook.SheetNames.forEach(sheetName => {
            const roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            if(roa.length > 0) { pendingRestoreData[sheetName] = roa; html += `<label style="display:flex; align-items:center; justify-content:flex-start; gap:10px; font-size:13px; margin:6px 0; color:var(--text-main); font-weight:bold;"><input type="checkbox" class="restore-chk" value="${sheetName}" checked style="width:16px; height:16px; margin:0; flex-shrink:0; cursor:pointer;"> Restore ${sheetName.replace(/_/g, ' ')} (${roa.length} rows)</label>`; }
        });
        document.getElementById('restoreCheckboxes').innerHTML = html; document.getElementById('restorePreview').style.display = 'block';
    };
    reader.readAsArrayBuffer(file);
}

async function executeRestore() {
    const checkboxes = document.querySelectorAll('.restore-chk:checked');
    if(checkboxes.length === 0) return alert("Select at least one sheet.");
    if(!confirm("⚠️ OVERWRITE cloud data?")) return;
    try {
        setMasterStatus("Restoring...", "mod-working"); setSysProgress(20, 'working');
        for (let chk of checkboxes) {
            const sheetName = chk.value; const rawData = pendingRestoreData[sheetName]; sysLog(`Restoring sheet: ${sheetName}`);
            let tableName = ''; let conflictKey = ''; let parsedData = rawData;
            if (sheetName === 'Master_Ledger') { tableName = 'full_landed_costs'; conflictKey = 'parcel_no, di_item_id'; } 
            else if (sheetName === 'Recipes') { tableName = 'product_recipes'; conflictKey = 'product_name'; parsedData = rawData.map(r => ({ ...r, components: JSON.parse(r.components || '[]') })); } 
            else if (sheetName === 'Inventory') { tableName = 'inventory_consumption'; conflictKey = 'item_key'; } 
            else if (sheetName === 'Work_Orders') { tableName = 'work_orders'; conflictKey = 'wo_id'; parsedData = rawData.map(r => ({ ...r, wip_state: JSON.parse(r.wip_state || '{}'), routing: JSON.parse(r.routing || '{}') })); } 
            else if (sheetName === 'SOPs') { tableName = 'production_sops'; conflictKey = 'product_name'; parsedData = rawData.map(r => ({ ...r, steps: JSON.parse(r.steps || '[]') })); }
            else if (sheetName === 'Sales_Ledger') { tableName = 'sales_ledger'; conflictKey = 'id'; }
            else if (sheetName === 'Storefront_Aliases') { tableName = 'storefront_aliases'; conflictKey = 'storefront_sku'; }
            else if (sheetName === 'Print_Queue') { tableName = 'print_queue'; conflictKey = 'id'; }
            else if (sheetName === 'App_Settings') { tableName = 'app_settings'; conflictKey = 'id'; }
            else if (sheetName === 'Socialz_Users') { tableName = 'socialz_audience'; conflictKey = 'name'; }
            else if (sheetName === 'Pack_Ship_SOPs') { tableName = 'pack_ship_sops'; conflictKey = 'internal_recipe_name'; parsedData = rawData.map(r => ({ ...r, instruction_json: typeof r.instruction_json === 'string' && r.instruction_json.startsWith('{') ? JSON.parse(r.instruction_json) : r.instruction_json })); }
            else if (sheetName === 'SOP_Archives') { tableName = 'sop_archives'; conflictKey = 'id'; parsedData = rawData.map(r => ({ ...r, telemetry_json: typeof r.telemetry_json === 'string' && r.telemetry_json.startsWith('[') ? JSON.parse(r.telemetry_json) : r.telemetry_json })); }
            else if (sheetName === 'Raw_Orders') { tableName = 'raw_orders'; conflictKey = 'di_item_id'; }
            else if (sheetName === 'Raw_Parcel_Summary') { tableName = 'raw_parcel_summary'; conflictKey = 'parcel_no'; }
            else if (sheetName === 'Raw_Parcel_Items') { tableName = 'raw_parcel_items'; conflictKey = 'parcel_no, di_item_id'; }
            if (tableName) {
                const { error } = await supabaseClient.from(tableName).upsert(parsedData, { onConflict: conflictKey });
                if (error) throw error;
            }
        }
        setMasterStatus("Complete!", "mod-success"); closeBackupModal(); if(typeof loadData === 'function') await loadData();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Restore Error", "mod-error"); }
}
