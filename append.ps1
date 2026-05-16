$content = @"
window.tePopulateTagFilter = function() {
    const filterSelect = document.getElementById('te-tag-filter');
    if (!filterSelect) return;
    
    let html = '<option value=\"\">All Tags</option>';
    let sortedTags = [...taskEngineDB.tagz].sort((a, b) => a.name.localeCompare(b.name));
    sortedTags.forEach(t => {
        html += `<option value=\"`${t.id}`\">`${t.name}</option>`;
    });
    filterSelect.innerHTML = html;
};

window.keyup_teFilterTaskSearch = function() {
    if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
};

window.change_teFilterTaskSearch = function() {
    if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
};
"@

Add-Content task-engine.js "`n"
Add-Content task-engine.js $content
