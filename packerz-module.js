// ==========================================
// NEXUZ: PACKERZ TERMINAL LOGIC
// ==========================================

async function fetchUnfulfilledOrders() {
    try {
        if (!supabaseClient) return console.error("Supabase client not initialized.");
        const queueContainer = document.getElementById('packerzAwaitingQueue');
        if (!queueContainer) return;
        
        queueContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-style:italic;">Querying Supabase edge nodes...</div>';

        // 1. Fetch exactly the physical rows mathematically marked globally as incomplete
        const { data, error } = await supabaseClient
            .from('sales_ledger')
            .select('*')
            .eq('internal_fulfillment_status', 'Awaiting Assembly')
            .order('sale_date', { ascending: true });

        if (error) throw error;

        // 2. Structurally group all the raw line-items mathematically into unified Order Cards
        const groupedOrders = {};
        data.forEach(row => {
            if(!groupedOrders[row.order_id]) {
                groupedOrders[row.order_id] = {
                    order_id: row.order_id,
                    sale_date: row.sale_date,
                    customer: 'Shopify Checkout', 
                    items: []
                };
            }
            groupedOrders[row.order_id].items.push({
                sku: row.storefront_sku,
                recipe: row.internal_recipe_name,
                qty: row.qty_sold
            });
        });

        const distinctOrderIds = Object.keys(groupedOrders);

        // 3. Dynamically Blast the global KPI Dashboard Tracker
        const kpiTracker = document.getElementById('kpiUnfulfilledCount');
        if(kpiTracker) kpiTracker.innerText = distinctOrderIds.length.toString();

        if (distinctOrderIds.length === 0) {
            queueContainer.innerHTML = '<div style="text-align:center; padding:60px; color:#10b981; font-size:14px; font-weight:900; font-style:italic; opacity:0.9;">ALL ACTIVE QUEUES CLEARED!</div>';
            return;
        }

        queueContainer.innerHTML = ''; 

        // 4. Architect Physical Order Cards in the DOM Container
        distinctOrderIds.forEach(id => {
            const order = groupedOrders[id];
            
            const card = document.createElement('div');
            card.className = 'packerz-order-card';
            card.style.cssText = 'background: var(--bg-container); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 15px var(--shadow-color); border-left: 5px solid #F59E0B;';
            
            const shortDate = new Date(order.sale_date).toLocaleDateString();
            const itemsPreview = order.items.map(i => `<span style="display:block; margin-top:4px;"><b>${i.qty}x</b> ${i.recipe}</span>`).join('');

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:4px;">
                    <strong style="color:var(--text-heading); font-size:15px; font-weight:900;">ORDER ${order.order_id}</strong>
                    <span style="font-size:11px; color:#F59E0B; font-weight:900; background:rgba(245,158,11,0.1); padding:4px 10px; border-radius:6px; letter-spacing:0.5px;">${shortDate}</span>
                </div>
                <div style="font-size:12px; color:var(--text-main); font-weight:700; background:var(--bg-bar); padding:10px; border-radius:8px;">
                    ${itemsPreview}
                </div>
                <button style="margin-top:10px; width:100%; padding:8px; background:transparent; border:1px solid #F59E0B; color:#F59E0B; border-radius:6px; font-weight:800; font-size:11px; cursor:pointer; transition:all 0.2s;">
                    OPEN SOP & START PACKING
                </button>
            `;
            
            card.onmouseover = () => card.style.borderColor = '#F59E0B';
            card.onmouseout = () => card.style.borderColor = 'var(--border-color)';
            
            card.onclick = () => openPackerzSopTerminal(order);
            queueContainer.appendChild(card);
        });

    } catch (err) {
        console.error("PACKERZ Fetch Error:", err);
        document.getElementById('packerzAwaitingQueue').innerHTML = `<div style="color:#ef4444; padding:20px; font-size:12px; font-weight:800;">Data hook structurally failed: ${err.message}</div>`;
    }
}

function openPackerzSopTerminal(orderGroup) {
    const activeQueue = document.getElementById('packerzActiveQueue');
    if (!activeQueue) return;

    let itemsHtml = orderGroup.items.map(i => `
        <div style="background:var(--bg-body); border:1px solid var(--border-color); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="font-weight:900; color:var(--text-heading); font-size:13px; display:block;">${i.recipe}</span>
                <span style="font-size:11px; color:var(--text-muted); font-family:monospace;">Source Alias: ${i.sku}</span>
            </div>
            <div style="background:#10b981; color:white; font-weight:900; font-size:14px; padding:6px 14px; border-radius:6px;">${i.qty}</div>
            <button style="margin-left:15px; padding:6px 12px; background:var(--text-heading); color:var(--bg-body); border:none; border-radius:6px; font-weight:800; font-size:10px; cursor:pointer;" onclick="alert('SOP Modal Configurator Launch Logic Coming in Step 4!')">VIEW SOP</button>
        </div>
    `).join('');

    activeQueue.innerHTML = `
    <div style="padding:25px; background:var(--bg-container); border-radius:12px; border:2px solid #F59E0B; box-shadow: 0 10px 30px rgba(245,158,11,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:#F59E0B; font-size:18px; font-weight:900; letter-spacing:1px;">ACTIVE TARGET: ${orderGroup.order_id}</h3>
            <span style="font-size:11px; font-weight:900; color:var(--text-muted);">${new Date(orderGroup.sale_date).toLocaleDateString()}</span>
        </div>
        
        <p style="font-size:12px; color:var(--text-muted); font-weight:700; margin-bottom:20px;">Review the mandatory Pick-List and clear all SOP QA checks before closing out this active order block.</p>
        
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:25px;">
            ${itemsHtml}
        </div>
        
        <button id="btnCompleteAssembly_${orderGroup.order_id}" style="width:100%; padding:16px; background:#10b981; color:white; border:none; border-radius:10px; font-weight:900; letter-spacing:1px; cursor:pointer; font-size:14px; transition:transform 0.2s; box-shadow:0 6px 20px rgba(16,185,129,0.3);" onclick="executePackerzCompletion('${orderGroup.order_id}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            ASSEMBLY COMPLETE
        </button>
    </div>`;
}

async function executePackerzCompletion(orderId) {
    if(!confirm(`Are you absolutely sure you want to officially mark Order ${orderId} as completely assembled?`)) return;
    
    try {
        const btn = document.getElementById(`btnCompleteAssembly_${orderId}`);
        if(btn) { btn.innerText = 'SYNCING SUPABASE CLOUD...'; btn.style.opacity = '0.7'; }

        // 1. Mutate the status flag to Completed globally across all grouped rows
        const { error } = await supabaseClient
            .from('sales_ledger')
            .update({ internal_fulfillment_status: 'Completed' })
            .eq('order_id', orderId);

        if(error) throw error;

        // NOTE: Hardware Stock mathematical deduction runs natively via RPC or subsequent dynamic query injections.
        
        // 2. Clear Active UI Node
        document.getElementById('packerzActiveQueue').innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic; opacity:0.6;">Select an order from the queue to functionally open the SOP terminal.</div>';
        
        // 3. Re-Sync Live Queue
        fetchUnfulfilledOrders();
        
    } catch(err) {
        console.error("Completion Error", err);
        alert("CRITICAL ERROR: Failed to close out structural order constraints. \\n" + err.message);
    }
}


// ==========================================
// PACKERZ: BLUEPRINT ADMIN SOP EDITOR
// ==========================================

// This physically generates the visual BATCHEZ-legacy Rich-Text row arrays
function generatePackerzEditableSOPRow(s, idx) {
    let safeText = s.text || ''; 
    let m1 = s.m1 || {type: s.type || 'img', url: s.url || ''}; 
    let m2 = s.m2 || {type: 'img', url: ''}; 
    let m3 = s.m3 || {type: 'img', url: ''};
    
    let rowGen = (m, n) => { 
        let u = (m.url||'').replace(/"/g,'"').replace(/'/g,"\\'"); 
        return `<div class="media-row">
            <select class="m${n}-type">
                <option value="img" ${m.type==='img'?'selected':''}>🖼️ Image</option>
                <option value="doc" ${m.type==='doc'?'selected':''}>📄 Doc</option>
                <option value="vid" ${m.type==='vid'?'selected':''}>🎬 Vid</option>
            </select>
            <input type="text" class="m${n}-url" value="${u}" placeholder="URL ${n}">
        </div>`; 
    };
    
    return `<div class="sop-step-row" style="display:flex; gap:15px; padding:20px; background:var(--bg-body); border:1px solid var(--border-color); border-radius:12px;">
        <div class="sop-step-movers">
            <button class="icon-btn" style="width:28px!important; height:28px; font-size:14px; border:none; background:var(--bg-input);" onclick="movePackerzSOPUp(this)">▲</button>
            <button class="icon-btn" style="width:28px!important; height:28px; font-size:14px; border:none; background:var(--bg-input);" onclick="movePackerzSOPDown(this)">▼</button>
            <button class="icon-btn" style="width:28px!important; height:28px; font-size:16px; font-weight:900; border:none; background:#3b82f6; color:white; margin-top:auto;" onclick="addPackerzSOPRow(this)">+</button>
            <button class="btn-red icon-btn" style="width:28px!important; height:28px; font-size:12px; margin-top:5px;" onclick="removePackerzSOPRow(this)">X</button>
        </div>
        <div class="sop-text-container" style="flex-grow:1; display:flex; flex-direction:column;">
            <div class="sop-text-rich" contenteditable="true" placeholder="Type extremely detailed packing instructions securely here..." style="flex-grow:1; min-height:120px; outline:none; padding:15px; border:1px solid var(--border-input); border-radius:8px; background:var(--bg-input);">${safeText}</div>
        </div>
        <div class="sop-controls-container">
            <div class="rt-toolbar">
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('bold',false,null)" title="Bold"><b>B</b></button>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('italic',false,null)" title="Italic"><i>I</i></button>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('underline',false,null)" title="Underline"><u>U</u></button>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('strikeThrough',false,null)" title="Strikethrough"><s>S</s></button>
                <span style="color:var(--border-input); margin:0 4px;">|</span>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('justifyLeft',false,null)" title="Align Left">⬅</button>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('justifyCenter',false,null)" title="Align Center">↔</button>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('justifyRight',false,null)" title="Align Right">➡</button>
                <span style="color:var(--border-input); margin:0 4px;">|</span>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList',false,null)" title="Bulleted List">●</button>
                <button type="button" class="rt-btn" onmousedown="event.preventDefault(); document.execCommand('insertOrderedList',false,null)" title="Numbered List">1.</button>
            </div>
            <div style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-top:4px;">ATTACHMENTS (Optional)</div>
            ${rowGen(m1, 1)} ${rowGen(m2, 2)} ${rowGen(m3, 3)}
        </div>
    </div>`;
}

// BATCHEZ-Legacy Logic Movers
function movePackerzSOPUp(btn) { let row = btn.closest('.sop-step-row'); if(row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling); }
function movePackerzSOPDown(btn) { let row = btn.closest('.sop-step-row'); if(row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row); }
function removePackerzSOPRow(btn) { btn.closest('.sop-step-row').remove(); }
function addPackerzSOPRow(btn) {
    let newRow = document.createElement('div');
    newRow.innerHTML = generatePackerzEditableSOPRow({text:""}, 999);
    let rowNode = newRow.firstChild;
    if(btn) {
        let currentRow = btn.closest('.sop-step-row');
        currentRow.parentNode.insertBefore(rowNode, currentRow.nextSibling);
    } else {
        let wrapper = document.getElementById('packerzSopEditorRowsWrapper');
        if(wrapper) wrapper.appendChild(rowNode);
    }
}

// API: Initialize Dropdown with Master Items
async function initPackerzAdmin() {
    const ddl = document.getElementById('packerzAdminRecipeSelect');
    if(!ddl) return;
    try {
        if(typeof productsDB !== 'undefined') {
            let opts = '<option value="">-- Select Active Master Recipe --</option>';
            Object.keys(productsDB).sort().forEach(p => {
                opts += `<option value="${String(p).replace(/"/g, '&quot;')}">📝 ${p}</option>`;
            });
            ddl.innerHTML = opts;
        } else {
            ddl.innerHTML = '<option value="">CRITICAL: global productsDB undefined in namespace</option>';
        }
    } catch(e) { console.error('PACKERZ Config Error:', e); }
}

// Hook it universally!
setTimeout(initPackerzAdmin, 1500);

async function loadPackerzSopFromDB() {
    const sku = document.getElementById('packerzAdminRecipeSelect').value;
    const area = document.getElementById('packerzSopEditorArea');
    if(!sku) {
        area.innerHTML = "<div style='text-align:center; padding:40px; color:var(--text-muted); font-size:14px; font-style:italic;'>Select a target recipe on the left to begin compiling standard operating procedures.</div>";
        return;
    }
    
    area.innerHTML = "<div style='padding:40px; text-align:center; color:#10b981; font-weight:900; font-style:italic;'>Fetching structural SOP payload from Supabase Edge...</div>";
    
    try {
        const { data, error } = await supabaseClient.from('pack_ship_sops').select('*').eq('internal_recipe_name', sku).single();
        
        let steps = [{}];
        if(data) {
            document.getElementById('packerzAdminBoxSku').value = data.required_box_sku || '';
            const instructionJson = JSON.parse(data.instruction_json || '{"steps": [], "qaChecks": []}');
            steps = instructionJson.steps && instructionJson.steps.length > 0 ? instructionJson.steps : [{}];
            document.getElementById('packerzAdminQA').value = (instructionJson.qaChecks || []).join('\n');
        } else {
            document.getElementById('packerzAdminBoxSku').value = '';
            document.getElementById('packerzAdminQA').value = '';
        }

        let h = `<div id="packerzSopEditorRowsWrapper" style="display:flex; flex-direction:column; gap:15px; margin-bottom:20px;">`;
        steps.forEach((s, idx) => { h += generatePackerzEditableSOPRow(s, idx); });
        h += `</div>`;
        
        area.innerHTML = h;

    } catch(e) {
        console.error("SOP Fetch Bound Error:", e);
        if(e.code === 'PGRST116') {
            // Null record perfectly fine (new SOP)
            document.getElementById('packerzAdminBoxSku').value = '';
            document.getElementById('packerzAdminQA').value = '';
            let h = `<div id="packerzSopEditorRowsWrapper" style="display:flex; flex-direction:column; gap:15px; margin-bottom:20px;">` + generatePackerzEditableSOPRow({}, 0) + `</div>`;
            area.innerHTML = h;
        } else {
            area.innerHTML = `<div style='padding:20px; color:red; font-weight:900;'>API Disconnect: ${e.message}</div>`;
        }
    }
}

async function savePackerzSOPToDB() {
    const sku = document.getElementById('packerzAdminRecipeSelect').value;
    if(!sku) return alert("Must select a Recipe first!");
    
    const btn = document.getElementById('btnSavePackerzSOP');
    btn.innerText = "UPLOADING PROTOCOLS..."; btn.style.opacity="0.5";

    try {
        let rows = document.querySelectorAll('#packerzSopEditorRowsWrapper .sop-step-row');
        let stepsArray = [];
        rows.forEach(r => {
            let richText = r.querySelector('.sop-text-rich').innerHTML;
            let m1t = r.querySelector('.m1-type').value; let m1u = r.querySelector('.m1-url').value;
            let m2t = r.querySelector('.m2-type').value; let m2u = r.querySelector('.m2-url').value;
            let m3t = r.querySelector('.m3-type').value; let m3u = r.querySelector('.m3-url').value;
            
            stepsArray.push({
                text: richText,
                m1: {type: m1t, url: m1u}, m2: {type: m2t, url: m2u}, m3: {type: m3t, url: m3u}
            });
        });

        let qaLines = document.getElementById('packerzAdminQA').value.split('\n').map(l=>l.trim()).filter(l=>l);
        let boxSku = document.getElementById('packerzAdminBoxSku').value.trim();

        const payload = {
            internal_recipe_name: sku,
            required_box_sku: boxSku,
            instruction_json: JSON.stringify({ steps: stepsArray, qaChecks: qaLines })
        };

        const { error } = await supabaseClient.from('pack_ship_sops').upsert(payload, { onConflict: 'internal_recipe_name' });
        if(error) throw error;
        
        btn.innerText = "💾 SAVED SUCCESSFULLY!";
        btn.style.background = "#059669";
        setTimeout(() => { btn.innerText = "💾 SAVE MASTER BLUEPRINT"; btn.style.background = ""; btn.style.opacity="1"; }, 3000);

    } catch(e) {
        console.error(e);
        alert("CRITICAL SAVE ERROR: " + e.message);
        btn.innerText = "💾 SAVE MASTER BLUEPRINT"; btn.style.opacity="1";
    }
}
