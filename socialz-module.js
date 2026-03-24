// --- Global Helpers ---
        function handleAvatarError(img) {
            const tt = img.getAttribute('data-tt'), yt = img.getAttribute('data-yt'), fb = img.getAttribute('data-fb'), p = img.getAttribute('data-provider');
            if (p === 'tiktok') { 
                if (yt) { img.setAttribute('data-provider', 'youtube'); img.src = `https://unavatar.io/youtube/${yt}?fallback=false`; } 
                else if (fb) { img.setAttribute('data-provider', 'facebook'); img.src = `https://unavatar.io/facebook/${fb}?fallback=false`; } 
                else img.style.display = 'none'; 
            }
            else if (p === 'youtube') { 
                if (fb) { img.setAttribute('data-provider', 'facebook'); img.src = `https://unavatar.io/facebook/${fb}?fallback=false`; } 
                else img.style.display = 'none'; 
            } else img.style.display = 'none';
        }

        function showToast(msg, type='success') {
            const c = document.getElementById('toast-container'); 
            const t = document.createElement('div');
            t.className = `${type==='success'?'bg-green-500':'bg-red-500'} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 toast-enter pointer-events-auto min-w-[280px] transition-opacity duration-500`;
            t.innerHTML = `<i class="fa-solid ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"></i><span class="font-medium text-sm">${msg}</span>`;
            c.appendChild(t); 
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
        }

        function getRegionClass(region) {
            const r = (region || '').toLowerCase();
            if (r === 'east') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300';
            if (r === 'west') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300';
            if (r === 'midwest') return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300';
            if (r === 'south') return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300';
            if (r === 'international') return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300';
            return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
        }

        // --- Data & State ---
        let socialzSkaters = []; 
        let socialzCurrentSort = 'alpha';
        let socialzSortDirection = 'asc'; 
        let dashboardCharts = {};
        let selectedStyles = [];
        let viewMode = 'grid'; 

        function initSocialzData(data) {
            if(!data) return;
            socialzSkaters = data.map(row => ({
                id: row.id,
                name: row.name || '',
                region: row.region || '',
                location: row.location || '',
                type: row.skater_type || '',
                isFavorite: !!row.is_favorite,
                style: row.style || '',
                summary: row.summary || '',
                viralUrl: row.viral_url || '',
                contactInfo: row.contact_info || '',
                collabTier: row.collab_tier || '',
                collabStatus: row.collab_status || '',
                handles: { ig: row.handle_ig || '', tt: row.handle_tt || '', yt: row.handle_yt || '', fb: row.handle_fb || '' },
                links: { ig: row.link_ig || '', tt: row.link_tt || '', yt: row.link_yt || '', fb: row.link_fb || '' },
                followers: { ig: parseFloat(row.followers_ig) || 0, tt: parseFloat(row.followers_tt) || 0, yt: parseFloat(row.followers_yt) || 0, fb: parseFloat(row.followers_fb) || 0 },
                rawFollowers: parseFloat(row.raw_followers) || 0
            }));
            updateFilterDropdownOptions();
            renderSkaters();
        }

        // --- Helpers ---
        function parseFollowerCount(str) {
            if(!str) return 0;
            str = str.toString().toLowerCase().replace(/,/g, '');
            let multiplier = 1;
            if(str.includes('k')) multiplier = 1000;
            else if(str.includes('m')) multiplier = 1000000;
            return (parseFloat(str) || 0) * multiplier;
        }

        function formatCountShort(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        }

        function toTitleCase(str) {
            if (!str) return '';
            const t = str.trim();
            return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        }

        function generateSocial(link, followers, icon, colorClass, handle) {
            if (!handle || handle === '-' || handle === '') return "";
            let tc = ''; 
            let hb = '';
            if(colorClass === 'pink') { tc = 'text-pink-500'; hb = 'hover:bg-pink-500/10'; }
            else if(colorClass === 'cyan') { tc = 'text-cyan-500'; hb = 'hover:bg-cyan-500/10'; }
            else if(colorClass === 'red') { tc = 'text-red-500'; hb = 'hover:bg-red-500/10'; }
            else if(colorClass === 'blue') { tc = 'text-blue-500'; hb = 'hover:bg-blue-500/10'; }
            
            return `
                <a href="${link}" target="_blank" class="flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${hb} group flex-1 min-w-0">
                    <span class="text-sm ${tc} mb-1 truncate w-full font-medium tracking-tight text-center px-1">${handle}</span>
                    <div class="flex items-center gap-2">
                        <i class="fa-brands ${icon} ${tc} text-4xl group-hover:scale-110 transition-transform"></i>
                        <span class="text-base font-bold dark:text-slate-300">${followers}</span>
                    </div>
                </a>
            `;
        }

        function toggleFavorite(id, e) {
            if (e) e.stopPropagation();
            const index = socialzSkaters.findIndex(s => s.id === id);
            if (index > -1) {
                socialzSkaters[index].isFavorite = !socialzSkaters[index].isFavorite;
                renderSkaters();
                sysLog(socialzSkaters[index].isFavorite ? 'Added to favorites' : 'Removed from favorites');
            }
        }

        // --- Analytics Dashboard ---
        function openAnalyticsDashboard() {
            if (socialzSkaters.length === 0) { sysLog("No data to analyze."); return; }
            document.getElementById('analytics-modal').classList.remove('hidden');
            renderDashboardCharts();
        }
        function closeAnalyticsDashboard() { document.getElementById('analytics-modal').classList.add('hidden'); }
        function updateChart(id, config) { if (dashboardCharts[id]) dashboardCharts[id].destroy(); const socialzCtx = document.getElementById(id).getContext('2d'); dashboardCharts[id] = new Chart(ctx, config); }

        function renderDashboardCharts() {
            const isDark = document.documentElement.classList.contains('dark'), tc = isDark ? '#94a3b8' : '#64748b', gc = isDark ? '#334155' : '#e2e8f0';
            const topSkaters = [...socialzSkaters].sort((a, b) => b.rawFollowers - a.rawFollowers).slice(0, 10);
            updateChart('chart-top-skaters', { type: 'bar', data: { labels: topSkaters.map(s => s.name), datasets: [{ data: topSkaters.map(s => s.rawFollowers), backgroundColor: '#FF6B00', borderRadius: 8 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gc }, ticks: { color: tc, callback: v => formatCountShort(v) } }, y: { grid: { display: false }, ticks: { color: tc } } } } });
            const styleCounts = {}; socialzSkaters.forEach(s => { if(s.style) s.style.split(';').forEach(st => { const c = st.trim(); if(c) styleCounts[c] = (styleCounts[c]||0)+1; }); });
            const topStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            updateChart('chart-top-styles', { type: 'bar', data: { labels: topStyles.map(s => s[0]), datasets: [{ data: topStyles.map(s => s[1]), backgroundColor: '#6366f1', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: gc }, ticks: { color: tc, stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: tc } } } } });
            const regCounts = {}; socialzSkaters.forEach(s => { const r = toTitleCase(s.region) || 'Unknown'; regCounts[r] = (regCounts[r]||0)+1; });
            updateChart('chart-regions', { type: 'doughnut', data: { labels: Object.keys(regCounts), datasets: [{ data: Object.values(regCounts), backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: tc } } } } });
            let pt = { IG: 0, TT: 0, YT: 0, FB: 0 }; socialzSkaters.forEach(s => { pt.IG += parseFollowerCount(s.followers.ig); pt.TT += parseFollowerCount(s.followers.tt); pt.YT += parseFollowerCount(s.followers.yt); pt.FB += parseFollowerCount(s.followers.fb); });
            updateChart('chart-platforms', { type: 'doughnut', data: { labels: ['Instagram', 'TikTok', 'YouTube', 'Facebook'], datasets: [{ data: [pt.IG, pt.TT, pt.YT, pt.FB], backgroundColor: ['#ec4899', '#06b6d4', '#ef4444', '#3b82f6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: tc } } } } });
        }

        // --- Filter Logic ---
        function updateFilterDropdownOptions() {
            const styleList = document.getElementById('style-options-list');
            const regionSelect = document.getElementById('filter-region');
            const typeSelect = document.getElementById('filter-type');
            const uniqueStyles = new Set();
            const uniqueRegions = new Set();
            const uniqueTypes = new Set();
            
            socialzSkaters.forEach(s => {
                if (s.style) { s.style.split(';').forEach(st => { const clean = st.trim(); if (clean) uniqueStyles.add(clean); }); }
                if (s.region) uniqueRegions.add(toTitleCase(s.region));
                if (s.type) uniqueTypes.add(toTitleCase(s.type));
            });

            const sortedStyles = Array.from(uniqueStyles).sort();
            if (styleList) {
                styleList.innerHTML = sortedStyles.map(st => `
                    <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md cursor-pointer transition-colors">
                        <input type="checkbox" class="w-3.5 h-3.5 accent-brand rounded border-slate-300" ${selectedStyles.includes(st) ? 'checked' : ''} onchange="handleStyleToggle('${st}')">
                        <span class="text-xs text-slate-700 dark:text-slate-300 font-medium">${st}</span>
                    </label>
                `).join('');
            }

            const sortedRegions = Array.from(uniqueRegions).sort();
            const currentReg = regionSelect.value;
            regionSelect.innerHTML = '<option value="">All Regions</option>' + sortedRegions.map(reg => `<option value="${reg}">${reg}</option>`).join('');
            if (sortedRegions.includes(currentReg)) regionSelect.value = currentReg;

            const sortedTypes = Array.from(uniqueTypes).sort();
            const currentType = typeSelect.value;
            typeSelect.innerHTML = '<option value="">All Types</option>' + sortedTypes.map(t => `<option value="${t}">${t}</option>`).join('');
            if (sortedTypes.includes(currentType)) typeSelect.value = currentType;
        }

        function toggleMultiSelect(type) {
            const panel = document.getElementById(`${type}-options-panel`);
            panel.classList.toggle('hidden');
        }

        window.addEventListener('click', function(e) {
            const container = document.getElementById('multi-select-style-container');
            const panel = document.getElementById('style-options-panel');
            if (container && !container.contains(e.target)) { panel.classList.add('hidden'); }
        });

        function handleStyleToggle(style) {
            if (selectedStyles.includes(style)) { selectedStyles = selectedStyles.filter(s => s !== style); } 
            else { selectedStyles.push(style); }
            updateStyleBtnText();
            renderSkaters();
        }

        function updateStyleBtnText() {
            const btnText = document.getElementById('style-btn-text');
            if (selectedStyles.length === 0) { btnText.innerText = "All Styles"; } 
            else if (selectedStyles.length === 1) { btnText.innerText = selectedStyles[0]; } 
            else { btnText.innerText = `${selectedStyles[0]} + ${selectedStyles.length - 1}`; }
        }

        // --- View Mode Logic ---
        window.toggleViewMode = function(isCompact) {
            viewMode = isCompact ? 'compact' : 'grid';
            
            // Sync Neon Toggle Button states
            const btnGrid = document.getElementById('neon-grid');
            if (btnGrid) btnGrid.className = !isCompact ? 'active' : '';
            
            const btnList = document.getElementById('neon-list');
            if (btnList) btnList.className = isCompact ? 'active' : '';

            // Update Layout Container
            const container = document.getElementById('skater-grid');
            if (!isCompact) {
                container.className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 transition-all duration-300 min-w-full";
            } else {
                container.className = "flex flex-col gap-2 transition-all duration-300 min-w-full";
            }
            renderSkaters();
        };

        function toggleSortDirection() {
            socialzSortDirection = socialzSortDirection === 'asc' ? 'desc' : 'asc';
            const icon = document.getElementById('sort-dir-icon');
            icon.className = socialzSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-short-wide';
            renderSkaters();
        }

        function handleSortChange(v) { socialzCurrentSort = v; renderSkaters(); }

        // --- Core Rendering ---
        function renderSkaters() {
            const grid = document.getElementById('skater-grid');
            const search = document.getElementById('search-input').value.toLowerCase();
            const emptyState = document.getElementById('empty-state');
            const regionFilter = document.getElementById('filter-region').value;
            const typeFilter = document.getElementById('filter-type').value;

            let filtered = socialzSkaters.filter(s => {
                const ms = s.name.toLowerCase().includes(search) || s.location.toLowerCase().includes(search) || (s.style && s.style.toLowerCase().includes(search));
                const mr = !regionFilter || toTitleCase(s.region) === regionFilter;
                const mt = !typeFilter || toTitleCase(s.type) === typeFilter;
                let mstyles = true;
                if (selectedStyles.length > 0) { mstyles = selectedStyles.every(sel => s.style && s.style.toLowerCase().includes(sel.toLowerCase())); }
                return ms && mr && mt && mstyles;
            });

            filtered.sort((a, b) => {
                let res = 0;
                switch(socialzCurrentSort) {
                    case 'alpha': res = a.name.localeCompare(b.name); break;
                    case 'total': res = a.rawFollowers - b.rawFollowers; break;
                    case 'ig': res = parseFollowerCount(a.followers.ig) - parseFollowerCount(b.followers.ig); break;
                    case 'tt': res = parseFollowerCount(a.followers.tt) - parseFollowerCount(b.followers.tt); break;
                    case 'yt': res = parseFollowerCount(a.followers.yt) - parseFollowerCount(b.followers.yt); break;
                    case 'fb': res = parseFollowerCount(a.followers.fb) - parseFollowerCount(b.followers.fb); break;
                }
                return socialzSortDirection === 'asc' ? res : -res;
            });

            // Update Stats
            if(document.getElementById('stat-total-skaters')) document.getElementById('stat-total-skaters').innerText = filtered.length;
            const reach = filtered.reduce((a, c) => a + (c.rawFollowers || 0), 0);
            if(document.getElementById('stat-total-reach')) document.getElementById('stat-total-reach').innerText = formatCountShort(reach);
            const stylesCount = {};
            filtered.forEach(s => { if(s.style) s.style.split(';').forEach(st => { const cl = st.trim(); if(cl) stylesCount[cl] = (stylesCount[cl] || 0) + 1; }); });
            if(document.getElementById('stat-top-style')) document.getElementById('stat-top-style').innerText = Object.keys(stylesCount).length > 0 ? Object.keys(stylesCount).reduce((a, b) => stylesCount[a] > stylesCount[b] ? a : b) : '-';
            if(document.getElementById('stat-avg-eng')) document.getElementById('stat-avg-eng').innerText = filtered.length > 0 ? (2.4 + (reach % 100) / 100).toFixed(1) + "%" : "0%";

            if (filtered.length === 0) {
                grid.innerHTML = ''; emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                grid.innerHTML = filtered.map(s => {
                    const originalIndex = socialzSkaters.findIndex(orig => orig.id === s.id);
                    const styleList = s.style ? s.style.split(';').map(st => st.trim()).filter(st => st).slice(0, 3) : [];
                    const cleanH = (h) => h ? h.replace(/^@/, '').trim() : '';
                    const ttHandle = cleanH(s.handles.tt), ytHandle = cleanH(s.handles.yt), fbHandle = cleanH(s.handles.fb);

                    let src = ''; let prov = '';
                    if (ttHandle) { src = `https://unavatar.io/tiktok/${ttHandle}?fallback=false`; prov = 'tiktok'; }
                    else if (ytHandle) { src = `https://unavatar.io/youtube/${ytHandle}?fallback=false`; prov = 'youtube'; }
                    else if (fbHandle) { src = `https://unavatar.io/facebook/${fbHandle}?fallback=false`; prov = 'facebook'; }
                    
                    const typeClass = (s.type || '').toLowerCase() === 'outdoor' ? 
                        'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 
                        ((s.type || '').toLowerCase() === 'indoor' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300');

                    const regClass = getRegionClass(s.region);

                    if (viewMode === 'grid') {
                        const igHtml = generateSocial(s.links.ig, s.followers.ig, 'fa-instagram', 'pink', s.handles.ig);
                        const ttHtml = generateSocial(s.links.tt, s.followers.tt, 'fa-tiktok', 'cyan', s.handles.tt);
                        const ytHtml = generateSocial(s.links.yt, s.followers.yt, 'fa-youtube', 'red', s.handles.yt);
                        const fbHtml = generateSocial(s.links.fb, s.followers.fb, 'fa-facebook', 'blue', s.handles.fb);

                        return `<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col group relative">
                        <!-- Favorite Heart -->
                        <button onclick="toggleFavorite(${s.id}, event)" class="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-sm flex items-center justify-center transition-all ${s.isFavorite ? 'opacity-100 text-red-500' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400'}">
                            <i class="${s.isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>

                        <div class="p-6 pb-4 relative flex-grow">
                        <div class="flex items-center gap-4 mb-4"><div class="w-16 h-16 relative rounded-full overflow-hidden shadow-lg shrink-0"><div class="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold z-0">${s.name.charAt(0)}</div>${src ? `<img src="${src}" class="absolute inset-0 w-full h-full object-cover z-10 bg-white dark:bg-slate-800" data-tt="${ttHandle}" data-yt="${ytHandle}" data-fb="${fbHandle}" data-provider="${prov}" onerror="handleAvatarError(this)">` : ''}</div><div class="overflow-hidden flex-grow"><h2 class="font-bold text-xl text-slate-900 dark:text-white leading-tight truncate pr-2">${s.name}</h2><div class="flex flex-wrap items-center gap-1.5 mt-1 text-sm text-slate-500 dark:text-slate-400 truncate"><i class="fa-solid fa-location-dot text-brand w-3"></i> ${s.location} ${s.region ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${regClass}">${s.region}</span>` : ''} <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}">${s.type || ''}</span></div></div></div><p class="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-3 leading-relaxed mb-4 min-h-[4.5em]">${s.summary || '<span class="italic opacity-50">No summary.</span>'}</p><div class="flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-700 pt-3 mt-auto gap-2">
                            <!-- Left: Status and Styles -->
                            <div class="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                                ${s.collabStatus ? `<span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded uppercase">${s.collabStatus}</span>` : ''}
                                ${styleList.map(st => `<div class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">${st}</div>`).join('')}
                            </div>
                            
                            <!-- Center Group: Reach and Viral -->
                            <div class="flex items-center gap-2 shrink-0">
                                <div class="bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <span class="text-xs font-black text-brand uppercase tracking-tight">${formatCountShort(s.rawFollowers)} REACH</span>
                                </div>
                                ${s.viralUrl ? `<a href="${s.viralUrl}" target="_blank" class="bg-gradient-to-r from-amber-400 to-amber-600 text-white p-2 rounded-lg flex items-center justify-center shadow-sm hover:shadow-amber-500/20 transition-all" title="View Viral Video"><i class="fa-solid fa-rocket text-xs"></i></a>` : ''}
                            </div>

                            <!-- Right: Edit Action -->
                            <div class="flex-1 flex justify-end">
                                <button onclick="editSkater(${originalIndex})" class="text-xs font-bold text-brand hover:text-orange-400 flex items-center gap-1 shrink-0 ml-2"><i class="fa-solid fa-pen"></i> EDIT</button>
                            </div>
                        </div></div><div class="mt-auto bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 p-4 flex flex-nowrap justify-center gap-2 overflow-x-auto custom-scrollbar">${igHtml}${ttHtml}${ytHtml}${fbHtml}</div></div>`;
                    } else {
                        // COMPACT LIST VIEW
                        return `
                        <div class="bg-white dark:bg-slate-800 p-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all grid items-center gap-2 overflow-hidden" style="grid-template-columns: 36px minmax(100px, 0.8fr) 70px 60px 90px repeat(4, 85px) 30px 65px 36px;">
                            <!-- Avatar -->
                            <div class="w-8 h-8 relative rounded-full overflow-hidden border border-slate-200 dark:border-slate-600">
                                <div class="absolute inset-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[10px] font-bold">${s.name.charAt(0)}</div>
                                ${src ? `<img src="${src}" class="absolute inset-0 w-full h-full object-cover z-10" data-tt="${ttHandle}" data-yt="${ytHandle}" data-fb="${fbHandle}" data-provider="${prov}" onerror="handleAvatarError(this)">` : ''}
                            </div>
                            
                            <!-- Name & Favorite -->
                            <div class="min-w-0 flex items-center gap-1.5 pr-1">
                                <h3 class="font-bold text-xs truncate dark:text-white" title="${s.name}">${s.name}</h3>
                                ${s.isFavorite ? '<i class="fa-solid fa-heart text-[9px] text-red-500 shrink-0"></i>' : ''}
                            </div>

                            <!-- Region -->
                            <div class="text-center px-1">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase truncate inline-block w-full ${regClass}">${s.region || '-'}</span>
                            </div>

                            <!-- Type -->
                            <div class="text-center px-1">
                                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase inline-block w-full ${typeClass}">${s.type || '-'}</span>
                            </div>

                            <!-- Status -->
                            <div class="text-center px-1">
                                ${s.collabStatus ? `<span class="px-2 py-0.5 rounded-full text-[8px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 uppercase truncate inline-block w-full">${s.collabStatus}</span>` : '-'}
                            </div>
                            
                            <!-- IG -->
                            <a href="${s.links.ig || '#'}" target="_blank" class="flex items-center gap-1.5 justify-center group/soc">
                                <i class="fa-brands fa-instagram text-pink-500 text-2xl group-hover/soc:scale-110 transition-transform"></i>
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${s.followers.ig || '0'}</span>
                            </a>

                            <!-- TikTok -->
                            <a href="${s.links.tt || '#'}" target="_blank" class="flex items-center gap-1.5 justify-center group/soc">
                                <i class="fa-brands fa-tiktok text-cyan-500 text-2xl group-hover/soc:scale-110 transition-transform"></i>
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${s.followers.tt || '0'}</span>
                            </a>

                            <!-- YouTube -->
                            <a href="${s.links.yt || '#'}" target="_blank" class="flex items-center gap-1.5 justify-center group/soc">
                                <i class="fa-brands fa-youtube text-red-500 text-2xl group-hover/soc:scale-110 transition-transform"></i>
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${s.followers.yt || '0'}</span>
                            </a>

                            <!-- Facebook -->
                            <a href="${s.links.fb || '#'}" target="_blank" class="flex items-center gap-1.5 justify-center group/soc">
                                <i class="fa-brands fa-facebook text-blue-500 text-2xl group-hover/soc:scale-110 transition-transform"></i>
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-300">${s.followers.fb || '0'}</span>
                            </a>

                            <!-- Viral rocket -->
                            <div class="flex justify-center">
                                ${s.viralUrl ? `<a href="${s.viralUrl}" target="_blank" class="bg-gradient-to-r from-amber-400 to-amber-600 text-white p-1 rounded-md flex items-center justify-center shadow-sm hover:scale-110 transition-all" title="View Viral Video"><i class="fa-solid fa-rocket text-[8px]"></i></a>` : '-'}
                            </div>

                            <!-- Total -->
                            <div class="font-bold text-sm text-red-500 text-right truncate pr-1">
                                ${formatCountShort(s.rawFollowers)}
                            </div>

                            <!-- Edit button -->
                            <div class="flex justify-end">
                                <button onclick="editSkater(${originalIndex})" class="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-brand transition-colors"><i class="fa-solid fa-pen text-[10px]"></i></button>
                            </div>
                        </div>`;
                    }
                }).join('');
            }
        }

        // --- Export CSV ---
        function exportCSV() {
            if (socialzSkaters.length === 0) { sysLog("Nothing to export"); return; }
            const headers = ["Name", "Region", "Location", "Type", "Favorite", "Styles", "Summary", "Viral URL", "Contact Info", "Collaboration Tier", "Collaboration Status", "IG Handle", "IG Link", "IG Followers", "TikTok Handle", "TikTok Link", "TikTok Followers", "YouTube Handle", "YouTube Link", "YouTube Subs", "FB Handle", "FB Link", "FB Followers"];
            const rows = socialzSkaters.map(s => [
                s.name, s.region, s.location, s.type, s.isFavorite ? "Yes" : "No", s.style, s.summary, s.viralUrl, s.contactInfo, s.collabTier, s.collabStatus,
                s.handles.ig, s.links.ig, s.followers.ig,
                s.handles.tt, s.links.tt, s.followers.tt,
                s.handles.yt, s.links.yt, s.followers.yt,
                s.handles.fb, s.links.fb, s.followers.fb
            ]);
            
            const csvContent = [headers, ...rows].map(e => e.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `skater_roster_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }

        // --- CSV Engine ---
        function handleCSVImport(input) {
            const f = input.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = typeof XLSX !== 'undefined' ? XLSX.read(data, {type: 'array'}) : null;
                    if(!workbook) throw new Error("SheetJS not loaded correctly");
                    const firstSheet = workbook.SheetNames[0];
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {raw: false, defval: ""});
                    
                    const newS = rows.map(r => {
                        const m = (k) => {
                            const keyMatch = Object.keys(r).find(h => h.toLowerCase().includes(k.toLowerCase()));
                            if (keyMatch) return r[keyMatch];
                            if (k === 'type' && Object.keys(r).find(h => h.toLowerCase().includes('indoor'))) return r[Object.keys(r).find(h => h.toLowerCase().includes('indoor'))];
                            if (k === 'region' && Object.keys(r).find(h => h.toLowerCase().includes('area'))) return r[Object.keys(r).find(h => h.toLowerCase().includes('area'))];
                            if (k === 'favorite' && Object.keys(r).find(h => h.toLowerCase().includes('fav'))) return r[Object.keys(r).find(h => h.toLowerCase().includes('fav'))];
                            return '';
                        };
                        const get = (key) => { const v = m(key); return v ? String(v).trim() : ''; };
                        
                        // Enforce row valid check
                        if (!get('name') && !get('region') && !get('type')) return null;
                        
                        const ig = get('ig followers'), tt = get('tiktok followers'), yt = get('youtube subs'), fb = get('fb followers');
                        const favVal = get('favorite').toLowerCase();
                        const isFav = favVal === 'yes' || favVal === 'true' || favVal === '1';
                        
                        return { 
                            name: get('name') || 'Unnamed Skater', 
                            region: get('region'), 
                            location: get('location'), 
                            type: get('type'), 
                            isFavorite: isFav,
                            style: get('styles'), 
                            summary: get('summary'), 
                            viralUrl: get('viral url'), 
                            contactInfo: get('contact info'), 
                            collabTier: get('collaboration tier'), 
                            collabStatus: get('collaboration status'), 
                            links: { ig: get('ig link'), tt: get('tiktok link'), yt: get('youtube link'), fb: get('fb link') }, 
                            handles: { ig: get('ig handle'), tt: get('tiktok handle'), yt: get('youtube handle'), fb: get('fb handle') }, 
                            followers: { ig, tt, yt, fb }, 
                            rawFollowers: parseFollowerCount(ig) + parseFollowerCount(tt) + parseFollowerCount(yt) + parseFollowerCount(fb) 
                        };
                    }).filter(s => s !== null);
                    
                    if(typeof sysLog === 'function') sysLog("Syncing CSV to Database...");
                    
                    // Transform to Supabase payload
                    const dbPayload = newS.map(s => ({
                        name: s.name, region: s.region, location: s.location, skater_type: s.type, is_favorite: s.isFavorite, style: s.style, summary: s.summary, viral_url: s.viralUrl, contact_info: s.contactInfo, collab_tier: s.collabTier, collab_status: s.collabStatus,
                        handle_ig: s.handles.ig, handle_tt: s.handles.tt, handle_yt: s.handles.yt, handle_fb: s.handles.fb,
                        link_ig: s.links.ig, link_tt: s.links.tt, link_yt: s.links.yt, link_fb: s.links.fb,
                        followers_ig: parseFollowerCount(s.followers.ig), followers_tt: parseFollowerCount(s.followers.tt), followers_yt: parseFollowerCount(s.followers.yt), followers_fb: parseFollowerCount(s.followers.fb),
                        raw_followers: s.rawFollowers
                    }));
                    
                    // Upsert via unique Name key
                    const { error } = await supabaseClient.from('socialz_audience').upsert(dbPayload, { onConflict: 'name' });
                    if(error) throw new Error(error.message);
                    
                    // Pull fresh data to sync UUIDs back from standard DB constraint
                    const { data: remoteData, error: fetchErr } = await supabaseClient.from('socialz_audience').select('*').order('name', { ascending: true });
                    if(fetchErr) throw new Error(fetchErr.message);
                    
                    initSocialzData(remoteData);
                    sysLog(`Imported ${newS.length} records successfully!`);
                } catch(err) { console.error("IMPORT ERROR:", err); sysLog("Import failed: " + err.message); }
                input.value = '';
            };
            reader.readAsArrayBuffer(f);
        }

        // --- CRUD Modals ---
        function openModal() { document.getElementById('skater-modal').classList.remove('hidden'); document.getElementById('skater-form').reset(); document.getElementById('edit-index').value = "-1"; document.getElementById('modal-title').innerText = "Add New Skater"; }
        function closeModal() { document.getElementById('skater-modal').classList.add('hidden'); }
        function editSkater(index) {
            const s = socialzSkaters[index]; document.getElementById('skater-modal').classList.remove('hidden'); document.getElementById('edit-index').value = index; document.getElementById('modal-title').innerText = "Edit Skater";
            document.getElementById('input-name').value = s.name; document.getElementById('input-location').value = s.location; document.getElementById('input-region').value = s.region; document.getElementById('input-contact').value = s.contactInfo; document.getElementById('input-style').value = s.style; document.getElementById('input-type').value = s.type; document.getElementById('input-collab-tier').value = s.collabTier; document.getElementById('input-collab-status').value = s.collabStatus; document.getElementById('input-summary').value = s.summary; document.getElementById('input-viral').value = s.viralUrl;
            document.getElementById('input-favorite').checked = s.isFavorite || false;
            document.getElementById('input-ig').value = s.handles.ig; document.getElementById('input-ig-link').value = s.links.ig; document.getElementById('input-ig-followers').value = s.followers.ig;
            document.getElementById('input-tt').value = s.handles.tt; document.getElementById('input-tt-link').value = s.links.tt; document.getElementById('input-tt-followers').value = s.followers.tt;
            document.getElementById('input-yt').value = s.handles.yt; document.getElementById('input-yt-link').value = s.links.yt; document.getElementById('input-yt-followers').value = s.followers.yt;
            document.getElementById('input-fb').value = s.handles.fb; document.getElementById('input-fb-link').value = s.links.fb; document.getElementById('input-fb-followers').value = s.followers.fb;
        }

        async function deleteSkaterFromModal() { 
            const i = parseInt(document.getElementById('edit-index').value); 
            if (i > -1 && confirm("Delete?")) { 
                try {
                    const skater = socialzSkaters[i];
                    if (skater.id && typeof skater.id === 'string' && skater.name) {
                        const { error } = await supabaseClient.from('socialz_audience').delete().eq('name', skater.name);
                        if(error) throw new Error(error.message);
                    }
                    socialzSkaters.splice(i, 1); updateFilterDropdownOptions(); renderSkaters(); closeModal(); sysLog("Deleted"); 
                } catch(e) { sysLog("Failed to delete from DB: " + e.message); }
            } 
        }
        
        async function handleFormSubmit(e) {
            e.preventDefault(); const i = parseInt(document.getElementById('edit-index').value);
            const igf = document.getElementById('input-ig-followers').value, ttf = document.getElementById('input-tt-followers').value, ytf = document.getElementById('input-yt-followers').value, fbf = document.getElementById('input-fb-followers').value;
            
            const dbRow = {
                name: document.getElementById('input-name').value || 'Unnamed Skater',
                region: toTitleCase(document.getElementById('input-region').value),
                location: document.getElementById('input-location').value,
                skater_type: toTitleCase(document.getElementById('input-type').value),
                is_favorite: document.getElementById('input-favorite').checked,
                style: document.getElementById('input-style').value,
                summary: document.getElementById('input-summary').value,
                viral_url: document.getElementById('input-viral').value,
                contact_info: document.getElementById('input-contact').value,
                collab_tier: document.getElementById('input-collab-tier').value,
                collab_status: document.getElementById('input-collab-status').value,
                handle_ig: document.getElementById('input-ig').value, handle_tt: document.getElementById('input-tt').value, handle_yt: document.getElementById('input-yt').value, handle_fb: document.getElementById('input-fb').value,
                link_ig: document.getElementById('input-ig-link').value, link_tt: document.getElementById('input-tt-link').value, link_yt: document.getElementById('input-yt-link').value, link_fb: document.getElementById('input-fb-link').value,
                followers_ig: parseFollowerCount(igf), followers_tt: parseFollowerCount(ttf), followers_yt: parseFollowerCount(ytf), followers_fb: parseFollowerCount(fbf),
                raw_followers: parseFollowerCount(igf) + parseFollowerCount(ttf) + parseFollowerCount(ytf) + parseFollowerCount(fbf)
            };
            
            try {
                if(i !== -1 && typeof socialzSkaters[i].id === 'string') { dbRow.id = socialzSkaters[i].id; }
                const { data, error } = await supabaseClient.from('socialz_audience').upsert(dbRow, { onConflict: 'name' }).select();
                if(error) throw new Error(error.message);
                
                // Fetch full remote state again just to ensure everything is perfect
                const { data: remoteData } = await supabaseClient.from('socialz_audience').select('*').order('name', { ascending: true });
                if(remoteData) initSocialzData(remoteData);
                closeModal(); sysLog("Saved to DB!");
            } catch(err) {
                console.error("DB SAVE ERROR", err);
                sysLog("Failed to save to DB: " + err.message);
            }
        }

        function toggleTheme() { document.documentElement.classList.toggle('dark'); }

        document.getElementById('search-input').addEventListener('input', renderSkaters);
        renderSkaters();
    
    // V11 NEOGLEAMZ NATIVE METRICS SYNC & SHIM
    const originalRenderSkaters = renderSkaters;
    renderSkaters = function() {
        originalRenderSkaters(); 
    };
    
    window.showSocialzPane = function(paneId) {
        if(document.getElementById('paneSocialzRoster')) document.getElementById('paneSocialzRoster').style.setProperty('display', 'flex', 'important');
    };
    
    // Safely reference hideAllExecutivePanes using window to avoid ReferenceErrors
    const originalHideExecutive = window.hideAllExecutivePanes;
    window.hideAllExecutivePanes = function() {
        if (originalHideExecutive) originalHideExecutive();
        try {
            if(document.getElementById('paneSocialzRoster')) document.getElementById('paneSocialzRoster').style.setProperty('display', 'none', 'important');
        } catch(e) {}
    }
    
    // --- LIVE ANALYTICS DATA BINDING ---
    let socialzChartInstances = {};
    window.openAnalyticsDashboard = function() {
        const modal = document.getElementById('analytics-modal');
        if(modal) modal.classList.remove('hidden');
        renderSocialzCharts();
    };
    window.closeAnalyticsDashboard = function() {
        const modal = document.getElementById('analytics-modal');
        if(modal) modal.classList.add('hidden');
    };
    function renderSocialzCharts() {
        if(typeof Chart === 'undefined') return;
        Chart.defaults.color = '#94a3b8'; Chart.defaults.font.family = "'Inter', sans-serif";
        
        // 1. Top Skaters (Horizontal Bar)
        const ctxTop = document.getElementById('chart-top-skaters');
        if(ctxTop) {
            if(socialzChartInstances['top']) socialzChartInstances['top'].destroy();
            const topSkaters = [...socialzSkaters].sort((a,b)=> (b.rawFollowers||0) - (a.rawFollowers||0)).slice(0, 10);
            socialzChartInstances['top'] = new Chart(ctxTop, {
                type: 'bar',
                data: { labels: topSkaters.map(s=>s.name), datasets: [{ label: 'Total Followers', data: topSkaters.map(s=>s.rawFollowers), backgroundColor: '#f59e0b', borderRadius: 4 }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false } } }
            });
        }
        
        // 2. Popular Styles (Vertical Bar)
        const ctxStyles = document.getElementById('chart-top-styles');
        if(ctxStyles) {
            if(socialzChartInstances['styles']) socialzChartInstances['styles'].destroy();
            const styles = {}; 
            socialzSkaters.forEach(s => {
                const arr = (s.style||'').split(/[;,\/\|]/).map(t=>t.trim()).filter(Boolean);
                if(arr.length===0) { styles['Unknown'] = (styles['Unknown']||0)+1; }
                else { arr.forEach(st => styles[st] = (styles[st]||0)+1); }
            });
            const topStyles = Object.entries(styles).sort((a,b)=>b[1]-a[1]).slice(0, 10);
            socialzChartInstances['styles'] = new Chart(ctxStyles, {
                type: 'bar',
                data: { labels: topStyles.map(e=>e[0]), datasets: [{ label: 'Occurrences', data: topStyles.map(e=>e[1]), backgroundColor: '#8b5cf6', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false } }, scales: { x: { ticks: { minRotation: 45, maxRotation: 45, font: { size: 9 } } } } }
            });
        }
        
        // 3. Regions (Doughnut)
        const ctxRegions = document.getElementById('chart-regions');
        if(ctxRegions) {
            if(socialzChartInstances['regions']) socialzChartInstances['regions'].destroy();
            const regions = {}; socialzSkaters.forEach(s => { const r = s.region||'Unknown'; regions[r] = (regions[r]||0)+1; });
            const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899', '#06b6d4'];
            socialzChartInstances['regions'] = new Chart(ctxRegions, {
                type: 'doughnut',
                data: { labels: Object.keys(regions), datasets: [{ data: Object.values(regions), backgroundColor: colors.slice(0, Object.keys(regions).length), borderWidth:0, hoverOffset: 10 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }
            });
        }
        
        // 4. Platforms (Doughnut)
        const ctxPlat = document.getElementById('chart-platforms');
        if(ctxPlat) {
            if(socialzChartInstances['plat']) socialzChartInstances['plat'].destroy();
            const plat = { Instagram: 0, TikTok: 0, YouTube: 0, Facebook: 0 };
            socialzSkaters.forEach(s => {
                if(s.followers) {
                    plat.Instagram += Number(String(s.followers.ig||'0').replace(/[^0-9.]/g,''));
                    plat.TikTok += Number(String(s.followers.tt||'0').replace(/[^0-9.]/g,''));
                    plat.YouTube += Number(String(s.followers.yt||'0').replace(/[^0-9.]/g,''));
                    plat.Facebook += Number(String(s.followers.fb||'0').replace(/[^0-9.]/g,''));
                }
            });
            socialzChartInstances['plat'] = new Chart(ctxPlat, {
                type: 'doughnut',
                data: { labels: Object.keys(plat), datasets: [{ data: Object.values(plat), backgroundColor: ['#ec4899', '#06b6d4', '#ef4444', '#3b82f6'], borderWidth:0, hoverOffset: 10 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }
            });
        }
    }