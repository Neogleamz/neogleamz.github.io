/**
 * @typedef {Object} SocialzAudienceRow
 * @property {string} id
 * @property {string} name
 * @property {string|null} region
 * @property {string|null} location
 * @property {string|null} skater_type
 * @property {boolean} is_favorite
 * @property {string|null} style
 * @property {string|null} summary
 * @property {string|null} viral_url
 * @property {string|null} contact_info
 * @property {string|null} collab_tier
 * @property {string|null} collab_status
 * @property {string|null} handle_ig
 * @property {string|null} handle_tt
 * @property {string|null} handle_yt
 * @property {string|null} handle_fb
 * @property {string|null} link_ig
 * @property {string|null} link_tt
 * @property {string|null} link_yt
 * @property {string|null} link_fb
 * @property {number} followers_ig
 * @property {number} followers_tt
 * @property {number} followers_yt
 * @property {number} followers_fb
 * @property {number} raw_followers
 */
// --- Global Helpers ---
        let _unavatarErrors = 0;
        let _unavatarCircuitBroken = false;
        setInterval(() => { _unavatarErrors = Math.max(0, _unavatarErrors - 1); }, 2000); // Gradual cooldown

        const avatarObserver = new window.IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const trueSrc = img.getAttribute('data-src');
                    if (trueSrc) {
                        const isDirectUrl = trueSrc.includes('supabase.co') || trueSrc.includes('fbcdn.net') || trueSrc.includes('instagram.com');
                        if (isDirectUrl || !_unavatarCircuitBroken) {
                            img.src = trueSrc;
                            img.removeAttribute('data-src');
                        }
                    }
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '50px 0px', threshold: 0.1 });

        function handleAvatarError(img) {
            if (_unavatarCircuitBroken) { img.style.display = 'none'; return; }
            _unavatarErrors++;
            if (_unavatarErrors > 15) {
                _unavatarCircuitBroken = true;
                if (window.sysLog) sysLog("Avatar fallback circuit broken due to 429 Rate Limits.", true);
                setTimeout(() => { _unavatarCircuitBroken = false; _unavatarErrors = 0; }, 60000); // 1 min cooldown
                img.style.display = 'none';
                return;
            }

            const tt = img.getAttribute('data-tt'), yt = img.getAttribute('data-yt'), fb = img.getAttribute('data-fb'), p = img.getAttribute('data-provider');
            if (p === 'instagram') {
                if (tt) { img.setAttribute('data-provider', 'tiktok'); img.src = `https://unavatar.io/tiktok/${tt}?fallback=false`; }
                else if (yt) { img.setAttribute('data-provider', 'youtube'); img.src = `https://unavatar.io/youtube/${yt}?fallback=false`; }
                else if (fb) { img.setAttribute('data-provider', 'facebook'); img.src = `https://unavatar.io/facebook/${fb}?fallback=false`; }
                else img.style.display = 'none';
            }
            else if (p === 'tiktok') { 
                if (yt) { img.setAttribute('data-provider', 'youtube'); img.src = `https://unavatar.io/youtube/${yt}?fallback=false`; } 
                else if (fb) { img.setAttribute('data-provider', 'facebook'); img.src = `https://unavatar.io/facebook/${fb}?fallback=false`; } 
                else img.style.display = 'none'; 
            }
            else if (p === 'youtube') { 
                if (fb) { img.setAttribute('data-provider', 'facebook'); img.src = `https://unavatar.io/facebook/${fb}?fallback=false`; } 
                else img.style.display = 'none'; 
            } else img.style.display = 'none';
        }

        // Global capture listener to catch image load errors (bypasses DOMPurify stripping inline onerrors)
        document.addEventListener('error', function(event) {
            if (event.target && event.target.tagName === 'IMG' && event.target.hasAttribute('data-provider')) {
                handleAvatarError(event.target);
            }
        }, true);

        window.showToast = function showToast(msg, type='success') {
            const c = document.getElementById('toast-container'); 
            const t = document.createElement('div');
            t.className = `${type==='success'?'bg-green-500':'bg-red-500'} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 toast-enter pointer-events-auto min-w-[280px] transition-opacity duration-500`;
            t.innerHTML = 
                window.safeHTML ? window.safeHTML(
                    `<i class="fa-solid ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"> </i><span class="font-medium text-sm">${msg}</span>`
                ) : `<i class="fa-solid ${type==='success'?'fa-check-circle':'fa-exclamation-circle'}"> </i><span class="font-medium text-sm">${msg}</span>`;
            c.appendChild(t); 
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
        }

        function getRegionStyleConfig(region) {
            const r = (region || '').toLowerCase();
            if (r === 'east') return 'background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2);';
            if (r === 'west') return 'background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);';
            if (r === 'midwest') return 'background: rgba(99, 102, 241, 0.1); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2);';
            if (r === 'south') return 'background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2);';
            if (r === 'international') return 'background: rgba(6, 182, 212, 0.1); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.2);';
            return 'background: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border-color);';
        }

        // --- Data & State ---
        let socialzSkaters = []; 
        let socialzCurrentSort = window.getSavedSort ? window.getSavedSort('socialzCurrentSort', 'alpha') : 'alpha';
        let socialzSortDirection = window.getSavedSort ? window.getSavedSort('socialzSortDirection', 'asc') : 'asc'; 
        let dashboardCharts = {};
        let selectedStyles = [];
        let viewMode = 'grid';
        let _socialzStylePanelListenerRegistered = false; // Guard: prevents duplicate window click listeners

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
                rawFollowers: parseFloat(row.raw_followers) || 0,
                avatarUrl: row.avatar_url || ''
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
            if (colorClass === 'pink') { tc = '#ec4899'; }
            else if(colorClass === 'cyan') { tc = '#06b6d4'; }
            else if(colorClass === 'red') { tc = '#ef4444'; }
            else if(colorClass === 'blue') { tc = '#3b82f6'; }
            
            let hoverClass = `socialz-hover-bg-${colorClass}`;

            let safeLink = link ? link.trim() : '';
            if (safeLink && !safeLink.startsWith('http://') && !safeLink.startsWith('https://')) {
                safeLink = 'https://' + safeLink;
            }

            return `
                <a href="${safeLink}" target="_blank" class="${hoverClass}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; transition: all 0.2s; flex: 1; min-width: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); text-decoration: none; background: var(--bg-panel); border: 1px solid var(--border-color);">
                    <span style="font-size: 14px; color: ${tc}; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; font-weight: 500; text-align: center;">${handle}</span>
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; justify-content: center; width: 100%;">
                        <i class="fa-brands ${icon}" style="color: ${tc}; font-size: 24px;"> </i>
                        <span style="font-size: 16px; font-weight: bold; color: var(--text-heading);">${followers}</span>
                    </div>
                </a>
            `;
        }

        window.toggleFavorite = async function toggleFavorite(index, e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            if (index > -1 && index < socialzSkaters.length) {
                socialzSkaters[index].isFavorite = !socialzSkaters[index].isFavorite;
                
                // Visually update the button without re-rendering the whole table or grid layout to prevent snapping/flicker
                if (e && e.target) {
                    const btn = e.target.closest('[data-click="click_toggleFavorite"]');
                    if (btn) {
                        if (socialzSkaters[index].isFavorite) {
                            btn.style.color = '#ef4444';
                            btn.innerHTML = 
                                window.safeHTML ? window.safeHTML(
                                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
                                ) : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
                        } else {
                            btn.style.color = 'var(--text-muted)';
                            btn.innerHTML = 
                                window.safeHTML ? window.safeHTML(
                                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
                                ) : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
                        }
                    } else {
                        renderSkaters();
                    }
                } else {
                    renderSkaters(); // fallback if called programmatically
                }
                sysLog(socialzSkaters[index].isFavorite ? 'Added to favorites' : 'Removed from favorites');
                try {
                    const skaterId = socialzSkaters[index].id;
                    if(skaterId) await supabaseClient.from('socialz_audience').update({ is_favorite: socialzSkaters[index].isFavorite }).eq('id', skaterId);
                } catch(err) {
                    console.error('Failed to sync favorite status to DB', err);
                    sysLog('Failed to sync favorite status to DB: ' + err.message, true);
                }
            }
        }

        // --- Analytics Dashboard ---
        window.openAnalyticsDashboard = function openAnalyticsDashboard() {
            if (socialzSkaters.length === 0) { sysLog("No data to analyze."); return; }
            document.getElementById('analytics-modal').style.display = 'flex';
            renderDashboardCharts();
        }
        window.closeAnalyticsDashboard = function closeAnalyticsDashboard() { document.getElementById('analytics-modal').style.display = 'none'; }
        function updateChart(id, config) { if (dashboardCharts[id]) dashboardCharts[id].destroy(); const _socialzCtx = document.getElementById(id).getContext('2d'); dashboardCharts[id] = new Chart(ctx, config); }

        function renderDashboardCharts() {
            const isDark = document.documentElement.classList.contains('dark'), tc = isDark ? '#94a3b8' : '#64748b', gc = isDark ? '#334155' : '#e2e8f0';
            const topSkaters = [...socialzSkaters].sort((a, b) => b.rawFollowers - a.rawFollowers).slice(0, 10);
            updateChart('chart-top-skaters', { type: 'bar', data: { labels: topSkaters.map(s => s.name), datasets: [{ data: topSkaters.map(s => s.rawFollowers), backgroundColor: '#a855f7', borderRadius: 8 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gc }, ticks: { color: tc, callback: v => formatCountShort(v) } }, y: { grid: { display: false }, ticks: { color: tc } } } } });
            const styleCounts = {}; socialzSkaters.forEach(s => { if(s.style) s.style.split(';').forEach(st => { const c = st.trim(); if(c) styleCounts[c] = (styleCounts[c]||0)+1; }); });
            const topStyles = Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            updateChart('chart-top-styles', { type: 'bar', data: { labels: topStyles.map(s => s[0]), datasets: [{ data: topStyles.map(s => s[1]), backgroundColor: '#8b5cf6', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: gc }, ticks: { color: tc, stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: tc } } } } });
            const regCounts = {}; socialzSkaters.forEach(s => { const r = toTitleCase(s.region) || 'Unknown'; regCounts[r] = (regCounts[r]||0)+1; });
            updateChart('chart-regions', { type: 'doughnut', data: { labels: Object.keys(regCounts), datasets: [{ data: Object.values(regCounts), backgroundColor: ['#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#c084fc'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: tc } } } } });
            let pt = { IG: 0, TT: 0, YT: 0, FB: 0 }; socialzSkaters.forEach(s => { pt.IG += parseFollowerCount(s.followers.ig); pt.TT += parseFollowerCount(s.followers.tt); pt.YT += parseFollowerCount(s.followers.yt); pt.FB += parseFollowerCount(s.followers.fb); });
            updateChart('chart-platforms', { type: 'doughnut', data: { labels: ['Instagram', 'TikTok', 'YouTube', 'Facebook'], datasets: [{ data: [pt.IG, pt.TT, pt.YT, pt.FB], backgroundColor: ['#a855f7', '#9333ea', '#7e22ce', '#c084fc'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: tc } } } } });
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
                styleList.innerHTML = window.safeHTML ? window.safeHTML(sortedStyles.map(st => `
                    <label class="socialz-hover-bg-input" style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:6px; cursor:pointer; background:transparent;">
                        <input type="checkbox" style="width:13px; height:13px; accent-color:var(--primary-color); cursor:pointer; flex-shrink:0;" ${selectedStyles.includes(st) ? 'checked' : ''} data-change="change_handleStyleToggle_this" data-style="${st}">
                        <span style="font-size:12px; color:var(--text-main); font-weight:600; user-select:none;">${st}</span>
                    </label>
                `).join('')) : sortedStyles.map(st => `
                    <label class="socialz-hover-bg-input" style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:6px; cursor:pointer; background:transparent;">
                        <input type="checkbox" style="width:13px; height:13px; accent-color:var(--primary-color); cursor:pointer; flex-shrink:0;" ${selectedStyles.includes(st) ? 'checked' : ''} data-change="change_handleStyleToggle_this" data-style="${st}">
                        <span style="font-size:12px; color:var(--text-main); font-weight:600; user-select:none;">${st}</span>
                    </label>
                `).join('');
            }

            const sortedRegions = Array.from(uniqueRegions).sort();
            const currentReg = regionSelect.value;
            regionSelect.innerHTML = 
                window.safeHTML ? window.safeHTML(
                    '<option value="">All Regions</option>' + sortedRegions.map(reg => `<option value="${reg}">${reg}</option>`).join('')
                ) : '<option value="">All Regions</option>' + sortedRegions.map(reg => `<option value="${reg}">${reg}</option>`).join('');
            if (sortedRegions.includes(currentReg)) regionSelect.value = currentReg;

            const sortedTypes = Array.from(uniqueTypes).sort();
            const currentType = typeSelect.value;
            typeSelect.innerHTML = 
                window.safeHTML ? window.safeHTML(
                    '<option value="">All Types</option>' + sortedTypes.map(t => `<option value="${t}">${t}</option>`).join('')
                ) : '<option value="">All Types</option>' + sortedTypes.map(t => `<option value="${t}">${t}</option>`).join('');
            if (sortedTypes.includes(currentType)) typeSelect.value = currentType;
        }

        window.toggleMultiSelect = function toggleMultiSelect(type) {
            const panel = document.getElementById(`${type}-options-panel`);
            const isHidden = panel.style.display === 'none' || panel.style.display === '';
            panel.style.display = isHidden ? 'block' : 'none';
        }

        // Named handler: allows future removeEventListener and prevents anonymous accumulation
        function closeSocialzStylePanel(e) {
            const container = document.getElementById('multi-select-style-container');
            const panel = document.getElementById('style-options-panel');
            if (container && !container.contains(e.target)) { panel.style.display = 'none'; }
        }
        if (!_socialzStylePanelListenerRegistered) {
            window.addEventListener('click', closeSocialzStylePanel);

        }

        window.handleStyleToggle = function handleStyleToggle(style) {
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
                container.className = "block transition-all duration-300 min-w-full overflow-x-auto";
            }
            renderSkaters();
        };

        window.toggleSortDirection = function toggleSortDirection() {
            socialzSortDirection = socialzSortDirection === 'asc' ? 'desc' : 'asc';
            if (window.saveSort) window.saveSort('socialzSortDirection', socialzSortDirection);
            const icon = document.getElementById('sort-dir-icon');
            icon.className = socialzSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-short-wide';
            renderSkaters();
        }

        window.handleSortChange = function handleSortChange(v) { 
            if (typeof isResizing !== 'undefined' && isResizing) return; 
            if (socialzCurrentSort === v) {
                socialzSortDirection = socialzSortDirection === 'asc' ? 'desc' : 'asc';
                if (window.saveSort) window.saveSort('socialzSortDirection', socialzSortDirection);
            } else {
                socialzCurrentSort = v; 
                socialzSortDirection = 'desc'; // Default numerical sorts to desc layout priority visually
                if (window.saveSort) {
                    window.saveSort('socialzCurrentSort', socialzCurrentSort);
                    window.saveSort('socialzSortDirection', socialzSortDirection);
                }
            }
            const icon = document.getElementById('sort-dir-icon');
            if (icon) icon.className = socialzSortDirection === 'asc' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-short-wide';
            renderSkaters(); 
        }

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
                    case 'location': res = (a.location || '').localeCompare(b.location || ''); break;
                    case 'region': res = (a.region || '').localeCompare(b.region || ''); break;
                    case 'style': res = (a.style || '').localeCompare(b.style || ''); break;
                    case 'total': res = a.rawFollowers - b.rawFollowers; break;
                    case 'ig': res = a.followers.ig - b.followers.ig; break;
                    case 'tt': res = a.followers.tt - b.followers.tt; break;
                    case 'yt': res = a.followers.yt - b.followers.yt; break;
                    case 'fb': res = a.followers.fb - b.followers.fb; break;
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
                grid.innerHTML = window.safeHTML ? window.safeHTML('') : ''; emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                if (viewMode === 'grid') {
                    grid.innerHTML = window.safeHTML ? window.safeHTML(filtered.map(s => {
                        const originalIndex = socialzSkaters.findIndex(orig => orig.id === s.id);
                        const styleList = s.style ? s.style.split(';').map(st => st.trim()).filter(st => st).slice(0, 3) : [];
                        const cleanH = (h) => h ? h.replace(/^@/, '').trim() : '';
                        const igHandle = cleanH(s.handles.ig), ttHandle = cleanH(s.handles.tt), ytHandle = cleanH(s.handles.yt), fbHandle = cleanH(s.handles.fb);

                        let src = ''; let prov = '';
                        if (s.avatarUrl) { src = s.avatarUrl; prov = 'direct'; }
                        
                        const typeClass = (s.type || '').toLowerCase() === 'outdoor' ? 
                            'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 
                            ((s.type || '').toLowerCase() === 'indoor' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300');

                        const regStyles = getRegionStyleConfig(s.region);
                        const igHtml = generateSocial(s.links.ig, s.followers.ig, 'fa-instagram', 'pink', s.handles.ig);
                        const ttHtml = generateSocial(s.links.tt, s.followers.tt, 'fa-tiktok', 'cyan', s.handles.tt);
                        const ytHtml = generateSocial(s.links.yt, s.followers.yt, 'fa-youtube', 'red', s.handles.yt);
                        const fbHtml = generateSocial(s.links.fb, s.followers.fb, 'fa-facebook', 'blue', s.handles.fb);

                        return `<div class="socialz-influencer-card grid-stack" style="background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; transition: all 0.3s; box-shadow: 0 4px 6px var(--shadow-color);">
               <div style="display: flex; flex-direction: column; z-index: 1;">
                 <div style="padding: 12px 16px 16px 16px; flex-grow: 1; display: flex; flex-direction: column;">
               <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div class="grid-stack" style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-color);">
                       <div style="background: linear-gradient(to bottom right, #fb923c, #ef4444); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; z-index: 0;">${s.name.charAt(0)}</div>
                       ${src ? `<img loading="lazy" data-src="${src}" class="lazy-avatar" style="width: 100%; height: 100%; object-fit: cover; z-index: 10; background: var(--bg-container);" data-ig="${igHandle}" data-tt="${ttHandle}" data-yt="${ytHandle}" data-fb="${fbHandle}" data-provider="${prov}">` : ''}
                   </div>
                   <div style="overflow: hidden; flex-grow: 1;">
                       <h2 style="font-weight: bold; font-size: 20px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; color: var(--text-heading); margin: 0;">${s.name}</h2>
                       <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; font-size: 14px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                           <i class="fa-solid fa-location-dot text-brand w-3"> </i> ${s.location} 
                           ${s.region ? `<span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase; ${regStyles}">${s.region}</span>` : ''} 
                           <span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;" class="${typeClass}">${s.type || ''}</span>
                       </div>
                   </div>
               </div>
               <p style="font-size: 14px; margin-top: 12px; margin-bottom: 16px; min-height: 60px; line-height: 1.5; color: var(--text-main); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${s.summary || '<span class="italic opacity-50">No summary.</span>'}</p>
                <div style="border-top: 1px solid var(--border-color); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; width: 100%; padding-top: 12px; margin-top: auto; gap: 8px;">
                    <div style="display: flex; flex-wrap: nowrap; gap: 4px; overflow: hidden;">
                        ${s.collabStatus ? `<span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase; background:rgba(99,102,241,0.1); color:#818cf8; white-space:nowrap; flex-shrink:0;">${s.collabStatus}</span>` : ''}
                        ${styleList.map(st => `<div style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase; background:var(--bg-input); color:var(--text-muted); border:1px solid var(--border-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st}</div>`).join('')}
                    </div>
                    
                    <div style="padding: 3px 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
                        <span style="font-size: 11px; font-weight: 900; color: #f59e0b; text-transform: uppercase;">${formatCountShort(s.rawFollowers)} REACH</span>
                    </div>

                    <div style="display: flex; justify-content: flex-end;">
                        <button class="socialz-hover-color-orange" data-click="click_editSkater" data-index="${originalIndex}" style="font-size: 11px; font-weight: bold; color: #f97316; border:none; background:none; cursor:pointer;"><i class="fa-solid fa-pen"> </i> EDIT</button>
                    </div>
                </div></div>
               <div style="margin-top: auto; padding: 16px; display: flex; justify-content: center; gap: 8px; border-top: 1px solid var(--border-color); background: var(--bg-input); overflow-x: auto;">
                   ${igHtml}${ttHtml}${ytHtml}${fbHtml}
                </div>
               </div>
               
               <!-- Overlay Action Layer -->
               <div class="top-right-action-flex" style="padding: 16px; pointer-events: none; z-index: 20;">
                    <div style="flex:1"></div>
                    <div style="display:flex; gap:8px; pointer-events: auto;">
                        ${s.viralUrl ? `<a href="${s.viralUrl}" target="_blank" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-main); border: 1px solid var(--border-color); color: #FBBF24; filter: drop-shadow(0 0 2px rgba(251,191,36,0.3));" title="View Viral Video"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" clip-rule="evenodd" /></svg></a>` : ''}
                        <button data-click="click_toggleFavorite" data-index="${originalIndex}" class="btn-icon-sq" style="border-radius: 50%; background: var(--bg-main); border: 1px solid var(--border-color); color: ${s.isFavorite ? '#ef4444' : 'var(--text-muted)'};">
                            ${s.isFavorite ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'}
                        </button>
                    </div>
               </div>
            </div>`;
                    }).join('')) : filtered.map(s => {
                        const originalIndex = socialzSkaters.findIndex(orig => orig.id === s.id);
                        const styleList = s.style ? s.style.split(';').map(st => st.trim()).filter(st => st).slice(0, 3) : [];
                        const cleanH = (h) => h ? h.replace(/^@/, '').trim() : '';
                        const igHandle = cleanH(s.handles.ig), ttHandle = cleanH(s.handles.tt), ytHandle = cleanH(s.handles.yt), fbHandle = cleanH(s.handles.fb);

                        let src = ''; let prov = '';
                        if (s.avatarUrl) { src = s.avatarUrl; prov = 'direct'; }
                        
                        const typeClass = (s.type || '').toLowerCase() === 'outdoor' ? 
                            'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 
                            ((s.type || '').toLowerCase() === 'indoor' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300');

                        const regStyles = getRegionStyleConfig(s.region);
                        const igHtml = generateSocial(s.links.ig, s.followers.ig, 'fa-instagram', 'pink', s.handles.ig);
                        const ttHtml = generateSocial(s.links.tt, s.followers.tt, 'fa-tiktok', 'cyan', s.handles.tt);
                        const ytHtml = generateSocial(s.links.yt, s.followers.yt, 'fa-youtube', 'red', s.handles.yt);
                        const fbHtml = generateSocial(s.links.fb, s.followers.fb, 'fa-facebook', 'blue', s.handles.fb);

                        return `<div class="socialz-influencer-card grid-stack" style="background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; transition: all 0.3s; box-shadow: 0 4px 6px var(--shadow-color);">
               <div style="display: flex; flex-direction: column; z-index: 1;">
                 <div style="padding: 12px 16px 16px 16px; flex-grow: 1; display: flex; flex-direction: column;">
               <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div class="grid-stack" style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-color);">
                       <div style="background: linear-gradient(to bottom right, #fb923c, #ef4444); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; z-index: 0;">${s.name.charAt(0)}</div>
                       ${src ? `<img loading="lazy" src="${src}" style="width: 100%; height: 100%; object-fit: cover; z-index: 10; background: var(--bg-container);" data-ig="${igHandle}" data-tt="${ttHandle}" data-yt="${ytHandle}" data-fb="${fbHandle}" data-provider="${prov}">` : ''}
                   </div>
                   <div style="overflow: hidden; flex-grow: 1;">
                       <h2 style="font-weight: bold; font-size: 20px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; color: var(--text-heading); margin: 0;">${s.name}</h2>
                       <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; font-size: 14px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                           <i class="fa-solid fa-location-dot text-brand w-3"> </i> ${s.location} 
                           ${s.region ? `<span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase; ${regStyles}">${s.region}</span>` : ''} 
                           <span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;" class="${typeClass}">${s.type || ''}</span>
                       </div>
                   </div>
               </div>
               <p style="font-size: 14px; margin-top: 12px; margin-bottom: 16px; min-height: 60px; line-height: 1.5; color: var(--text-main); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${s.summary || '<span class="italic opacity-50">No summary.</span>'}</p>
                <div style="border-top: 1px solid var(--border-color); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; width: 100%; padding-top: 12px; margin-top: auto; gap: 8px;">
                    <div style="display: flex; flex-wrap: nowrap; gap: 4px; overflow: hidden;">
                        ${s.collabStatus ? `<span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase; background:rgba(99,102,241,0.1); color:#818cf8; white-space:nowrap; flex-shrink:0;">${s.collabStatus}</span>` : ''}
                        ${styleList.map(st => `<div style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase; background:var(--bg-input); color:var(--text-muted); border:1px solid var(--border-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${st}</div>`).join('')}
                    </div>
                    
                    <div style="padding: 3px 8px; border-radius: 6px; background: var(--bg-input); border: 1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
                        <span style="font-size: 11px; font-weight: 900; color: #f59e0b; text-transform: uppercase;">${formatCountShort(s.rawFollowers)} REACH</span>
                    </div>

                    <div style="display: flex; justify-content: flex-end;">
                        <button class="socialz-hover-color-orange" data-click="click_editSkater" data-index="${originalIndex}" style="font-size: 11px; font-weight: bold; color: #f97316; border:none; background:none; cursor:pointer;"><i class="fa-solid fa-pen"> </i> EDIT</button>
                    </div>
                </div></div>
               <div style="margin-top: auto; padding: 16px; display: flex; justify-content: center; gap: 8px; border-top: 1px solid var(--border-color); background: var(--bg-input); overflow-x: auto;">
                   ${igHtml}${ttHtml}${ytHtml}${fbHtml}
                </div>
               </div>
               
               <!-- Overlay Action Layer -->
               <div class="top-right-action-flex" style="padding: 16px; pointer-events: none; z-index: 20;">
                    <div style="flex:1"></div>
                    <div style="display:flex; gap:8px; pointer-events: auto;">
                        ${s.viralUrl ? `<a href="${s.viralUrl}" target="_blank" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-main); border: 1px solid var(--border-color); color: #FBBF24; filter: drop-shadow(0 0 2px rgba(251,191,36,0.3));" title="View Viral Video"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" clip-rule="evenodd" /></svg></a>` : ''}
                        <button data-click="click_toggleFavorite" data-index="${originalIndex}" class="btn-icon-sq" style="border-radius: 50%; background: var(--bg-main); border: 1px solid var(--border-color); color: ${s.isFavorite ? '#ef4444' : 'var(--text-muted)'};">
                            ${s.isFavorite ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'}
                        </button>
                    </div>
               </div>
            </div>`;
                    }).join('');
                } else {
                    // COMPACT LIST VIEW - TABLE MODE
                    let tCols = [
                        {k: 'fav', label: ''},
                        {k: 'alpha', label: 'Name'},
                        {k: 'location', label: 'Location'},
                        {k: 'region', label: 'Region'},
                        {k: 'style', label: 'Styles'},
                        {k: 'ig', label: 'Instagram'},
                        {k: 'tt', label: 'TikTok'},
                        {k: 'yt', label: 'YouTube'},
                        {k: 'fb', label: 'Facebook'},
                        {k: 'viral', label: 'Viral'},
                        {k: 'total', label: 'Total Reach'},
                        {k: 'edit', label: 'Edit', min: '80px'}
                    ];
                    let ths = tCols.map(c => `<th ${['fav','viral','edit'].includes(c.k) ? '' : `data-click="click_socialzSort" data-sort="${c.k}"`} class="${c.k === socialzCurrentSort ? (socialzSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''} ${c.label==='Name'||c.label==='Location'?'text-left':'text-center'} px-3 py-2 cursor-pointer select-none" title="Sort by ${c.label}">${c.label}</th>`).join('');
                    
                    let tableHtml = `<div style="overflow-x:auto; width:100%;"><table class="neo-table hover-rows" id="socialzListTable" style="width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; text-align:left;">
                        <thead style="position:sticky; top:0; z-index:40; background:var(--bg-panel);"><tr style="color:var(--text-heading); border-bottom:1px solid var(--border-color); font-weight:800;">${ths}</tr></thead><tbody id="socialz-table-body">`;
                    
                    tableHtml += filtered.map(s => {
                        const originalIndex = socialzSkaters.findIndex(orig => orig.id === s.id);
                        const cleanH = (h) => h ? h.replace(/^@/, '').trim() : '';
                        const igHandle = cleanH(s.handles.ig), ttHandle = cleanH(s.handles.tt), ytHandle = cleanH(s.handles.yt), fbHandle = cleanH(s.handles.fb);

                        let src = ''; let _prov = '';
                        if (s.avatarUrl) { src = s.avatarUrl; _prov = 'direct'; }
                        
                        const _typeClass = (s.type || '').toLowerCase() === 'outdoor' ? 
                            'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 
                            ((s.type || '').toLowerCase() === 'indoor' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300');

                        const regStyles = getRegionStyleConfig(s.region);
                        const parsedStyles = s.style ? s.style.split(';').map(st => `<span style="background: var(--bg-input); padding: 2px 6px; border-radius: 4px; margin: 0 2px; font-size: 9px; text-transform: uppercase; font-weight: bold; border: 1px solid var(--border-color);" style="border-color:var(--border-color)">${st.trim()}</span>`).join('') : '-';
                        
                        return `<tr class="socialz-hover-bg-blue-light" style="border-bottom:1px solid var(--border-color); background:var(--bg-panel);">
                            <td class="overflow-hidden" style="padding:4px; text-align:center;">
                                <button class="socialz-hover-scale-11" data-click="click_toggleFavorite" data-index="${originalIndex}" style="display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 100%; color: ${s.isFavorite ? '#ef4444' : 'var(--text-muted)'};">${s.isFavorite ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'}</button>
                            </td>
                            <td class="trunc-col" style="padding:4px 12px; font-weight:bold; color:var(--text-heading); text-align:left;">
                                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; width: 100%;">
                                    <div class="grid-stack" style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-muted); flex-shrink: 0;">
                                        <div style="display: flex; align-items: center; justify-content: center; z-index: 0; font-size: 10px;">${s.name.charAt(0)}</div>
                                        ${src ? `<img loading="lazy" data-src="${src}" class="lazy-avatar" style="width: 100%; height: 100%; object-fit: cover; z-index: 10;" data-ig="${igHandle}" data-tt="${ttHandle}" data-yt="${ytHandle}" data-fb="${fbHandle}" data-provider="${_prov}">` : ''}
                                    </div>
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%;">${s.name}</span>
                                </div>
                            </td>
                            <td class="trunc-col" style="padding:4px 12px; color:var(--text-muted); text-align:left;">${s.location || '-'}</td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;"><span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; ${regStyles}">${s.region || '-'}</span></td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;">${parsedStyles}</td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;"><a href="${s.links.ig||'#'}" target="_blank" style="font-weight:800; color:#ec4899; display:block; overflow:hidden; text-overflow:ellipsis;">${s.followers.ig||'0'}</a></td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;"><a href="${s.links.tt||'#'}" target="_blank" style="font-weight:800; color:#06b6d4; display:block; overflow:hidden; text-overflow:ellipsis;">${s.followers.tt||'0'}</a></td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;"><a href="${s.links.yt||'#'}" target="_blank" style="font-weight:800; color:#ef4444; display:block; overflow:hidden; text-overflow:ellipsis;">${s.followers.yt||'0'}</a></td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;"><a href="${s.links.fb||'#'}" target="_blank" style="font-weight:800; color:#3b82f6; display:block; overflow:hidden; text-overflow:ellipsis;">${s.followers.fb||'0'}</a></td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;">${s.viralUrl ? `<a href="${s.viralUrl}" target="_blank" class="socialz-hover-scale-125" style="display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 100%; height: 100%;" title="View Viral Video"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="color: #FBBF24; filter: drop-shadow(0 0 5px rgba(251,191,36,0.6));"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" clip-rule="evenodd" /></svg></a>` : '-'}</td>
                            <td class="overflow-hidden" style="padding:4px; text-align:right; font-weight:900; color:var(--text-heading); font-size:13px;">${formatCountShort(s.rawFollowers)}</td>
                            <td class="overflow-hidden" style="padding:4px; text-align:center;"><button class="socialz-hover-color-orange-light" data-click="click_editSkater" data-index="${originalIndex}" style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 9px; display: flex; align-items: center; justify-content: center; gap: 4px; margin: 0 auto; color: var(--text-muted); background: var(--bg-input); border: 1px solid var(--border-color);"><i class="fa-solid fa-pen"> </i> EDIT</button></td>
                        </tr>`;
                    }).join('');
                    
                    tableHtml += `</tbody></table></div>`;
                    grid.innerHTML = window.safeHTML ? window.safeHTML(tableHtml) : tableHtml;
                    setTimeout(() => { if(typeof applyTableInteractivity === 'function') applyTableInteractivity('skater-grid-wrapper'); }, 50);
                }
            }
            
            document.querySelectorAll('.lazy-avatar').forEach(img => {
                if (img.getAttribute('data-src')) avatarObserver.observe(img);
            });
        }

        // --- Export CSV ---
        window.exportCSV = function exportCSV() {
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
        window.handleCSVImport = function handleCSVImport(input) {
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
                } catch(err) { console.error("IMPORT ERROR:", err); sysLog("Import failed: " + err.message, true); }
                input.value = '';
            };
            reader.readAsArrayBuffer(f);
        }

        // --- MIGRATION ENGINE (PASSIVE MONITOR) ---
        let _migrationMonitorInterval = null;
        
        window.click_startAvatarMigration = async function() { 
            document.getElementById('migration-modal').style.display = 'flex'; 
            
            const statusEl = document.getElementById('migration-status-text');
            const progressText = document.getElementById('migration-progress-text');
            const progressBar = document.getElementById('migration-progress-bar');
            const term = document.getElementById('migration-log-terminal');
            
            term.innerHTML = window.safeHTML ? window.safeHTML('> Connecting to Supabase Storage...<br>') : '> Connecting to Supabase Storage...<br>';
            statusEl.innerText = "Monitoring DB Sync...";
            
            async function checkProgress() {
                const { data, error } = await supabaseClient.from('socialz_audience').select('name, avatar_url');
                if(!error && data) {
                    const total = data.length;
                    const complete = data.filter(s => s.avatar_url && s.avatar_url.includes('supabase.co')).length;
                    
                    progressText.innerText = `${complete} / ${total}`;
                    progressBar.style.width = `${(complete/total)*100}%`;
                    
                    if(complete >= total) {
                        term.innerHTML = window.safeHTML ? window.safeHTML(term.innerHTML + '> 100% Complete. All avatars safely stored.<br>') : term.innerHTML + '> 100% Complete. All avatars safely stored.<br>';
                        statusEl.innerText = "Migration Complete!";
                        clearInterval(_migrationMonitorInterval);
                    } else {
                        const newContent = '> Syncing with background Node task...<br>> ' + complete + ' avatars securely stored in Supabase.<br>> Awaiting next batch...<br>';
                        term.innerHTML = window.safeHTML ? window.safeHTML(newContent) : newContent;
                    }
                }
            }
            
            checkProgress();
            _migrationMonitorInterval = setInterval(checkProgress, 3000);
        }
        
        window.click_closeMigrationModal = function() { 
            document.getElementById('migration-modal').style.display = 'none'; 
            if(_migrationMonitorInterval) clearInterval(_migrationMonitorInterval);
        }
        
        window.click_runMigrationEngine = async function() {
            const statusEl = document.getElementById('migration-status-text');
            const progressText = document.getElementById('migration-progress-text');
            const progressBar = document.getElementById('migration-progress-bar');
            const term = document.getElementById('migration-log-terminal');
            
            function log(msg) { term.innerHTML = window.safeHTML ? window.safeHTML(term.innerHTML + '> ' + msg + '<br>') : term.innerHTML + '> ' + msg + '<br>'; term.scrollTop = term.scrollHeight; }
            
            statusEl.innerText = "Scanning database...";
            
            // Only target skaters without a Supabase Storage URL
            const targets = socialzSkaters.filter(s => !s.avatarUrl || !s.avatarUrl.includes('supabase.co'));
            
            if(targets.length === 0) {
                statusEl.innerText = "Complete - No missing avatars!";
                log("Zero missing avatars found in database. You are 100% synced.");
                return;
            }
            
            statusEl.innerText = "Migration active...";
            log(`Found ${targets.length} skaters needing avatars. Proceeding with 2.5s delays...`);
            
            let success = 0;
            for(let i = 0; i < targets.length; i++) {
                const s = targets[i];
                progressText.innerText = `${i+1} / ${targets.length}`;
                progressBar.style.width = `${((i+1)/targets.length)*100}%`;
                
                log(`[${i+1}/${targets.length}] Fetching ${s.name}...`);
                const cleanH = (h) => h ? h.replace(/^@/, '').trim() : '';
                const ig = cleanH(s.handles.ig), tt = cleanH(s.handles.tt), yt = cleanH(s.handles.yt), fb = cleanH(s.handles.fb);
                
                let fetchedBlob = null;
                let ext = 'jpeg';
                let successProvider = null;
                
                async function tryFetch(prov, handle) {
                    if(!handle) return false;
                    try {
                        const r = await fetch(`https://unavatar.io/${prov}/${handle}?fallback=false`);
                        if(r.status === 429) {
                            log(`  <span style="color:#ef4444;">[!] 429 RATE LIMIT. Switch your VPN.</span>`);
                            return false;
                        }
                        if(r.ok) {
                            fetchedBlob = await r.blob();
                            const cType = r.headers.get('content-type') || 'image/jpeg';
                            ext = cType.split('/')[1] || 'jpeg';
                            successProvider = prov;
                            return true;
                        }
                    } catch(e) { log(`  <span style="color:#ef4444;">[FETCH ERR]</span> ${e.message}`); }
                    return false;
                }
                
                log(`  -> Trying providers...`);
                let found = await tryFetch('instagram', ig);
                if(!found && tt) { await new Promise(r=>setTimeout(r,1000)); found = await tryFetch('tiktok', tt); }
                if(!found && yt) { await new Promise(r=>setTimeout(r,1000)); found = await tryFetch('youtube', yt); }
                if(!found && fb) { await new Promise(r=>setTimeout(r,1000)); found = await tryFetch('facebook', fb); }
                
                if(found && fetchedBlob) {
                    const filename = `${s.id}_${successProvider}.${ext}`;
                    log(`  <span style="color:#3b82f6;">[+]</span> Downloading... Uploading to Supabase...`);
                    
                    try {
                        const { data: _uploadData, error: uploadError } = await window.supabaseClient.storage.from('avatars').upload(filename, fetchedBlob, { upsert: true });
                        if(uploadError) {
                            log(`  <span style="color:#ef4444;">[STORAGE ERROR]</span> ${uploadError.message}`);
                            // Usually means RLS policies don't allow public inserts!
                        } else {
                            const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(filename);
                            const { error: dbErr } = await supabaseClient.from('socialz_audience').update({ avatar_url: publicUrl }).eq('id', s.id);
                            if(dbErr) log(`  <span style="color:#ef4444;">[DB ERROR]</span> ${dbErr.message}`);
                            else {
                                log(`  <span style="color:#10b981;">[$$]</span> Saved to Storage!`);
                                success++;
                                s.avatarUrl = publicUrl;
                            }
                        }
                    } catch(err) { log(`  <span style="color:#ef4444;">[FATAL]</span> ${err.message}`); }
                } else {
                    log(`  <span style="color:#f59e0b;">[SKIP]</span> No valid avatar returned (or rate limited).`);
                }
                
                // Sleep for rate limits
                if (i < targets.length - 1) await new Promise(r => setTimeout(r, 2500));
            }
            
            statusEl.innerText = "Migration Finished";
            log(`<strong>Job Finished.</strong> Saved ${success} new avatars! You can safely close this window.`);
            renderSkaters();
        }

        // --- CRUD Modals ---
        window.openModal = function openModal() { document.getElementById('skater-modal').style.display = 'flex'; document.getElementById('skater-form').reset(); document.getElementById('edit-index').value = "-1"; document.getElementById('modal-title').innerText = "Add New Skater"; }
        function closeModal() { document.getElementById('skater-modal').style.display = 'none'; }
        window.editSkater = function editSkater(index) {
            const s = socialzSkaters[index]; document.getElementById('skater-modal').style.display = 'flex'; document.getElementById('edit-index').value = index; document.getElementById('modal-title').innerText = "Edit Skater";
            document.getElementById('input-name').value = s.name; document.getElementById('input-location').value = s.location; document.getElementById('input-region').value = s.region; document.getElementById('input-contact').value = s.contactInfo; document.getElementById('input-style').value = s.style; document.getElementById('input-type').value = s.type; document.getElementById('input-collab-tier').value = s.collabTier; document.getElementById('input-collab-status').value = s.collabStatus; document.getElementById('input-summary').value = s.summary; document.getElementById('input-viral').value = s.viralUrl;
            if (document.getElementById('input-avatar-url')) document.getElementById('input-avatar-url').value = s.avatarUrl || '';
            document.getElementById('input-favorite').checked = s.isFavorite || false;
            document.getElementById('input-ig').value = s.handles.ig; document.getElementById('input-ig-link').value = s.links.ig; document.getElementById('input-ig-followers').value = s.followers.ig;
            document.getElementById('input-tt').value = s.handles.tt; document.getElementById('input-tt-link').value = s.links.tt; document.getElementById('input-tt-followers').value = s.followers.tt;
            document.getElementById('input-yt').value = s.handles.yt; document.getElementById('input-yt-link').value = s.links.yt; document.getElementById('input-yt-followers').value = s.followers.yt;
            document.getElementById('input-fb').value = s.handles.fb; document.getElementById('input-fb-link').value = s.links.fb; document.getElementById('input-fb-followers').value = s.followers.fb;
        }

        window.deleteSkaterFromModal = async function deleteSkaterFromModal() { 
            const i = parseInt(document.getElementById('edit-index').value); 
            if (i > -1 && confirm("Delete?")) { 
                try {
                    const skater = socialzSkaters[i];
                    if (skater.id && typeof skater.id === 'string' && skater.name) {
                        const { error } = await supabaseClient.from('socialz_audience').delete().eq('name', skater.name);
                        if(error) throw new Error(error.message);
                    }
                    socialzSkaters.splice(i, 1); updateFilterDropdownOptions(); renderSkaters(); closeModal(); sysLog("Deleted"); 
                } catch(e) { sysLog("Failed to delete from DB: " + e.message, true); }
            } 
        }
        
        window.handleFormSubmit = async function handleFormSubmit(e) {
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
                avatar_url: document.getElementById('input-avatar-url') ? document.getElementById('input-avatar-url').value : null,
                handle_ig: document.getElementById('input-ig').value, handle_tt: document.getElementById('input-tt').value, handle_yt: document.getElementById('input-yt').value, handle_fb: document.getElementById('input-fb').value,
                link_ig: document.getElementById('input-ig-link').value, link_tt: document.getElementById('input-tt-link').value, link_yt: document.getElementById('input-yt-link').value, link_fb: document.getElementById('input-fb-link').value,
                followers_ig: parseFollowerCount(igf), followers_tt: parseFollowerCount(ttf), followers_yt: parseFollowerCount(ytf), followers_fb: parseFollowerCount(fbf),
                raw_followers: parseFollowerCount(igf) + parseFollowerCount(ttf) + parseFollowerCount(ytf) + parseFollowerCount(fbf)
            };
            
            try {
                if(i !== -1 && typeof socialzSkaters[i].id === 'string') { dbRow.id = socialzSkaters[i].id; }
                const { _data, error } = await supabaseClient.from('socialz_audience').upsert(dbRow, { onConflict: 'name' }).select();
                if(error) throw new Error(error.message);
                
                // Fetch full remote state again just to ensure everything is perfect
                const { data: remoteData } = await supabaseClient.from('socialz_audience').select('*').order('name', { ascending: true });
                if(remoteData) initSocialzData(remoteData);
                closeModal(); sysLog("Saved to DB!");
            } catch(err) {
                console.error("DB SAVE ERROR", err);
                sysLog("Failed to save to DB: " + err.message, true);
            }
        }

        renderSkaters();
    
    // V11 NEOGLEAMZ NATIVE METRICS SYNC & SHIM
    const originalRenderSkaters = renderSkaters;
    window.renderSkaters = function() {
        originalRenderSkaters(); 
    };
    
    window.showSocialzPane = function(_paneId) {
        if(document.getElementById('paneSocialzRoster')) document.getElementById('paneSocialzRoster').style.setProperty('display', 'flex', 'important');
    };
    
    // Safely reference hideAllExecutivePanes using window to avoid ReferenceErrors
    const originalHideExecutive = window.hideAllExecutivePanes;
    window.hideAllExecutivePanes = function() {
        if (originalHideExecutive) originalHideExecutive();
        try {
            if(document.getElementById('paneSocialzRoster')) document.getElementById('paneSocialzRoster').style.setProperty('display', 'none', 'important');
        } catch(e) { sysLog("UI Error hiding social pane: " + e.message, true); }
    }
    
        window.handleManualAvatarUpload = async function(inputElem) {
            const file = inputElem.files[0];
            if(!file) return;
            
            const urlInput = document.getElementById('input-avatar-url');
            urlInput.value = "Uploading to Storage...";
            urlInput.disabled = true;
            
            try {
                // Generate a unique filename using timestamp and original name
                const ext = file.name.split('.').pop() || 'jpeg';
                const filename = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                
                const { error } = await supabaseClient.storage.from('avatars').upload(filename, file, { upsert: true });
                if(error) {
                    alert("Upload failed! RLS policy might be blocking Public Inserts: " + error.message);
                    urlInput.value = "";
                } else {
                    const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(filename);
                    urlInput.value = publicUrl;
                    sysLog("Manual avatar uploaded to Storage: " + filename);
                }
            } catch(e) {
                alert("Upload failed: " + e.message);
                urlInput.value = "";
            } finally {
                urlInput.disabled = false;
                inputElem.value = ""; // reset input
            }
        };

    // --- LIVE ANALYTICS DATA BINDING ---
    let socialzChartInstances = {};
    window.openAnalyticsDashboard = function() {
        const modal = document.getElementById('analytics-modal');
        if(modal) modal.style.display = 'flex';
        renderSocialzCharts();
    };
    window.closeAnalyticsDashboard = function() {
        const modal = document.getElementById('analytics-modal');
        if(modal) modal.style.display = 'none';
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
                data: { labels: topSkaters.map(s=>s.name), datasets: [{ label: 'Total Followers', data: topSkaters.map(s=>s.rawFollowers), backgroundColor: '#a855f7', borderRadius: 4 }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false } } }
            });
        }
        
        // 2. Popular Styles (Vertical Bar)
        const ctxStyles = document.getElementById('chart-top-styles');
        if(ctxStyles) {
            if(socialzChartInstances['styles']) socialzChartInstances['styles'].destroy();
            const styles = {}; 
            socialzSkaters.forEach(s => {
                const arr = (s.style||'').split(/[;,/|]/).map(t=>t.trim()).filter(Boolean);
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
            const colors = ['#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#c084fc', '#d8b4fe', '#f3e8ff', '#581c87'];
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
                data: { labels: Object.keys(plat), datasets: [{ data: Object.values(plat), backgroundColor: ['#a855f7', '#9333ea', '#7e22ce', '#c084fc'], borderWidth:0, hoverOffset: 10 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }
            });
        }
    }
