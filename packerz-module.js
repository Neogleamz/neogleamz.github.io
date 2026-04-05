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
            `;
            
            card.onmouseover = () => card.style.borderColor = '#F59E0B';
            card.onmouseout = () => card.style.borderColor = 'var(--border-color)';
            
            card.onclick = () => openPackerzSopTerminal(order);
            queueContainer.appendChild(card);
        });

        fetchPackerzCompletedOrders();

    } catch (err) {
        console.error("PACKERZ Fetch Error:", err);
        document.getElementById('packerzAwaitingQueue').innerHTML = `<div style="color:#ef4444; padding:20px; font-size:12px; font-weight:800;">Data hook structurally failed: ${err.message}</div>`;
    }
}

async function fetchPackerzCompletedOrders() {
    try {
        if (!supabaseClient) return;
        const compQueue = document.getElementById('packerzCompletedQueue');
        if (!compQueue) return;
        
        compQueue.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-style:italic;">Querying archive...</div>';

        const { data, error } = await supabaseClient
            .from('sales_ledger')
            .select('*')
            .eq('internal_fulfillment_status', 'Completed')
            .order('sale_date', { ascending: false })
            .limit(150);

        if (error) throw error;

        const groupedOrders = {};
        data.forEach(row => {
            if(!groupedOrders[row.order_id]) groupedOrders[row.order_id] = { order_id: row.order_id, sale_date: row.sale_date, completed_at: row.assembly_completed_at, items: [] };
            groupedOrders[row.order_id].items.push({ 
                sku: row.storefront_sku, 
                recipe: row.internal_recipe_name, 
                qty: row.qty_sold, 
                qa_cleared_at: row.qa_cleared_at,
                telemetry: row.qa_telemetry_data
            });
        });

        const distinctOrderIds = Object.keys(groupedOrders);
        if (distinctOrderIds.length === 0) {
            compQueue.innerHTML = '<div style="text-align:center; padding:60px; color:var(--text-muted); font-size:12px; font-style:italic;">No historical records found.</div>';
            return;
        }

        compQueue.innerHTML = ''; 
        distinctOrderIds.forEach(id => {
            const order = groupedOrders[id];
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--bg-container); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 8px; border-left: 5px solid #10b981; opacity:0.8;';
            
            const shortDate = new Date(order.sale_date).toLocaleDateString();
            const completedString = order.completed_at ? new Date(order.completed_at).toLocaleString() : 'Legacy Archive (No Time Lock)';
            
            const itemsPreview = order.items.map(i => {
                const qaTime = i.qa_cleared_at ? new Date(i.qa_cleared_at).toLocaleTimeString() : 'N/A';
                let telHtml = '';
                if(i.telemetry && i.telemetry.length > 0) {
                    let safeT = JSON.stringify(i.telemetry).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                    telHtml = `<button onclick="openPackerzAuditLog('${i.sku}', '${safeT}')" style="margin-top:6px; font-size:9px; font-weight:900; background:#10b981; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">VIEW AUDIT LOG</button>`;
                }
                
                return `<div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px; margin-bottom:5px;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-size:11px;"><b>${i.qty}x</b> ${i.recipe}</span>
                                ${telHtml}
                            </div>
                            <span style="font-size:9px; color:#10b981; font-family:monospace; background:rgba(16,185,129,0.1); padding:2px 6px; border-radius:4px;">QA: ${qaTime}</span>
                        </div>`;
            }).join('');
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid rgba(16,185,129,0.2); padding-bottom:8px; margin-bottom:4px;">
                    <div style="display:flex; flex-direction:column;">
                        <strong style="color:var(--text-heading); font-size:14px; font-weight:900;">ORDER ${order.order_id}</strong>
                        <span style="font-size:9px; color:var(--text-muted); font-family:monospace; margin-top:2px;">Closed: ${completedString}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        <span style="font-size:10px; color:#10b981; font-weight:900; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:6px;">${shortDate}</span>
                        <button onclick="unarchivePackerzOrder('${order.order_id}')" style="background:#ef4444; color:white; border:none; padding:3px 8px; border-radius:4px; font-size:9px; font-weight:bold; cursor:pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">UNARCHIVE</button>
                    </div>
                </div>
                <div style="color:var(--text-muted); font-weight:700; background:var(--bg-panel); padding:10px; border-radius:8px;">
                    ${itemsPreview}
                </div>
            `;
            compQueue.appendChild(card);
        });

    } catch (err) {
        console.error("PACKERZ Archive Error:", err);
    }
}

// ============================================================
// BARCODE UTILITIES — deterministic NGZ-slug from item name
// ============================================================

function getItemBarcodeValue(itemName) {
    // e.g. 'SK8Lytz Unit' → 'NGZ-SK8LYTZ-UNIT'
    return 'NGZ-' + String(itemName).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Track scan confirmations per session (reset on modal open)
const scanConfirmations = new Map(); // rowId → true/false

function openPackerzSopTerminal(orderGroup) {
    const activeQueue = document.getElementById('packerzActiveQueue');
    if (!activeQueue) return;

    let itemsHtml = orderGroup.items.map(i => `
        <div id="qa-row-${orderGroup.order_id}-${i.sku}" data-qa-passed="false" style="background:var(--bg-body); border:1px solid var(--border-color); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:15px;">
            <div style="flex-grow:1; min-width:0;">
                <span style="font-weight:900; color:var(--text-heading); font-size:13px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${i.recipe}</span>
                <span style="font-size:11px; color:var(--text-muted); font-family:monospace; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Source Alias: ${i.sku || 'N/A'}</span>
            </div>
            <div style="background:#10b981; color:white; font-weight:900; font-size:14px; padding:6px 14px; border-radius:6px; flex-shrink:0;">${i.qty}</div>
            <button id="qa-btn-${orderGroup.order_id}-${i.sku}" style="padding:6px 15px; background:#3b82f6; color:#fff; border:none; border-radius:6px; font-weight:800; font-size:11px; cursor:pointer; flex-shrink:0; width:auto;" onclick="loadPackerzActiveSOP('${orderGroup.order_id}', '${i.sku}', '${i.recipe.replace(/'/g,"\\'")}')">VIEW SOP: ${i.recipe.length > 20 ? i.recipe.substring(0,20)+'...' : i.recipe}</button>
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
        
        <button id="btnCompleteAssembly_${orderGroup.order_id}" style="width:100%; padding:16px; background:#F59E0B; color:white; border:none; border-radius:10px; font-weight:900; letter-spacing:1px; cursor:not-allowed; opacity:0.5; font-size:14px; transition:transform 0.2s; box-shadow:0 6px 20px rgba(245,158,11,0.3);">
            AWAITING QA CLEARANCE
        </button>
    </div>`;
    
    validatePackerzAssemblyButton(orderGroup.order_id);
}

function validatePackerzAssemblyButton(orderId) {
    const rows = document.querySelectorAll(`[id^="qa-row-${orderId}-"]`);
    let allPassed = true;
    rows.forEach(r => { if(r.getAttribute('data-qa-passed') !== 'true') allPassed = false; });
    
    const btn = document.getElementById(`btnCompleteAssembly_${orderId}`);
    if(btn) {
        if(allPassed) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.style.background = '#10b981';
            btn.style.boxShadow = '0 6px 20px rgba(16,185,129,0.3)';
            btn.innerText = 'ASSEMBLY COMPLETE';
            btn.onmouseover = () => btn.style.transform='scale(1.02)';
            btn.onmouseout = () => btn.style.transform='scale(1)';
            btn.onclick = () => executePackerzCompletion(orderId);
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.style.background = '#F59E0B';
            btn.style.boxShadow = '0 6px 20px rgba(245,158,11,0.3)';
            btn.innerText = 'AWAITING QA CLEARANCE';
            btn.onmouseover = null;
            btn.onmouseout = null;
            btn.onclick = null;
        }
    }
}

let currentPackerzQaOrderId = null;
let currentPackerzQaSku = null;

async function loadPackerzActiveSOP(orderId, sku, recipe) {
    currentPackerzQaOrderId = orderId;
    currentPackerzQaSku = sku;
    scanConfirmations.clear();
    
    document.getElementById('packerzSopViewerModal').style.display = 'flex';
    document.getElementById('packerzSopViewerTitle').innerHTML = `🎯 ACTIVE SOP: ${recipe}`;
    document.getElementById('packerzSopViewerSubtitle').innerText = `Target Alias: ${sku}`;
    
    const body = document.getElementById('packerzSopViewerBody');
    const qaList = document.getElementById('packerzSopViewerQAList');
    const btnSignoff = document.getElementById('btnPackerzSopSignoff');
    
    body.innerHTML = `<div style='padding:40px; text-align:center; color:#10b981; font-weight:900; font-style:italic;'>Fetching restricted SOP clearance logic from Supabase Edge...</div>`;
    qaList.innerHTML = '';
    btnSignoff.style.opacity = '0.5'; btnSignoff.style.cursor = 'not-allowed';
    btnSignoff.onclick = null;
    
    try {
        const { data, error } = await supabaseClient.from('pack_ship_sops').select('*').eq('internal_recipe_name', recipe).single();
        if(error || !data) throw new Error("No SOP Matrix officially bound to this Master Recipe.");
        
        const instructionJson = JSON.parse(data.instruction_json || '{"steps": [], "qaChecks": []}');
        const steps = instructionJson.steps || [];
        const qaChecks = instructionJson.qaChecks || [];
                 // 1. Render Read-Only Steps
          let h = '';
          
          let getDId = (u) => { let match = (u||'').match(/\/(?:file\/d\/|uc\?id=|open\?id=)([a-zA-Z0-9_-]+)/); return match ? match[1] : null; };
          
          steps.forEach((s, idx) => {
              let mediaHtml = '';
              [s.m1, s.m2, s.m3].forEach(m => {
                  if(m && m.url) {
                      let safeUrl = m.url.replace(/'/g, "\\'").replace(/"/g, '"');
                      let dId = getDId(m.url);
                      if (m.type === 'img') { 
                          mediaHtml += `<img loading="lazy" src="${safeUrl}" style="max-height:200px; max-width:100%; object-fit:contain; border-radius:8px; border:1px solid var(--border-color); cursor:zoom-in;" onclick="if(typeof openMediaModal==='function') openMediaModal('${safeUrl}', 'img')">`; 
                      } else { 
                          let isNativeVid = !dId && m.type === 'vid' && (safeUrl.includes('.mp4') || safeUrl.includes('.webm') || safeUrl.includes('supabase.co'));
                          if (isNativeVid) {
                              mediaHtml += `<div class="media-thumb" style="position:relative; background:#1e293b; border-radius:8px; overflow:hidden; border:1px solid var(--border-color); cursor:zoom-in;" onclick="if(typeof openMediaModal==='function') openMediaModal('${safeUrl}', 'vid')"><video preload="none" src="${safeUrl}" style="width:100%; height:100%; object-fit:cover; opacity:0;" muted playsinline></video><div style="position:absolute; inset:0; display:flex; justify-content:center; align-items:center; flex-direction:column; gap:8px;"><i class="fa-solid fa-play" style="font-size:32px; color:white; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i><span style="color:white; font-size:11px; font-weight:bold;">NATIVE VIDEO</span></div></div>`;
                          } else {
                              let mediaUrl = dId ? `https://drive.google.com/file/d/${dId}/preview` : safeUrl; 
                              if (mediaUrl.includes('sharepoint.com') && !mediaUrl.includes('action=embedview')) mediaUrl += (mediaUrl.includes('?') ? '&' : '?') + 'action=embedview';
                              mediaHtml += `<div class="media-thumb" style="position:relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); cursor: zoom-in;" onclick="if(typeof openMediaModal==='function') openMediaModal('${mediaUrl}', 'iframe')"><iframe loading="lazy" src="${mediaUrl}" style="width: 100%; height: 100%; border: none; pointer-events: none;"></iframe></div>`; 
                          }
                      }
                  }
              });
              
              h += `
              <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:12px; padding:20px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                  <div style="font-size:11px; font-weight:900; color:#F59E0B; margin-bottom:10px; letter-spacing:1px;">PROCEDURE STEP ${idx+1}</div>
                  <div class="sop-text-rich" style="font-size:15px; line-height:1.5;">${s.text || ''}</div>
                  ${mediaHtml ? `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed var(--border-color); display:flex; gap:15px; flex-wrap:wrap;">${mediaHtml}</div>` : ''}
              </div>`;
          });         
        
        if(steps.length === 0) h = `<div style="padding:20px; color:var(--text-muted); font-style:italic;">No visual steps configured. Proceed strictly to QA Checks.</div>`;
        
        if(data.required_box_sku) {
            h = `<div style="background:rgba(245,158,11,0.1); border:1px solid #F59E0B; border-radius:12px; padding:20px; margin-bottom:10px;">
                <div style="font-size:11px; font-weight:900; color:#F59E0B; margin-bottom:5px; letter-spacing:1px;">REQUIRED SHIPPING HARNESS</div>
                <div style="font-size:18px; font-weight:900; color:var(--text-heading); font-family:monospace;">📦 ${data.required_box_sku}</div>
            </div>` + h;
        }
        body.innerHTML = h;
        
        // 2. Render Checkboxes
        if(qaChecks.length === 0) {
            qaList.innerHTML = `<div style="color:var(--text-muted); font-size:12px; font-style:italic;">No custom QA parameters required for this module. Free clear.</div>`;
            checkPackerzSopSignoffState(); // Automatically unlocks button
        } else {
            let html = '';
            
            function parseInputs(text) {
                return text.replace(/\[INPUT\]/gi, `<input type="text" onclick="event.stopPropagation()" class="packerz-qa-input" placeholder="..." style="padding:2px 6px; border-radius:4px; background:rgba(0,0,0,0.3); border:1px solid var(--border-input); color:#10b981; font-family:monospace; font-size:11px; width:100px; text-transform:uppercase; margin:0 6px;" onkeyup="checkPackerzSopSignoffState()">`);
            }
            
            function parseInlineMedia(text) {
                text = text.replace(/\[PDF:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
                    const safe = url.replace(/'/g, "\\'");
                    return `<button type="button" onclick="window.open('${safe}','_blank'); event.preventDefault(); event.stopPropagation();" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">📄 View PDF</button>`;
                });
                text = text.replace(/\[VID:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
                    const safe = url.replace(/'/g, "\\'");
                    return `<button type="button" onclick="openMediaModal('${safe}', 'vid'); event.preventDefault(); event.stopPropagation();" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">🎥 Play Video</button>`;
                });
                text = text.replace(/\[IMG:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
                    const safe = url.replace(/'/g, "\\'");
                    if(url.toLowerCase().endsWith('.pdf')) {
                       return `<button type="button" onclick="window.open('${safe}','_blank'); event.preventDefault(); event.stopPropagation();" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">📄 View PDF</button>`;
                    }
                    if(url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
                       return `<button type="button" onclick="openMediaModal('${safe}', 'vid'); event.preventDefault(); event.stopPropagation();" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">🎥 Play Video</button>`;
                    }
                    return `<img src="${url}" loading="lazy" style="max-height:100px; max-width:100%; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in; margin:4px 2px; display:inline-block; vertical-align:middle;" onclick="openMediaModal('${safe}', 'img'); event.preventDefault(); event.stopPropagation();">`;
                });
                text = text.replace(/\[SCAN:([^\]]+)\]/gi, (_, val) => {
                    return `<span style="background:rgba(14,165,233,0.15); border:1px solid #0ea5e9; color:#0ea5e9; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:800; white-space:nowrap; margin:0 4px; vertical-align:middle;">📷 SCAN: ${val.trim()}</span>`;
                });
                text = text.replace(/\[BARCODE:([^\]]+)\]/gi, (_, val) => {
                    const id = `sop-bc-live-${Math.random().toString(36).slice(2,8)}`;
                    return `<svg id="${id}" data-value="${val.trim()}" class="sop-barcode-svg" style="max-width:150px; background:white; padding:4px; border-radius:4px; display:inline-block; vertical-align:middle; margin:0 4px;"></svg>`;
                });
                text = text.replace(/\[QR:([^\]]+)\]/gi, (_, val) => {
                    const id = `sop-qr-live-${Math.random().toString(36).slice(2,8)}`;
                    return `<canvas id="${id}" data-value="${val.trim()}" class="sop-qr-canvas" style="border-radius:4px; display:inline-block; vertical-align:middle; margin:0 4px; width:45px!important; height:45px!important;"></canvas>`;
                });
                return text;
            }
            
            qaChecks.forEach((line) => {
                let q = line.trim();
                if(!q) return;
                
                // ── [SCAN:itemName] ──────────────────────────────────
                if (/^\[SCAN:(.+)\]$/i.test(q)) {
                    const itemName = q.match(/^\[SCAN:(.+)\]$/i)[1].trim();
                    const expected = getItemBarcodeValue(itemName);
                    const safeItem = itemName.replace(/"/g, '&quot;');
                    const rowId = `scan-${Math.random().toString(36).slice(2,8)}`;
                    scanConfirmations.set(rowId, false);
                    html += `
                        <div id="scanrow-${rowId}" class="packerz-scan-row" data-expected="${expected}" data-confirmed="false"
                             style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; padding:10px 12px; transition:border-color 0.3s;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                                    <canvas id="scan-qr-${rowId}" width="56" height="56" style="border-radius:4px; flex-shrink:0;"></canvas>
                                    <div style="min-width:0;">
                                        <div style="font-size:12px; font-weight:900; color:var(--text-heading); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📦 ${safeItem}</div>
                                        <div style="font-size:10px; font-family:monospace; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${expected}</div>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                                    <span id="scan-status-${rowId}" style="font-size:11px; color:#ef4444; font-weight:700;">⏳ Unscan</span>
                                    <button id="scan-btn-${rowId}" onclick="openCameraScanner('${expected}', '${rowId}', '${safeItem}')" style="padding:6px 10px; background:#0ea5e9; color:white; border:none; border-radius:6px; font-weight:800; font-size:11px; cursor:pointer; white-space:nowrap;">📷 SCAN</button>
                                </div>
                            </div>
                        </div>`;
                    return;
                }

                if (q.startsWith('[INPUT]') && q.match(/\[INPUT\]/gi).length === 1 && q.indexOf('[INPUT]') === 0) {
                    let label = q.replace(/\[INPUT\]/ig, '').trim();
                    let safeLabel = label.replace(/"/g, '&quot;');
                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px; margin-bottom:2px; padding:4px 8px; background:var(--bg-panel); border:1px solid var(--border-color); border-radius:4px;">
                            <label style="font-size:10px; font-weight:900; color:#F59E0B; text-transform:uppercase; flex-shrink:0;">${label}</label>
                            <input type="text" class="packerz-qa-input" data-label="${safeLabel}" placeholder="..." style="flex:1; padding:4px; border-radius:4px; background:var(--bg-input); border:1px solid var(--border-color); color:#fff; font-family:monospace; font-size:11px;" onkeyup="checkPackerzSopSignoffState()">
                        </div>
                    `;
                } 
                else if (q.startsWith('# ')) {
                    let content = parseInlineMedia(parseInputs(q.substring(2).trim()));
                    html += `<div style="font-size:13px; font-weight:900; color:#10b981; margin-top:8px; border-bottom:1px solid rgba(16,185,129,0.3); padding-bottom:2px; margin-bottom:4px; display:flex; align-items:center; flex-wrap:wrap;">${content}</div>`;
                }
                else if (q.startsWith('> ')) {
                    let subQ = q.substring(2).trim();
                    let safeSubQ = subQ.replace(/"/g, '&quot;');
                    let content = parseInlineMedia(parseInputs(subQ));
                    html += `
                        <label style="display:flex; align-items:center; flex-wrap:wrap; gap:6px; font-size:11px; font-weight:600; color:var(--text-muted); cursor:pointer; padding:2px 8px 2px 28px; margin-bottom:0; border-radius:4px; transition:all 0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.05)'" onmouseout="this.style.background='transparent'">
                            <input type="checkbox" class="packerz-qa-check" data-label="${safeSubQ}" style="width:12px; height:12px; flex-shrink:0; cursor:pointer;" onchange="checkPackerzSopSignoffState()">
                            <span style="display:flex; align-items:center; flex-wrap:wrap;">${content}</span>
                        </label>
                    `;
                }
                else {
                    if(q.startsWith('- ')) q = q.substring(2).trim();
                    let safeQ = q.replace(/"/g, '&quot;');
                    let content = parseInlineMedia(parseInputs(q));
                    html += `
                        <label style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; font-size:12px; font-weight:700; color:var(--text-heading); cursor:pointer; padding:4px 8px; margin-bottom:0; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-panel); transition:all 0.2s;" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--border-color)'">
                            <input type="checkbox" class="packerz-qa-check" data-label="${safeQ}" style="width:14px; height:14px; flex-shrink:0; cursor:pointer;" onchange="checkPackerzSopSignoffState()">
                            <span style="display:flex; align-items:center; flex-wrap:wrap;">${content}</span>
                        </label>
                    `;
                }
            });
            qaList.innerHTML = html;
            
            // Hydrate scan row QR codes after innerHTML
            if (typeof QRCode !== 'undefined') {
                document.querySelectorAll('#packerzSopViewerQAList canvas[id^="scan-qr-"]').forEach(el => {
                    const rowId = el.id.replace('scan-qr-', '');
                    const row = document.getElementById(`scanrow-${rowId}`);
                    const value = row ? row.dataset.expected : 'NGZ';
                    QRCode.toCanvas(el, value, { width: 56, margin: 0, color: { dark: '#000', light: '#fff' } }).catch(() => {});
                });
                
                // Hydrate inline QR
                document.querySelectorAll('#packerzSopViewerQAList .sop-qr-canvas').forEach(el => {
                    try {
                        QRCode.toCanvas(el, el.dataset.value || 'https://neogleamz.com', {
                            margin: 1, width: 45, color: { dark: '#000', light: '#fff' }
                        }).catch(()=>{});
                    } catch(e) {}
                });
            }
            
            // Hydrate inline Barcodes
            if (typeof JsBarcode !== 'undefined') {
                document.querySelectorAll('#packerzSopViewerQAList .sop-barcode-svg').forEach(el => {
                    try {
                        JsBarcode(el, el.dataset.value || 'NEOGLEAMZ', {
                            format: 'CODE128', width: 1.5, height: 40,
                            displayValue: true, fontSize: 10, margin: 4,
                            lineColor: '#000', background: '#ffffff'
                        });
                    } catch (e) {
                        el.outerHTML = `<span style="color:#ef4444; font-size:10px;">⚠️ Barcode error</span>`;
                    }
                });
            }
            
            checkPackerzSopSignoffState(); // Initial check
        }

    } catch(err) {
        body.innerHTML = `<div style='padding:40px 20px; text-align:center; color:#ef4444; font-weight:900;'>SOP Hook Failed: ${err.message}<br><br><span style="color:var(--text-muted); font-size:12px; font-weight:normal;">If this item does not strictly require a physical procedure (e.g. Raw Materials or Legacy Orders), you may click COMPLETE below to securely bypass this check.</span></div>`;
        qaList.innerHTML = '';
        checkPackerzSopSignoffState();
    }
}

function checkPackerzSopSignoffState() {
    const checks = document.querySelectorAll('.packerz-qa-check');
    let allValid = true;
    checks.forEach(c => { if(!c.checked) allValid = false; });
    
    const inputs = document.querySelectorAll('.packerz-qa-input');
    inputs.forEach(i => { if(i.value.trim() === '') allValid = false; });
    
    // Gate on unconfirmed scan rows
    document.querySelectorAll('.packerz-scan-row').forEach(row => {
        if (row.dataset.confirmed !== 'true') allValid = false;
    });
    
    const btnSignoff = document.getElementById('btnPackerzSopSignoff');
    if(allValid) {
        btnSignoff.style.opacity = '1';
        btnSignoff.style.cursor = 'pointer';
        btnSignoff.onclick = signoffPackerzQA;
    } else {
        btnSignoff.style.opacity = '0.5';
        btnSignoff.style.cursor = 'not-allowed';
        btnSignoff.onclick = null;
    }
}

async function signoffPackerzQA() {
    if(!currentPackerzQaOrderId || !currentPackerzQaSku) return;
    
    // Snag telemetry object map
    let telemetryData = [];
    document.querySelectorAll('.packerz-qa-check').forEach(c => {
        telemetryData.push({ type: 'check', text: c.getAttribute('data-label'), valid: c.checked });
    });
    document.querySelectorAll('.packerz-qa-input').forEach(i => {
        telemetryData.push({ type: 'input', text: i.getAttribute('data-label'), value: i.value.trim() });
    });

    // Natively stamp the physical QA clearance via the Edge Ledger
    try {
        if(supabaseClient) {
            await supabaseClient.from('sales_ledger')
                .update({ 
                    qa_cleared_at: new Date().toISOString(),
                    qa_telemetry_data: JSON.stringify(telemetryData)
                })
                .eq('order_id', currentPackerzQaOrderId)
                .eq('storefront_sku', currentPackerzQaSku);
        }
        // Fire-and-forget: archive a full SOP snapshot at QA sign-off moment
        archiveSOPSnapshot(currentPackerzQaOrderId, currentPackerzQaSku);
    } catch(err) {
        console.warn("Audit tracking mathematically failed on the Edge.", err);
    }
    
    const rowId = `qa-row-${currentPackerzQaOrderId}-${currentPackerzQaSku}`;
    const btnId = `qa-btn-${currentPackerzQaOrderId}-${currentPackerzQaSku}`;
    
    const row = document.getElementById(rowId);
    if(row) {
        row.setAttribute('data-qa-passed', 'true');
        row.style.borderColor = '#10b981';
        row.style.background = 'rgba(16,185,129,0.05)';
        
        let qtyNode = row.querySelector('div:nth-child(2)');
        if(qtyNode) qtyNode.style.boxShadow = '0 0 10px rgba(16,185,129,0.5)';
    }
    
    const btn = document.getElementById(btnId);
    if(btn) {
        btn.innerText = 'QA PASSED ✓';
        btn.style.background = '#10b981';
        btn.style.color = 'white';
    }
    
    const capturedOrderId = currentPackerzQaOrderId;
    closePackerzSopViewer();
    validatePackerzAssemblyButton(capturedOrderId);
}

function closePackerzSopViewer() {
    document.getElementById('packerzSopViewerModal').style.display = 'none';
    currentPackerzQaOrderId = null;
    currentPackerzQaSku = null;
}

async function executePackerzCompletion(orderId) {
    if(!confirm(`Are you absolutely sure you want to officially mark Order ${orderId} as completely assembled?`)) return;
    
    try {
        const btn = document.getElementById(`btnCompleteAssembly_${orderId}`);
        if(btn) { btn.innerText = 'SYNCING SUPABASE CLOUD...'; btn.style.opacity = '0.7'; }

        // 1. Mutate the status flag to Completed globally across all grouped rows & timestamp it
        const { error } = await supabaseClient
            .from('sales_ledger')
            .update({ 
                internal_fulfillment_status: 'Completed',
                assembly_completed_at: new Date().toISOString()
            })
            .eq('order_id', orderId);

        if(error) throw error;

        // 2. Fetch specific line items for this order and structurally deduct (upsert) the Inventory ledger
        const { data: lineItems, error: itemsError } = await supabaseClient
            .from('sales_ledger')
            .select('internal_recipe_name, qty_sold')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        let invMap = {};
        lineItems.forEach(r => { let k = `RECIPE:::${r.internal_recipe_name}`; if(!invMap[k]) invMap[k] = (inventoryDB[k] ? inventoryDB[k].sold_qty : 0); invMap[k] += r.qty_sold; });
        let invPayload = Object.keys(invMap).map(k => {
            if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
            inventoryDB[k].sold_qty = invMap[k];
            return { item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty };
        });

        if (invPayload.length > 0) {
            const { error: invError } = await supabaseClient.from('inventory_consumption').upsert(invPayload, {onConflict:'item_key'});
            if (invError) throw new Error("Inventory Deduction Error: " + invError.message);
        }

        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        
        // 2. Clear Active UI Node
        document.getElementById('packerzActiveQueue').innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic; opacity:0.6;">Select an order from the queue to functionally open the SOP terminal.</div>';
        
        // 3. Re-Sync Live Queue
        fetchUnfulfilledOrders();
        
} catch(err) {
        console.error("Completion Error", err);
        alert("CRITICAL ERROR: Failed to close out structural order constraints. \n" + err.message);
    }
}

async function unarchivePackerzOrder(orderId) {
    if(!confirm(`Are you absolutely sure you want to UNARCHIVE Order ${orderId} and return it to the active queue?`)) return;
    
    try {
        // 1. Fetch specific line items for this order and structurally refund (upsert) the Inventory ledger
        const { data: lineItems, error: itemsError } = await supabaseClient
            .from('sales_ledger')
            .select('internal_recipe_name, qty_sold')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        let invMap = {};
        lineItems.forEach(r => { let k = `RECIPE:::${r.internal_recipe_name}`; if(!invMap[k]) invMap[k] = (inventoryDB[k] ? inventoryDB[k].sold_qty : 0); invMap[k] -= r.qty_sold; });
        let invPayload = Object.keys(invMap).map(k => {
            if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
            inventoryDB[k].sold_qty = invMap[k];
            return { item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty };
        });

        if (invPayload.length > 0) {
            const { error: invError } = await supabaseClient.from('inventory_consumption').upsert(invPayload, {onConflict:'item_key'});
            if (invError) throw new Error("Inventory Refund Error: " + invError.message);
        }

        if (typeof renderInventoryTable === 'function') renderInventoryTable();

        const { error } = await supabaseClient
            .from('sales_ledger')
            .update({ 
                internal_fulfillment_status: 'Awaiting Assembly',
                assembly_completed_at: null
            })
            .eq('order_id', orderId);

        if(error) throw error;

        // Re-Sync Live Queues
        if (typeof fetchUnfulfilledOrders === 'function') fetchUnfulfilledOrders();
        fetchPackerzCompletedOrders();
        
    } catch(err) {
        console.error("Unarchive Error", err);
        alert("CRITICAL ERROR: Failed to unarchive order. \n" + err.message);
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
            <button class="icon-btn btn-icon-sq" style="border:none; background:var(--bg-input);" onclick="movePackerzSOPUp(this)">▲</button>
            <button class="icon-btn btn-icon-sq" style="border:none; background:var(--bg-input);" onclick="movePackerzSOPDown(this)">▼</button>
            <button class="icon-btn btn-icon-sq" style="font-size:16px; font-weight:900; border:none; background:#3b82f6; color:white; margin-top:auto;" onclick="addPackerzSOPRow(this)">+</button>
            <button class="btn-red icon-btn btn-icon-sq" style="margin-top:5px;" onclick="removePackerzSOPRow(this)">✕</button>
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
                <span style="color:var(--border-input); margin:0 4px;">|</span>
                <input type="color" onchange="document.execCommand('foreColor', false, this.value)" title="Text Color" style="width:24px; height:24px; padding:0; border:none; cursor:pointer; background:transparent;">
                <select onchange="document.execCommand('fontSize', false, this.value)" style="width:auto; padding:4px; font-size:12px; border:1px solid var(--border-input); border-radius:4px; background:var(--bg-input); color:var(--text-main);">
                    <option value="3">Normal Font</option>
                    <option value="4">Large Font</option>
                    <option value="5">Huge Font</option>
                </select>
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
            let sorted = Object.keys(productsDB).sort();
            let retail  = sorted.filter(p => !isSubassemblyDB[p] && !(productsDB[p] && productsDB[p].is_3d_print) && !(productsDB[p] && productsDB[p].is_label));
            let subs    = sorted.filter(p =>  isSubassemblyDB[p] && !(productsDB[p] && productsDB[p].is_3d_print) && !(productsDB[p] && productsDB[p].is_label));
            let prints  = sorted.filter(p => productsDB[p] && productsDB[p].is_3d_print && !(productsDB[p] && productsDB[p].is_label));
            const grp = (label, icon, arr) => arr.length ? `<optgroup label="${label}">${arr.map(p => `<option value="${String(p).replace(/"/g,'&quot;')}">${icon} ${p}</option>`).join('')}</optgroup>` : '';
            opts += grp('📦 RETAIL PRODUCTS', '📦', retail);
            opts += grp('⚙️ SUB-ASSEMBLIES',  '⚙️',  subs);
            opts += grp('🖨️ 3D PRINTS',       '🖨️',  prints);
            ddl.innerHTML = opts;
        } else {
            ddl.innerHTML = '<option value="">CRITICAL: global productsDB undefined in namespace</option>';
        }
    } catch(e) { console.error('PACKERZ Config Error:', e); }
}

// Hook it universally!
setTimeout(initPackerzAdmin, 1500);

async function filterPackerzAdminDropdown() {
    let p = document.getElementById('packerzAdminRecipeSelect').value;
    loadPackerzSopFromDB();
}

function openPackerzAuditLog(sku, telemetryJsonString) {
    let data;
    try { data = JSON.parse(telemetryJsonString); } catch(e) { return alert("Corrupted Audit Log"); }
    
    let h = `
        <div id="packerzAuditOverlay" class="modal-overlay active">
            <div style="background:var(--bg-container); border:1px solid #10b981; border-radius:12px; width:clamp(320px, 90vw, 500px); max-height:90vh; padding:25px; box-shadow:0 10px 40px rgba(16,185,129,0.2); display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(16,185,129,0.3); padding-bottom:10px; margin-bottom:15px;">
                    <h3 style="margin:0; font-size:16px; color:#10b981; font-weight:900;">QA AUDIT LOG</h3>
                    <button class="icon-btn" onclick="document.getElementById('packerzAuditOverlay').remove()" style="color:var(--text-muted); font-size:16px; font-weight:bold; border:1px solid var(--border-color);">✕</button>
                </div>
                <div style="font-size:11px; margin-bottom:15px; color:var(--text-muted); font-family:monospace;">Item ID: ${sku}</div>
                <div style="overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:5px;">
    `;
    
    data.forEach(d => {
        if(d.type === 'check') {
            h += `<div style="display:flex; align-items:flex-start; gap:8px; font-size:13px; color:var(--text-heading); background:rgba(255,255,255,0.02); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);"><span style="color:#10b981; font-size:14px; margin-top:-1px;">✅</span><span>${d.text}</span></div>`;
        } else if(d.type === 'input') {
            h += `<div style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.2); border-radius:6px; padding:10px;">
                    <div style="font-size:10px; color:#F59E0B; font-weight:900; text-transform:uppercase;">${d.text}</div>
                    <div style="font-size:14px; color:white; font-family:monospace; margin-top:5px; font-weight:700;">${d.value}</div>
                  </div>`;
        }
    });
    
    h += `</div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', h);
}

function renderPackerzTelemetryPreview() {
    const rawText = document.getElementById('packerzAdminQA')?.value || '';
    const previewContainer = document.getElementById('packerzAdminQAPreview');
    if(!previewContainer) return;

    if(!rawText.trim()) {
        previewContainer.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic;">Type in the telemetry editor to preview elements.</div>`;
        return;
    }

    const qaChecks = rawText.split('\n').filter(x => x.trim() !== '');
    let html = '';

    // --- Inline token parsers ---

    // [INPUT] → small text input inline
    function parseInputs(text) {
        return text.replace(/\[INPUT\]/gi, `<input type="text" disabled placeholder="..." style="padding:2px 6px; border-radius:4px; background:rgba(0,0,0,0.3); border:1px solid var(--border-input); color:#10b981; font-family:monospace; font-size:11px; width:100px; text-transform:uppercase; margin:0 6px;">`);
    }

    // Advanced universal media parser: intercepts accidental img tags pointing to pdf/mp4 and forces them into native buttons
    function parseImgs(text) {
        text = text.replace(/\[PDF:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
            const safe = url.replace(/'/g, "\\'");
            return `<button type="button" onclick="window.open('${safe}','_blank'); event.preventDefault(); event.stopPropagation();" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">📄 View PDF</button>`;
        });
        text = text.replace(/\[VID:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
            const safe = url.replace(/'/g, "\\'");
            return `<button type="button" onclick="openMediaModal('${safe}', 'vid'); event.preventDefault(); event.stopPropagation();" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">🎥 Play Video</button>`;
        });
        text = text.replace(/\[IMG:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
            const safe = url.replace(/'/g, "\\'");
            if(url.toLowerCase().endsWith('.pdf')) {
               return `<button type="button" onclick="window.open('${safe}','_blank'); event.preventDefault(); event.stopPropagation();" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">📄 View PDF</button>`;
            }
            if(url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
               return `<button type="button" onclick="openMediaModal('${safe}', 'vid'); event.preventDefault(); event.stopPropagation();" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">🎥 Play Video</button>`;
            }
            return `<img src="${url}" loading="lazy" style="max-height:100px; max-width:100%; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in; margin:4px 2px; display:inline-block; vertical-align:middle;" onclick="openMediaModal('${safe}', 'img'); event.preventDefault(); event.stopPropagation();">`;
        });
        return text;
    }

    // [BARCODE:value] → SVG placeholder (hydrated after innerHTML set)
    let barcodeIdx = 0;
    function parseBarcodes(text) {
        return text.replace(/\[BARCODE:([^\]]+)\]/gi, (_, val) => {
            const id = `sop-bc-${barcodeIdx++}`;
            return `<svg id="${id}" data-value="${val.trim()}" class="sop-barcode-svg" style="max-width:220px; background:white; padding:6px 8px; border-radius:6px; display:block; margin:4px 0;"></svg>`;
        });
    }

    // [QR:value] → canvas placeholder (hydrated after innerHTML set)
    let qrIdx = 0;
    function parseQR(text) {
        return text.replace(/\[QR:([^\]]+)\]/gi, (_, val) => {
            const id = `sop-qr-${qrIdx++}`;
            return `<canvas id="${id}" data-value="${val.trim()}" class="sop-qr-canvas" style="border-radius:6px; display:block; margin:4px 0;"></canvas>`;
        });
    }

    // [SCAN:item] → pill placeholder (inline)
    function parseScan(text) {
        return text.replace(/\[SCAN:([^\]]+)\]/gi, (_, val) => {
            return `<span style="background:rgba(14,165,233,0.15); border:1px solid #0ea5e9; color:#0ea5e9; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:800; white-space:nowrap; margin:0 4px; vertical-align:middle;">📷 SCAN: ${val.trim()}</span>`;
        });
    }

    // Apply all inline parsers in order
    function parseAll(text) {
        return parseQR(parseBarcodes(parseImgs(parseInputs(parseScan(text)))));
    }

    qaChecks.forEach((line) => {
        let q = line.trim();
        if(!q) return;

        // Standalone [IMG:url] line — display as full-width image block
        if (/^\[IMG:(https?:\/\/[^\]]+)\]$/i.test(q)) {
            const url = q.match(/\[IMG:(https?:\/\/[^\]]+)\]/i)[1];
            const safe = url.replace(/'/g, "\\'");
            html += `<div style="margin:4px 0;"><img src="${url}" loading="lazy" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid var(--border-color); cursor:zoom-in;" onclick="openMediaModal('${safe}', 'img')"></div>`;
            return;
        }

        // Standalone [BARCODE:val] line
        if (/^\[BARCODE:([^\]]+)\]$/i.test(q)) {
            const val = q.match(/\[BARCODE:([^\]]+)\]/i)[1].trim();
            const id = `sop-bc-${barcodeIdx++}`;
            html += `<div style="margin:4px 0; padding:8px; background:white; border-radius:8px; display:inline-block;"><svg id="${id}" data-value="${val}" class="sop-barcode-svg"></svg></div>`;
            return;
        }

        // Standalone [QR:val] line
        if (/^\[QR:([^\]]+)\]$/i.test(q)) {
            const val = q.match(/\[QR:([^\]]+)\]/i)[1].trim();
            const id = `sop-qr-${qrIdx++}`;
            html += `<div style="margin:4px 0;"><canvas id="${id}" data-value="${val}" class="sop-qr-canvas"></canvas></div>`;
            return;
        }

        // [INPUT]-only standalone row
        if (q.startsWith('[INPUT]') && q.match(/\[INPUT\]/gi).length === 1 && q.indexOf('[INPUT]') === 0) {
            let label = q.replace(/\[INPUT\]/ig, '').trim();
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px; margin-bottom:2px; padding:4px 8px; background:var(--bg-panel); border:1px solid var(--border-color); border-radius:4px;">
                    <label style="font-size:10px; font-weight:900; color:#F59E0B; text-transform:uppercase; flex-shrink:0;">${label}</label>
                    <input type="text" disabled placeholder="..." style="flex:1; padding:4px; border-radius:4px; background:var(--bg-input); border:1px solid var(--border-color); color:#fff; font-family:monospace; font-size:11px;">
                </div>
            `;
        }
        else if (q.startsWith('# ')) {
            let content = parseAll(q.substring(2).trim());
            html += `<div style="font-size:13px; font-weight:900; color:#10b981; margin-top:8px; border-bottom:1px solid rgba(16,185,129,0.3); padding-bottom:2px; margin-bottom:4px; display:flex; align-items:center; flex-wrap:wrap;">${content}</div>`;
        }
        else if (q.startsWith('> ')) {
            let content = parseAll(q.substring(2).trim());
            html += `
                <label style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px; font-size:11px; font-weight:600; color:var(--text-muted); cursor:pointer; padding:2px 8px 2px 28px; margin-bottom:0; border-radius:4px; transition:all 0.2s;" onmouseover="this.style.background='rgba(16,185,129,0.05)'" onmouseout="this.style.background='transparent'">
                    <input type="checkbox" disabled style="width:12px; height:12px; flex-shrink:0; cursor:pointer; margin-top:2px;">
                    <span style="display:flex; align-items:flex-start; flex-wrap:wrap; flex-direction:column;">${content}</span>
                </label>
            `;
        }
        else {
            if(q.startsWith('- ')) q = q.substring(2).trim();
            let content = parseAll(q);
            html += `
                <label style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:8px; font-size:12px; font-weight:700; color:var(--text-heading); cursor:pointer; padding:4px 8px; margin-bottom:0; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-panel); transition:all 0.2s;" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--border-color)'">
                    <input type="checkbox" disabled style="width:14px; height:14px; flex-shrink:0; cursor:pointer; margin-top:2px;">
                    <span style="display:flex; align-items:flex-start; flex-wrap:wrap; flex-direction:column;">${content}</span>
                </label>
            `;
        }
    });

    previewContainer.innerHTML = html;

    // --- Hydrate barcodes (JsBarcode) ---
    if (typeof JsBarcode !== 'undefined') {
        previewContainer.querySelectorAll('.sop-barcode-svg').forEach(el => {
            try {
                JsBarcode(el, el.dataset.value || 'NEOGLEAMZ', {
                    format: 'CODE128', width: 1.8, height: 50,
                    displayValue: true, fontSize: 11, margin: 6,
                    lineColor: '#000', background: '#ffffff'
                });
            } catch(e) { el.outerHTML = `<span style="color:#ef4444;font-size:11px;">⚠️ Barcode error: ${e.message}</span>`; }
        });
    }

    // --- Hydrate QR codes (qrcode.js) ---
    if (typeof QRCode !== 'undefined') {
        previewContainer.querySelectorAll('.sop-qr-canvas').forEach(el => {
            QRCode.toCanvas(el, el.dataset.value || 'https://neogleamz.com', { width: 90, margin: 1, color: { dark: '#000', light: '#fff' } })
                .catch(e => { el.outerHTML = `<span style="color:#ef4444;font-size:11px;">⚠️ QR error: ${e.message}</span>`; });
        });
    }
}


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
            if(typeof renderPackerzTelemetryPreview === 'function') renderPackerzTelemetryPreview();
        } else {
            document.getElementById('packerzAdminBoxSku').value = '';
            document.getElementById('packerzAdminQA').value = '';
            if(typeof renderPackerzTelemetryPreview === 'function') renderPackerzTelemetryPreview();
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

        let rawQa = document.getElementById('packerzAdminQA').value;
        let qaLines = rawQa.trim() === '' ? [] : rawQa.split('\n').map(l=>l.trim());
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

// --- PACKERZ ADMIN: UI Split Pane Resizer ---
let isPackerzResizing = false;

function initPackerzSopResize(e) {
    isPackerzResizing = true;
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', doPackerzSopResize);
    document.addEventListener('mouseup', stopPackerzSopResize);
}

function doPackerzSopResize(e) {
    if(!isPackerzResizing) return;
    const wrapper = document.getElementById('packerzSopSplitWrapper');
    const leftPane = document.getElementById('packerzSopLeftPane');
    if(!wrapper || !leftPane) return;
    
    const rect = wrapper.getBoundingClientRect();
    // 30 is the left padding on the wrapper, minus it strictly
    let newWidth = e.clientX - rect.left - 30; 
    let minWidth = 300;
    
    const maxAvailable = rect.width - 60; // subtracting l/r padding 30*2
    if(newWidth < minWidth) newWidth = minWidth;
    if(newWidth > maxAvailable - minWidth) newWidth = maxAvailable - minWidth;
    
    let percentage = (newWidth / maxAvailable) * 100;
    leftPane.style.flex = `0 0 ${percentage}%`;
}

function stopPackerzSopResize() {
    isPackerzResizing = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', doPackerzSopResize);
    document.removeEventListener('mouseup', stopPackerzSopResize);
}

// --- PACKERZ LIVE: SOP Viewer Split Pane Resizer ---
let isPackerzLiveResizing = false;

function initPackerzLiveSopResize(e) {
    isPackerzLiveResizing = true;
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', doPackerzLiveSopResize);
    document.addEventListener('mouseup', stopPackerzLiveSopResize);
}

function doPackerzLiveSopResize(e) {
    if(!isPackerzLiveResizing) return;
    const wrapper = document.getElementById('packerzLiveSopSplitWrapper');
    const leftPane = document.getElementById('packerzLiveSopLeftPane');
    if(!wrapper || !leftPane) return;
    
    const rect = wrapper.getBoundingClientRect();
    let newWidth = e.clientX - rect.left; 
    let minWidth = 280; // Standardized Fulfillz panel collision barrier
    
    if(newWidth < minWidth) newWidth = minWidth;
    if(newWidth > rect.width - 250) newWidth = rect.width - 250;
    
    // Aggressive flex overwrite matches the global standard exactly
    leftPane.style.width = newWidth + 'px';
    leftPane.style.minWidth = newWidth + 'px';
    leftPane.style.flex = `0 0 ${newWidth}px`;
}

function stopPackerzLiveSopResize() {
    isPackerzLiveResizing = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', doPackerzLiveSopResize);
    document.removeEventListener('mouseup', stopPackerzLiveSopResize);
}

// ============================================================
// SOP MEDIA PICKER — Supabase Storage 'sop-media' bucket
// ============================================================

const SOP_MEDIA_BUCKET = 'sop-media';
let currentSOPMediaFolder = '';   // '' = bucket root
let activeSOPTextAreaId = 'packerzAdminQA'; // Memory for multi-module targeting

async function openSOPMediaPicker(taId = 'packerzAdminQA') {
    activeSOPTextAreaId = taId;
    currentSOPMediaFolder = '';
    const modal = document.getElementById('sopMediaPickerModal');
    modal.style.display = 'flex';
    updateSOPMediaBreadcrumb();
    await refreshSOPMediaGrid();
}

function closeSOPMediaPicker() {
    document.getElementById('sopMediaPickerModal').style.display = 'none';
    // Reset upload input so same file can be re-uploaded
    const input = document.getElementById('sopMediaUploadInput');
    if (input) input.value = '';
}

async function refreshSOPMediaGrid() {
    const grid = document.getElementById('sopMediaGrid');
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">Loading...</div>`;
    updateSOPMediaBreadcrumb();

    try {
        const { data, error } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).list(currentSOPMediaFolder, {
            limit: 300, sortBy: { column: 'name', order: 'asc' }
        });
        if (error) throw error;

        const folders = (data || []).filter(f => f.id === null && f.name !== '.emptyFolderPlaceholder');
        const files   = (data || []).filter(f => f.id !== null && f.name !== '.emptyFolderPlaceholder');

        if (folders.length === 0 && files.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">${currentSOPMediaFolder ? 'This folder is empty.' : 'No files yet. Upload your first image above.'}</div>`;
            return;
        }
        grid.innerHTML = '';

        // Back-navigation card
        if (currentSOPMediaFolder) {
            const upCard = document.createElement('div');
            upCard.style.cssText = 'background:var(--bg-panel); border:1px dashed var(--border-color); border-radius:8px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:110px; gap:6px;';
            upCard.onmouseover = () => upCard.style.borderColor = '#0ea5e9';
            upCard.onmouseout  = () => upCard.style.borderColor = 'var(--border-color)';
            upCard.onclick = () => { const p = currentSOPMediaFolder.split('/'); p.pop(); navigateSOPMediaFolder(p.join('/')); };
            upCard.innerHTML = `<div style="font-size:28px; color:var(--text-muted);">⬆</div><div style="font-size:10px; color:var(--text-muted); font-weight:700;">Parent Folder</div>`;
            grid.appendChild(upCard);
        }

        // Folder cards
        folders.forEach(folder => {
            const fullPath = currentSOPMediaFolder ? `${currentSOPMediaFolder}/${folder.name}` : folder.name;
            const card = document.createElement('div');
            card.style.cssText = 'background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:110px; gap:6px; padding:8px; position:relative;';
            card.ondragover = (e) => { e.preventDefault(); card.style.borderColor = '#10b981'; card.style.backgroundColor = 'rgba(16,185,129,0.1)'; };
            card.ondragleave = (e) => { card.style.borderColor = 'var(--border-color)'; card.style.backgroundColor = 'var(--bg-panel)'; };
            card.ondrop = (e) => sopHandleDrop(e, fullPath);
            card.onmouseover = () => { card.style.borderColor = '#10b981'; card.style.transform = 'translateY(-2px)'; };
            card.onmouseout  = () => { card.style.borderColor = 'var(--border-color)'; card.style.transform = ''; };
            
            card.innerHTML = `
                <div style="font-size:36px;" onclick="navigateSOPMediaFolder('${fullPath.replace(/'/g, "\\'")}')">📁</div>
                <div style="font-size:10px; color:var(--text-muted); text-align:center; word-break:break-word; font-weight:700;" onclick="navigateSOPMediaFolder('${fullPath.replace(/'/g, "\\'")}')">${folder.name}</div>
                <button onclick="deleteSOPMedia('${fullPath.replace(/'/g, "\\'")}', true)" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.15); border:none; color:#ef4444; border-radius:4px; width:22px; height:22px; font-size:10px; cursor:pointer; display:flex; justify-content:center; align-items:center;" title="Delete Folder">🗑️</button>
            `;
            grid.appendChild(card);
        });

        // File cards
        files.forEach(file => {
            const filePath = currentSOPMediaFolder ? `${currentSOPMediaFolder}/${file.name}` : file.name;
            const { data: urlData } = supabaseClient.storage.from(SOP_MEDIA_BUCKET).getPublicUrl(filePath);
            const url = urlData.publicUrl;
            const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
            const sizeKb = file.metadata?.size ? Math.round(file.metadata.size / 1024) : '?';
            const card = document.createElement('div');
            card.draggable = true;
            card.ondragstart = (e) => sopHandleDragStart(e, filePath);
            card.style.cssText = 'background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; overflow:hidden; cursor:grab; transition:all 0.2s; display:flex; flex-direction:column; position:relative;';
            card.onmouseover = () => { card.style.borderColor = '#0ea5e9'; card.style.transform = 'translateY(-2px)'; };
            card.onmouseout  = () => { card.style.borderColor = 'var(--border-color)'; card.style.transform = ''; };
            
            const contentHtml = isImg
                ? `<img src="${url}" loading="lazy" style="width:100%; height:110px; object-fit:cover; pointer-events:none;"><div style="padding:6px 8px; font-size:10px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;" title="${file.name}">${file.name}</div><div style="padding:0 8px 6px; font-size:10px; color:var(--text-muted); pointer-events:none;">${sizeKb} KB</div>`
                : `<div style="height:110px; display:flex; align-items:center; justify-content:center; font-size:36px; pointer-events:none;">📄</div><div style="padding:6px 8px; font-size:10px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;">${file.name}</div><div style="padding:0 8px 6px; font-size:10px; color:var(--text-muted); pointer-events:none;">${sizeKb} KB</div>`;

            card.innerHTML = `
                <div style="flex-grow:1; display:flex; flex-direction:column;" onclick="insertSOPToken('[IMG:${url}]')">${contentHtml}</div>
                <button onclick="deleteSOPMedia('${filePath.replace(/'/g, "\\'")}', false)" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.85); border:1px solid #ef4444; color:white; border-radius:4px; width:22px; height:22px; font-size:10px; cursor:pointer; display:flex; justify-content:center; align-items:center; opacity:0.8;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'" title="Delete File">🗑️</button>
            `;
            grid.appendChild(card);
        });
    } catch(e) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:#ef4444; font-size:12px;">⚠️ Could not load media library: ${e.message}<br><span style="font-size:11px; color:var(--text-muted);">Ensure the '${SOP_MEDIA_BUCKET}' bucket exists with public read access.</span></div>`;
    }
}

async function uploadSOPMedia(file) {
    if (!file) return;

    // Strict web-safe extensions check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        alert(`UPLOAD REJECTED: Unsupported File Format.\n\nOnly standard web formats are supported:\n- Images: JPG, PNG, WEBP, GIF, SVG\n- Videos: MP4, WEBM\n- Documents: PDF\n\nExtensions like .AVI, .TIF, or .MOV are generally incompatible with browser playback and restricted by the media bucket.`);
        const input = document.getElementById('sopMediaUploadInput');
        if (input) input.value = '';
        return;
    }

    const statusEl = document.getElementById('sopMediaUploadStatus');
    statusEl.style.display = 'block';
    statusEl.style.color = '#0ea5e9';
    statusEl.innerText = `⬆ Uploading ${file.name}...`;

    try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const path = currentSOPMediaFolder ? `${currentSOPMediaFolder}/${fileName}` : fileName;
        const { error } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).upload(path, file, {
            cacheControl: '3600', upsert: false
        });
        if (error) throw error;

        const { data: urlData } = supabaseClient.storage.from(SOP_MEDIA_BUCKET).getPublicUrl(path);
        statusEl.innerText = `✅ Uploaded${currentSOPMediaFolder ? ' to ' + currentSOPMediaFolder : ''} — inserting token...`;
        insertSOPToken(`[IMG:${urlData.publicUrl}]`);
        setTimeout(() => { statusEl.style.display = 'none'; statusEl.style.color = '#0ea5e9'; }, 2500);
        await refreshSOPMediaGrid();
    } catch(e) {
        statusEl.style.color = '#ef4444';
        statusEl.innerText = `❌ Upload failed: ${e.message}`;
    }
}

// Inserts a token at the cursor position in the QA textarea
function insertSOPToken(token) {
    const ta = document.getElementById(activeSOPTextAreaId);
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);
    // Insert on its own line for block tokens
    const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
    const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');
    ta.value = before + (needsNewlineBefore ? '\n' : '') + token + (needsNewlineAfter ? '\n' : '') + after;
    ta.focus();
    
    if (activeSOPTextAreaId === 'packerzAdminQA' && typeof renderPackerzTelemetryPreview === 'function') {
        renderPackerzTelemetryPreview();
    } else if (activeSOPTextAreaId === 'productionAdminQA' && typeof renderProductionTelemetryPreview === 'function') {
        renderProductionTelemetryPreview();
    }
    
    closeSOPMediaPicker();
}

// ============================================================
// SOP MEDIA BROWSER — Folder Navigation & Guide
// ============================================================

function navigateSOPMediaFolder(path) {
    currentSOPMediaFolder = path;
    refreshSOPMediaGrid();
}

function updateSOPMediaBreadcrumb() {
    const el = document.getElementById('sopMediaBreadcrumb');
    if (!el) return;
    if (!currentSOPMediaFolder) {
        el.innerHTML = `<span style="color:#0ea5e9; font-weight:700;">📁 Root</span>`;
        return;
    }
    const parts = currentSOPMediaFolder.split('/');
    let html = `<span style="color:#0ea5e9; font-weight:700; cursor:pointer;" onclick="navigateSOPMediaFolder('')">📁 Root</span>`;
    let cum = '';
    parts.forEach((p, i) => {
        cum += (i === 0 ? '' : '/') + p;
        const cp = cum;
        const last = i === parts.length - 1;
        html += ` <span style="color:var(--text-muted); margin:0 2px;">›</span> `;
        html += last
            ? `<span style="color:var(--text-heading); font-weight:900;">${p}</span>`
            : `<span style="color:#0ea5e9; cursor:pointer;" onclick="navigateSOPMediaFolder('${cp}')">${p}</span>`;
    });
    el.innerHTML = html;
}

// ---- Drag and Drop Moving ----
function sopHandleDragStart(e, sourcePath) {
    e.dataTransfer.setData('text/plain', sourcePath);
    e.dataTransfer.setData('fulfillz-path', sourcePath);
}

async function sopHandleDrop(e, destFolder) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--border-color)';
    e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
    
    // Extract custom payload to bypass browser <img> URI-hijacks natively
    let sourcePath = e.dataTransfer.getData('fulfillz-path');
    if(!sourcePath) sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath || destFolder === undefined) return;
    
    // Prevent moving folder into itself etc..
    const fileName = sourcePath.split('/').pop();
    const destPath = destFolder ? `${destFolder}/${fileName}` : fileName;
    if (sourcePath === destPath) return;

    const statusEl = document.getElementById('sopMediaUploadStatus');
    statusEl.style.display = 'block';
    statusEl.style.color = '#f59e0b';
    statusEl.innerText = `📦 Relocating file to ${destFolder || 'Root'}...`;

    // Attempt native move (requires UPDATE RLS)
    const { error: moveError } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).move(sourcePath, destPath);
    let finalError = moveError?.message;

    // Fallback: If UPDATE policy blocks .move (Returns Object not found), execute Copy(INSERT) + Remove(DELETE)
    if (moveError) {
        statusEl.innerText = `📦 Native move blocked by Edge Policy. Attempting clone bypass...`;
        const { error: copyError } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).copy(sourcePath, destPath);
        if (!copyError) {
            await supabaseClient.storage.from(SOP_MEDIA_BUCKET).remove([sourcePath]);
            finalError = null; // Cleared error
        } else {
            finalError = copyError.message;
        }
    }

    if (finalError) { statusEl.style.color = '#ef4444'; statusEl.innerText = `❌ Move failed: ${finalError}`; return; }
    
    statusEl.style.color = '#10b981';
    statusEl.innerText = `✅ Moved successfully.`;
    setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
    await refreshSOPMediaGrid();
}

// ---- Deletion & Creation ----
async function deleteSOPMedia(path, isFolder) {
    if (!confirm(`⚠️ Are you sure you want to permanently delete:\n\n${path}\n\n${isFolder ? "This will instantly delete ALL files and folders inside it!" : ""}`)) return;

    const statusEl = document.getElementById('sopMediaUploadStatus');
    statusEl.style.display = 'block';
    statusEl.style.color = '#ef4444';
    statusEl.innerText = `🗑️ Deleting...`;

    let pathsToDelete = [path];

    if (isFolder) {
        // Fetch everything inside the folder to wipe it recursively
        pathsToDelete = [];
        const { data } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).list(path, { limit: 1000 });
        if (data && data.length > 0) {
            pathsToDelete = data.map(f => `${path}/${f.name}`);
        }
        // Also delete the placeholder itself just in case it wasn't caught
        pathsToDelete.push(`${path}/.emptyFolderPlaceholder`);
    }

    const { error } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).remove(pathsToDelete);
    
    if (error) { statusEl.innerText = `❌ Delete failed: ${error.message}`; return; }
    
    statusEl.style.color = '#10b981';
    statusEl.innerText = `✅ Deleted successfully.`;
    setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
    await refreshSOPMediaGrid();
}

async function createSOPMediaFolder() {
    const name = prompt('Enter folder name (letters, numbers, hyphens):');
    if (!name || !name.trim()) return;
    const safe = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!safe) { alert('Invalid folder name.'); return; }
    const fullPath = currentSOPMediaFolder ? `${currentSOPMediaFolder}/${safe}/.emptyFolderPlaceholder` : `${safe}/.emptyFolderPlaceholder`;
    const statusEl = document.getElementById('sopMediaUploadStatus');
    statusEl.style.display = 'block';
    statusEl.style.color = '#0ea5e9';
    statusEl.innerText = `📁 Creating folder "${safe}"...`;
    const blob = new Blob([''], { type: 'text/plain' });
    const { error } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).upload(fullPath, blob, { upsert: true });
    if (error) { statusEl.style.color = '#ef4444'; statusEl.innerText = `❌ Failed: ${error.message}`; return; }
    statusEl.innerText = `✅ Folder "${safe}" created`;
    setTimeout(() => { statusEl.style.display = 'none'; statusEl.style.color = '#0ea5e9'; }, 2000);
    await refreshSOPMediaGrid();
}

function openSOPTokenGuide()  { document.getElementById('sopTokenGuideModal').style.display = 'flex'; }
function closeSOPTokenGuide() { document.getElementById('sopTokenGuideModal').style.display = 'none'; }

// ============================================================
// SOP QA ARCHIVE — snapshot SOP at moment of QA sign-off
// Called from signoffPackerzQA() after sales_ledger update
// ============================================================

async function archiveSOPSnapshot(orderId, sku) {
    try {
        // Fetch the live SOP at the moment of sign-off
        const { data: sopData } = await supabaseClient
            .from('pack_ship_sops')
            .select('instruction_json, required_box_sku')
            .eq('internal_recipe_name', sku)
            .single();

        if (!sopData) return; // No SOP written yet — nothing to archive

        const telemetryData = [];
        document.querySelectorAll('.packerz-qa-check').forEach(c => {
            telemetryData.push({ type: 'check', text: c.getAttribute('data-label'), valid: c.checked });
        });
        document.querySelectorAll('.packerz-qa-input').forEach(i => {
            telemetryData.push({ type: 'input', text: i.getAttribute('data-label'), value: i.value.trim() });
        });

        await supabaseClient.from('sop_archives').insert({
            order_id: orderId,
            internal_recipe_name: sku,
            qa_passed_at: new Date().toISOString(),
            packer_telemetry: telemetryData,
            sop_snapshot: JSON.parse(sopData.instruction_json || '{}'),
            required_box_sku: sopData.required_box_sku || ''
        });
    } catch(e) {
        console.warn('SOP archive write failed (non-critical):', e.message);
        // Intentionally non-blocking — QA sign-off still completes even if archive fails
    }
}

// ============================================================
// SOP AUDIT LOG MODAL
// ============================================================

let sopAuditLogCache = [];

let sopAuditReturnToPackerz = false;

async function openSOPAuditLog(fromPackerzPage = false) {
    sopAuditReturnToPackerz = fromPackerzPage;
    document.getElementById('sopAuditLogModal').style.display = 'flex';
    await loadSOPAuditLog();
}

function closeSOPAuditLog() {
    document.getElementById('sopAuditLogModal').style.display = 'none';
    if (sopAuditReturnToPackerz) {
        sopAuditReturnToPackerz = false;
        document.getElementById('paneFulfillzSopAdmin').style.display = 'none';
    }
}

async function loadSOPAuditLog() {
    const body = document.getElementById('sopAuditLogBody');
    body.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading archive records...</div>`;

    try {
        const { data, error } = await supabaseClient
            .from('sop_archives')
            .select('*')
            .order('qa_passed_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        sopAuditLogCache = data || [];
        renderSOPAuditLogRows(sopAuditLogCache);
    } catch(e) {
        body.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">
            ⚠️ Could not load audit log: ${e.message}<br>
            <span style="font-size:11px; color:var(--text-muted);">Make sure the 'sop_archives' table exists in Supabase.</span>
        </div>`;
    }
}

function filterSOPAuditLog() {
    const q = (document.getElementById('sopAuditSearch')?.value || '').toLowerCase().trim();
    if (!q) { renderSOPAuditLogRows(sopAuditLogCache); return; }
    const filtered = sopAuditLogCache.filter(r =>
        (r.order_id || '').toLowerCase().includes(q) ||
        (r.internal_recipe_name || '').toLowerCase().includes(q)
    );
    renderSOPAuditLogRows(filtered);
}

function renderSOPAuditLogRows(rows) {
    const body = document.getElementById('sopAuditLogBody');
    if (!rows || rows.length === 0) {
        body.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">No QA archive records found yet. Records are created automatically when a QA sign-off is completed.</div>`;
        return;
    }

    body.innerHTML = rows.map((r, i) => {
        const dt = r.qa_passed_at ? new Date(r.qa_passed_at).toLocaleString() : 'Unknown';
        const telemetry = Array.isArray(r.packer_telemetry) ? r.packer_telemetry : [];
        const checks    = telemetry.filter(t => t.type === 'check');
        const inputs    = telemetry.filter(t => t.type === 'input');
        const passed    = checks.filter(c => c.valid).length;
        const total     = checks.length;

        return `
        <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
            <!-- Row header —— always visible -->
            <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; transition:background 0.2s;"
                 onclick="toggleSOPAuditDetail('sop-audit-detail-${i}')"
                 onmouseover="this.style.background='rgba(16,185,129,0.05)'" onmouseout="this.style.background=''">
                <div style="background:#10b981; color:white; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:900; flex-shrink:0;">✓ QA PASSED</div>
                <div style="font-weight:900; color:var(--text-heading); font-size:13px; flex:1;">${r.order_id || '—'}</div>
                <div style="font-size:12px; color:#0ea5e9; font-weight:700;">${r.internal_recipe_name || '—'}</div>
                <div style="font-size:11px; color:var(--text-muted);">${dt}</div>
                <div style="font-size:11px; color:${passed === total ? '#10b981' : '#f59e0b'}; font-weight:700;">${passed}/${total} checks</div>
                ${r.required_box_sku ? `<div style="font-size:10px; color:var(--text-muted); font-family:monospace;">📦 ${r.required_box_sku}</div>` : ''}
                <div style="color:var(--text-muted); font-size:12px;">▼</div>
            </div>

            <!-- Expandable detail -->
            <div id="sop-audit-detail-${i}" style="display:none; padding:16px; border-top:1px solid var(--border-color); background:var(--bg-body);">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <!-- Telemetry checks -->
                    <div>
                        <div style="font-size:11px; font-weight:900; color:#10b981; letter-spacing:1px; margin-bottom:8px;">TELEMETRY CHECKS</div>
                        ${checks.length === 0 ? '<div style="color:var(--text-muted); font-size:12px; font-style:italic;">None recorded</div>' :
                          checks.map(c => `<div style="font-size:12px; padding:3px 0; color:${c.valid ? '#10b981' : '#ef4444'};">${c.valid ? '✅' : '❌'} ${c.text || ''}</div>`).join('')}
                        ${inputs.length > 0 ? `<div style="font-size:11px; font-weight:900; color:#F59E0B; letter-spacing:1px; margin:10px 0 6px;">INPUT VALUES</div>
                        ${inputs.map(inp => `<div style="font-size:12px; padding:3px 0; color:var(--text-muted);">📝 ${inp.text}: <b style="color:var(--text-main); font-family:monospace;">${inp.value || '(blank)'}</b></div>`).join('')}` : ''}
                    </div>
                    <!-- SOP snapshot summary -->
                    <div>
                        <div style="font-size:11px; font-weight:900; color:#0ea5e9; letter-spacing:1px; margin-bottom:8px;">SOP SNAPSHOT AT TIME OF SIGNING</div>
                        <div style="font-size:11px; color:var(--text-muted); background:var(--bg-input); padding:10px; border-radius:6px; max-height:200px; overflow-y:auto; font-family:monospace; line-height:1.6;">
                            ${formatSOPSnapshotPreview(r.sop_snapshot)}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join("");
}

function toggleSOPAuditDetail(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function formatSOPSnapshotPreview(snapshot) {
    if (!snapshot) return '<span style="color:var(--text-muted);">No snapshot saved.</span>';
    try {
        const steps = snapshot.steps || [];
        const qa    = snapshot.qaChecks || [];
        let out = '';
        if (qa.length) out += qa.map(l => `<div style="color:#10b981;">${l}</div>`).join('');
        if (steps.length) out += `<div style="margin-top:6px; color:#0ea5e9;">${steps.length} packing step(s) recorded.</div>`;
        return out || '<span style="color:var(--text-muted);">Empty SOP snapshot.</span>';
    } catch(e) { return `<span style="color:#ef4444;">Parse error: ${e.message}</span>`; }
}

// ============================================================
// CAMERA SCANNER ENGINE — html5-qrcode
// ============================================================

let _html5QrScanner = null;     // active Html5Qrcode instance
let _activeScanRowId = null;    // which scan row is being confirmed

async function openCameraScanner(expectedValue, rowId, itemName) {
    _activeScanRowId = rowId;

    // Show the modal
    const modal = document.getElementById('sopCameraModal');
    modal.style.display = 'flex';
    document.getElementById('sopCameraItemName').innerText = itemName || expectedValue;
    document.getElementById('sopCameraExpected').innerText = `Expected: ${expectedValue}`;
    document.getElementById('sopCameraStatus').innerText = 'Point at the QR code on the bin label...';
    document.getElementById('sopCameraStatus').style.color = 'rgba(255,255,255,0.7)';

    // Clear previous reader instance
    if (_html5QrScanner) {
        try { await _html5QrScanner.stop(); } catch(e) {}
        _html5QrScanner = null;
    }
    // Clear the DOM element so html5-qrcode can re-mount
    const readerEl = document.getElementById('sopCameraReader');
    readerEl.innerHTML = '';

    try {
        _html5QrScanner = new Html5Qrcode('sopCameraReader');
        await _html5QrScanner.start(
            { facingMode: 'environment' },   // rear camera
            { fps: 12, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
            (decodedText) => handleScanResult(decodedText, expectedValue, rowId),
            () => {}  // suppress per-frame errors
        );
    } catch(err) {
        document.getElementById('sopCameraStatus').innerText = `❌ Camera error: ${err.message || err}`;
        document.getElementById('sopCameraStatus').style.color = '#ef4444';
    }
}

async function closeCameraScanner() {
    if (_html5QrScanner) {
        try { await _html5QrScanner.stop(); } catch(e) {}
        _html5QrScanner = null;
    }
    document.getElementById('sopCameraModal').style.display = 'none';
    document.getElementById('sopCameraReader').innerHTML = '';
    _activeScanRowId = null;
}

async function handleScanResult(decodedText, expectedValue, rowId) {
    const scanned = (decodedText || '').trim();
    const row     = document.getElementById(`scanrow-${rowId}`);
    const status  = document.getElementById(`scan-status-${rowId}`);
    const btn     = document.getElementById(`scan-btn-${rowId}`);

    if (scanned === expectedValue) {
        // ✅ Match — confirm the row
        closeCameraScanner();
        if (row)    { row.dataset.confirmed = 'true'; row.style.borderColor = '#10b981'; row.style.background = 'rgba(16,185,129,0.06)'; }
        if (status) { status.innerText = '✅ Confirmed'; status.style.color = '#10b981'; }
        if (btn)    { btn.innerText = '✓ SCANNED'; btn.style.background = '#10b981'; btn.disabled = true; }
        // Record in the telemetry Map
        scanConfirmations.set(rowId, true);
        checkPackerzSopSignoffState();
    } else {
        // ❌ Mismatch — flash warning, keep camera open
        const statusEl = document.getElementById('sopCameraStatus');
        if (statusEl) {
            statusEl.innerText = `⚠️ Wrong item — scanned: ${scanned}\nExpected: ${expectedValue}`;
            statusEl.style.color = '#ef4444';
            setTimeout(() => {
                statusEl.innerText = 'Point at the QR code on the bin label...';
                statusEl.style.color = 'rgba(255,255,255,0.7)';
            }, 2500);
        }
    }
}
