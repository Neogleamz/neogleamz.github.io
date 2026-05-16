$content = @"
window.teOpenTagManager = function() {
    const modal = document.getElementById('te-tag-manager-modal');
    if (modal) modal.style.display = 'flex';
    window.teRenderTagManagerList();
};

window.teCloseTagManager = function() {
    const modal = document.getElementById('te-tag-manager-modal');
    if (modal) modal.style.display = 'none';
};

window.teRenderTagManagerList = function() {
    const list = document.getElementById('te-tag-mngr-list');
    if (!list) return;
    
    let html = '';
    let sortedTags = [...taskEngineDB.tagz].sort((a, b) => a.name.localeCompare(b.name));
    
    if (sortedTags.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); font-size:12px; font-style:italic;">No tags created yet.</div>';
        return;
    }
    
    sortedTags.forEach(t => {
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.05); border-radius:6px;">
            <div style="display:flex; align-items:center; gap:10px; color:white; font-size:13px; font-weight:bold;">
                <span style="width:16px; height:16px; border-radius:50%; background:${t.color_hex || '#64748b'};"></span> ${t.name}
            </div>
            <button class="btn-red-muted" data-click="click_teDeleteTag" data-tag-id="`${t.id}`" style="padding:4px 8px; font-size:10px;">🗑️ Delete</button>
        </div>`;
    });
    
    list.innerHTML = html;
};

window.teCreateTagFromManager = async function() {
    const nameInput = document.getElementById('te-tag-mngr-name');
    const colorInput = document.getElementById('te-tag-mngr-color');
    if (!nameInput || !colorInput) return;
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) {
        alert('Tag name cannot be empty.');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.from('tagz').insert([{ name: name, color_hex: color }]).select();
        if (error) throw error;
        
        if (data && data.length > 0) {
            taskEngineDB.tagz.push(data[0]);
            nameInput.value = '';
            window.teRenderTagManagerList();
            if (typeof window.tePopulateTagFilter === 'function') window.tePopulateTagFilter();
        }
    } catch(e) {
        console.error('[TaskEngine] Create tag failed', e);
        alert('Failed to create tag. Check console for details.');
    }
};

window.teDeleteTag = async function(element) {
    const tagId = element.getAttribute('data-tag-id');
    if (!tagId) return;
    
    const tag = taskEngineDB.tagz.find(t => t.id === tagId);
    if (!tag) return;
    
    if (!confirm(`Are you sure you want to delete the tag \"${tag.name}\"? This will remove it from all tasks.`)) return;
    
    try {
        const { error } = await supabaseClient.from('tagz').delete().eq('id', tagId);
        if (error) throw error;
        
        // Remove locally
        taskEngineDB.tagz = taskEngineDB.tagz.filter(t => t.id !== tagId);
        
        // Cleanup tasks that had this tag
        taskEngineDB.taskz.forEach(t => {
            if (t.metadata && t.metadata.tag_ids && t.metadata.tag_ids.includes(tagId)) {
                t.metadata.tag_ids = t.metadata.tag_ids.filter(id => id !== tagId);
                // Note: we don't spam Supabase with updates here to save requests, 
                // the tag is gone so it just won't render. 
                // A better approach would be to bulk update or just let it naturally resolve.
            }
        });
        
        window.teRenderTagManagerList();
        if (typeof window.tePopulateTagFilter === 'function') window.tePopulateTagFilter();
        if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
        if (window.currentOpenTaskId) window.teRenderTagEditor(window.currentOpenTaskId);
        
    } catch(e) {
        console.error('[TaskEngine] Delete tag failed', e);
        alert('Failed to delete tag. Check console for details.');
    }
};
"@

Add-Content task-engine.js "`n"
Add-Content task-engine.js $content
