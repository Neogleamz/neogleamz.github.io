window.isPackerzLiveEditing = false;

// ==========================================
// NEXUZ: PACKERZ TERMINAL STYLE INJECTION
// ==========================================
function injectPackerzStyles() {
    if (document.getElementById('packerz-dynamic-styles')) return;
    const style = document.createElement('style');
    style.id = 'packerz-dynamic-styles';
    style.textContent = `
        .packerz-qa-sub-label {
            transition: all 0.2s;
        }
        .packerz-qa-sub-label:hover {
            background: rgba(16,185,129,0.05) !important;
        }
        .packerz-qa-main-label {
            transition: all 0.2s;
        }
        .packerz-qa-main-label:hover {
            border-color: #10b981 !important;
        }
        .packerz-sop-delete-btn {
            transition: all 0.2s;
            opacity: 0.8;
        }
        .packerz-sop-delete-btn:hover {
            opacity: 1 !important;
        }
        .packerz-blueprint-btn {
            transition: all 0.2s;
        }
        .packerz-blueprint-btn:hover {
            background: rgba(14,165,233,0.1) !important;
        }
        .packerz-unarchive-btn {
            transition: all 0.2s;
        }
        .packerz-unarchive-btn:hover {
            background: #ef4444 !important;
            color: white !important;
        }
        .packerz-audit-row {
            transition: all 0.2s;
        }
        .packerz-audit-row:hover {
            background: rgba(16,185,129,0.05) !important;
        }
    `;
    document.head.appendChild(style);
}
injectPackerzStyles();

// ==========================================
// NEXUZ: PACKERZ TERMINAL LOGIC
// ==========================================

/**
 * @typedef {Object} PackerzShipmentPayload
 * @property {string|number} order_id
 * @property {string} sale_date
 * @property {string} customer
 * @property {Array<{sku: string, recipe: string, qty: number, transaction_type: string}>} items
 */

/**
 * Queries Supabase edge nodes to retrieve all orders marked globally as incomplete
 * ("Awaiting Assembly") and updates the awaiting orders queue UI in real time.
 * @async
 * @function fetchUnfulfilledOrders
 * @returns {Promise<void>} Resolves when the unfulfilled orders queue has been fetched and rendered.
 */
async function fetchUnfulfilledOrders() {
    try {
        if (!supabaseClient) return console.error("Supabase client not initialized.");
        const queueContainer = document.getElementById('packerzAwaitingQueue');
        if (!queueContainer) return;

        queueContainer.innerHTML = window.safeHTML(
            '<div style="text-align:center; padding:20px; color:var(--text-muted); font-style:italic;">Querying Supabase edge nodes...</div>'
        );

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
                qty: row.qty_sold,
                transaction_type: row.transaction_type || 'Standard'
            });
        });

        const distinctOrderIds = Object.keys(groupedOrders).sort((a, b) => {
            const numA = parseInt(String(a).replace(/[^0-9]/g, ''), 10) || 0;
            const numB = parseInt(String(b).replace(/[^0-9]/g, ''), 10) || 0;
            return numA - numB;
        });

        // 3. Dynamically Blast the global KPI Dashboard Tracker
        const kpiTracker = document.getElementById('kpiUnfulfilledCount');
        if(kpiTracker) kpiTracker.innerText = distinctOrderIds.length.toString();

        if (distinctOrderIds.length === 0) {
            queueContainer.innerHTML = window.safeHTML(
                '<div style="text-align:center; padding:60px; color:#10b981; font-size:14px; font-weight:900; font-style:italic; opacity:0.9;">ALL ACTIVE QUEUES CLEARED!</div>'
            );
            return;
        }

        queueContainer.innerHTML = window.safeHTML('');

        // 4. Architect Physical Order Cards in the DOM Container
        const fragment = document.createDocumentFragment();
        distinctOrderIds.forEach(id => {
            const order = groupedOrders[id];

            const card = document.createElement('div');
            card.className = 'packerz-order-card';
            card.id = 'packerz-card-' + order.order_id;
            card.style.cssText = 'background: var(--bg-container); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 15px var(--shadow-color); border-left: 1px solid var(--border-color);';

            const shortDate = new Date(order.sale_date).toLocaleDateString();
            const itemsPreview = order.items.map(i => `<span style="display:block; margin-top:4px;"><b>${i.qty}x</b> ${i.recipe}</span>`).join('');

            card.innerHTML = window.safeHTML(`
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:4px;">
                    <strong style="color:var(--text-heading); font-size:15px; font-weight:900;">ORDER ${order.order_id}</strong>
                    <span style="font-size:11px; color:#F59E0B; font-weight:900; background:rgba(245,158,11,0.1); padding:4px 10px; border-radius:6px; letter-spacing:0.5px;">${shortDate}</span>
                </div>
                <div style="font-size:12px; color:var(--text-main); font-weight:700; background:var(--bg-bar); padding:10px; border-radius:8px;">
                    ${itemsPreview}
                </div>
            `);

            card.dataset.appClick = 'openSopTerminal';
            card.dataset.orderId = order.order_id;
            
            fragment.appendChild(card);
        });
        window.currentPackerzGroupedOrders = groupedOrders;
        queueContainer.appendChild(fragment);

        loadSOPAuditLog();

    } catch (err) {
        console.error("PACKERZ Fetch Error:", err);
        document.getElementById('packerzAwaitingQueue').innerHTML = window.safeHTML(
            `<div style="color:#ef4444; padding:20px; font-size:12px; font-weight:800;">Data hook structurally failed: ${err.message}</div>`
        );
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

/**
 * Opens the interactive Packerz SOP terminal for a specific order group, updating the active queue
 * and rendering all individual item cards with their specific QA status and guidelines.
 * @function openPackerzSopTerminal
 * @param {Object} orderGroup - The grouped order object containing order details and items.
 * @returns {void}
 */
function openPackerzSopTerminal(orderGroup) {
    const activeQueue = document.getElementById('packerzActiveQueue');
    if (!activeQueue) return;

    // Remove orange selection styling from all cards, and apply full outline to the newly active one
    document.querySelectorAll('.packerz-order-card').forEach(c => {
        c.style.border = '1px solid var(--border-color)';
        c.style.boxShadow = '0 4px 15px var(--shadow-color)';
        c.style.transform = 'scale(1)';
    });
    const activeCard = document.getElementById('packerz-card-' + orderGroup.order_id);
    if(activeCard) {
        activeCard.style.border = '1px solid #F59E0B';
        activeCard.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.2)';
    }

    let itemsHtml = orderGroup.items.map(i => {
        let t = i.transaction_type || 'Standard';
        let safeRecipe = i.recipe.replace(/'/g,"\\'");
        let selectHtml = `
            <select class="type-sel" style="background:#1e293b; color:var(--text-main); border:1px solid rgba(255,255,255,0.1); padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; width:160px; max-width:100%;" 
                data-app-change="updateItemType" data-order-id="${orderGroup.order_id}" data-sku="${i.sku}" data-recipe="${safeRecipe}">
                <option value="Standard" ${t==='Standard'?'selected':''}>Standard</option>
                <option value="Pre-Ship Exchange" ${t==='Pre-Ship Exchange'?'selected':''}>Unshipped (Keep Rev)</option>
                <option value="Post-Ship Exchange" ${t==='Post-Ship Exchange'?'selected':''}>Post-Ship Exchange</option>
                <option value="Replacement / Warranty" ${t==='Replacement / Warranty'?'selected':''}>Exchange Replacement</option>
                <option value="Warranty" ${t==='Warranty'?'selected':''}>Warranty</option>
                <option value="Gift" ${t==='Gift'?'selected':''}>Gift</option>
                <option value="IGNORE" ${t==='IGNORE'?'selected':''}>IGNORE</option>
            </select>
        `;
        return `
        <div id="qa-row-${orderGroup.order_id}-${i.sku}" data-qa-passed="false" style="background:var(--bg-body); border:1px solid var(--border-color); border-radius:10px; padding:15px; display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:15px;">
                <div style="flex-grow:1; min-width:0;">
                    <span style="font-weight:900; color:var(--text-heading); font-size:14px; letter-spacing:0.5px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${i.recipe}</span>
                    <span style="font-size:11px; color:var(--text-muted); font-family:monospace; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:3px;">Alias: ${i.sku || 'N/A'}</span>
                </div>
                <div style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-weight:900; font-size:13px; padding:4px 12px; border-radius:6px; flex-shrink:0;">QTY: ${i.qty}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:10px; color:var(--text-muted); font-weight:800; text-transform:uppercase;">TYPE:</span>
                    ${selectHtml}
                </div>
                <button id="qa-btn-${orderGroup.order_id}-${i.sku}"
                    class="btn-blue"
                    style="flex-shrink:0; white-space:nowrap; padding: 6px 12px; font-weight: 800; font-size: 11px;"
                    data-app-click="loadActiveSOP" data-order-id="${orderGroup.order_id}" data-sku="${i.sku}" data-recipe="${safeRecipe}">
                    &#128065; VIEW SOP
                </button>
            </div>
        </div>
        `;
    }).join('');

    activeQueue.innerHTML = window.safeHTML(`
    <div style="padding:25px; background:var(--bg-container); border-radius:12px; border:2px solid #F59E0B; box-shadow: 0 10px 30px rgba(245,158,11,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:#F59E0B; font-size:18px; font-weight:900; letter-spacing:1px;">ACTIVE TARGET: ${orderGroup.order_id}</h3>
            <span style="font-size:11px; font-weight:900; color:var(--text-muted);">${new Date(orderGroup.sale_date).toLocaleDateString()}</span>
        </div>

        <p style="font-size:12px; color:var(--text-muted); font-weight:700; margin-bottom:20px;">Review the mandatory Pick-List and clear all SOP QA checks before closing out this active order block.</p>

        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:25px;">
            ${itemsHtml}
        </div>

        <button id="btnCompleteAssembly_${orderGroup.order_id}" class="btn-orange-neon" style="width:100%; padding:16px; border-radius:10px; font-weight:900; letter-spacing:1px; cursor:not-allowed; opacity:0.5; font-size:14px; transition:transform 0.2s;">
            AWAITING QA CLEARANCE
        </button>
    </div>`);

    validatePackerzAssemblyButton(orderGroup.order_id);
}

window.updatePackerzItemType = async function(orderId, sku, newVal, _safeRecipe) {
    sysLog(`Packerz overriding Sale Type ${orderId}: ${newVal}`);
    const { error } = await supabaseClient.from('sales_ledger').update({transaction_type: newVal}).eq('order_id', orderId).eq('storefront_sku', sku);
    if(error) { alert("Error saving type mapping from Packerz: " + error.message); return; }

    // Auto-update local DB if present
    if (typeof salesDB !== 'undefined') {
        let r = salesDB.find(s => s.order_id === orderId && s.storefront_sku === sku);
        if (r) r.transaction_type = newVal;
    }
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
            btn.className = 'btn-green-neon';

            btn.innerText = 'ASSEMBLY COMPLETE';
            btn.dataset.appClick = 'executeCompletion';
            btn.dataset.orderId = orderId;
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.className = 'btn-orange-neon';

            btn.innerText = 'AWAITING QA CLEARANCE';
            delete btn.dataset.appClick;
        }
    }
}

let currentPackerzQaOrderId = null;
let currentPackerzQaSku = null;
let currentPackerzQaRecipe = null;

window.currentActiveSopOrderId = null;
window.currentActiveSopSku = null;
window.currentActiveSopRecipe = null;
window.currentActiveSopType = 'packerz';
window.currentActiveSopData = null;
window.isActiveSopLiveEditing = false;

window.togglePackerzLiveInlineSOP = function() {
    window.isActiveSopLiveEditing = !window.isActiveSopLiveEditing;
    window.isPackerzLiveEditing = window.isActiveSopLiveEditing;
    if(window.currentActiveSopRecipe) {
        window.loadActiveSOP(window.currentActiveSopOrderId, window.currentActiveSopSku, window.currentActiveSopRecipe, window.currentActiveSopType, window.isActiveSopLiveEditing);
    }
};

window.renderInlineSopTelemetryPreview = function() {
    const rawText = document.getElementById('sopViewerQA')?.value || '';
    const previewContainer = document.getElementById('sopViewerQAPreview');
    if(!previewContainer) return;

    if(!rawText.trim()) {
        previewContainer.innerHTML = window.safeHTML(
            `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic;">Type in the telemetry editor to preview elements.</div>`
        );
        return;
    }

    const qaChecks = rawText.split('\n').filter(x => x.trim() !== '');
    let html = '';

    qaChecks.forEach((line, idx) => {
        let q = line.trim();
        if(!q) return;

        let contentHtml = typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(q, idx) : q;

        if (q.startsWith('> ')) {
            html += `<label class="packerz-qa-sub-label" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px; font-size:11px; font-weight:600; color:var(--text-muted); cursor:pointer; padding:4px 8px 4px 28px; margin-bottom:0; border-radius:4px; width:100%;"><input type="checkbox" disabled style="width:12px; height:12px; flex-shrink:0; cursor:not-allowed; margin-top:2px;">${contentHtml}</label>`;
        } else if (!q.startsWith('[INPUT]') && !q.startsWith('# ') && !/^\[(IMG|BARCODE|QR):/.test(q)) {
            html += `<label class="packerz-qa-main-label" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; cursor:pointer; padding:6px 10px; margin-bottom:4px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-panel); width:100%;"><input type="checkbox" disabled style="width:16px; height:16px; flex-shrink:0; cursor:not-allowed; margin-top:2px;">${contentHtml}</label>`;
        } else {
            html += `<div style="width:100%; pointer-events:none; opacity:0.8;">${contentHtml}</div>`;
        }
    });

    previewContainer.innerHTML = window.safeHTML(
        html || `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic;">No checklist steps to preview.</div>`
    );

    if (typeof processTelemetryCanvasRendering === 'function') {
        processTelemetryCanvasRendering(previewContainer);
    }
};

window.renderPackerzLiveInlineTelemetryPreview = window.renderInlineSopTelemetryPreview;

window.saveLiveInlineSOP = async function() {
    const type = window.currentActiveSopType || 'packerz';
    const recipe = window.currentActiveSopRecipe;
    if(!recipe) return alert("SOP Target Unknown!");
    const btn = document.getElementById('btnSaveLiveInlineSOP') || document.getElementById('btnSavePackerzInlineSOP');
    if(btn) { btn.innerText = "UPLOADING PROTOCOLS..."; btn.style.opacity="0.5"; }

    try {
        let rows = document.querySelectorAll('#sopViewerBody .sop-step-row');
        let stepsArray = [];
        rows.forEach(r => {
            let richText = r.querySelector('.sop-text-rich').innerHTML;
            let attachments = [];
            r.querySelectorAll('.media-row').forEach(mr => {
                let typeSel = mr.querySelector('.m-type');
                let urlInp = mr.querySelector('.m-url');
                if (typeSel && urlInp) {
                    attachments.push({type: typeSel.value, url: urlInp.value});
                }
            });
            stepsArray.push({
                text: richText,
                attachments: attachments
            });
        });

        let rawQa = document.getElementById('sopViewerQA')?.value || '';
        let qaLines = rawQa.trim() === '' ? [] : rawQa.split('\n').map(l=>l.trim());

        if (type === 'packerz') {
            const payload = {
                internal_recipe_name: recipe,
                required_box_sku: window.currentActiveSopData?.required_box_sku || null,
                instruction_json: JSON.stringify({ steps: stepsArray, qaChecks: qaLines })
            };

            const { error } = await supabaseClient.from('pack_ship_sops').upsert(payload, { onConflict: 'internal_recipe_name' });
            if(error) throw error;
        } else {
            const payload = { qaChecks: qaLines, steps: stepsArray };
            
            if(typeof sopsDB !== 'undefined') sopsDB[recipe] = payload;
            
            const { error } = await supabaseClient.from('production_sops').upsert({ product_name: recipe, steps: payload }, { onConflict: 'product_name' });
            if(error) throw error;
        }

        if(btn) { btn.innerText = "💾 SAVED SUCCESSFULLY!"; btn.style.background = "#059669"; }
        setTimeout(async () => {
            window.isActiveSopLiveEditing = false;
            window.isPackerzLiveEditing = false;
            await window.loadActiveSOP(window.currentActiveSopOrderId, window.currentActiveSopSku, window.currentActiveSopRecipe, type);
            
            if (type !== 'packerz') {
                if(typeof currentPrintJob !== "undefined" && currentPrintJob && currentPrintJob.id && document.getElementById("paneProdPrint") && document.getElementById("paneProdPrint").style.display !== "none") {
                    if(typeof renderActivePrintJob === "function") renderActivePrintJob(currentPrintJob.id);
                } else {
                    if(typeof window.renderActiveWO === "function" && window.currentActiveSopOrderId) {
                        window.renderActiveWO(window.currentActiveSopOrderId);
                    }
                }
            }
        }, 1200);

    } catch(e) {
        console.error(e);
        if(typeof sysLog === 'function') sysLog(`Inline SOP Save Error: ${e.message}`, true);
        alert("CRITICAL SAVE ERROR: " + e.message);
        if(btn) { btn.innerText = "💾 SAVE MASTER BLUEPRINT"; btn.style.opacity="1"; btn.style.background = ""; }
    }
};

window.savePackerzLiveInlineSOP = window.saveLiveInlineSOP;

/**
 * Loads the active Standard Operating Procedure (SOP) view/edit pane for a given order, SKU, and recipe.
 * Clears scanner telemetry, opens the modal, and renders active checklist guidelines.
 * @async
 * @function loadActiveSOP
 * @param {string|number} orderId - The target Order ID or Work Order ID.
 * @param {string} sku - The SKU of the item being checked.
 * @param {string} recipe - The recipe name.
 * @param {string} type - The product context type ('packerz', 'batches', or 'layerz').
 * @param {boolean} [isEditMode=false] - Whether to launch directly in Edit Mode.
 * @returns {Promise<void>} Resolves when the active SOP modal has been loaded and rendered.
 */
window.loadActiveSOP = async function(orderId, sku, recipe, type = 'packerz', isEditMode = false) {
    window.currentActiveSopOrderId = orderId;
    window.currentActiveSopSku = sku;
    window.currentActiveSopRecipe = recipe;
    window.currentActiveSopType = type;
    window.isActiveSopLiveEditing = isEditMode;

    // Preserve legacy compatibility inside packerz module
    currentPackerzQaOrderId = orderId;
    currentPackerzQaSku = sku;
    currentPackerzQaRecipe = recipe;
    scanConfirmations.clear();

    const modal = document.getElementById('sopViewerModal');
    if (modal) modal.style.display = 'flex';

    const titleEl = document.getElementById('sopViewerTitle');
    if (titleEl) {
        titleEl.innerHTML = window.safeHTML(
            window.isActiveSopLiveEditing ? `✏️ EDITING SOP: ${recipe}` : `🎯 ACTIVE SOP: ${recipe}`
        );
    }

    const subtitleEl = document.getElementById('sopViewerSubtitle');
    if (subtitleEl) {
        subtitleEl.innerText = `Target Alias: ${sku} [${type.toUpperCase()}]`;
    }

    const headerButtonsWrapper = document.getElementById('sopViewerHeaderButtons');
    if (headerButtonsWrapper) {
        if (window.isActiveSopLiveEditing) {
            headerButtonsWrapper.innerHTML = window.safeHTML(
                `<button class="btn-green" style="padding:10px 25px; font-size:14px; font-weight:900; letter-spacing:1px; box-shadow:0 4px 15px rgba(16,185,129,0.3); border-radius:8px;" data-click="click_saveLiveInlineSOP" id="btnSaveLiveInlineSOP">💾 SAVE MASTER BLUEPRINT</button>` +
                `<button class="btn-red" style="width:auto; padding:10px 20px; font-size:14px; font-weight:bold; border-radius:8px;" data-click="click_if_typeof_togglePackerzLiveInl" id="btnPackerzLiveToggleEdit">Close</button>`
            );
        } else {
            headerButtonsWrapper.innerHTML = window.safeHTML(
                `<button class="btn-ghost-base btn-ghost-blue" data-click="click_printActiveSOP" style="padding:10px 20px; font-size:14px;">🖨️ Print SOP</button>` +
                `<button class="btn-blue" id="btnPackerzLiveToggleEdit" data-click="click_if_typeof_togglePackerzLiveInl" style="padding:10px 20px; font-size:14px; font-weight:900; border-radius:8px;">✏️ EDIT</button>` +
                `<button class="btn-red" style="width:auto; padding:10px 20px; font-size:14px; font-weight:bold; border-radius:8px;" data-click="click_closePackerzSopViewer">Close</button>`
            );
        }
    }

    const wrapper = document.getElementById('sopViewerSplitWrapper');
    if (!wrapper) return;

    let body = document.getElementById('sopViewerBody');
    let qaList = document.getElementById('sopViewerQAList');
    let btnSignoff = document.getElementById('btnSopSignoff');

    if (!window.isActiveSopLiveEditing) {
        wrapper.innerHTML = window.safeHTML(
            window.buildUnifiedSopLayoutHTML({
                isEdit: false,
                sopType: type,
                grpId: 'inline',
                requiredBoxSku: '',
                qaChecksHtml: '',
                stepsHtml: ''
            })
        );
        // re-grab references after DOM recreation
        body = document.getElementById('sopViewerBody');
        qaList = document.getElementById('sopViewerQAList');
        btnSignoff = document.getElementById('btnSopSignoff');

        if (body) {
            body.innerHTML = window.safeHTML(
                `<div style='padding:40px; text-align:center; color:#10b981; font-weight:900; font-style:italic;'>Fetching restricted SOP clearance logic from Supabase Edge...</div>`
            );
        }
        if (qaList) qaList.innerHTML = window.safeHTML('');
        if (btnSignoff) {
            btnSignoff.style.opacity = '0.5';
            btnSignoff.style.cursor = 'not-allowed';
            btnSignoff.onclick = null;
        }
    } else {
        wrapper.innerHTML = window.safeHTML(
            `<div style='padding:40px; width:100%; text-align:center; color:#3b82f6; font-weight:900; font-style:italic;'>Constructing Inline Admin Workspace...</div>`
        );
        if (btnSignoff) btnSignoff.style.display = 'none';
    }

    try {
        let instructionJson = { steps: [], qaChecks: [] };
        let requiredBoxSku = '';
        let rowData = null;

        if (type === 'packerz') {
            const { data: rows, error } = await supabaseClient.from('pack_ship_sops').select('*').eq('internal_recipe_name', recipe);
            if (error) throw error;
            rowData = rows && rows.length > 0 ? rows[0] : null;
            instructionJson = rowData ? JSON.parse(rowData.instruction_json || '{"steps": [], "qaChecks": []}') : { steps: [], qaChecks: [] };
            requiredBoxSku = rowData ? rowData.required_box_sku : '';
        } else {
            const { data: rows, error } = await supabaseClient.from('production_sops').select('*').eq('product_name', recipe);
            if (error) throw error;
            rowData = rows && rows.length > 0 ? rows[0] : null;
            if (rowData) {
                instructionJson = (typeof rowData.steps === 'string') ? JSON.parse(rowData.steps) : (rowData.steps || { steps: [], qaChecks: [] });
            }
        }

        window.currentActiveSopData = instructionJson;

        const steps = instructionJson.steps && instructionJson.steps.length > 0 
            ? instructionJson.steps 
            : (window.isActiveSopLiveEditing ? [{}] : []);
        const qaChecks = instructionJson.qaChecks || [];

        if (window.isActiveSopLiveEditing) {
            let qaText = (qaChecks || []).join('\n');
            let rowsHtml = '';
            steps.forEach((s, idx) => { rowsHtml += window.generateEditableSOPRow(s, idx, sku, type); });

            let editHtml = window.buildUnifiedSopLayoutHTML({
                isEdit: true,
                sopType: type,
                grpId: 'inline',
                qaText: qaText,
                rowsHtml: rowsHtml
            });
            wrapper.innerHTML = window.safeHTML(editHtml);
            setTimeout(() => { if (typeof window.renderInlineSopTelemetryPreview === 'function') window.renderInlineSopTelemetryPreview(); }, 150);
            return;
        }

        // View Mode: Render visual steps
        let h = '';
        let getDId = (u) => { let match = (u||'').match(/\/(?:file\/d\/|uc\?id=|open\?id=)([a-zA-Z0-9_-]+)/); return match ? match[1] : null; };

        steps.forEach((s, idx) => {
            let mediaHtml = '';
            let stepAttachments = s.attachments && s.attachments.length > 0 ? s.attachments : [s.m1, s.m2, s.m3];
            stepAttachments.forEach(m => {
                if (m && m.url) {
                    let safeUrl = m.url.replace(/'/g, "\\'").replace(/"/g, '"');
                    let dId = getDId(m.url);
                    if (m.type === 'img') {
                        mediaHtml += `<img loading="lazy" src="${safeUrl}" style="max-height:200px; max-width:100%; object-fit:contain; border-radius:8px; border:1px solid var(--border-color); cursor:zoom-in;" data-app-click="openMediaContext" data-url="${safeUrl}" data-type="img">`;
                    } else {
                        let isNativeVid = !dId && m.type === 'vid' && (safeUrl.includes('.mp4') || safeUrl.includes('.webm') || safeUrl.includes('supabase.co'));
                        if (isNativeVid) {
                            mediaHtml += `<div class="media-thumb grid-stack" style="background:#1e293b; border-radius:8px; overflow:hidden; border:1px solid var(--border-color); cursor:zoom-in;" data-app-click="openMediaContext" data-url="${safeUrl}" data-type="vid"><video preload="none" src="${safeUrl}" style="width:100%; height:100%; object-fit:cover; opacity:0;" muted playsinline></video><div class="overlay-center-flex" style="flex-direction:column; gap:8px; z-index:1;"><i class="fa-solid fa-play" style="font-size:32px; color:white; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i><span style="color:white; font-size:11px; font-weight:bold;">NATIVE VIDEO</span></div></div>`;
                        } else {
                            let mediaUrl = dId ? `https://drive.google.com/file/d/${dId}/preview` : safeUrl;
                            if (mediaUrl.includes('sharepoint.com') && !mediaUrl.includes('action=embedview')) mediaUrl += (mediaUrl.includes('?') ? '&' : '?') + 'action=embedview';
                            mediaHtml += `<div class="media-thumb grid-stack" style="border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); cursor: zoom-in;" data-app-click="openMediaContext" data-url="${mediaUrl}" data-type="iframe"><iframe loading="lazy" src="${mediaUrl}" style="width: 100%; height: 100%; border: none; pointer-events: none;"></iframe></div>`;
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

        if (steps.length === 0) h = `<div style="padding:20px; color:var(--text-muted); font-style:italic;">No visual steps configured. Proceed strictly to QA Checks.</div>`;

        if (requiredBoxSku) {
            h = `
            <div style="background:rgba(245,158,11,0.1); border:1px solid #F59E0B; border-radius:12px; padding:20px; margin-bottom:10px;">
                <div style="font-size:11px; font-weight:900; color:#F59E0B; margin-bottom:5px; letter-spacing:1px;">REQUIRED SHIPPING HARNESS</div>
                <div style="font-size:18px; font-weight:900; color:var(--text-heading); font-family:monospace;">📦 ${requiredBoxSku}</div>
            </div>` + h;
        }

        if (body) body.innerHTML = window.safeHTML(h);

        // View Mode: Render Checkboxes
        if (qaChecks.length === 0) {
            if (qaList) {
                qaList.innerHTML = window.safeHTML(
                    `<div style="color:var(--text-muted); font-size:12px; font-style:italic;">No custom QA parameters required for this module. Free clear.</div>`
                );
            }
            checkPackerzSopSignoffState(); // Automatically unlocks button
        } else {
            let html = '';

            function parseInputs(text) {
                return text.replace(/\[INPUT\]/gi, `<input type="text" data-app-click="stopProp" class="packerz-qa-input" placeholder="..." style="padding:2px 6px; border-radius:4px; background:rgba(0,0,0,0.3); border:1px solid var(--border-input); color:#10b981; font-family:monospace; font-size:11px; width:100px; text-transform:uppercase; margin:0 6px;" data-app-keyup="sopSignoffCheck">`);
            }

            function parseInlineMedia(text) {
                text = text.replace(/\[PDF:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
                    const safe = url.replace(/'/g, "\\'");
                    return `<button type="button" data-app-click="openWindowBlank" data-url="${safe}" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" class="packerz-btn-hover">📄 View PDF</button>`;
                });
                text = text.replace(/\[VID:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
                    const safe = url.replace(/'/g, "\\'");
                    return `<button type="button" data-app-click="openMediaContext" data-type="vid" data-url="${safe}" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" class="packerz-btn-hover">🎥 Play Video</button>`;
                });
                text = text.replace(/\[IMG:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
                    const safe = url.replace(/'/g, "\\'");
                    if(url.toLowerCase().endsWith('.pdf')) {
                       return `<button type="button" data-app-click="openWindowBlank" data-url="${safe}" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" class="packerz-btn-hover">📄 View PDF</button>`;
                    }
                    if(url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
                       return `<button type="button" data-app-click="openMediaContext" data-type="vid" data-url="${safe}" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;" class="packerz-btn-hover">🎥 Play Video</button>`;
                    }
                    return `<img src="${url}" loading="lazy" style="max-height:100px; max-width:100%; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in; margin:4px 2px; display:inline-block; vertical-align:middle;" data-app-click="openMediaContext" data-type="img" data-url="${safe}">`;
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
                                    <button id="scan-btn-${rowId}" data-app-click="openScanner" data-expected="${expected}" data-rowid="${rowId}" data-item="${safeItem}" style="padding:6px 10px; background:#0ea5e9; color:white; border:none; border-radius:6px; font-weight:800; font-size:11px; cursor:pointer; white-space:nowrap;">📷 SCAN</button>
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
                            <input type="text" class="packerz-qa-input" data-label="${safeLabel}" placeholder="..." style="flex:1; padding:4px; border-radius:4px; background:var(--bg-input); border:1px solid var(--border-color); color:#fff; font-family:monospace; font-size:11px;" data-app-keyup="sopSignoffCheck">
                        </div>
                    `;
                } else if (q.startsWith('# ')) {
                    let content = parseInlineMedia(parseInputs(q.substring(2).trim()));
                    html += `<div style="font-size:13px; font-weight:900; color:#10b981; margin-top:8px; border-bottom:1px solid rgba(16,185,129,0.3); padding-bottom:2px; margin-bottom:4px; display:flex; align-items:center; flex-wrap:wrap;">${content}</div>`;
                } else if (q.startsWith('> ')) {
                    let subQ = q.substring(2).trim();
                    let safeSubQ = subQ.replace(/"/g, '&quot;');
                    let content = parseInlineMedia(parseInputs(subQ));
                    html += `
                        <label style="display:flex; align-items:center; flex-wrap:wrap; gap:6px; font-size:11px; font-weight:600; color:var(--text-muted); cursor:pointer; padding:2px 8px 2px 28px; margin-bottom:0; border-radius:4px; transition:all 0.2s;" class="packerz-qa-hover-sub">
                            <input type="checkbox" class="packerz-qa-check" data-label="${safeSubQ}" style="width:12px; height:12px; flex-shrink:0; cursor:pointer;" data-app-change="sopSignoffCheck">
                            <span style="display:flex; align-items:center; flex-wrap:wrap;">${content}</span>
                        </label>
                    `;
                } else {
                    if(q.startsWith('- ')) q = q.substring(2).trim();
                    let safeQ = q.replace(/"/g, '&quot;');
                    let content = parseInlineMedia(parseInputs(q));
                    html += `
                        <label style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; font-size:12px; font-weight:700; color:var(--text-heading); cursor:pointer; padding:4px 8px; margin-bottom:0; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-panel); transition:all 0.2s;" class="packerz-qa-hover-main">
                            <input type="checkbox" class="packerz-qa-check" data-label="${safeQ}" style="width:14px; height:14px; flex-shrink:0; cursor:pointer;" data-app-change="sopSignoffCheck">
                            <span style="display:flex; align-items:center; flex-wrap:wrap;">${content}</span>
                        </label>
                    `;
                }
            });
            if (qaList) qaList.innerHTML = window.safeHTML(html);

            // Hydrate QR Codes
            if (typeof QRCode !== 'undefined') {
                document.querySelectorAll('#sopViewerQAList canvas[id^="scan-qr-"]').forEach(el => {
                    const rowId = el.id.replace('scan-qr-', '');
                    const row = document.getElementById(`scanrow-${rowId}`);
                    const value = row ? row.dataset.expected : 'NGZ';
                    QRCode.toCanvas(el, value, { width: 56, margin: 0, color: { dark: '#000', light: '#fff' } }).catch(() => {});
                });

                document.querySelectorAll('#sopViewerQAList .sop-qr-canvas').forEach(el => {
                    try {
                        QRCode.toCanvas(el, el.dataset.value || 'https://neogleamz.com', {
                            margin: 1, width: 45, color: { dark: '#000', light: '#fff' }
                        }).catch(()=>{});
                    } catch(e) { console.error(e); }
                });
            }

            // Hydrate Barcodes
            if (typeof JsBarcode !== 'undefined') {
                document.querySelectorAll('#sopViewerQAList .sop-barcode-svg').forEach(el => {
                    try {
                        JsBarcode(el, el.dataset.value || 'NEOGLEAMZ', {
                            format: 'CODE128', width: 1.5, height: 40,
                            displayValue: true, fontSize: 10, margin: 4,
                            lineColor: '#000', background: '#ffffff'
                        });
                    } catch (_e) {
                        el.outerHTML = `<span style="color:#ef4444; font-size:10px;">⚠️ Barcode error</span>`;
                    }
                });
            }

            checkPackerzSopSignoffState(); // Initial check
        }

    } catch(err) {
        if (body) {
            body.innerHTML = window.safeHTML(
                `<div style='padding:40px 20px; text-align:center; color:#ef4444; font-weight:900;'>SOP Hook Failed: ${err.message}<br><br><span style="color:var(--text-muted); font-size:12px; font-weight:normal;">If this item does not strictly require a physical procedure (e.g. Raw Materials or Legacy Orders), you may click COMPLETE below to securely bypass this check.</span></div>`
            );
        }
        if (qaList) qaList.innerHTML = window.safeHTML('');
        checkPackerzSopSignoffState();
    }
};

window.loadPackerzActiveSOP = async function(orderId, sku, recipe) {
    return window.loadActiveSOP(orderId, sku, recipe, 'packerz');
};

window.executeSopPrint = function(printType) {
    try {
        const recipe = window.currentActiveSopRecipe;
        const sopData = window.currentActiveSopData;
        if(!recipe || !sopData) {
            sysLog("No active SOP data available to print.", true);
            return;
        }

        let pName = recipe;
        let steps = sopData.steps || [];
        let qaChecks = sopData.qaChecks || [];

        // Safety check
        if(!Array.isArray(steps)) steps = Object.keys(steps).map(k => steps[k]);
        if(!Array.isArray(qaChecks)) qaChecks = Object.keys(qaChecks).map(k => qaChecks[k]);

        let hasRichText = steps.length > 0;
        let hasChecklist = qaChecks.length > 0;

        let html = `<html><head><title>Packing SOP - ${pName}</title>
<style>
body { font-family: sans-serif; padding: 20px; font-size: 13px; max-width: 800px; margin: 0 auto; color: #333; }
hr { border: 0; border-top: 2px solid #10b981; margin: 20px 0; }
.header { background: rgba(16,185,129,0.05); padding: 10px; font-weight: bold; font-size: 16px; margin: 25px 0 15px 0; border-left: 5px solid #10b981; border-radius: 4px; }
.step { margin-bottom: 12px; display: flex; align-items: flex-start; gap: 12px; font-size: 14px; line-height: 1.5; }
.step-checkbox { width: 16px; height: 16px; border: 2px solid #ccc; border-radius: 3px; margin-top: 2px; flex-shrink: 0; }
.step-content { flex: 1; }
.telemetry-header { font-weight: bold; font-size: 18px; color: #10b981; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }
.telemetry-subtext { font-size: 12px; color: #666; font-style: italic; margin-left: 5px; }
img { max-width: 100%; max-height: 350px; display: block; margin-top: 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
a { color: #10b981; font-weight: bold; margin-right: 15px; text-decoration: none; }
h2 { margin: 0 0 5px 0; font-size: 24px; color: #111; }
h3 { margin: 0 0 10px 0; font-size: 16px; color: #555; }
.richtext-container { margin-top: 30px; padding-top: 20px; border-top: 3px solid #F59E0B; }
.richtext-container img { max-width: 100%; height: auto; }
</style></head><body>`;
        
        html += `<h2>Fulfillment & Packing SOP</h2><h3 style="color:#10b981;">Master Recipe: ${pName}</h3><hr>`;

        // CHECKLIST RENDERING (QA Checks)
        if(printType === 'checklist' || printType === 'full') {
            if(!hasChecklist) {
                html += `<p style="color:#666; font-style:italic;">No mandatory QA checklist defined for this pack.</p>`;
            } else {
                html += `<div class="header" style="color:#F59E0B; border-left-color:#F59E0B;">MANDATORY QA CHECKS</div>`;
                qaChecks.forEach((qa, idx) => {
                    let parsedHTML = typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(qa, idx) : qa;
                    if (qa.startsWith('# ')) {
                        html += `<div class="step-content" style="margin-top:15px; margin-bottom:10px;">${parsedHTML}</div>`;
                    } else {
                        html += `<div class="step">
                                    <div class="step-checkbox"></div>
                                    <div class="step-content">${parsedHTML}</div>
                                 </div>`;
                    }
                });
            }
        }

        // RICH TEXT RENDERING (Visual Steps)
        if(printType === 'richtext' || printType === 'full') {
            if(!hasRichText) {
                if(printType === 'richtext') html += `<p style="color:#666; font-style:italic;">No visual packing steps configured.</p>`;
            } else {
                html += `<div class="richtext-container">
                            <h2 style="color:#F59E0B; margin-bottom:20px;">Packing Instructions</h2>`;
                
                let stepCounter = 1;
                steps.forEach((s) => {
                    html += `<div style="margin-bottom:25px; padding-bottom:15px; border-bottom:1px dashed #ccc;">
                                <strong style="color:#F59E0B; font-size:16px; display:block; margin-bottom:10px;">Pack Step ${stepCounter++}</strong>
                                <div style="font-size:15px; line-height:1.6; white-space:pre-wrap;">${typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(s.text || '', -1) : s.text || ''}</div>
                             </div>`;
                });
                
                html += `</div>`;
            }
        }

        html += `</body></html>`;
        
        let win = window.open('', '', 'width=800,height=800');
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 700);
        
    } catch(e) {
        if(typeof sysLog === 'function') sysLog(`Print SOP Error: ${e.message}`, true);
    }
};

window.executePackerzSopPrint = window.executeSopPrint;

function checkPackerzSopSignoffState() {
    const checks = document.querySelectorAll('.packerz-qa-check');
    let allValid = true;
    checks.forEach(c => { if(!c.checked) allValid = false; });

    const inputs = document.querySelectorAll('.packerz-qa-input');
    inputs.forEach(i => { if(i.value.trim() === '') allValid = false; });

    document.querySelectorAll('.packerz-scan-row').forEach(row => {
        if (row.dataset.confirmed !== 'true') allValid = false;
    });

    const btnSignoff = document.getElementById('btnSopSignoff') || document.getElementById('btnPackerzSopSignoff');
    if(btnSignoff) {
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
}

async function signoffPackerzQA() {
    const orderId = window.currentActiveSopOrderId || currentPackerzQaOrderId;
    const sku = window.currentActiveSopSku || currentPackerzQaSku;
    const recipe = window.currentActiveSopRecipe || currentPackerzQaRecipe;

    if(!orderId || !sku) return;

    let telemetryData = [];
    document.querySelectorAll('.packerz-qa-check').forEach(c => {
        telemetryData.push({ type: 'check', text: c.getAttribute('data-label'), valid: c.checked });
    });
    document.querySelectorAll('.packerz-qa-input').forEach(i => {
        telemetryData.push({ type: 'input', text: i.getAttribute('data-label'), value: i.value.trim() });
    });

    try {
        if(supabaseClient) {
            if (window.currentActiveSopType === 'packerz') {
                const { error: updErr } = await supabaseClient.from('sales_ledger')
                    .update({
                        qa_cleared_at: new Date().toISOString()
                    })
                    .eq('order_id', orderId)
                    .eq('storefront_sku', sku);

                if (updErr) {
                    console.error("QA Ledger Update silently rejected heavily:", updErr);
                    alert("Critical Database Warning: Your QA Signoff was not committed to the ledger! " + updErr.message);
                    return;
                }
            } else {
                // For Batchez/Layerz, clear QA in production_wos table!
                const { error: updErr } = await supabaseClient.from('production_wos')
                    .update({
                        qa_cleared_at: new Date().toISOString(),
                        qa_user: window.currentActiveUser || 'System'
                    })
                    .eq('wo_id', orderId);

                if (updErr) {
                    console.error("QA Production WO Update rejected:", updErr);
                    alert("Critical Database Warning: Your QA Signoff was not committed! " + updErr.message);
                    return;
                }
            }
        }
        archiveSOPSnapshot(orderId, sku, recipe, telemetryData);
    } catch(err) {
        console.warn("Audit tracking mathematically failed on the Edge.", err);
    }

    const rowId = `qa-row-${orderId}-${sku}`;
    const btnId = `qa-btn-${orderId}-${sku}`;

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
        btn.className = 'btn-green-neon';
        btn.style.color = 'white';
    }

    const capturedOrderId = orderId;
    closePackerzSopViewer();
    if (window.currentActiveSopType === 'packerz') {
        validatePackerzAssemblyButton(capturedOrderId);
    } else {
        if (typeof window.renderActiveWO === 'function') window.renderActiveWO(capturedOrderId);
    }
}

window.closePackerzSopViewer = function() {
    const modal = document.getElementById('sopViewerModal');
    if (modal) modal.style.display = 'none';
    window.isActiveSopLiveEditing = false;
    window.isPackerzLiveEditing = false;
    currentPackerzQaOrderId = null;
    currentPackerzQaSku = null;
    currentPackerzQaRecipe = null;
    window.currentActiveSopOrderId = null;
    window.currentActiveSopSku = null;
    window.currentActiveSopRecipe = null;
    window.currentActiveSopType = null;
    window.currentActiveSopData = null;
    const btnEdit = document.getElementById('btnPackerzLiveToggleEdit');
    if (btnEdit) {
        btnEdit.innerHTML = '✏️ EDIT';
        btnEdit.className = 'btn-blue';
    }
};

/**
 * Executes the final order assembly completion, updating the internal fulfillment status to "Completed"
 * and setting the timestamp in the Supabase sales ledger.
 * @async
 * @function executePackerzCompletion
 * @param {string|number} orderId - The ID of the order being completed.
 * @returns {Promise<void>} Resolves when the completion update is fully synced with the remote database.
 */
async function executePackerzCompletion(orderId) {
    if(!confirm(`Are you absolutely sure you want to officially mark Order ${orderId} as completely assembled?`)) return;

    try {
        await window.executeWithButtonAction(`btnCompleteAssembly_${orderId}`, '📦 SYNCING...', '✅ QA PASSED ✓', async () => {
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
                .select('internal_recipe_name, qty_sold, transaction_type')
                .eq('order_id', orderId);

            if (itemsError) throw itemsError;

            let invMap = {};
            lineItems.forEach(r => {
                if (r.transaction_type === 'IGNORE' || r.transaction_type === 'Pre-Ship Exchange') return;
                let k = `RECIPE:::${r.internal_recipe_name}`;
                if(!invMap[k]) invMap[k] = (inventoryDB[k] ? inventoryDB[k].sold_qty : 0);
                invMap[k] += r.qty_sold;
            });
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
            document.getElementById('packerzActiveQueue').innerHTML = window.safeHTML(
                '<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic; opacity:0.6;">Select an order from the queue to functionally open the SOP terminal.</div>'
            );

            // 3. Re-Sync Live Queue
            fetchUnfulfilledOrders();
        });
    } catch(err) {
        console.error("Completion Error", err);
        alert("CRITICAL ERROR: Failed to close out structural order constraints. \n" + err.message);
    }
}

/**
 * Unarchives a completed order, returning it to the active queue and dynamically adjusting inventory values.
 * @async
 * @function unarchivePackerzOrder
 * @param {string|number} orderId - The target Order ID.
 * @returns {Promise<void>} Resolves when the order unarchival process is complete.
 */
window.unarchivePackerzOrder = async function(orderId) {
    if(!confirm(`Are you absolutely sure you want to UNARCHIVE Order ${orderId} and return it to the active queue?`)) return;

    try {
        // 1. Fetch specific line items for this order and structurally refund (upsert) the Inventory ledger
        const { data: lineItems, error: itemsError } = await supabaseClient
            .from('sales_ledger')
            .select('internal_recipe_name, qty_sold, transaction_type')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        let invMap = {};
        lineItems.forEach(r => {
            if (r.transaction_type === 'IGNORE' || r.transaction_type === 'Pre-Ship Exchange') return;
            let k = `RECIPE:::${r.internal_recipe_name}`;
            if(!invMap[k]) invMap[k] = (inventoryDB[k] ? inventoryDB[k].sold_qty : 0);
            invMap[k] -= r.qty_sold;
        });
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

        // Immediately delete the snapshot from the archive so it re-enters the QA pipeline cleanly
        await supabaseClient.from('sop_archives').delete().eq('order_id', orderId);

        // Re-Sync Live Queues
        if (typeof fetchUnfulfilledOrders === 'function') fetchUnfulfilledOrders();
        loadSOPAuditLog();

    } catch(err) {
        console.error("Unarchive Error", err);
        alert("CRITICAL ERROR: Failed to unarchive order. \n" + err.message);
    }
}


// ==========================================
// PACKERZ: BLUEPRINT ADMIN SOP EDITOR
// ==========================================

// BATCHEZ-Legacy Logic Movers
window.movePackerzSOPUp = function(btn) { let row = btn.closest('.sop-step-row'); if(row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling); }
window.movePackerzSOPDown = function(btn) { let row = btn.closest('.sop-step-row'); if(row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row); }
window.removePackerzSOPRow = function(btn) { btn.closest('.sop-step-row').remove(); }
window.addPackerzSOPRow = function(btn) {
    let newRow = document.createElement('div');
    const sku = btn ? (btn.getAttribute('data-prodid') || currentPackerzQaSku || 'unknown') : (currentPackerzQaSku || 'unknown');
    const sopType = btn ? (btn.getAttribute('data-soptype') || 'packerz') : 'packerz';
    newRow.innerHTML = window.safeHTML(window.generateEditableSOPRow({text:""}, 999, sku, sopType));
    let rowNode = newRow.firstChild;
    if(btn && btn.closest('.sop-step-row')) {
        let currentRow = btn.closest('.sop-step-row');
        currentRow.parentNode.insertBefore(rowNode, currentRow.nextSibling);
    } else {
        let wrapper = document.getElementById('packerzLiveInlineRowsWrapper') || document.getElementById('packerzSopEditorRowsWrapper');
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
            ddl.innerHTML = window.safeHTML(opts);
        } else {
            ddl.innerHTML = window.safeHTML(
                '<option value="">CRITICAL: global productsDB undefined in namespace</option>'
            );
        }
    } catch(e) { console.error('PACKERZ Config Error:', e); }
}

// Hook it universally!
setTimeout(initPackerzAdmin, 1500);

window.filterPackerzAdminDropdown = async function() {
    let _p = document.getElementById('packerzAdminRecipeSelect').value;
    loadPackerzSopFromDB();
}

window.openPackerzAuditLog = function(sku, telemetryJsonString) {
    let data;
    try { data = JSON.parse(telemetryJsonString); } catch(_e) { return alert("Corrupted Audit Log"); }

    let h = `
        <div id="packerzAuditOverlay" class="modal-overlay active">
            <div style="background:var(--bg-container); border:1px solid #10b981; border-radius:12px; width:clamp(320px, 90vw, 500px); max-height:90vh; padding:25px; box-shadow:0 10px 40px rgba(16,185,129,0.2); display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(16,185,129,0.3); padding-bottom:10px; margin-bottom:15px;">
                    <h3 style="margin:0; font-size:16px; color:#10b981; font-weight:900;">QA AUDIT LOG</h3>
                    <button class="icon-btn" data-click="click_closePackerzAuditOverlay" style="color:var(--text-muted); font-size:16px; font-weight:bold; border:1px solid var(--border-color);">✕</button>
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
        previewContainer.innerHTML = window.safeHTML(
            `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic;">Type in the telemetry editor to preview elements.</div>`
        );
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
            const safe = url.replace(/"/g, '&quot;');
            return `<button type="button" data-click="click_openPdf" data-url="${safe}" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">📄 View PDF</button>`;
        });
        text = text.replace(/\[VID:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
            const safe = url.replace(/"/g, '&quot;');
            return `<button type="button" data-click="click_openVideo" data-url="${safe}" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">🎥 Play Video</button>`;
        });
        text = text.replace(/\[IMG:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
            const safe = url.replace(/"/g, '&quot;');
            if(url.toLowerCase().endsWith('.pdf')) {
               return `<button type="button" data-click="click_openPdf" data-url="${safe}" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">📄 View PDF</button>`;
            }
            if(url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
               return `<button type="button" data-click="click_openVideo" data-url="${safe}" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">🎥 Play Video</button>`;
            }
            return `<img src="${url}" loading="lazy" style="max-height:100px; max-width:100%; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in; margin:4px 2px; display:inline-block; vertical-align:middle;" data-click="click_openImage" data-url="${safe}">`;
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
            const safe = url.replace(/"/g, '&quot;');
            html += `<div style="margin:4px 0;"><img src="${url}" loading="lazy" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid var(--border-color); cursor:zoom-in;" data-click="click_openImage" data-url="${safe}"></div>`;
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
                <label class="packerz-qa-sub-label" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px; font-size:11px; font-weight:600; color:var(--text-muted); cursor:pointer; padding:2px 8px 2px 28px; margin-bottom:0; border-radius:4px;">
                    <input type="checkbox" disabled style="width:12px; height:12px; flex-shrink:0; cursor:pointer; margin-top:2px;">
                    <span style="display:flex; align-items:flex-start; flex-wrap:wrap; flex:1;">${content}</span>
                </label>
            `;
        }
        else {
            if(q.startsWith('- ')) q = q.substring(2).trim();
            let content = parseAll(q);
            html += `
                <label class="packerz-qa-main-label" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:8px; font-size:12px; font-weight:700; color:var(--text-heading); cursor:pointer; padding:4px 8px; margin-bottom:0; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-panel);">
                    <input type="checkbox" disabled style="width:14px; height:14px; flex-shrink:0; cursor:pointer; margin-top:2px;">
                    <span style="display:flex; align-items:flex-start; flex-wrap:wrap; flex:1;">${content}</span>
                </label>
            `;
        }
    });

    previewContainer.innerHTML = window.safeHTML(html);

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


/**
 * Loads and constructs the vertical split-pane Packerz Admin SOP Editor layout.
 * Fetches existing SOP configurations from the Supabase database for the selected recipe SKU,
 * populates the telemetry checklist textarea and preview, and dynamically constructs editable procedure step rows.
 * Uses the centralized unified layout generator to maintain layout and style parity across all editor screens.
 * 
 * @async
 * @function loadPackerzSopFromDB
 * @returns {Promise<void>} Resolves when the admin editor has been populated and rendered.
 */
async function loadPackerzSopFromDB() {
    const sku = document.getElementById('packerzAdminRecipeSelect').value;
    const wrapper = document.getElementById('packerzSopSplitWrapper');
    if (!wrapper) return;

    // Initialize split-pane grid structure once to preserve resizing widths
    if (!wrapper.querySelector('#packerzSopLeftPane')) {
        wrapper.innerHTML = window.safeHTML(
            window.buildUnifiedSopLayoutHTML({
                isEdit: true,
                sopType: 'packerz',
                grpId: 'dashboard',
                qaText: '',
                rowsHtml: ''
            })
        );
    }

    const area = document.getElementById('packerzSopEditorArea');
    if(!sku) {
        if (area) {
            area.innerHTML = window.safeHTML(
                "<div style='text-align:center; padding:40px; color:var(--text-muted); font-size:14px; font-style:italic;'>Select a target recipe on the left to begin compiling standard operating procedures.</div>"
            );
        }
        return;
    }

    if (area) {
        area.innerHTML = window.safeHTML(
            "<div style='padding:40px; text-align:center; color:#10b981; font-weight:900; font-style:italic;'>Fetching structural SOP payload from Supabase Edge...</div>"
        );
    }

    try {
        const { data: rows, error: _selectErr } = await supabaseClient.from('pack_ship_sops').select('*').eq('internal_recipe_name', sku);
        const data = rows && rows.length > 0 ? rows[0] : null;

        let steps = [{}];
        if(data) {
            const instructionJson = JSON.parse(data.instruction_json || '{"steps": [], "qaChecks": []}');
            steps = instructionJson.steps && instructionJson.steps.length > 0 ? instructionJson.steps : [{}];
            const packerzAdminQA = document.getElementById('packerzAdminQA');
            if (packerzAdminQA) {
                packerzAdminQA.value = (instructionJson.qaChecks || []).join('\n');
            }
            if(typeof renderPackerzTelemetryPreview === 'function') renderPackerzTelemetryPreview();
        } else {
            const packerzAdminQA = document.getElementById('packerzAdminQA');
            if (packerzAdminQA) {
                packerzAdminQA.value = '';
            }
            if(typeof renderPackerzTelemetryPreview === 'function') renderPackerzTelemetryPreview();
        }

        let h = `<div id="packerzSopEditorRowsWrapper" style="display:flex; flex-direction:column; gap:15px; margin-bottom:20px;">`;
        steps.forEach((s, idx) => { h += window.generateEditableSOPRow(s, idx, sku, 'packerz'); });
        h += `</div>`;

        if (area) area.innerHTML = window.safeHTML(h);

    } catch(e) {
        console.error("SOP Fetch Bound Error:", e);
        if(typeof sysLog === 'function') sysLog(`Packerz SOP Load Error: ${e.message}`, true);
        if(e.code === 'PGRST116') {
            const packerzAdminQA = document.getElementById('packerzAdminQA');
            if (packerzAdminQA) packerzAdminQA.value = '';
            let h = `<div id="packerzSopEditorRowsWrapper" style="display:flex; flex-direction:column; gap:15px; margin-bottom:20px;">` + window.generateEditableSOPRow({}, 0, sku, 'packerz') + `</div>`;
            if (area) area.innerHTML = window.safeHTML(h);
        } else {
            if (area) {
                area.innerHTML = window.safeHTML(
                    `<div style='padding:20px; color:red; font-weight:900;'>API Disconnect: ${e.message}</div>`
                );
            }
        }
    }
}

window.savePackerzSOPToDB = async function() {
    const sku = document.getElementById('packerzAdminRecipeSelect').value;
    if(!sku) return alert("Must select a Recipe first!");

    await executeWithButtonAction('btnSavePackerzSOP', 'UPLOADING PROTOCOLS...', '💾 SAVED SUCCESSFULLY!', async () => {
        let rows = document.querySelectorAll('#packerzSopEditorRowsWrapper .sop-step-row');
        let stepsArray = [];
        rows.forEach(r => {
            let richText = r.querySelector('.sop-text-rich').innerHTML;
            let attachments = [];
            r.querySelectorAll('.media-row').forEach(mr => {
                let typeSel = mr.querySelector('.m-type');
                let urlInp = mr.querySelector('.m-url');
                if (typeSel && urlInp) {
                    attachments.push({type: typeSel.value, url: urlInp.value});
                }
            });
            stepsArray.push({
                text: richText,
                attachments: attachments
            });
        });

        let rawQa = document.getElementById('packerzAdminQA').value;
        let qaLines = rawQa.trim() === '' ? [] : rawQa.split('\n').map(l=>l.trim());

        const payload = {
            internal_recipe_name: sku,
            required_box_sku: null,
            instruction_json: JSON.stringify({ steps: stepsArray, qaChecks: qaLines })
        };

        const { error } = await supabaseClient.from('pack_ship_sops').upsert(payload, { onConflict: 'internal_recipe_name' });
        if(error) throw error;
    }).catch(e => {
        console.error(e);
        if(typeof sysLog === 'function') sysLog(`Packerz Save Error: ${e.message}`, true);
        alert("CRITICAL SAVE ERROR: " + e.message);
    });
}

// --- PACKERZ ADMIN: UI Split Pane Resizer ---


// ============================================================
// SOP MEDIA PICKER — Supabase Storage 'sop-media' bucket
// ============================================================

const SOP_MEDIA_BUCKET = 'sop-media';
let currentSOPMediaFolder = '';   // '' = bucket root
window.activeSOPTextAreaId = window.activeSOPTextAreaId || 'packerzAdminQA'; // Memory for multi-module targeting

async function openSOPMediaPicker(taId = 'packerzAdminQA') {
    window.activeSOPTextAreaId = taId;
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
    grid.innerHTML = window.safeHTML(
        `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">Loading...</div>`
    );
    updateSOPMediaBreadcrumb();

    try {
        const { data, error } = await supabaseClient.storage.from(SOP_MEDIA_BUCKET).list(currentSOPMediaFolder, {
            limit: 300, sortBy: { column: 'name', order: 'asc' }
        });
        if (error) throw error;

        const folders = (data || []).filter(f => f.id === null && f.name !== '.emptyFolderPlaceholder');
        const files   = (data || []).filter(f => f.id !== null && f.name !== '.emptyFolderPlaceholder');

        if (folders.length === 0 && files.length === 0) {
            grid.innerHTML = window.safeHTML(
                `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">${currentSOPMediaFolder ? 'This folder is empty.' : 'No files yet. Upload your first image above.'}</div>`
            );
            return;
        }
        grid.innerHTML = window.safeHTML('');

        // Back-navigation card
        if (currentSOPMediaFolder) {
            const upCard = document.createElement('div');
            upCard.style.cssText = 'background:var(--bg-panel); border:1px dashed var(--border-color); border-radius:8px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:110px; gap:6px;';
            upCard.onmouseover = () => upCard.style.borderColor = '#0ea5e9';
            upCard.onmouseout  = () => upCard.style.borderColor = 'var(--border-color)';
            upCard.onclick = () => { const p = currentSOPMediaFolder.split('/'); p.pop(); navigateSOPMediaFolder(p.join('/')); };
            upCard.innerHTML = window.safeHTML(
                `<div style="font-size:28px; color:var(--text-muted);">⬆</div><div style="font-size:10px; color:var(--text-muted); font-weight:700;">Parent Folder</div>`
            );
            grid.appendChild(upCard);
        }

        // Folder cards
        folders.forEach(folder => {
            const fullPath = currentSOPMediaFolder ? `${currentSOPMediaFolder}/${folder.name}` : folder.name;
            const card = document.createElement('div');
            card.classList.add('grid-stack');
            card.style.cssText = 'background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; cursor:pointer; transition:all 0.2s; min-height:110px; padding:8px;';
            card.ondragover = (e) => { e.preventDefault(); card.style.borderColor = '#10b981'; card.style.backgroundColor = 'rgba(16,185,129,0.1)'; };
            card.ondragleave = (_e) => { card.style.borderColor = 'var(--border-color)'; card.style.backgroundColor = 'var(--bg-panel)'; };
            card.ondrop = (e) => sopHandleDrop(e, fullPath);
            card.onmouseover = () => { card.style.borderColor = '#10b981'; card.style.transform = 'translateY(-2px)'; };
            card.onmouseout  = () => { card.style.borderColor = 'var(--border-color)'; card.style.transform = ''; };

            card.innerHTML = window.safeHTML(`
                <div class="overlay-center-flex" style="flex-direction:column; gap:6px; z-index:0;" data-click="click_navigateSOPMediaFolder" data-path="${fullPath.replace(/"/g, '&quot;')}">
                    <div style="font-size:36px;">📁</div>
                    <div style="font-size:10px; color:var(--text-muted); text-align:center; word-break:break-word; font-weight:700;">${folder.name}</div>
                </div>
                <div class="top-right-action-flex" style="z-index:1;">
                    <button data-click="click_deleteSOPMedia" data-path="${fullPath.replace(/"/g, '&quot;')}" data-folder="true" style="background:rgba(239,68,68,0.15); border:none; color:#ef4444; border-radius:4px; width:22px; height:22px; font-size:10px; cursor:pointer; display:flex; justify-content:center; align-items:center;" title="Delete Folder">🗑️</button>
                </div>
            `);
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
            card.classList.add('grid-stack');
            card.ondragstart = (e) => sopHandleDragStart(e, filePath);
            card.style.cssText = 'background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; overflow:hidden; cursor:grab; transition:all 0.2s; display:flex; flex-direction:column;';
            card.onmouseover = () => { card.style.borderColor = '#0ea5e9'; card.style.transform = 'translateY(-2px)'; };
            card.onmouseout  = () => { card.style.borderColor = 'var(--border-color)'; card.style.transform = ''; };

            const contentHtml = isImg
                ? `<img src="${url}" loading="lazy" style="width:100%; height:110px; object-fit:cover; pointer-events:none;"><div style="padding:6px 8px; font-size:10px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;" title="${file.name}">${file.name}</div><div style="padding:0 8px 6px; font-size:10px; color:var(--text-muted); pointer-events:none;">${sizeKb} KB</div>`
                : `<div style="height:110px; display:flex; align-items:center; justify-content:center; font-size:36px; pointer-events:none;">📄</div><div style="padding:6px 8px; font-size:10px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;">${file.name}</div><div style="padding:0 8px 6px; font-size:10px; color:var(--text-muted); pointer-events:none;">${sizeKb} KB</div>`;

            card.innerHTML = window.safeHTML(`
                <div style="flex-grow:1; display:flex; flex-direction:column; z-index:0;" data-click="click_insertSOPToken" data-token="[IMG:${url.replace(/"/g, '&quot;')}]">${contentHtml}</div>
                <div class="top-right-action-flex" style="z-index:1;">
                    <button class="packerz-sop-delete-btn" data-click="click_deleteSOPMedia" data-path="${filePath.replace(/"/g, '&quot;')}" data-folder="false" style="background:rgba(239,68,68,0.85); border:1px solid #ef4444; color:white; border-radius:4px; width:22px; height:22px; font-size:10px; cursor:pointer; display:flex; justify-content:center; align-items:center;" title="Delete File">🗑️</button>
                </div>
            `);
            grid.appendChild(card);
        });
    } catch(e) {
        grid.innerHTML = window.safeHTML(
            `<div style="grid-column:1/-1; text-align:center; padding:20px; color:#ef4444; font-size:12px;">⚠️ Could not load media library: ${e.message}<br><span style="font-size:11px; color:var(--text-muted);">Ensure the '${SOP_MEDIA_BUCKET}' bucket exists with public read access.</span></div>`
        );
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
    if (window.activeWorkerPhotoTarget) {
        const urlMatch = token.match(/\[IMG:(https?:\/\/[^\]]+)\]/i);
        if (urlMatch) {
            const url = urlMatch[1];
            const targetDiv = document.getElementById(`worker-photo-res-${window.activeWorkerPhotoTarget}`);
            if (targetDiv) {
                targetDiv.style.display = 'block';
                const label = window.activeWorkerPhotoLabel || 'Camera Log';
                targetDiv.innerHTML = window.safeHTML(`
                    <img src="${url}" loading="lazy" style="max-height:100px; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in; display:inline-block;" data-click="click_openImage" data-url="${url}">
                    <input type="hidden" class="packerz-qa-input" data-label="${label}" value="${url}">
                `);
            }
        }
        window.activeWorkerPhotoTarget = null;
        window.activeWorkerPhotoLabel = null;
        closeSOPMediaPicker();
        return;
    }

    if (window.activeSOPTextAreaId === 'richText') {
        const urlMatch = token.match(/\[IMG:(https?:\/\/[^\]]+)\]/i);
        if (urlMatch) {
            const url = urlMatch[1];
            if (window.activeRichTextContainer) {
                window.activeRichTextContainer.focus();
                if (window.activeRichTextRange) {
                    let sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(window.activeRichTextRange);
                }
                document.execCommand('insertHTML', false, `<img src="${url}" style="max-height:100px; border-radius:6px; vertical-align:middle; cursor:zoom-in; margin:2px;" data-click="click_openImage" data-url="${url}">&nbsp;`);
            }
        }
        window.activeSOPTextAreaId = null;
        window.activeRichTextRange = null;
        window.activeRichTextContainer = null;
        closeSOPMediaPicker();
        return;
    }

    if (window.activeSOPTextAreaId === 'attachment') {
        const urlMatch = token.match(/\[IMG:(https?:\/\/[^\]]+)\]/i);
        if (urlMatch) {
            const url = urlMatch[1];
            if (window.activeAttachmentInput) {
                window.activeAttachmentInput.value = url;
                // Dispatch input event to trigger any unsaved changes state if needed
                window.activeAttachmentInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        window.activeSOPTextAreaId = null;
        window.activeAttachmentInput = null;
        closeSOPMediaPicker();
        return;
    }

    const ta = document.getElementById(window.activeSOPTextAreaId);
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

    if (window.activeSOPTextAreaId === 'packerzAdminQA' && typeof renderPackerzTelemetryPreview === 'function') {
        renderPackerzTelemetryPreview();
    } else if (window.activeSOPTextAreaId === 'productionAdminQA' && typeof renderProductionTelemetryPreview === 'function') {
        renderProductionTelemetryPreview();
    } else if (window.activeSOPTextAreaId === 'packerzLiveInlineQA' && typeof renderPackerzLiveInlineTelemetryPreview === 'function') {
        renderPackerzLiveInlineTelemetryPreview();
    } else if (window.activeSOPTextAreaId && window.activeSOPTextAreaId.startsWith('inlineSopQA_') && typeof inlineRenderTelemetryPreview === 'function') {
        inlineRenderTelemetryPreview(window.activeSOPTextAreaId.replace('inlineSopQA_', ''));
    }

    closeSOPMediaPicker();
}

window.click_workerTakePhoto = function(e) {
    if(typeof e !== 'undefined' && e) e.preventDefault();
    let ctx = e.target.dataset.ctx || e.target.closest('.worker-photo-btn')?.dataset.ctx;
    let label = e.target.dataset.label || e.target.closest('.worker-photo-btn')?.dataset.label || 'Camera Log';
    if(ctx) {
        window.activeWorkerPhotoTarget = ctx;
        window.activeWorkerPhotoLabel = label;
        window.activeSOPTextAreaId = null; // Clear out the editor context
        if(typeof openSOPSnapshotCamera === 'function') openSOPSnapshotCamera();
    }
};

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
        el.innerHTML = window.safeHTML(`<span style="color:#0ea5e9; font-weight:700;">📁 Root</span>`);
        return;
    }
    const parts = currentSOPMediaFolder.split('/');
    let html = `<span style="color:#0ea5e9; font-weight:700; cursor:pointer;" data-click="click_navigateSOPMediaFolder" data-path="">📁 Root</span>`;
    let cum = '';
    parts.forEach((p, i) => {
        cum += (i === 0 ? '' : '/') + p;
        const cp = cum;
        const last = i === parts.length - 1;
        html += ` <span style="color:var(--text-muted); margin:0 2px;">›</span> `;
        html += last
            ? `<span style="color:var(--text-heading); font-weight:900;">${p}</span>`
            : `<span style="color:#0ea5e9; cursor:pointer;" data-click="click_navigateSOPMediaFolder" data-path="${cp}">${p}</span>`;
    });
    el.innerHTML = window.safeHTML(html);
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
window.deleteSOPMedia = async function(path, isFolder) {
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

window.createSOPMediaFolder = async function() {
    const name = prompt('Enter folder name (letters, numbers, hyphens):');
    if (!name || !name.trim()) return;
    const safe = name.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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
window.closeSOPTokenGuide = function() { document.getElementById('sopTokenGuideModal').style.display = 'none'; }

// ============================================================
// SOP QA ARCHIVE — snapshot SOP at moment of QA sign-off
// Called from signoffPackerzQA() after sales_ledger update
// ============================================================

async function archiveSOPSnapshot(orderId, sku, recipeName, capturedTelemetry) {
    try {
        // Fallback recipeName if null, empty, or literally "null" to satisfy Postgres NOT NULL
        const finalRecipeName = (recipeName && recipeName !== 'null') ? recipeName : (sku || 'UNKNOWN_RECIPE');

        // Fetch the live SOP at the moment of sign-off (may be null for products without a formal SOP)
        const { data: sopRows } = await supabaseClient
            .from('pack_ship_sops')
            .select('instruction_json, required_box_sku')
            .eq('internal_recipe_name', finalRecipeName);
        
        const sopData = sopRows && sopRows.length > 0 ? sopRows[0] : null;
        const telemetryData = capturedTelemetry || [];

        const { error: insErr } = await supabaseClient.from('sop_archives').insert({
            order_id: orderId,
            internal_recipe_name: finalRecipeName,
            qa_passed_at: new Date().toISOString(),
            packer_telemetry: telemetryData,
            sop_snapshot: sopData ? JSON.parse(sopData.instruction_json || '{}') : null,
            required_box_sku: sopData ? (sopData.required_box_sku || '') : ''
        });

        if (insErr) {
            console.error('SOP archive write rejected:', insErr.message, insErr.details);
        }
    } catch(e) {
        console.warn('SOP archive write failed (non-critical):', e.message);
    }
}

// ============================================================
// SOP AUDIT LOG MODAL
// ============================================================

let sopAuditLogCache = [];

let sopAuditReturnToPackerz = false;

window.openSOPAuditLog = async function(fromPackerzPage = false) {
    sopAuditReturnToPackerz = fromPackerzPage;
    document.getElementById('sopAuditLogModal').style.display = 'flex';
    await loadSOPAuditLog();
}

window.closeSOPAuditLog = function() {
    document.getElementById('sopAuditLogModal').style.display = 'none';
    if (sopAuditReturnToPackerz) {
        sopAuditReturnToPackerz = false;
        document.getElementById('paneFulfillzSopAdmin').style.display = 'none';
    }
}

async function loadSOPAuditLog() {
    const body = document.getElementById('sopAuditLogBody');
    body.innerHTML = window.safeHTML(
        `<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading archive records...</div>`
    );

    try {
        const { data, error } = await supabaseClient
            .from('sop_archives')
            .select('*')
            .order('qa_passed_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const rawData = data || [];

        if (rawData.length > 0) {
            const orderIds = [...new Set(rawData.map(a => a.order_id))];
            const { data: ledgerData } = await supabaseClient
                .from('sales_ledger')
                .select('order_id, sale_date, assembly_completed_at, internal_fulfillment_status')
                .in('order_id', orderIds);

            let ledgerMap = {};
            if(ledgerData) ledgerData.forEach(row => ledgerMap[row.order_id] = row);

            // Filter out ghost archives where the order was unarchived back to Awaiting Assembly
            const validData = rawData.filter(a => {
                const lp = ledgerMap[a.order_id];
                if (!lp || lp.internal_fulfillment_status !== 'Completed') return false;

                a._sale_date = lp.sale_date;
                a._completed_at = lp.assembly_completed_at;
                return true;
            });

            // Group valid items purely by order_id
            const orderGroups = {};
            validData.forEach(a => {
                let k = a.order_id;
                if (!orderGroups[k]) {
                    orderGroups[k] = {
                        order_id: a.order_id,
                        _sale_date: a._sale_date,
                        _completed_at: a._completed_at,
                        items: {}
                    };
                }

                // Deduplicate item-level snapshots
                let recipeKey = a.internal_recipe_name;
                if (!orderGroups[k].items[recipeKey] || new Date(a.qa_passed_at) > new Date(orderGroups[k].items[recipeKey].qa_passed_at)) {
                    orderGroups[k].items[recipeKey] = a;
                }
            });

            // Convert to array and sort by latest completion mathematically map down
            sopAuditLogCache = Object.values(orderGroups).map(g => {
                g.items = Object.values(g.items);
                return g;
            });
            sopAuditLogCache.sort((a,b) => new Date(b._completed_at) - new Date(a._completed_at));
            // Convert to array and sort by latest completion mathematically map down
            sopAuditLogCache = Object.values(orderGroups).map(g => {
                g.items = Object.values(g.items);
                return g;
            });
            sopAuditLogCache.sort((a,b) => new Date(b._completed_at) - new Date(a._completed_at));

        } else {
            sopAuditLogCache = [];
        }

        renderSOPAuditLogRows(sopAuditLogCache);
    } catch(e) {
        body.innerHTML = window.safeHTML(`<div style="text-align:center; padding:20px; color:#ef4444;">
            ⚠️ Could not load audit log: ${e.message}<br>
            <span style="font-size:11px; color:var(--text-muted);">Make sure the 'sop_archives' table exists in Supabase.</span>
        </div>`);
    }
}

window.filterSOPAuditLog = function() {
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
        body.innerHTML = window.safeHTML(
            `<div style="text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">No QA archive records found yet. Records are created automatically when a QA sign-off is completed.</div>`
        );
        return;
    }

    body.innerHTML = window.safeHTML(rows.map((order, i) => {
        const placedDt = order._sale_date ? new Date(order._sale_date).toLocaleString() : 'N/A';
        const completedDt = order._completed_at ? new Date(order._completed_at).toLocaleString() : 'N/A';

        let totalChecks = 0;
        let totalPassed = 0;
        let recipeNames = [];

        const itemsHtml = (order.items || []).map((item, _idx) => {
            const telemetry = Array.isArray(item.packer_telemetry) ? item.packer_telemetry : [];
            const checks    = telemetry.filter(t => t.type === 'check');
            const inputs    = telemetry.filter(t => t.type === 'input');
            const passed    = checks.filter(c => c.valid).length;
            const total     = checks.length;

            totalChecks += total;
            totalPassed += passed;
            recipeNames.push(item.internal_recipe_name);

            return `
            <div style="margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:15px;">
                <div style="font-size:13px; font-weight:900; color:#0ea5e9; margin-bottom:10px;">📦 ${item.internal_recipe_name} <span style="font-size:10px; color:var(--text-muted); float:right;">Signed: ${item.qa_passed_at ? new Date(item.qa_passed_at).toLocaleTimeString() : 'N/A'}</span></div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div>
                        <div style="font-size:11px; font-weight:900; color:#10b981; letter-spacing:1px; margin-bottom:8px;">TELEMETRY CHECKS</div>
                        ${checks.length === 0 ? '<div style="color:var(--text-muted); font-size:12px; font-style:italic;">None recorded</div>' :
                          checks.map(c => `<div style="font-size:12px; padding:3px 0; color:${c.valid ? '#10b981' : '#ef4444'};">${c.valid ? '✅' : '❌'} ${c.text || ''}</div>`).join('')}
                        ${inputs.length > 0 ? `<div style="font-size:11px; font-weight:900; color:#F59E0B; letter-spacing:1px; margin:10px 0 6px;">INPUT VALUES</div>
                        ${inputs.map(inp => `<div style="font-size:12px; padding:3px 0; color:var(--text-muted);">📝 ${inp.text}: <b style="color:var(--text-main); font-family:monospace;">${inp.value || '(blank)'}</b></div>`).join('')}` : ''}
                    </div>
                    <div>
                        <button class="packerz-blueprint-btn" data-click="click_toggleOriginalBlueprint" style="background:transparent; border:1px solid #0ea5e9; color:#0ea5e9; padding:6px 12px; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer;">View Original Blueprint</button>
                        <div style="display:none; font-size:11px; color:var(--text-muted); background:rgba(0,0,0,0.15); padding:10px; border-radius:6px; max-height:150px; overflow-y:auto; font-family:monospace; line-height:1.6; margin-top:8px;">
                            <div style="font-size:10px; font-weight:900; color:#0ea5e9; letter-spacing:1px; margin-bottom:6px;">IMMUTABLE SNAPSHOT:</div>
                            ${formatSOPSnapshotPreview(item.sop_snapshot)}
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        let sumRecipes = recipeNames.join(', ');
        if (sumRecipes.length > 30) sumRecipes = sumRecipes.substring(0, 27) + '...';
        if (!sumRecipes) sumRecipes = "LEGACY ARCHIVE ITEM";

        return `
        <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:10px; overflow:hidden;">
            <!-- Row header —— always visible -->
            <div class="packerz-audit-row" style="display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer;"
                 data-click="click_toggleSOPAuditDetail" data-target="sop-audit-detail-${i}">
                <div style="background:#10b981; color:white; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:900; flex-shrink:0;">✓ QA PASSED</div>
                <div style="font-weight:900; color:var(--text-heading); font-size:13px; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-shrink:0;">${order.order_id || '—'}</div>
                <div style="font-size:12px; color:#0ea5e9; font-weight:700; flex:1;">${sumRecipes} <span style="color:var(--text-muted); font-size:10px;">(${(order.items || []).length} items)</span></div>

                <!-- Timestamp Block -->
                <div style="display:flex; flex-direction:column; gap:2px; flex-shrink:0; text-align:right;">
                    <div style="font-size:10px; color:var(--text-muted);"><span style="color:#f59e0b; font-weight:bold;">PLACED:</span> ${placedDt}</div>
                    <div style="font-size:10px; color:var(--text-muted);"><span style="color:#10b981; font-weight:bold;">CLOSED:</span> ${completedDt}</div>
                </div>

                <div style="font-size:11px; color:${totalPassed === totalChecks && totalChecks > 0 ? '#10b981' : '#f59e0b'}; font-weight:700; flex-shrink:0; margin-left:10px;">${totalPassed}/${totalChecks} checks</div>
                <button class="packerz-unarchive-btn" data-click="click_unarchivePackerzOrder" data-id="${order.order_id}" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.5); padding:4px 12px; border-radius:4px; font-size:10px; font-weight:900; cursor:pointer; flex: none; white-space: nowrap; width: max-content;">UNARCHIVE</button>
                <div style="color:var(--text-muted); font-size:12px; margin-left:8px;">▼</div>
            </div>

            <!-- Expandable detail -->
            <div id="sop-audit-detail-${i}" style="display:none; padding:16px; border-top:1px solid var(--border-color); background:var(--bg-body);">
                ${itemsHtml}
            </div>
        </div>`;
    }).join(""));
}

window.toggleSOPAuditDetail = function(id) {
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
        try { await _html5QrScanner.stop(); } catch(e) { console.error(e); }
        _html5QrScanner = null;
    }
    // Clear the DOM element so html5-qrcode can re-mount
    const readerEl = document.getElementById('sopCameraReader');
    readerEl.innerHTML = window.safeHTML('');

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
        try { await _html5QrScanner.stop(); } catch(e) { console.error(e); }
        _html5QrScanner = null;
    }
    document.getElementById('sopCameraModal').style.display = 'none';
    document.getElementById('sopCameraReader').innerHTML = window.safeHTML('');
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
        if (btn)    { btn.innerText = '✓ SCANNED'; btn.className = 'btn-green-neon'; btn.disabled = true; }
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

// --- PACKERZ EVENT DELEGATION ---
if (!window.isPackerzListenerBound) {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-app-click]');
        if (!btn) return;
        const action = btn.dataset.appClick;
        
        if (action === 'openSopTerminal') {
            if(typeof openPackerzSopTerminal === 'function') openPackerzSopTerminal(window.currentPackerzGroupedOrders[btn.dataset.orderId]);
        } else if (action === 'loadActiveSOP') {
            if(typeof window.loadActiveSOP === 'function') window.loadActiveSOP(btn.dataset.orderId, btn.dataset.sku, btn.dataset.recipe, 'packerz');
        } else if (action === 'signoffQA') {
            if(typeof signoffPackerzQA === 'function') signoffPackerzQA();
        } else if (action === 'openSOPMediaInline') {
            window.activeSOPTextAreaId = 'packerzLiveInlineQA';
            if(typeof openSOPMediaPicker === 'function') openSOPMediaPicker('packerzLiveInlineQA');
        } else if (action === 'openSOPTokenGuide') {
            if(typeof openSOPTokenGuide === 'function') openSOPTokenGuide();
        } else if (action === 'openSOPSnapshotCameraInline') {
            if(typeof click_openSOPSnapshotCameraInline === 'function') click_openSOPSnapshotCameraInline();
        } else if (action === 'togglePackerzSOPPreview') {
            if(typeof toggleHorizontalPreview === 'function') toggleHorizontalPreview('packerzInlineSopLeftPane', 'packerzLiveInlinePreviewCol', btn);
        } else if (action === 'saveInlineSOP') {
            if(typeof savePackerzLiveInlineSOP === 'function') savePackerzLiveInlineSOP();
        } else if (action === 'addInlineSOPRow') {
            if(typeof window.addPackerzSOPRow === 'function') window.addPackerzSOPRow(btn);
        } else if (action === 'openMediaContext') {
            if(typeof openMediaModal === 'function') openMediaModal(btn.dataset.url, btn.dataset.type);
        } else if (action === 'stopProp') {
            e.stopPropagation();
        } else if (action === 'openWindowBlank') {
            e.preventDefault(); e.stopPropagation();
            window.open(btn.dataset.url, '_blank');
        } else if (action === 'openScanner') {
            if(typeof openCameraScanner === 'function') openCameraScanner(btn.dataset.expected, btn.dataset.rowid, btn.dataset.item);
        } else if (action === 'executeCompletion') {
            if(typeof executePackerzCompletion === 'function') executePackerzCompletion(btn.dataset.orderId);
        }
    });

    document.addEventListener('change', (e) => {
        const el = e.target;
        if (el.dataset.appChange === 'updateItemType') {
            if(typeof updatePackerzItemType === 'function') updatePackerzItemType(el.dataset.orderId, el.dataset.sku, el.value, el.dataset.recipe);
        } else if (el.dataset.appChange === 'sopSignoffCheck') {
            if(typeof checkPackerzSopSignoffState === 'function') checkPackerzSopSignoffState();
        }
    });

    document.addEventListener('input', (e) => {
        const el = e.target;
        if (el.dataset.appInput === 'renderSOPPreview') {
            if(typeof renderPackerzLiveInlineTelemetryPreview === 'function') renderPackerzLiveInlineTelemetryPreview();
        }
    });

    document.addEventListener('keyup', (e) => {
        const el = e.target;
        if (el.dataset.appKeyup === 'sopSignoffCheck') {
            if(typeof checkPackerzSopSignoffState === 'function') checkPackerzSopSignoffState();
        }
    });

    document.addEventListener('mousedown', (e) => {
        const el = e.target;
        if (el.dataset.appMousedown === 'initPackerzResize') {
            if(typeof window.initUnifiedSopResizer === 'function') {
                const targetLeftPane = document.getElementById('packerzInlineSopLeftPane') ? 'packerzInlineSopLeftPane' : 'packerzLiveSopLeftPane';
                window.initUnifiedSopResizer(e, targetLeftPane, 'packerzLiveSopSplitWrapper', null, true);
            }
        }
    });

    window.isPackerzListenerBound = true;
}

// ============================================================
// SOP WEBRTC CAMERA SNAPSHOT (AUTHORING)
// ============================================================

let sopSnapshotStream = null;

window.click_openSOPSnapshotCameraInline = function(_e) {
    window.activeSOPTextAreaId = 'packerzLiveInlineQA';
    openSOPSnapshotCamera();
};

window.click_openSOPSnapshotCamera_packerz = function(e) {
    if (typeof e !== 'undefined' && e) e.preventDefault();
    window.activeSOPTextAreaId = 'packerzAdminQA';
    openSOPSnapshotCamera();
};

window.click_openSOPSnapshotCamera = function(_e) {
    if(window.activeSOPTextAreaId) {
        openSOPSnapshotCamera();
    } else {
        alert("Please click this from within an active SOP editor text area.");
    }
};

window.openSOPSnapshotCamera = async function() {
    const modal = document.getElementById('sopSnapshotModal');
    const video = document.getElementById('sopSnapshotVideo');
    const statusEl = document.getElementById('sopSnapshotStatus');
    const captureBtn = document.getElementById('btnSOPSnapshotCapture');
    
    if(!modal || !video) return;
    
    modal.style.display = 'flex';
    statusEl.innerText = "Requesting camera access...";
    captureBtn.style.opacity = '0.5';
    captureBtn.style.cursor = 'not-allowed';
    
    try {
        sopSnapshotStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        video.srcObject = sopSnapshotStream;
        video.onloadedmetadata = () => {
            video.play();
            statusEl.innerText = "Live Stream Active. Ready to Capture.";
            captureBtn.style.opacity = '1';
            captureBtn.style.cursor = 'pointer';
        };
    } catch(e) {
        statusEl.innerText = "Camera Access Denied or Unavailable: " + e.message;
        statusEl.style.color = '#ef4444';
        console.error(e);
    }
};

window.click_closeSOPSnapshotCamera = function() {
    const modal = document.getElementById('sopSnapshotModal');
    const video = document.getElementById('sopSnapshotVideo');
    
    if(sopSnapshotStream) {
        sopSnapshotStream.getTracks().forEach(track => track.stop());
        sopSnapshotStream = null;
    }
    if(video) video.srcObject = null;
    if(modal) modal.style.display = 'none';
};

window.click_captureSOPSnapshot = function() {
    const video = document.getElementById('sopSnapshotVideo');
    const canvas = document.getElementById('sopSnapshotCanvas');
    const statusEl = document.getElementById('sopSnapshotStatus');
    const captureBtn = document.getElementById('btnSOPSnapshotCapture');
    
    if(!video || !canvas || !sopSnapshotStream) return;
    if(captureBtn.style.cursor === 'not-allowed') return;
    
    // Play a brief shutter sound if possible
    try {
        let beep = document.getElementById('scanner-beep');
        if(beep) {
            beep.currentTime = 0;
            beep.play().catch(()=>{});
        }
    } catch(e) { console.warn('Beep playback failed:', e); }
    
    statusEl.innerText = "📸 Capturing and preparing upload...";
    captureBtn.style.opacity = '0.5';
    captureBtn.style.cursor = 'not-allowed';
    
    // Draw current video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to Blob and then File
    canvas.toBlob((blob) => {
        if(!blob) {
            statusEl.innerText = "❌ Capture failed. Please try again.";
            captureBtn.style.opacity = '1';
            captureBtn.style.cursor = 'pointer';
            return;
        }
        
        // Generate a valid File object for the existing upload logic
        const timestamp = Date.now();
        const file = new File([blob], `sop-snapshot-${timestamp}.jpg`, { type: 'image/jpeg' });
        
        // Stop stream and close modal instantly for snappy UX
        click_closeSOPSnapshotCamera();
        
        // Use the existing uploadSOPMedia function
        if(typeof uploadSOPMedia === 'function') {
            uploadSOPMedia(file);
        } else {
            console.error("uploadSOPMedia function not found.");
            alert("Upload failed. Media uploader missing.");
        }
    }, 'image/jpeg', 0.85); // 85% quality JPEG
};
