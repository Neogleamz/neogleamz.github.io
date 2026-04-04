// ============================================================
// LABELZ MODULE — Neogleamz Custom Label Manager
// ============================================================
// Manages custom thermal-printed labels as first-class recipes.
// Labels are tracked through the same cost/stock system as all
// other product types (Retail, Sub-Assembly, 3D Print).
// ============================================================

const LABEL_STORAGE_BUCKET = 'sop-media'; // Reuse existing bucket under labelz/ folder

let labelzDB = []; // cache from label_designs
let labelzCurrentEdit = null; // label being created/edited

// ============================================================
// DATA LAYER
// ============================================================

async function loadLabelzData() {
    try {
        const { data, error } = await supabaseClient
            .from('label_designs')
            .select('*')
            .order('product_name', { ascending: true });
        if (error) throw error;
        labelzDB = data || [];
        renderLabelzGrid();
        buildBarcodzCache(); // refresh BARCODZ to include labels
    } catch(e) {
        sysLog('LABELZ load error: ' + e.message, true);
        const grid = document.getElementById('labelzGrid');
        if (grid) grid.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">⚠️ Could not load label designs.<br><small>Make sure the <code>label_designs</code> table exists in Supabase.</small></div>`;
    }
}

// ============================================================
// GRID RENDER
// ============================================================

function renderLabelzGrid() {
    const grid = document.getElementById('labelzGrid');
    if (!grid) return;
    const search = document.getElementById('labelzSearch')?.value.toLowerCase() || '';

    const filtered = labelzDB.filter(l =>
        l.product_name.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);font-style:italic;">
            <div style="font-size:48px;margin-bottom:12px;">🏷️</div>
            ${search ? 'No labels match your search.' : 'No custom labels yet. Click <strong>+ NEW LABEL</strong> to create your first one.'}
        </div>`;
        return;
    }

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;">';

    filtered.forEach(label => {
        const stockData = typeof productsDB !== 'undefined' && productsDB[label.product_name];
        const stockQty = stockData ? (stockData._stock_qty || 0) : 0;
        const lowThreshold = 10;
        const stockColor = stockQty === 0 ? '#ef4444' : stockQty < lowThreshold ? '#f59e0b' : '#10b981';
        const stockEmoji = stockQty === 0 ? '🔴' : stockQty < lowThreshold ? '🟡' : '🟢';

        const hasThumbnail = label.file_url && !label.file_url.toLowerCase().endsWith('.pdf');
        const hasPDF = label.file_url && label.file_url.toLowerCase().endsWith('.pdf');
        const hasLayout = label.layout_json && Object.keys(label.layout_json).length > 0;

        html += `
        <div style="background:var(--bg-panel);border:1px solid var(--border-color);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px;transition:border-color 0.2s;" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--border-color)'">

            <!-- Header row -->
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="font-size:26px;flex-shrink:0;">${label.emoji || '🏷️'}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:900;color:var(--text-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${label.product_name}">${label.product_name}</div>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${label.label_size || '2.25x1.25'}"</div>
                </div>
                <div style="font-size:11px;font-weight:800;color:${stockColor};flex-shrink:0;">${stockEmoji} ${stockQty}</div>
            </div>

            <!-- Thumbnail -->
            ${hasThumbnail ? `<img src="${label.file_url}" style="width:100%;height:80px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid var(--border-color);">` :
              hasPDF ? `<div style="height:80px;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,0.1);border-radius:6px;border:1px dashed #ef4444;color:#ef4444;font-weight:800;font-size:13px;">📄 PDF Label</div>` :
              hasLayout ? `<div style="height:80px;display:flex;align-items:center;justify-content:center;background:rgba(16,185,129,0.08);border-radius:6px;border:1px dashed #10b981;color:#10b981;font-weight:800;font-size:12px;">🎨 Custom Layout</div>` :
              `<div style="height:80px;display:flex;align-items:center;justify-content:center;background:var(--bg-bar);border-radius:6px;color:var(--text-muted);font-size:11px;font-style:italic;">No design yet</div>`}

            <!-- Badge row -->
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${label.file_url ? `<span style="font-size:9px;font-weight:800;background:rgba(14,165,233,0.15);color:#0ea5e9;padding:2px 6px;border-radius:8px;">📎 FILE</span>` : ''}
                ${hasLayout ? `<span style="font-size:9px;font-weight:800;background:rgba(16,185,129,0.15);color:#10b981;padding:2px 6px;border-radius:8px;">🎨 LAYOUT</span>` : ''}
                <span style="font-size:9px;font-weight:800;background:rgba(139,92,246,0.15);color:#8b5cf6;padding:2px 6px;border-radius:8px;">LABEL</span>
            </div>

            <!-- Action buttons -->
            <div style="display:flex;gap:6px;margin-top:auto;">
                <button onclick="addLabelzToSpool('${label.product_name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}', '${(label.emoji||'🏷️')}')" style="flex:1;background:#3b82f6;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;">➕ Spool</button>
                <button onclick="openEditLabelModal('${label.product_name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')" style="background:var(--bg-bar);color:var(--text-main);border:1px solid var(--border-color);padding:6px 10px;border-radius:6px;font-size:11px;cursor:pointer;">✏️</button>
                ${label.file_url ? `<button onclick="printLabelFile('${label.file_url.replace(/'/g,"\\'")}','${hasPDF?'pdf':'img'}')" style="background:var(--bg-bar);color:#10b981;border:1px solid #10b981;padding:6px 10px;border-radius:6px;font-size:11px;cursor:pointer;">🖨️</button>` : ''}
            </div>
        </div>`;
    });

    html += '</div>';
    grid.innerHTML = html;
}

// ============================================================
// SPOOL INTEGRATION (shared with barcodz)
// ============================================================

function addLabelzToSpool(name, emoji) {
    const slug = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().substring(0, 30);
    if (typeof addBarcodzToSpool === 'function') {
        addBarcodzToSpool(name, slug, emoji, 'Custom Label');
    }
    // Visual feedback
    setMasterStatus(`${emoji} ${name} added to spool`, 'mod-success');
    setTimeout(() => setMasterStatus('Ready.', 'status-idle'), 2000);
}

// ============================================================
// PRINT LABEL FILE (uploaded image / PDF)
// ============================================================

function printLabelFile(url, type) {
    if (type === 'pdf') {
        window.open(url, '_blank');
        return;
    }
    // Image: open in a minimal print window
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`<html><head><title>Label Print</title><style>
        body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;}
        img{max-width:100%;max-height:100vh;object-fit:contain;}
        @media print{body{margin:0;}img{width:100%;height:auto;}}
    </style></head><body><img src="${url}" onload="window.print();setTimeout(()=>window.close(),1000)"></body></html>`);
    win.document.close();
}

// ============================================================
// CREATE / EDIT MODAL
// ============================================================

const EMOJI_PALETTE = ['🏷️','📦','🎁','🧴','💊','🍬','🎨','🧲','⚙️','🔩','🔖','📌','🔑','💎','🌟','✨','🛍️','📋','🗂️','📁','💼','🧶','🧵','🖊️','🖋️','📝','🎀','🎗️','🎫','🎟️','🔷','🔶','🟣','🟢','🔴','🟡'];

function openCreateLabelModal() {
    labelzCurrentEdit = null;
    document.getElementById('labelzModalTitle').innerText = '+ Create New Label';
    document.getElementById('labelzProductName').value = '';
    document.getElementById('labelzEmojiDisplay').innerText = '🏷️';
    document.getElementById('labelzSelectedEmoji').value = '🏷️';
    document.getElementById('labelzLabelSize').value = '2.25x1.25';
    document.getElementById('labelzFilePreview').innerHTML = '';
    document.getElementById('labelzFileUploadStatus').style.display = 'none';
    document.getElementById('labelzLayoutArea').value = '';
    document.getElementById('labelzModal').style.display = 'flex';
}

function openEditLabelModal(name) {
    const label = labelzDB.find(l => l.product_name === name);
    if (!label) return;
    labelzCurrentEdit = label;
    document.getElementById('labelzModalTitle').innerText = `✏️ Edit: ${name}`;
    document.getElementById('labelzProductName').value = name;
    document.getElementById('labelzEmojiDisplay').innerText = label.emoji || '🏷️';
    document.getElementById('labelzSelectedEmoji').value = label.emoji || '🏷️';
    document.getElementById('labelzLabelSize').value = label.label_size || '2.25x1.25';
    document.getElementById('labelzLayoutArea').value = label.layout_json ? JSON.stringify(label.layout_json, null, 2) : '';
    document.getElementById('labelzFileUploadStatus').style.display = 'none';

    // Show existing file preview
    const preview = document.getElementById('labelzFilePreview');
    if (label.file_url) {
        const isPDF = label.file_url.toLowerCase().endsWith('.pdf');
        preview.innerHTML = isPDF
            ? `<a href="${label.file_url}" target="_blank" style="color:#ef4444;font-weight:800;font-size:12px;">📄 ${label.file_name || 'View PDF'}</a>`
            : `<img src="${label.file_url}" style="max-height:80px;max-width:100%;border-radius:6px;border:1px solid var(--border-color);">`;
    } else {
        preview.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">No file uploaded yet.</span>';
    }

    document.getElementById('labelzModal').style.display = 'flex';
}

function closeLabelzModal() {
    document.getElementById('labelzModal').style.display = 'none';
    labelzCurrentEdit = null;
}

function pickLabelEmoji(emoji) {
    document.getElementById('labelzEmojiDisplay').innerText = emoji;
    document.getElementById('labelzSelectedEmoji').value = emoji;
    // Collapse picker
    document.getElementById('labelzEmojiPicker').style.display = 'none';
}

function toggleLabelEmojiPicker() {
    const picker = document.getElementById('labelzEmojiPicker');
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
}

async function uploadLabelFile(file) {
    if (!file) return null;
    const status = document.getElementById('labelzFileUploadStatus');
    status.style.display = 'block';
    status.style.color = '#0ea5e9';
    status.innerText = `⬆ Uploading ${file.name}...`;

    try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `labelz/${Date.now()}-${safeName}`;
        const { error } = await supabaseClient.storage.from(LABEL_STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: urlData } = supabaseClient.storage.from(LABEL_STORAGE_BUCKET).getPublicUrl(path);
        status.style.color = '#10b981';
        status.innerText = `✅ Uploaded successfully!`;

        // Preview
        const preview = document.getElementById('labelzFilePreview');
        const isPDF = file.name.toLowerCase().endsWith('.pdf');
        preview.innerHTML = isPDF
            ? `<a href="${urlData.publicUrl}" target="_blank" style="color:#ef4444;font-weight:800;font-size:12px;">📄 ${file.name}</a>`
            : `<img src="${urlData.publicUrl}" style="max-height:80px;max-width:100%;border-radius:6px;">`;

        return { url: urlData.publicUrl, name: file.name };
    } catch(e) {
        status.style.color = '#ef4444';
        status.innerText = `❌ Upload failed: ${e.message}`;
        return null;
    }
}

async function saveLabelRecipe() {
    const name = document.getElementById('labelzProductName').value.trim();
    if (!name) return alert('Label name is required.');

    const emoji = document.getElementById('labelzSelectedEmoji').value || '🏷️';
    const size = document.getElementById('labelzLabelSize').value;
    const layoutRaw = document.getElementById('labelzLayoutArea').value.trim();

    let layout_json = null;
    if (layoutRaw) {
        try { layout_json = JSON.parse(layoutRaw); } catch(e) { return alert('Layout JSON is invalid. Leave blank or fix the syntax.'); }
    }

    // Handle file upload if new file was chosen
    const fileInput = document.getElementById('labelzFileInput');
    let fileData = null;
    if (fileInput.files && fileInput.files[0]) {
        fileData = await uploadLabelFile(fileInput.files[0]);
        if (!fileData) return; // upload failed
    }

    const payload = {
        product_name: name,
        emoji,
        label_size: size,
        layout_json,
        updated_at: new Date().toISOString()
    };
    if (fileData) {
        payload.file_url = fileData.url;
        payload.file_name = fileData.name;
    }

    try {
        setMasterStatus('Saving label...', 'mod-working');
        const { error } = await supabaseClient.from('label_designs').upsert(payload, { onConflict: 'product_name' });
        if (error) throw error;

        // Also ensure product_recipes has is_label=true for this product name
        const { error: e2 } = await supabaseClient.from('product_recipes').upsert({
            product_name: name,
            components: productsDB[name] || [],
            is_label: true,
            label_emoji: emoji,
            is_subassembly: false,
            is_3d_print: false,
            print_time_mins: 0,
            labor_time_mins: 0,
            labor_rate_hr: 0,
            msrp: 0,
            wholesale_price: 0
        }, { onConflict: 'product_name', ignoreDuplicates: false });
        // e2 is non-critical if is_label column doesn't exist yet
        if (e2) sysLog('product_recipes is_label update: ' + e2.message, true);

        // Update local cache
        if (!productsDB[name]) { productsDB[name] = []; productsDB[name].is_label = true; }
        if (typeof isSubassemblyDB !== 'undefined') isSubassemblyDB[name] = false;

        setMasterStatus('Label saved!', 'mod-success');
        setTimeout(() => setMasterStatus('Ready.', 'status-idle'), 2000);
        closeLabelzModal();
        await loadLabelzData();
        if (typeof renderProductList === 'function') renderProductList();
    } catch(e) {
        sysLog('saveLabelRecipe: ' + e.message, true);
        setMasterStatus('Error saving', 'mod-error');
    }
}

async function deleteLabelRecipe(name) {
    if (!confirm(`Permanently delete label "${name}"? This cannot be undone.`)) return;
    try {
        setMasterStatus('Deleting...', 'mod-working');
        await supabaseClient.from('label_designs').delete().eq('product_name', name);
        setMasterStatus('Deleted!', 'mod-success');
        setTimeout(() => setMasterStatus('Ready.', 'status-idle'), 2000);
        await loadLabelzData();
    } catch(e) {
        sysLog('deleteLabelRecipe: ' + e.message, true);
        setMasterStatus('Error', 'mod-error');
    }
}

// ============================================================
// STOCK / KPI
// ============================================================

function getLabelStockCount() {
    if (typeof productsDB === 'undefined') return 0;
    return labelzDB.length;
}

// ============================================================
// BARCODE INTEGRATION — called from buildBarcodzCache
// ============================================================

function getLabelzForBarcodz() {
    return labelzDB.map(l => ({
        name: l.product_name,
        slug: l.product_name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().substring(0, 30),
        type: 'Custom Label',
        icon: l.emoji || '🏷️',
        isCatalog: false,
        isLabel: true,
        fileUrl: l.file_url || null
    }));
}

// ============================================================
// INIT
// ============================================================

function initLabelzPane() {
    loadLabelzData();
}
