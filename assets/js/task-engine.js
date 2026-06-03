/* =========================================================================
   TASK ENGINE (PHASE 3)
   A.I. Generated UI Takeover Module
   ========================================================================= */

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let isTaskPlannerOpen = false;

let taskEngineDB = { taskz: [], cyclez: [], projectz: [], teams: [], comments: [], activity: [], tagz: [] };
window.taskEngineDB = taskEngineDB;
window.teCurrentSort = { col: null, dir: 'asc' };
window.teActiveProjectId = null;

const TE_OFFICIAL_USERS = {
    'ef25fcf4-3521-45ef-990f-6361d416a53b': { name: 'Chris', email: 'chrisl@neogleamz.com' },
    'd806e985-3ba1-4b8c-9d2d-3197eb60e416': { name: 'Andy', email: 'andyl@neogleamz.com' },
    'a1b627d4-78ca-4039-8029-384eeeb13542': { name: 'Tyson', email: 'tysonl@neogleamz.com' }
};

function isUserInTeam(team, userId) {
    if (!team || !team.members) return false;
    if (team.members.includes(userId)) return true;
    let userObj = TE_OFFICIAL_USERS[userId];
    if (userObj) {
        if (team.members.includes(userObj.name)) return true;
        let alias = userObj.email.split('@')[0];
        if (team.members.includes(alias)) return true;
    }
    return false;
}

window.initTaskEngine = async function() {
    console.log('[TaskEngine] Initialization check complete.');
    if (typeof supabaseClient !== 'undefined') {
        await teFetchAllData();
    } else {
        console.warn('[TaskEngine] supabaseClient not defined.');
    }
};

window.teGetStringColor = function(str) {
    if (!str) return '#3b82f6';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];
    let index = Math.abs(hash) % colors.length;
    return colors[index];
};

/**
 * Asynchronously boots the Task Engine data cache by executing parallel
 * read operations against the Supabase `taskz`, `cyclez`, and `teams` tables.
 * Safely parses the payloads and passes them to the Vanilla DOM renderers.
 */
async function teFetchAllData() {
    try {
        const [taskzRes, cyclezRes, projectzRes, teamsRes, commentsRes, activityRes, tagzRes] = await Promise.all([
            supabaseClient.from('taskz').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('cyclez').select('*').order('start_date', { ascending: false }),
            supabaseClient.from('projectz').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('teams').select('*').order('name', { ascending: true }),
            supabaseClient.from('task_comments').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('task_activity').select('*').order('timestamp', { ascending: false }),
            supabaseClient.from('tagz').select('*').order('name', { ascending: true })
        ]);
        if (taskzRes.data) taskEngineDB.taskz = taskzRes.data;
        if (cyclezRes.data) taskEngineDB.cyclez = cyclezRes.data;
        if (projectzRes.data) taskEngineDB.projectz = projectzRes.data;
        if (teamsRes.data) taskEngineDB.teams = teamsRes.data;
        if (commentsRes.data) taskEngineDB.comments = commentsRes.data;
        if (activityRes.data) taskEngineDB.activity = activityRes.data;
        if (tagzRes.data) taskEngineDB.tagz = tagzRes.data;
        
        if (typeof window.tePopulateTagFilter === 'function') window.tePopulateTagFilter();
        
        teRenderSidebar();
        teRenderTaskGrid();
        teUpdateInboxBadge();
    } catch (err) {
        console.error('[TaskEngine] Failed to fetch data', err);
    }
}

window.teChangeIdentity = function(_userId) {
    // Deprecated: Identity is now strictly tied to Supabase Auth session via window.currentUser
    console.warn("teChangeIdentity is deprecated.");
};

function teUpdateInboxBadge() {
    const badge = document.getElementById('te-inbox-badge');
    if (!badge) return;
    let currentUser = window.currentUser ? window.currentUser.id : null;
    let currentAlias = window.currentUser ? window.currentUser.email.split('@')[0] : null;
    if (!currentUser) {
        badge.style.display = 'none';
        return;
    }
    // Count unread or relevant items (e.g. mentions in comments or activity on tasks they own)
    // For now, let's just count comments containing "@" + currentAlias
    let count = taskEngineDB.comments.filter(c => c.content && currentAlias && c.content.includes('@' + currentAlias)).length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function teRenderSidebar() {
    const projectzList = document.getElementById('te-projectz-list');
    const teamsList = document.getElementById('te-teams-list');
    
    if (projectzList) {
        let projectHTML = '';
        let currentUser = window.currentUser ? window.currentUser.id : null;
        taskEngineDB.projectz.filter(p => {
            if (p.is_archived) return false;
            if (p.visibility === 'Private') {
                if (!p.created_by || p.created_by !== currentUser) return false;
            }
            return true;
        }).forEach(p => {
            let isActive = window.teActiveProjectId === p.id ? 'active' : '';
            projectHTML += `
                <div class="task-nav-link ${isActive}" style="flex-direction: column; align-items: flex-start; position: relative;" data-click="click_teSelectProject" data-project-id="${p.id}">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                        <span style="font-weight: 800; display: flex; align-items: center; gap: 6px;">
                            <span style="display:inline-block; width:10px; height:10px; background:${p.color_hex || '#f97316'}; border-radius:3px;"></span>
                            ${p.title}
                        </span>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span data-click="click_teOpenEditProject" data-project-id="${p.id}" style="font-size: 10px; cursor: pointer; padding: 2px; filter: grayscale(100%); opacity: 0.7;" class="te-hover-grayscale">✏️</span>
                            <span data-click="click_teDeleteProject" data-project-id="${p.id}" style="color: var(--text-muted); font-size: 10px; cursor: pointer; padding: 2px;">✖</span>
                        </div>
                    </div>
                </div>
            `;
        });
        projectzList.innerHTML = window.safeHTML ? window.safeHTML(projectHTML) : projectHTML;
    }
    
    if (teamsList) {
        let teamsHTML = '';
        taskEngineDB.teams.filter(t => !t.is_archived).forEach(t => {
            let membersList = (t.members || []).map(m => {
                let displayName = m;
                let avatarSeed = m;
                if (TE_OFFICIAL_USERS[m]) {
                    displayName = TE_OFFICIAL_USERS[m].name;
                    avatarSeed = displayName;
                }
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 4px;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div style="width: 14px; height: 14px; border-radius: 50%; background: ${window.teGetStringColor(avatarSeed)}; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: white;">${displayName.substring(0,1).toUpperCase()}</div>
                            <span style="font-size: 11px; color: #ccc;">${displayName}</span>
                        </div>
                        <span data-click="click_teRemoveTeamMember" data-team-id="${t.id}" data-member-name="${m}" style="color: var(--text-muted); font-size: 10px; cursor: pointer; padding: 2px;">✖</span>
                    </div>
                `;
            }).join('');

            teamsHTML += `
                <div style="display: flex; flex-direction: column;">
                    <div class="task-nav-link" style="display: flex; justify-content: space-between; align-items: center;" data-click="click_teToggleTeamMembers" data-team-id="${t.id}">
                        <span>${t.name}</span>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <span data-click="click_teAddTeamMember" data-team-id="${t.id}" style="color: var(--text-muted); font-size: 12px; cursor: pointer; padding: 2px;">+</span>
                            <span data-click="click_teDeleteTeam" data-team-id="${t.id}" style="color: var(--text-muted); font-size: 10px; cursor: pointer; padding: 2px;">✖</span>
                        </div>
                    </div>
                    <div id="te-team-members-${t.id}" style="display: none; flex-direction: column; padding-left: 15px; margin-bottom: 5px;">
                        ${membersList}
                        ${(!t.members || t.members.length === 0) ? '<span style="font-size: 10px; color: var(--text-muted); padding: 2px 4px;">No members</span>' : ''}
                    </div>
                </div>
            `;
        });
        teamsList.innerHTML = window.safeHTML ? window.safeHTML(teamsHTML) : teamsHTML;
    }
}

/**
 * Renders the main task list grid view based on the current filter criteria,
 * grouping items by cycle and recursively constructing parent/child DOM relationships.
 * @param {string|null} filter - The string identifier for the active filter view.
 */
function teRenderTaskGrid(filter = null) {
    if (!filter) {
        let activeNav = document.querySelector('.task-nav-link.active');
        if (activeNav) {
            let txt = activeNav.textContent.toLowerCase();
            if (txt.includes('inbox')) filter = 'inbox';
            else if (txt.includes('my tasks')) filter = 'my_tasks';
            else if (txt.includes('in progress')) filter = 'in_progress';
            else if (txt.includes('completed')) filter = 'completed';
            else if (txt.includes('archive')) filter = 'archive';
            else filter = 'list';
        } else {
            filter = 'list';
        }
    }
    const wrapper = document.getElementById('te-task-rows-wrapper');
    if (!wrapper) return;
    
    let html = '';
    
    // Determine filters
    let currentUser = window.currentUser ? window.currentUser.id : null;
    let taskList = taskEngineDB.taskz;
    
    if (filter === 'my_tasks' && currentUser && currentUser !== 'none') {
        // filter by assignee or by created_by if no assignee logic is robust yet. We'll check assigned_to_id or created_by_id? 
        // We only have the name in currentUser right now. We should map it to an actual user ID if we had one, but we are spoofing.
        // Let's assume for spoofing we just match the metadata or title temporarily, or if we assign via teams.
        // Actually, the assignment dropdown sets the value to "Chris", "Andy", etc. We will store that in `metadata.spoofed_assignee`.
    }
    
    // Filter tasks based on view
    let displayTasks = taskList.filter(t => {
        if (t.is_archived) return false;
        
        if (t.project_id) {
            let p = taskEngineDB.projectz.find(proj => proj.id === t.project_id);
            if (p && p.visibility === 'Private') {
                let owner = p.owner_id;
                if (!owner || owner !== currentUser) return false;
            }
        }
        
        if (filter === 'in_progress') return t.status === 'In Progress';
        if (filter === 'completed') return t.status === 'Completed' || t.status === 'Done';
        if (filter === 'inbox') {
            if (t.status === 'Completed' || t.status === 'Done' || t.status === 'In Progress') return false;
            let meta = t.metadata || {};
            let assignee = t.assigned_to_id || 'UNASSIGNED';
            
            if (assignee === 'UNASSIGNED' || assignee.trim() === '') {
                if (meta.assigned_team_id) {
                    let team = taskEngineDB.teams.find(tm => tm.id === meta.assigned_team_id);
                    if (team && isUserInTeam(team, currentUser)) return true;
                    return false; // unassigned but belongs to another team
                }
                return true; // globally unassigned
            }
            
            if (assignee === currentUser) return true;
            return false;
        }
        if (filter === 'my_tasks') {
            let meta = t.metadata || {};
            let assignee = t.assigned_to_id || 'UNASSIGNED';
            
            if (assignee === currentUser) return true;
            
            if (meta.assigned_team_id) {
                let team = taskEngineDB.teams.find(tm => tm.id === meta.assigned_team_id);
                // If it is assigned to my team, it belongs in My Tasks regardless of individual claim status.
                if (team && isUserInTeam(team, currentUser)) return true;
            }
            return false;
        }
        return t.status !== 'Completed' && t.status !== 'Done'; // Default 'list' view hides done
    });
    if (window.teActiveProjectId) {
        displayTasks = displayTasks.filter(t => t.project_id === window.teActiveProjectId);
    }

    // 1. Initial UI Hierarchy Safety: Build the COMPLETE list of tasks that belong in this view regardless of search/tag filters.
    // This ensures that if a parent is in the Inbox, we pull its children into the view BEFORE filtering.
    let fullViewTasks = new Set(displayTasks);
    
    function getAllDescendants(taskId) {
        let children = taskEngineDB.taskz.filter(t => t.parent_task_id === taskId && t.status !== 'Archived');
        children.forEach(c => {
            fullViewTasks.add(c);
            getAllDescendants(c.id);
        });
    }
    
    function getAllAncestors(taskId) {
        let t = taskEngineDB.taskz.find(task => task.id === taskId);
        if (t && t.parent_task_id) {
            let p = taskEngineDB.taskz.find(pt => pt.id === t.parent_task_id);
            if (p && !p.is_archived) {
                fullViewTasks.add(p);
                getAllAncestors(p.id);
            }
        }
    }
    
    displayTasks.forEach(t => {
        getAllDescendants(t.id);
        getAllAncestors(t.id);
    });
    displayTasks = Array.from(fullViewTasks);

    const searchInput = document.getElementById('te-task-search');
    const tagSelect = document.getElementById('te-tag-filter');
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const tagVal = tagSelect ? tagSelect.value : '';

    if (searchVal || tagVal) {
        displayTasks = displayTasks.filter(t => {
            let meta = t.metadata || {};
            let tags = meta.tag_ids || [];
            
            let matchSearch = true;
            if (searchVal) {
                let titleMatch = (t.title || '').toLowerCase().includes(searchVal);
                let tagMatchSearch = false;
                tags.forEach(tagId => {
                    let tagObj = taskEngineDB.tagz.find(tg => tg.id == tagId);
                    if (tagObj && tagObj.name.toLowerCase().includes(searchVal)) {
                        tagMatchSearch = true;
                    }
                });
                matchSearch = titleMatch || tagMatchSearch;
            }
            
            let matchTag = true;
            if (tagVal) {
                matchTag = tags.some(tag => String(tag) === String(tagVal));
            }
            
            return matchSearch && matchTag;
        });

        // 2. Post-Filter Hierarchy Safety: Ensure all ancestors of matching tasks are visible so nested structures don't break.
        let extraIdsToAdd = new Set();
        function ensureAncestors(taskId) {
            let t = taskEngineDB.taskz.find(tk => tk.id === taskId);
            if (t && t.parent_task_id) {
                if (!displayTasks.some(p => p.id === t.parent_task_id) && !extraIdsToAdd.has(t.parent_task_id)) {
                    extraIdsToAdd.add(t.parent_task_id);
                }
                ensureAncestors(t.parent_task_id);
            }
        }
        displayTasks.forEach(t => ensureAncestors(t.id));
        extraIdsToAdd.forEach(id => {
            let task = taskEngineDB.taskz.find(t => t.id === id);
            if (task && !task.is_archived) displayTasks.push(task);
        });
    }

    // Group by Cycle (Sections)
    let cycleGroups = new Map();
    cycleGroups.set('unassigned', { title: 'No Section', color: '#64748b', tasks: [] });
    
    let isPersonalView = !window.teActiveProjectId;
    let currentUserId = window.currentUser ? window.currentUser.id : null;

    let sortedCyclez = taskEngineDB.cyclez.filter(c => {
        if (c.is_archived) return false;
        if (!isPersonalView) {
            return c.project_id === window.teActiveProjectId;
        } else {
            // Include personal/shared cycles if they belong to the user, OR if they contain tasks in the current personal view!
            if (!c.project_id) {
                if (c.assigned_to_id === currentUserId) return true;
                return displayTasks.some(t => !t.parent_task_id && (t.personal_cycle_id === c.id || t.cycle_id === c.id));
            }
            // Include project cycles ONLY if they contain tasks in the current personal view
            if (c.project_id) {
                return displayTasks.some(t => !t.parent_task_id && !t.personal_cycle_id && t.cycle_id === c.id);
            }
            return false;
        }
    }).sort((a,b) => {
        let aSort = (a.metadata && typeof a.metadata.sort_order === 'number') ? a.metadata.sort_order : 999999;
        let bSort = (b.metadata && typeof b.metadata.sort_order === 'number') ? b.metadata.sort_order : 999999;
        return aSort - bSort;
    });
    
    sortedCyclez.forEach(c => {
        let title = c.title;
        let cColor = c.color_hex;
        let badgeHtml = '';
        // Prefix project cycles with the project name for clarity in personal views
        if (isPersonalView && c.project_id) {
            let p = taskEngineDB.projectz.find(proj => proj.id === c.project_id);
            if (p) {
                title = `${p.title} ➔ ${c.title}`;
                if (!cColor || cColor === '#10b981') cColor = p.color_hex;
            }
        } else if (isPersonalView && !c.project_id && c.assigned_to_id) {
            badgeHtml = `<span style="background: #a855f720; color: #a855f7; padding: 2px 6px; border-radius: 4px; border: 1px solid #a855f740; font-size: 10px; font-weight: bold; margin-bottom: 0px; display: inline-block;">PRIVATE</span>`;
            if (!cColor || cColor === '#10b981') cColor = '#a855f7';
        }
        
        if (!cColor) cColor = c.project_id ? '#3b82f6' : '#a855f7';
        
        if (!isPersonalView && window.teActiveProjectId) {
            let p = taskEngineDB.projectz.find(proj => proj.id === window.teActiveProjectId);
            if (p && p.color_hex) {
                cColor = p.color_hex;
            }
        }
        
        cycleGroups.set(c.id, { title: title, color: cColor, badgeHtml: badgeHtml, tasks: [], project_id: c.project_id || null });
    });
    
    // Sort tasks into cycles (only top-level tasks)
    displayTasks.filter(t => !t.parent_task_id).forEach(t => {
        let cid = isPersonalView ? (t.personal_cycle_id || t.cycle_id) : t.cycle_id;
        if (cid && cycleGroups.has(cid)) {
            cycleGroups.get(cid).tasks.push(t);
        } else {
            cycleGroups.get('unassigned').tasks.push(t);
        }
    });
    
    // Apply sorting to cycleGroups
    for (const [_cid, group] of cycleGroups) {
        group.tasks.sort((a, b) => {
            if (window.teCurrentSort && window.teCurrentSort.col) {
                let dir = window.teCurrentSort.dir === 'asc' ? 1 : -1;
                let col = window.teCurrentSort.col;
                let valA, valB;
                if (col === 'title') {
                    valA = (a.title || '').toLowerCase();
                    valB = (b.title || '').toLowerCase();
                } else if (col === 'owner') {
                    valA = ((a.metadata && a.metadata.spoofed_assignee) || '').toLowerCase();
                    valB = ((b.metadata && b.metadata.spoofed_assignee) || '').toLowerCase();
                } else if (col === 'status') {
                    valA = (a.status || '').toLowerCase();
                    valB = (b.status || '').toLowerCase();
                } else if (col === 'timeline') {
                    valA = a.due_date ? new Date(a.due_date).getTime() : 0;
                    valB = b.due_date ? new Date(b.due_date).getTime() : 0;
                }
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
                return 0;
            } else {
                let aSort = (a.metadata && typeof a.metadata.sort_order === 'number') ? a.metadata.sort_order : 999999;
                let bSort = (b.metadata && typeof b.metadata.sort_order === 'number') ? b.metadata.sort_order : 999999;
                return aSort - bSort;
            }
        });
    }
    // Render loop
    html += `<div id="te-sections-wrapper" class="te-sortable-sections-list">`;


    let collapsedCache;
    try {
        collapsedCache = JSON.parse(localStorage.getItem('neogleamz_task_sections_collapsed') || '{}') || {};
    } catch(_e) { collapsedCache = {}; }

    for (const [cid, group] of cycleGroups) {
        if (group.tasks.length === 0) {
            if (cid !== 'unassigned' && !window.teActiveProjectId && group.project_id !== null) continue;
        }
        
        let headerColor = group.color || '#64748b';
        let isCollapsed = collapsedCache[cid] === true;
        let displayState = isCollapsed ? 'none' : 'flex';
        let toggleIcon = isCollapsed ? '▶' : '▼';
        
        html += `
        <div class="te-section-container" data-cycle-id="${cid}" style="margin-bottom: 12px;">
            <div class="te-section-header neo-category-row" style="cursor: grab;">
                <span style="font-weight:900; color:var(--text-heading); font-size:12px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                    <span class="cat-arrow" data-click="click_teToggleCycleGroup" data-cycle-id="${cid}" style="color:var(--text-muted); width:20px; text-align:center; cursor:pointer;" class="te-hover-text-white">${toggleIcon}</span> 
                    <span class="te-section-title" data-click="click_teEditSectionTitle" data-cycle-id="${cid}" style="color: ${headerColor}; cursor: text; padding: 4px; border-radius: 4px;" class="te-hover-bg-dynamic">${group.title}</span>
                </span>
                <span style="display:flex; align-items:center; gap:12px;">
                    ${group.badgeHtml ? group.badgeHtml : ''}
                    <div data-click="click_teDeleteCycle" data-cycle-id="${cid}" style="cursor: pointer; color: var(--text-muted); font-size: 12px; padding: 4px 8px; border-radius: 4px;" class="te-hover-bg-red">✖</div>
                </span>
            </div>
            <div id="te-cycle-group-${cid}" class="te-sortable-cycle-list" style="display: ${displayState}; flex-direction: column; gap: 4px; min-height: ${group.tasks.length > 0 ? 'auto' : '2px'}; padding-bottom: 0px;">
        `;
        
        function renderTaskTree(task, depth) {
            let taskHtml = '';
            let isTopLevel = (depth === 0);
            
            let children = displayTasks.filter(child => child.parent_task_id === task.id);
            children.sort((a,b) => {
                let aSort = (a.metadata && typeof a.metadata.sort_order === 'number') ? a.metadata.sort_order : 999999;
                let bSort = (b.metadata && typeof b.metadata.sort_order === 'number') ? b.metadata.sort_order : 999999;
                return aSort - bSort;
            });

            if (isTopLevel) {
                taskHtml += `<div class="te-list-sortable-item" data-id="${task.id}" style="display: flex; flex-direction: column;">`;
            } else {
                taskHtml += `<div class="te-list-sortable-child" data-id="${task.id}" style="display: flex; flex-direction: column;">`;
            }

            taskHtml += teBuildTaskRowHTML(task, depth, children.length > 0);

            let isCollapsed = window['teSubtaskState_' + task.id] === 'collapsed';
            let displayState = isCollapsed ? 'none' : 'flex';

            taskHtml += `<div id="te-subtasks-wrapper-${task.id}" class="te-sortable-subtask-list" style="display: ${displayState}; padding-left: 24px; flex-direction: column; gap: 2px; min-height: ${children.length > 0 ? 'auto' : '2px'}; padding-bottom: 0px;">`;
            
            if (children.length > 0) {
                children.forEach(child => {
                    taskHtml += renderTaskTree(child, depth + 1);
                });
            }
            
            taskHtml += `</div>`;
            taskHtml += `</div>`;
            
            return taskHtml;
        }

        group.tasks.forEach(t => {
            html += renderTaskTree(t, 0);
        });
        
        html += `
            </div>
            <div class="task-row te-inline-add-row" data-cycle-id="${cid === 'unassigned' ? '' : cid}" style="padding: 6px 15px; margin-top: 0px; display: flex; align-items: flex-start; gap: 12px; cursor: pointer; min-height: unset; background: transparent; border: none; box-shadow: none;" class="te-hover-bg-white-05">
                <div style="width:16px; height:16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-weight: bold; font-size: 16px;">+</div>
                <div style="flex: 1; display: flex; align-items: flex-start;" class="te-inline-container" data-click="click_teActivateInlineTask">
                    <span class="te-inline-add-placeholder" style="color: var(--text-muted); font-size: 14px; padding-top: 0px;">Add task...</span>
                </div>
            </div>
        </div>`;
    }
    html += `</div>`;
    
    html += `
        <div style="margin-top: 20px; padding: 10px 15px; cursor: pointer; color: var(--text-muted); font-weight: bold; display: flex; align-items: center; gap: 8px; border-radius: 8px; max-width: 200px;" data-click="click_teCreateCycle" class="te-hover-bg-white-05-text">
            <span style="font-size: 16px;">+</span> Add section
        </div>
    `;
    
    wrapper.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
    
    // Initialize SortableJS
    if (typeof Sortable !== 'undefined' && (!window.teCurrentSort || !window.teCurrentSort.col)) {
        let sectionsWrapper = document.getElementById('te-sections-wrapper');
        if (sectionsWrapper) {
            new Sortable(sectionsWrapper, {
                group: 'list-view-sections',
                animation: 150,
                handle: '.te-section-header',
                ghostClass: 'sortable-ghost',
                onEnd: async function(evt) {
                    if (evt.oldIndex === evt.newIndex) return;
                    let sectionDivs = Array.from(evt.to.children);
                    let updates = [];
                    for (let i = 0; i < sectionDivs.length; i++) {
                        let cid = sectionDivs[i].getAttribute('data-cycle-id');
                        if (!cid || cid === 'unassigned') continue;
                        let cycle = taskEngineDB.cyclez.find(c => c.id === cid);
                        if (cycle) {
                            let meta = cycle.metadata || {};
                            meta.sort_order = i;
                            cycle.metadata = meta;
                            updates.push({ id: cid, metadata: meta });
                        }
                    }
                    if (updates.length > 0) {
                        try {
                            const promises = updates.map(u => supabaseClient.from('cyclez').update({ metadata: u.metadata }).eq('id', u.id));
                            await Promise.all(promises);
                        } catch(e) { console.error('[TaskEngine] Section sort failed', e); }
                    }
                }
            });
        }
        
        let taskSortableOptions = {
            group: 'list-view-tasks',
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.task-row',
            onEnd: async function(evt) {
                if (evt.oldIndex === evt.newIndex && evt.from === evt.to) return;
                let childDivs = Array.from(evt.to.children);
                let updates = [];
                
                let isPersonalView = !window.teActiveProjectId;
                let isToCycle = evt.to.id.startsWith('te-cycle-group-');
                let isToSubtask = evt.to.id.startsWith('te-subtasks-wrapper-');
                
                let toCycleId = null;
                let toParentId = null;
                
                if (isToCycle) {
                    toCycleId = evt.to.id.replace('te-cycle-group-', '');
                    if (toCycleId === 'unassigned') toCycleId = null;
                } else if (isToSubtask) {
                    toParentId = evt.to.id.replace('te-subtasks-wrapper-', '');
                }

                for (let i = 0; i < childDivs.length; i++) {
                    let div = childDivs[i];
                    let tId = div.getAttribute('data-id');
                    if (!tId) continue;
                    let task = taskEngineDB.taskz.find(tk => tk.id === tId);
                    if (task) {
                        let meta = JSON.parse(JSON.stringify(task.metadata || {}));
                        meta.sort_order = i;
                        task.metadata = meta;
                        
                        task.parent_task_id = toParentId;
                        
                        if (isToCycle) {
                            if (isPersonalView) {
                                task.personal_cycle_id = toCycleId;
                                let uid = window.currentUser ? window.currentUser.id : null;
                                task.assigned_to_id = uid;
                                task.project_id = null;
                                updates.push({ id: tId, metadata: meta, personal_cycle_id: toCycleId, parent_task_id: null, assigned_to_id: uid, project_id: null });
                            } else {
                                task.cycle_id = toCycleId;
                                task.project_id = window.teActiveProjectId;
                                updates.push({ id: tId, metadata: meta, cycle_id: toCycleId, parent_task_id: null, project_id: window.teActiveProjectId });
                            }
                        } else {
                            // is subtask
                            let uPayload = { id: tId, metadata: meta, parent_task_id: toParentId };
                            let parentTask = taskEngineDB.taskz.find(pt => pt.id === toParentId);
                            if (parentTask) {
                                if (parentTask.project_id) {
                                    task.project_id = parentTask.project_id;
                                    uPayload.project_id = parentTask.project_id;
                                } else if (parentTask.assigned_to_id) {
                                    task.assigned_to_id = parentTask.assigned_to_id;
                                    uPayload.assigned_to_id = parentTask.assigned_to_id;
                                    task.project_id = null;
                                    uPayload.project_id = null;
                                }
                            }
                            updates.push(uPayload);
                        }
                    }
                }
                if (updates.length > 0) {
                    try {
                        const promises = updates.map(u => {
                            let payload = { metadata: u.metadata, parent_task_id: u.parent_task_id };
                            if (u.cycle_id !== undefined) payload.cycle_id = u.cycle_id;
                            if (u.personal_cycle_id !== undefined) payload.personal_cycle_id = u.personal_cycle_id;
                            if (u.project_id !== undefined) payload.project_id = u.project_id;
                            if (u.assigned_to_id !== undefined) payload.assigned_to_id = u.assigned_to_id;
                            return supabaseClient.from('taskz').update(payload).eq('id', u.id);
                        });
                        await Promise.all(promises);
                    } catch(e) { console.error('[TaskEngine] Sortable update failed', e); }
                }
            }
        };

        document.querySelectorAll('.te-sortable-cycle-list').forEach(listEl => {
            new Sortable(listEl, taskSortableOptions);
        });
        
        document.querySelectorAll('.te-sortable-subtask-list').forEach(listEl => {
            new Sortable(listEl, taskSortableOptions);
        });
    }
}

window.teFormatTimeline = function(startDateStr, dueDateStr) {
    if (!startDateStr && !dueDateStr) return 'No Timeline';
    
    let formatOptions = { month: 'short', day: 'numeric' };
    
    if (startDateStr && !dueDateStr) {
        return new Date(startDateStr).toLocaleDateString('en-US', formatOptions);
    }
    
    if (!startDateStr && dueDateStr) {
        return new Date(dueDateStr).toLocaleDateString('en-US', formatOptions);
    }
    
    let d1 = new Date(startDateStr);
    let d2 = new Date(dueDateStr);
    return `${d1.toLocaleDateString('en-US', formatOptions)} - ${d2.toLocaleDateString('en-US', formatOptions)}`;
};

function teBuildTaskRowHTML(t, depth = 0, hasChildren = false) {
    let statusColorClass = 'status-in-progress';
    if (t.status === 'Done' || t.status === 'Completed') statusColorClass = 'status-completed';
    if (t.status === 'Todo' || t.status === 'Backlog') statusColorClass = 'status-todo';
    if (t.status === 'Archived') statusColorClass = 'status-archived';
    
    let meta = t.metadata || {};
    let ownerInitials = 'UN';
    let ownerBg = '#3b82f6';
    let ownerTitle = 'Unassigned';
    
    if (meta.assigned_team_id) {
        let team = taskEngineDB.teams.find(tm => tm.id === meta.assigned_team_id);
        if (team) {
            ownerInitials = team.name.substring(0,2).toUpperCase();
            ownerBg = team.color_hex || '#8b5cf6';
            ownerTitle = team.name;
        }
    } else if (t.assigned_to_id && TE_OFFICIAL_USERS[t.assigned_to_id]) {
        let u = TE_OFFICIAL_USERS[t.assigned_to_id];
        ownerInitials = u.name.substring(0,2).toUpperCase();
        ownerBg = window.teGetStringColor(u.name);
        ownerTitle = u.name;
    } else if (meta.spoofed_assignee) {
        ownerInitials = meta.spoofed_assignee.substring(0,2).toUpperCase();
        ownerBg = window.teGetStringColor(meta.spoofed_assignee);
        ownerTitle = meta.spoofed_assignee;
    }

    let timelineStr = window.teFormatTimeline(meta.start_date, t.due_date);
    let rowPadding = '10px 15px';
    let titleWeight = depth > 0 ? '400' : '500';
    
    // Glassmorphism styling based on mockup request
    let rowBg = depth > 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
    let borderStyle = depth > 0 ? 'border-left: 2px solid rgba(255, 255, 255, 0.1); border-radius: 4px;' : 'border-bottom: 1px solid rgba(255,255,255,0.05);';

    let tagsHtml = '';
    if (meta.tag_ids && Array.isArray(meta.tag_ids)) {
        meta.tag_ids.forEach(tagId => {
            let tagObj = taskEngineDB.tagz.find(tg => tg.id == tagId);
            if (tagObj) {
                tagsHtml += `<span style="background: ${tagObj.color_hex || '#64748b'}; color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px; font-weight: bold; white-space: nowrap;">${tagObj.name}</span>`;
            }
        });
    }

    let expandArrowHtml;
    if (hasChildren) {
        let isCollapsed = window['teSubtaskState_' + t.id] === 'collapsed';
        let arrow = isCollapsed ? '▶' : '▼';
        expandArrowHtml = `<div data-click="click_teToggleSubtaskVisibility" data-task-id="${t.id}" style="cursor: pointer; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-muted); opacity: 0.7;" class="te-hover-opacity">${arrow}</div>`;
    } else {
        expandArrowHtml = `<div style="width: 20px; height: 20px; flex-shrink: 0;"></div>`;
    }
    
    let isDone = (t.status === 'Completed' || t.status === 'Done');

    return `
    <div class="task-row" data-task-id="${t.id}" style="padding: ${rowPadding}; min-height: unset; background: ${rowBg}; ${borderStyle} margin-bottom: 2px; transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex-grow: 1;">
            ${expandArrowHtml}
            <input type="checkbox" class="te-task-checkbox" data-id="${t.id}" ${isDone ? 'checked' : ''} style="cursor: pointer; width:16px; height:16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); accent-color: var(--primary-color); flex-shrink: 0;" data-change="change_teUpdateMainSelection">
            <div data-click="click_teOpenTaskContext" data-task-id="${t.id}" style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; cursor: pointer; flex-grow: 1;">
                <span style="color: ${isDone ? 'var(--text-muted)' : 'white'}; text-decoration: ${isDone ? 'line-through' : 'none'}; text-decoration-color: var(--primary-color); text-decoration-thickness: 2px; font-weight: ${titleWeight}; font-size: 14px; overflow: hidden; text-overflow: ellipsis;">${t.title}</span>
                ${tagsHtml ? `<div style="display: flex; gap: 4px; overflow: hidden; white-space: nowrap;">${tagsHtml}</div>` : ''}
            </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;" data-click="click_teOpenTaskContext" data-task-id="${t.id}" style="cursor: pointer;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${ownerBg}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid var(--bg-panel);" title="${ownerTitle}">${ownerInitials}</div>
        </div>
        <div style="display: flex; justify-content: center;">
            <span class="status-pill ${statusColorClass}" data-click="click_teOpenStatusDropdown" style="position: relative; z-index: 2; cursor: pointer;">${t.status}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); font-weight: bold; display: flex; align-items: center; justify-content: center;" data-click="click_teOpenTaskContext" data-task-id="${t.id}" style="cursor: pointer;">
            ${timelineStr}
        </div>
        <div style="font-size: 11px; color: var(--text-muted); font-weight: bold; display: flex; align-items: center; justify-content: center;" data-click="click_teOpenTaskContext" data-task-id="${t.id}" style="cursor: pointer;">
            #${(meta.priority || 'normal').toLowerCase()}
        </div>
    </div>
    `;
}

window.teCreateNewTask = async function() {
    try {
        let payload = {
            id: generateUUID(),
            title: 'Untitled Task',
            status: 'Todo',
            estimated_minutes: 30
        };
        if (window.teActiveProjectId) {
            payload.project_id = window.teActiveProjectId;
        } else {
            let currentUserId = window.currentUser ? window.currentUser.id : null;
            if (currentUserId) payload.assigned_to_id = currentUserId;
        }
        
        const { data, error } = await supabaseClient.from('taskz').insert([payload]).select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            taskEngineDB.taskz.unshift(data[0]); // Add to top of cache
            teRenderTaskGrid();
            window.teOpenTaskContext(data[0].id);
        }
    } catch (e) {
        console.error('[TaskEngine] Create Task failed:', e);
    }
};

window.teOpenTaskContext = function(taskId) {
    if (!taskId) return;
    window.currentOpenTaskId = taskId;
    const flyout = document.getElementById('taskContextFlyout');
    if (flyout) {
        const task = taskEngineDB.taskz.find(t => t.id === taskId);
        if (task) {
            const titleInput = document.getElementById('te-flyout-title');
            if (titleInput) titleInput.value = task.title;
            
            const descInput = document.getElementById('te-flyout-description');
            if (descInput) descInput.value = task.description || '';
            
            const assigneeSelect = document.getElementById('te-flyout-assignee');
            if (assigneeSelect) {
                let opts = '<option value="">Unassigned</option>';
                opts += '<optgroup label="Users">';
                Object.entries(TE_OFFICIAL_USERS).forEach(([id, user]) => {
                    opts += `<option value="${id}">${user.name}</option>`;
                });
                opts += '</optgroup>';
                
                if (taskEngineDB.teams && taskEngineDB.teams.length > 0) {
                    opts += '<optgroup label="Teams">';
                    taskEngineDB.teams.forEach(team => {
                        opts += `<option value="team_${team.id}">${team.name}</option>`;
                    });
                    opts += '</optgroup>';
                }
                assigneeSelect.innerHTML = window.safeHTML ? window.safeHTML(opts) : opts;
                
                let meta = JSON.parse(JSON.stringify(task.metadata || {}));
                if (meta.assigned_team_id) {
                    assigneeSelect.value = 'team_' + meta.assigned_team_id;
                } else {
                    assigneeSelect.value = task.assigned_to_id || meta.spoofed_assignee || '';
                }
            }
            
            const cycleSelect = document.getElementById('te-flyout-cycle');
            if (cycleSelect) {
                // Populate options first
                let opts = '<option value="">No Section</option>';
                let currentUserId = window.currentUser ? window.currentUser.id : null;
                
                let relevantCycles = taskEngineDB.cyclez.filter(c => {
                    if (window.teActiveProjectId) {
                        return c.project_id === window.teActiveProjectId;
                    } else {
                        return !c.project_id && c.assigned_to_id === currentUserId;
                    }
                });
                
                relevantCycles.forEach(c => {
                    opts += `<option value="${c.id}">${c.title}</option>`;
                });
                cycleSelect.innerHTML = window.safeHTML ? window.safeHTML(opts) : opts;
                cycleSelect.value = task.cycle_id || '';
            }
            
            const startDateInput = document.getElementById('te-flyout-start-date');
            if (startDateInput) {
                let meta = JSON.parse(JSON.stringify(task.metadata || {}));
                startDateInput.value = meta.start_date ? meta.start_date.substring(0, 10) : '';
            }
            
            const dueDateInput = document.getElementById('te-flyout-due-date');
            if (dueDateInput) {
                dueDateInput.value = task.due_date ? String(task.due_date).substring(0, 10) : '';
            }

            const timerBtn = document.getElementById('te-flyout-timer-btn');
            if (timerBtn) {
                let meta = JSON.parse(JSON.stringify(task.metadata || {}));
                if (meta.timer_start_time) {
                    timerBtn.textContent = 'Stop Timer';
                    timerBtn.className = 'btn-red';
                    timerBtn.style.animation = 'pulse 2s infinite';
                } else {
                    timerBtn.textContent = 'Start Timer';
                    timerBtn.className = 'btn-orange';
                    timerBtn.style.animation = 'none';
                }
            }
            
            const tagInput = document.getElementById('te-flyout-tag-input');
            if (tagInput) tagInput.value = '';
            const suggestBox = document.getElementById('te-flyout-tag-suggest');
            if (suggestBox) suggestBox.style.display = 'none';
            
            window.teRenderTagEditor(taskId);
            teRenderSubtasks(taskId);
            teRenderActivityFeed(taskId);
        }
        flyout.classList.remove('hidden');
    }
};

window.teRenderTagEditor = function(taskId) {
    const container = document.getElementById('te-flyout-tags-container');
    if (!container) return;
    
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    let html = '';
    let meta = JSON.parse(JSON.stringify(task.metadata || {}));
    if (meta.tag_ids && Array.isArray(meta.tag_ids)) {
        meta.tag_ids.forEach(tagId => {
            let tagObj = taskEngineDB.tagz.find(tg => tg.id == tagId);
            if (tagObj) {
                html += `
                <div style="background: ${tagObj.color_hex || '#64748b'}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                    ${tagObj.name}
                    <span data-click="click_teRemoveTagFromTask" data-task-id="${taskId}" data-tag-id="${tagId}" style="cursor: pointer; opacity: 0.7;" class="te-hover-opacity">✖</span>
                </div>`;
            }
        });
    }
    container.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
};

window.teRenderSubtasks = function(taskId) {
    const container = document.getElementById('te-flyout-subtasks-container');
    const header = document.getElementById('te-flyout-subtasks-header');
    if (!container) return;
    if (!taskId) {
        if (header) header.textContent = 'SUBTASKS (0/0)';
        container.innerHTML = '';
        return;
    }
    
    // Find relational subtasks
    let subtasks = taskEngineDB.taskz.filter(t => t.parent_task_id === taskId && t.parent_task_id != null);
    
    if (header) {
        let doneCount = subtasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
        header.textContent = `SUBTASKS (${doneCount}/${subtasks.length})`;
    }
    
    let html = '';
    subtasks.forEach(st => {
        let isDone = st.status === 'Completed' || st.status === 'Done';
        html += `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <input type="checkbox" data-id="${st.id}" ${isDone ? 'checked' : ''} style="cursor: pointer; width:16px; height:16px; accent-color: #2dd4bf; flex-shrink: 0;" data-change="change_teToggleSubtaskDone">
            <span data-click="click_teOpenTaskContext" data-task-id="${st.id}" style="color: ${isDone ? 'var(--text-muted)' : 'white'}; text-decoration: ${isDone ? 'line-through' : 'none'}; text-decoration-color: #2dd4bf; text-decoration-thickness: 2px; font-size: 13px; cursor: pointer; flex-grow: 1;">${st.title}</span>
        </div>`;
    });
    
    container.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
};

window.teRenderActivityFeed = function(taskId) {
    const container = document.getElementById('te-flyout-activity-container');
    if (!container) return;
    
    let relevantEvents = [];
    taskEngineDB.comments.filter(c => c.task_id === taskId).forEach(c => {
        relevantEvents.push({ type: 'comment', data: c, ts: new Date(c.created_at).getTime() });
    });
    taskEngineDB.activity.filter(a => a.task_id === taskId).forEach(a => {
        relevantEvents.push({ type: 'activity', data: a, ts: new Date(a.timestamp).getTime() });
    });
    
    relevantEvents.sort((a,b) => b.ts - a.ts); // descending
    
    if (relevantEvents.length === 0) {
        container.innerHTML = window.safeHTML ? window.safeHTML('<div style="color: var(--text-muted); font-size: 12px; text-align: center;">No activity yet.</div>') : '<div style="color: var(--text-muted); font-size: 12px; text-align: center;">No activity yet.</div>';
        return;
    }
    
    let html = '';
    relevantEvents.forEach(ev => {
        if (ev.type === 'comment') {
            let displayAuthor = 'System';
            if (ev.data.author_id) {
                displayAuthor = TE_OFFICIAL_USERS[ev.data.author_id] ? TE_OFFICIAL_USERS[ev.data.author_id].name : ev.data.author_id;
            }
            let displayContent = ev.data.content || '';
            if (displayContent.startsWith('SPOOF:')) {
                let parts = displayContent.split('|||');
                displayAuthor = parts[0].replace('SPOOF:', '');
                displayContent = parts.slice(1).join('|||');
            }
            
            html += `
            <div style="margin-bottom: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong style="font-size: 11px; color: var(--text-muted);">${displayAuthor}</strong>
                    <span style="font-size: 10px; color: var(--text-muted);">${new Date(ev.data.created_at).toLocaleString()}</span>
                </div>
                <div style="font-size: 13px; color: white; white-space: pre-wrap;">${displayContent}</div>
            </div>`;
        } else {
            html += `
            <div style="margin-bottom: 10px; padding-left: 10px; border-left: 2px solid #8b5cf6;">
                <div style="font-size: 12px; color: var(--text-muted);"><strong style="color: #ccc;">${ev.data.actor_type}</strong> ${ev.data.action_text}</div>
                <div style="font-size: 10px; color: var(--text-muted);">${new Date(ev.data.timestamp).toLocaleString()}</div>
            </div>`;
        }
    });
    container.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
};

window.teToggleTaskDone = async function(taskId) {
    if (!taskId) return;
    
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    let nextStatus = (task.status === 'Done') ? 'Todo' : 'Done';
    await window.teSetStatus(nextStatus, taskId, true);
};

window.teOpenStatusDropdown = function(taskId, element) {
    if (!taskId) return;
    
    let dropdown = document.getElementById('te-status-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'te-status-dropdown';
        dropdown.className = 'task-dropdown-menu';
        
        const options = [
            { status: 'Todo', class: 'status-todo' },
            { status: 'In Progress', class: 'status-in-progress' },
            { status: 'Completed', class: 'status-completed' },
            { status: 'Archived', class: 'status-archived' }
        ];
        
        let html = '';
        options.forEach(opt => {
            html += `
            <div data-click="click_teSetStatus" data-status="${opt.status}" style="padding: 6px 12px; cursor: pointer; border-radius: 4px; font-size: 12px; color: var(--text-color); display: flex; align-items: center; gap: 8px;" class="te-hover-bg-white-10">
                <span class="status-pill ${opt.class}" style="font-size: 10px; width: auto; display: inline-block;">${opt.status}</span>
            </div>`;
        });
        
        dropdown.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
        document.body.appendChild(dropdown);
        
        if (!window._teHandleDropdownClickOut) {
            window._teHandleDropdownClickOut = function(e) {
                const dd = document.getElementById('te-status-dropdown');
                if (!dd) return;
                if (!dd.contains(e.target) && !e.target.closest('[data-click="click_teOpenStatusDropdown"]') && !e.target.closest('[data-click="click_teBulkStatusDropdown"]')) {
                    dd.style.display = 'none';
                }
            };
        }
        document.removeEventListener('click', window._teHandleDropdownClickOut);
        document.addEventListener('click', window._teHandleDropdownClickOut);
    }

    if (dropdown.style.display === 'flex' && dropdown.getAttribute('data-task-id') === taskId) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.setAttribute('data-task-id', taskId);
    
    const rect = element.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.display = 'flex';
};

window.teSetStatus = async function(status, directTaskId = null, ignoreBulk = false) {
    let taskIds = [];
    const checkboxes = document.querySelectorAll('.te-task-checkbox:checked');
    const dropdown = document.getElementById('te-status-dropdown');
    
    let isArchived = (status === 'Archived');
    let activities = [];
    let updatedTasks = [];
    
    if (!ignoreBulk && checkboxes.length > 0) {
        taskIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
        if (dropdown) dropdown.style.display = 'none';
        
        window.bulkStatusMode = false;
        window.bulkSelectedIds = null;
        
        // Uncheck all main tasks after action
        const selectAll = document.getElementById('te-main-select-all');
        if (selectAll) selectAll.checked = false;
        checkboxes.forEach(cb => cb.checked = false);
        if (typeof window.teUpdateMainSelection === 'function') window.teUpdateMainSelection();
    } else {
        let taskId = directTaskId;
        if (!taskId) {
            if (!dropdown) return;
            taskId = dropdown.getAttribute('data-task-id');
            if (dropdown) dropdown.style.display = 'none';
        }
        if (taskId) taskIds.push(taskId);
    }
    
    if (taskIds.length === 0) return;
    
    let currentUser = window.currentUser ? window.currentUser.id : 'System';
    
    for (let id of taskIds) {
        let task = taskEngineDB.taskz.find(t => t.id === id);
        if (!task || task.status === status) continue;
        
        task.status = status;
        task.is_archived = isArchived;
        
        let meta = JSON.parse(JSON.stringify(task.metadata || {}));
        let timerUpdate = false;
        let dueDate = task.due_date;
        let dueDateUpdate = false;
        
        if (status === 'In Progress') {
            if (!meta.start_date) {
                meta.start_date = new Date().toISOString();
                timerUpdate = true;
            }
            if (!meta.timer_start_time) {
                meta.timer_start_time = Date.now().toString();
                timerUpdate = true;
            }
            task.metadata = meta;
        } else if ((status === 'Done' || status === 'Todo') && meta.timer_start_time) {
            let startTime = parseInt(meta.timer_start_time);
            let elapsedMs = Date.now() - startTime;
            let elapsedMinutes = Math.floor(elapsedMs / 60000);
            task.actual_minutes = (task.actual_minutes || 0) + Math.max(1, elapsedMinutes);
            delete meta.timer_start_time;
            task.metadata = meta;
            timerUpdate = true;
        }
        
        if (status === 'Done' || isArchived) {
            dueDate = new Date().toISOString();
            task.due_date = dueDate;
            dueDateUpdate = true;
            if (!meta.start_date) {
                meta.start_date = dueDate;
                task.metadata = meta;
                timerUpdate = true;
            }
        }
        
        updatedTasks.push({ 
            id: id, 
            timerUpdate: timerUpdate, 
            meta: meta, 
            actual: task.actual_minutes,
            dueDateUpdate: dueDateUpdate,
            dueDate: dueDate
        });
        
        const newAct = {
            task_id: id,
            actor_type: currentUser,
            action_text: `Status changed to ${status}`,
            timestamp: new Date().toISOString()
        };
        activities.push(newAct);
        taskEngineDB.activity.push(newAct);
    }
    
    if (updatedTasks.length === 0) return;
    
    teRenderTaskGrid();
    
    try {
        const updatePromises = updatedTasks.map(tData => {
            let payload = { is_archived: isArchived };
            if (status !== 'Archived') {
                payload.status = status;
            }
            if (tData.dueDateUpdate) {
                payload.due_date = tData.dueDate;
            }
            if (tData.timerUpdate) {
                payload.metadata = tData.meta;
                payload.actual_minutes = tData.actual;
            }
            return supabaseClient.from('taskz').update(payload).eq('id', tData.id);
        });
        await Promise.all(updatePromises);
        if (activities.length > 0) {
            await supabaseClient.from('task_activity').insert(activities);
        }
        
        if (window.currentOpenTaskId) {
            let updatedIds = updatedTasks.map(u => u.id);
            if (updatedIds.includes(window.currentOpenTaskId) || taskEngineDB.taskz.some(t => updatedIds.includes(t.parent_task_id) && t.parent_task_id === window.currentOpenTaskId)) {
                window.teOpenTaskContext(window.currentOpenTaskId);
            }
        }
    } catch(e) {
        console.error('[TaskEngine] Bulk status update failed:', e);
    }
};

window.teAddSubtask = async function() {
    if (!window.currentOpenTaskId) return;
    let input = document.getElementById('te-flyout-subtask-input');
    if (!input || !input.value.trim()) return;
    
    let title = input.value.trim();
    input.value = '';
    
    try {
        let parentTask = taskEngineDB.taskz.find(t => t.id === window.currentOpenTaskId);
        let payload = {
            id: generateUUID(),
            title: title,
            status: 'Todo',
            parent_task_id: window.currentOpenTaskId
        };
        
        if (parentTask) {
            if (parentTask.project_id) {
                payload.project_id = parentTask.project_id;
            } else if (parentTask.assigned_to_id) {
                payload.assigned_to_id = parentTask.assigned_to_id;
            }
        }
        
        const { data, error } = await supabaseClient.from('taskz').insert([payload]).select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            taskEngineDB.taskz.push(data[0]);
            teRenderSubtasks(window.currentOpenTaskId);
            // Re-render list to show the new subtask in the main UI immediately
            if (typeof teRenderTaskGrid === 'function') {
                teRenderTaskGrid();
            }
        }
    } catch(e) {
        console.error('Failed to add subtask', e);
    }
};

window.teUpdateTaskTitle = async function(taskId, newTitle) {
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    if (task.title === newTitle) return; // no change
    
    task.title = newTitle;
    teRenderTaskGrid();
    
    try {
        await supabaseClient.from('taskz').update({ title: newTitle }).eq('id', taskId);
    } catch(e) { console.error(e); }
};

window.teUpdateTaskDescription = async function(taskId, newDesc) {
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    if (task.description === newDesc) return;
    
    task.description = newDesc;
    try {
        await supabaseClient.from('taskz').update({ description: newDesc }).eq('id', taskId);
    } catch(e) { console.error(e); }
};

// Timeline & Timer Functions
window.teUpdateStartDate = async function(taskId, dateValue) {
    if (!taskId) return;
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    let meta = JSON.parse(JSON.stringify(task.metadata || {}));
    meta.start_date = dateValue;
    task.metadata = meta;
    
    teRenderTaskGrid();
    try {
        await supabaseClient.from('taskz').update({ metadata: meta }).eq('id', taskId);
    } catch(e) { console.error('[TaskEngine] Start date update failed', e); }
};

window.teUpdateDueDate = async function(taskId, dateValue) {
    if (!taskId) return;
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    task.due_date = dateValue ? new Date(dateValue).toISOString() : null;
    
    teRenderTaskGrid();
    try {
        await supabaseClient.from('taskz').update({ due_date: task.due_date }).eq('id', taskId);
    } catch(e) { console.error('[TaskEngine] Due date update failed', e); }
};

window.teToggleTimer = async function(taskId, forceStop = false) {
    if (!taskId) return;
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    let meta = JSON.parse(JSON.stringify(task.metadata || {}));
    let isRunning = !!meta.timer_start_time;
    let updateNeeded = false;
    
    if (isRunning) {
        // Stop the timer
        let startTime = parseInt(meta.timer_start_time);
        let elapsedMs = Date.now() - startTime;
        let elapsedMinutes = Math.floor(elapsedMs / 60000);
        
        task.actual_minutes = (task.actual_minutes || 0) + Math.max(1, elapsedMinutes); // Minimum 1 minute recorded
        delete meta.timer_start_time;
        updateNeeded = true;
    } else if (!forceStop) {
        // Start the timer
        meta.timer_start_time = Date.now().toString();
        updateNeeded = true;
    }
    
    if (updateNeeded) {
        task.metadata = meta;
        teOpenTaskContext(taskId); // Refresh Flyout UI
        try {
            await supabaseClient.from('taskz').update({ 
                metadata: meta, 
                actual_minutes: task.actual_minutes 
            }).eq('id', taskId);
        } catch(e) { console.error('[TaskEngine] Timer toggle failed', e); }
    }
};

window.teUpdateTaskAssignee = async function(taskId, assignee) {
    let taskIds = [taskId];
    const checkboxes = document.querySelectorAll('.te-task-checkbox:checked');
    if (checkboxes.length > 0) {
        taskIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
        const selectAll = document.getElementById('te-main-select-all');
        if (selectAll) selectAll.checked = false;
        checkboxes.forEach(cb => cb.checked = false);
        if (typeof window.teUpdateMainSelection === 'function') window.teUpdateMainSelection();
    }
    
    let updatePromises = [];
    
    for (let id of taskIds) {
        let task = taskEngineDB.taskz.find(t => t.id === id);
        if (!task) continue;
        
        let meta = JSON.parse(JSON.stringify(task.metadata || {}));
        let payload;
        
        if (assignee && assignee.startsWith('team_')) {
            let teamId = assignee.replace('team_', '');
            meta.assigned_team_id = teamId;
            delete meta.spoofed_assignee;
            task.assigned_to_id = null;
            payload = { metadata: meta, assigned_to_id: null };
        } else if (assignee && TE_OFFICIAL_USERS[assignee]) {
            delete meta.assigned_team_id;
            delete meta.spoofed_assignee;
            task.assigned_to_id = assignee;
            payload = { metadata: meta, assigned_to_id: assignee };
        } else {
            delete meta.assigned_team_id;
            delete meta.spoofed_assignee;
            task.assigned_to_id = null;
            payload = { metadata: meta, assigned_to_id: null };
        }
        
        task.metadata = meta;
        updatePromises.push(supabaseClient.from('taskz').update(payload).eq('id', id));
    }
    
    if (updatePromises.length === 0) return;
    
    teRenderTaskGrid();
    
    try {
        await Promise.all(updatePromises);
    } catch(e) { console.error(e); }
};

window.teUpdateTaskCycle = async function(taskId, cycleId) {
    let taskIds = [taskId];
    const checkboxes = document.querySelectorAll('.te-task-checkbox:checked');
    if (checkboxes.length > 0) {
        taskIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
        const selectAll = document.getElementById('te-main-select-all');
        if (selectAll) selectAll.checked = false;
        checkboxes.forEach(cb => cb.checked = false);
        if (typeof window.teUpdateMainSelection === 'function') window.teUpdateMainSelection();
    }
    
    let updatePromises = [];
    
    for (let id of taskIds) {
        let task = taskEngineDB.taskz.find(t => t.id === id);
        if (!task) continue;
        
        task.cycle_id = cycleId || null;
        updatePromises.push(supabaseClient.from('taskz').update({ cycle_id: cycleId || null }).eq('id', id));
    }
    
    if (updatePromises.length === 0) return;
    
    teRenderTaskGrid();
    
    try {
        await Promise.all(updatePromises);
    } catch(e) { console.error(e); }
};

window.teSelectProject = function(projectId) {
    window.teActiveProjectId = projectId;
    document.querySelectorAll('.task-nav-link').forEach(l => l.classList.remove('active'));
    let activeLink = document.querySelector(`.task-nav-link[data-project-id="${projectId}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    let p = taskEngineDB.projectz.find(x => x.id === projectId);
    if (p) {
        let titleEl = document.getElementById('te-main-header-title');
        if (titleEl) titleEl.innerHTML = window.safeHTML ? window.safeHTML(`<span style="display:inline-flex; align-items:center; gap:8px;"><span style="display:inline-block; width:14px; height:14px; background:${p.color_hex || '#f97316'}; border-radius:4px; box-shadow:0 0 10px ${p.color_hex || '#f97316'};"></span>${p.title}</span>`) : `<span style="display:inline-flex; align-items:center; gap:8px;"><span style="display:inline-block; width:14px; height:14px; background:${p.color_hex || '#f97316'}; border-radius:4px; box-shadow:0 0 10px ${p.color_hex || '#f97316'};"></span>${p.title}</span>`;
    }
    teSwitchView('list');
};

window.click_teOpenEditProject = function(element) {
    if (document.getElementById('te-edit-project-modal')) return;
    const projectId = element.getAttribute('data-project-id');
    const project = taskEngineDB.projectz.find(p => p.id === projectId);
    if (!project) return;
    
    let modalOverlay = document.createElement('div');
    modalOverlay.id = 'te-edit-project-modal';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; pointer-events: auto; margin: 0; padding: 0;';
    
    let html = `
        <div style="background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 400px; max-width: 90vw; margin: auto; position: relative; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div class="pane-header-bar" style="position: relative; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                <div class="pane-header-title">Edit Project</div>
                <div class="modal-close-btn te-proj-close" data-click="click_window_closeEditProject" style="position: absolute; top: 50%; right: 16px; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); font-size: 12px; padding: 4px 12px; border-radius: 4px; background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.2);" class="te-hover-bg-red-close">✖ CLOSE</div>
            </div>
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Project Name</label>
                    <input type="text" id="te-edit-project-title" value="${project.title.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 14px; outline: none; box-sizing: border-box;">
                </div>
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <label style="display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Color Accent</label>
                        <input type="color" id="te-edit-project-color" value="${project.color_hex || '#f97316'}" style="width: 100%; height: 40px; padding: 0; border: none; border-radius: 6px; cursor: pointer; background: transparent;">
                    </div>
                    <div style="flex: 2;">
                        <label style="display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Privacy</label>
                        <select id="te-edit-project-visibility" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 14px; outline: none; box-sizing: border-box; cursor: pointer;">
                            <option value="Organization" ${project.visibility === 'Organization' ? 'selected' : ''} style="background: var(--bg-panel); color: white;">Organization (Public)</option>
                            <option value="Private" ${project.visibility === 'Private' ? 'selected' : ''} style="background: var(--bg-panel); color: white;">Private (Invite Only)</option>
                        </select>
                    </div>
                </div>
                <button class="btn-green-neon" data-click="click_teSaveProjectEdit" data-project-id="${project.id}" style="margin-top: 10px; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 14px; width: 100%;">Save Changes</button>
            </div>
        </div>
    `;
    modalOverlay.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
    document.body.appendChild(modalOverlay);
};

window.click_window_closeEditProject = function() {
    let m = document.getElementById('te-edit-project-modal');
    if (m) m.remove();
};

window.click_teSaveProjectEdit = async function(element) {
    const projectId = element.getAttribute('data-project-id');
    const titleInput = document.getElementById('te-edit-project-title');
    const colorInput = document.getElementById('te-edit-project-color');
    const visibilityInput = document.getElementById('te-edit-project-visibility');
    if (!projectId || !titleInput || !colorInput) return;
    
    const newTitle = titleInput.value.trim();
    const newColor = colorInput.value;
    const newVisibility = visibilityInput ? visibilityInput.value : 'Organization';
    
    if (!newTitle) {
        alert('Project name cannot be empty.');
        return;
    }
    
    let btn = element;
    let oldText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    try {
        const { error } = await supabaseClient.from('projectz').update({ title: newTitle, color_hex: newColor, visibility: newVisibility }).eq('id', projectId);
        if (error) throw error;
        
        // Update local cache
        let project = taskEngineDB.projectz.find(p => p.id === projectId);
        if (project) {
            project.title = newTitle;
            project.color_hex = newColor;
            project.visibility = newVisibility;
        }
        
        window.click_window_closeEditProject();
        window.teRenderSidebar();
        
        // Update main header if this is the active project
        if (window.teActiveProjectId === projectId) {
            let titleEl = document.getElementById('te-main-header-title');
            if (titleEl) {
                titleEl.innerHTML = window.safeHTML ? window.safeHTML(`<span style="display:inline-flex; align-items:center; gap:8px;"><span style="display:inline-block; width:14px; height:14px; background:${newColor || '#f97316'}; border-radius:4px; box-shadow:0 0 10px ${newColor || '#f97316'};"></span>${newTitle}</span>`) : `<span style="display:inline-flex; align-items:center; gap:8px;"><span style="display:inline-block; width:14px; height:14px; background:${newColor || '#f97316'}; border-radius:4px; box-shadow:0 0 10px ${newColor || '#f97316'};"></span>${newTitle}</span>`;
            }
        }
        
    } catch(e) {
        console.error('[TaskEngine] Update Project failed', e);
        alert('Failed to update project. Check console.');
        btn.textContent = oldText;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
};

window.teToggleGlobalCreateMenu = function() {
    let dropdown = document.getElementById('te-global-create-dropdown');
    if (dropdown) {
        if (dropdown.style.display === 'none' || dropdown.style.display === '') {
            dropdown.style.display = 'flex';
            
            // Add a one-time click listener to close it when clicking outside
            setTimeout(() => {
                const closeHandler = function(e) {
                    if (!e.target.closest('#te-global-create-dropdown') && !e.target.closest('[data-click="click_teToggleGlobalCreateMenu"]')) {
                        dropdown.style.display = 'none';
                        document.removeEventListener('click', closeHandler);
                    }
                };
                document.addEventListener('click', closeHandler);
            }, 10);
            
        } else {
            dropdown.style.display = 'none';
        }
    }
};

window.teCreateProject = async function() {
    if (document.getElementById('te-create-project-modal')) return;
    
    let modalOverlay = document.createElement('div');
    modalOverlay.id = 'te-create-project-modal';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; pointer-events: auto; margin: 0; padding: 0;';
    
    let html = `
        <div style="background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 400px; max-width: 90vw; margin: auto; position: relative; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div class="pane-header-bar" style="position: relative; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                <div class="pane-header-title">Create New Project</div>
                <div class="modal-close-btn te-proj-close" style="position: absolute; top: 50%; right: 16px; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); font-size: 12px; padding: 4px 12px; border-radius: 4px; background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.2);" class="te-hover-bg-red-close">✕ CLOSE</div>
            </div>
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Project Name</label>
                    <input type="text" id="te-new-project-title" placeholder="e.g. Q3 Marketing Launch" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 14px; outline: none; box-sizing: border-box;">
                </div>
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <label style="display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Color Accent</label>
                        <input type="color" id="te-new-project-color" value="#f97316" style="width: 40px; height: 40px; border: none; border-radius: 6px; background: transparent; cursor: pointer; padding: 0;">
                    </div>
                    <div style="flex: 2;">
                        <label style="display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Privacy</label>
                        <select id="te-new-project-visibility" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 14px; outline: none; box-sizing: border-box; cursor: pointer;">
                            <option value="Organization" style="background: var(--bg-panel); color: white;">Organization (Public)</option>
                            <option value="Private" style="background: var(--bg-panel); color: white;">Private (Invite Only)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div style="padding: 16px; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn-slate-muted te-proj-close" style="padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 13px;">Cancel</button>
                <button id="te-submit-project-btn" class="btn-green-neon" style="padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 13px;">Create Project</button>
            </div>
        </div>
    `;
    
    modalOverlay.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
    document.body.appendChild(modalOverlay);
    
    let input = document.getElementById('te-new-project-title');
    let colorInput = document.getElementById('te-new-project-color');
    let visibilityInput = document.getElementById('te-new-project-visibility');
    let submitBtn = document.getElementById('te-submit-project-btn');
    
    if (input) input.focus();
    
    const closeModal = () => {
        if (modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
    };
    
    modalOverlay.querySelectorAll('.te-proj-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    const submitProject = async () => {
        let title = input.value.trim();
        if (!title) return;
        let color = colorInput ? colorInput.value : '#f97316';
        let vis = visibilityInput ? visibilityInput.value : 'Organization';
        let currentUser = window.currentUser ? window.currentUser.id : null;
        
        submitBtn.textContent = 'CREATING...';
        submitBtn.disabled = true;
        
        try {
            const { data, error } = await supabaseClient.from('projectz').insert([{
                id: generateUUID(),
                title: title,
                color_hex: color,
                visibility: vis,
                owner_id: currentUser,
                health_status: 'On Track'
            }]).select();
            
            if (error) throw error;
            if (data && data.length > 0) {
                taskEngineDB.projectz.unshift(data[0]);
                teRenderSidebar();
                window.teSelectProject(data[0].id);
                closeModal();
            }
        } catch(e) { 
            console.error(e); 
            submitBtn.textContent = 'ERROR';
            setTimeout(() => { submitBtn.textContent = 'Create Project'; submitBtn.disabled = false; }, 2000);
        }
    };
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitProject);
    }
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitProject();
            if (e.key === 'Escape') closeModal();
        });
    }
};

window.teEditSectionTitle = function(cycleId, el) {
    if (!cycleId || cycleId === 'unassigned') return;
    let cycle = taskEngineDB.cyclez.find(c => c.id === cycleId);
    if (!cycle) return;
    
    let currentTitle = cycle.title;
    let input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.style.cssText = "font-size: 14px; font-weight: bold; color: white; background: rgba(0,0,0,0.5); border: 1px solid var(--neon-green); padding: 4px 8px; border-radius: 4px; outline: none; width: 250px;";
    
    el.innerHTML = '';
    el.appendChild(input);
    input.focus();
    input.select();
    
    const saveTitle = async () => {
        let newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            el.innerHTML = window.safeHTML ? window.safeHTML(newTitle) : newTitle;
            cycle.title = newTitle;
            try {
                await supabaseClient.from('cyclez').update({ title: newTitle }).eq('id', cycleId);
            } catch(e) { console.error('Failed to update section title', e); }
        } else {
            el.innerHTML = window.safeHTML ? window.safeHTML(currentTitle) : currentTitle;
        }
    };
    
    input.addEventListener('blur', saveTitle);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = currentTitle;
            input.blur();
        }
    });
};

window.teCreateCycle = async function() {
    let title = prompt("Enter new section name:");
    if (!title) return;
    
    try {
        let payload = {
            id: generateUUID(),
            title: title,
            color_hex: '#10b981',
        };
        
        if (window.teActiveProjectId) {
            payload.project_id = window.teActiveProjectId;
        } else {
            payload.project_id = null;
            payload.assigned_to_id = window.currentUser ? window.currentUser.id : null;
        }
        
        const { data, error } = await supabaseClient.from('cyclez').insert([payload]).select();
        
        if (error) throw error;
        if (data && data.length > 0) {
            taskEngineDB.cyclez.push(data[0]);
            if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
        }
    } catch(e) { console.error(e); }
};

window.teCreateTeam = async function() {
    let title = prompt("Enter new team name:");
    if (!title || !title.trim()) return;
    
    const newTeam = { id: generateUUID(), name: title.trim(), color_hex: '#8b5cf6' };
    try {
        const { data, _error } = await supabaseClient.from('teams').insert([newTeam]).select();
        if (data && data.length > 0) {
            taskEngineDB.teams.push(data[0]);
            teRenderSidebar();
        }
    } catch(e) { console.error(e); }
};

window.teDeleteCycle = async function(cycleId) {
    if (!confirm("Delete this cycle? Tasks inside it will become Unassigned.")) return;
    
    taskEngineDB.cyclez = taskEngineDB.cyclez.filter(c => c.id !== cycleId);
    taskEngineDB.taskz.forEach(t => {
        if (t.cycle_id === cycleId) t.cycle_id = null;
    });
    teRenderSidebar();
    teRenderTaskGrid();
    
    try {
        await supabaseClient.from('taskz').update({ cycle_id: null }).eq('cycle_id', cycleId);
        await supabaseClient.from('cyclez').delete().eq('id', cycleId);
    } catch(e) { console.error(e); }
};

window.teDeleteTeam = async function(teamId) {
    if (!confirm("Delete this team? Tasks assigned to it will become Unassigned.")) return;
    
    taskEngineDB.teams = taskEngineDB.teams.filter(t => t.id !== teamId);
    taskEngineDB.taskz.forEach(t => {
        let meta = t.metadata || {};
        if (meta.assigned_team_id === teamId) {
            delete meta.assigned_team_id;
            t.metadata = meta;
        }
    });
    teRenderSidebar();
    teRenderTaskGrid();
    
    try {
        let affectedTasks = taskEngineDB.taskz.filter(t => t.metadata && t.metadata.assigned_team_id === teamId);
        for (let task of affectedTasks) {
            let meta = JSON.parse(JSON.stringify(task.metadata || {}));
            delete meta.assigned_team_id;
            await supabaseClient.from('taskz').update({ metadata: meta }).eq('id', task.id);
        }
        await supabaseClient.from('teams').delete().eq('id', teamId);
    } catch(e) { console.error(e); }
};

window.teAddTeamMember = async function(teamId) {
    let name = prompt("Enter member name (e.g. Chris, Andy, Tyson):");
    if (!name || !name.trim()) return;
    name = name.trim();
    
    let matchedUserId = null;
    let lowerName = name.toLowerCase();
    Object.entries(TE_OFFICIAL_USERS).forEach(([id, user]) => {
        if (user.name.toLowerCase() === lowerName || user.email.toLowerCase().startsWith(lowerName)) {
            matchedUserId = id;
        }
    });
    
    let memberVal = matchedUserId || name;
    
    let team = taskEngineDB.teams.find(t => t.id === teamId);
    if (!team) return;
    
    let members = team.members || [];
    if (members.includes(memberVal)) return;
    
    members.push(memberVal);
    team.members = members;
    
    teRenderSidebar();
    
    try {
        await supabaseClient.from('teams').update({ members: members }).eq('id', teamId);
    } catch(e) { console.error(e); }
};

window.teRemoveTeamMember = async function(teamId, memberName) {
    let team = taskEngineDB.teams.find(t => t.id === teamId);
    if (!team) return;
    
    let members = team.members || [];
    members = members.filter(m => m !== memberName);
    team.members = members;
    
    teRenderSidebar();
    
    try {
        await supabaseClient.from('teams').update({ members: members }).eq('id', teamId);
    } catch(e) { console.error(e); }
};

window.tePostComment = async function() {
    if (!window.currentOpenTaskId) return;
    let input = document.getElementById('te-flyout-comment-input');
    if (!input || !input.value.trim()) return;
    
    let currentUser = window.currentUser ? window.currentUser.id : 'System';
    let text = input.value.trim();
    
    let newComment = {
        task_id: window.currentOpenTaskId,
        // Bypassing UUID strictness by spoofing author into the content string
        // since auth.users is not fully wired up yet.
        content: `SPOOF:${currentUser}|||${text}`,
        created_at: new Date().toISOString()
    };
    
    input.value = '';
    
    try {
        const { data, error } = await supabaseClient.from('task_comments').insert([newComment]).select();
        if (!error && data && data.length > 0) {
            taskEngineDB.comments.push(data[0]);
        } else {
            console.error('Insert error:', error);
            // fallback optimistic if no return
            taskEngineDB.comments.push(newComment);
        }
        teRenderActivityFeed(window.currentOpenTaskId);
    } catch(e) {
        console.error('Failed to post comment', e);
    }
};

window.teSwitchView = function(view, btnEl) {
    if (['inbox', 'my_tasks', 'in_progress', 'completed', 'archive'].includes(view)) {
        window.teActiveProjectId = null;
    }
    // Update UI buttons based on what was clicked
    if (btnEl) {
        if (btnEl.classList.contains('task-nav-link')) {
            document.querySelectorAll('.task-nav-link').forEach(b => {
                b.classList.remove('active');
            });
            btnEl.classList.add('active');
        } else if (btnEl.classList.contains('task-view-btn')) {
            document.querySelectorAll('.task-view-btn').forEach(b => {
                b.classList.remove('active');
            });
            btnEl.classList.add('active');
        }
    }
    
    const wrapper = document.getElementById('te-task-rows-wrapper');
    const archiveWrapper = document.getElementById('te-archive-view-wrapper');
    const header = document.querySelector('.task-grid-header');
    if (!wrapper || !header) return;

    if (archiveWrapper) {
        if (view === 'archive') {
            wrapper.style.display = 'none';
            header.style.display = 'none';
            archiveWrapper.style.display = 'flex';
            if (typeof window.teRenderArchiveView === 'function') window.teRenderArchiveView();
            let title = document.getElementById('te-main-header-title');
            if (title) title.textContent = 'Archive';
            return;
        } else {
            archiveWrapper.style.display = 'none';
            wrapper.style.display = 'flex';
        }
    }

    
    if (view === 'list') {
        header.style.display = 'grid';
        teRenderTaskGrid(null);
        let activeNav = document.querySelector('.task-nav-link.active');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = activeNav ? activeNav.textContent : 'All Tasks';
    } else if (view === 'my_tasks') {
        header.style.display = 'grid';
        teRenderTaskGrid('my_tasks');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = 'My Tasks';
    } else if (view === 'in_progress') {
        header.style.display = 'grid';
        teRenderTaskGrid('in_progress');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = 'In Progress Tasks';
    } else if (view === 'completed') {
        header.style.display = 'grid';
        teRenderTaskGrid('completed');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = 'Completed Tasks';
    } else if (view === 'inbox') {
        header.style.display = 'grid';
        teRenderTaskGrid('inbox');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = 'Inbox View';
    } else if (view === 'board') {
        header.style.display = 'none';
        
        let boardHTML = `
            <div style="display: flex; gap: 20px; height: 100%; align-items: stretch; overflow-x: auto; padding-bottom: 20px;">
                ${['Todo', 'In Progress', 'Completed'].map(status => {
                    let tasksHtml = taskEngineDB.taskz.filter(t => (status === 'Completed' ? (t.status === 'Completed' || t.status === 'Done') : t.status === status)).map(t => {
                        let color = status === 'Completed' ? '#10b981' : (status === 'Todo' ? '#64748b' : '#3b82f6');
                        return `
                        <div class="kanban-card" data-task-id="${t.id}" data-click="click_teOpenTaskContext" style="background: var(--bg-container); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 10px; cursor: grab; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border-left: 3px solid ${color};">
                            <div style="font-weight: 500; font-size: 14px; margin-bottom: 8px; color: white;">${t.title}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: var(--text-muted);">⏱️ ${t.estimated_minutes || 0}m</span>
                                <span class="status-pill status-${status.toLowerCase().replace(' ', '-')}" data-click="click_teOpenStatusDropdown" data-task-id="${t.id}" style="font-size: 10px; padding: 2px 6px; cursor: pointer;">${status}</span>
                            </div>
                        </div>`;
                    }).join('');
                    
                    return `
                    <div style="flex: 1; min-width: 250px; background: rgba(0,0,0,0.2); border-radius: 12px; display: flex; flex-direction: column;">
                        <div style="padding: 15px; font-weight: bold; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.05); text-transform: uppercase; font-size: 12px;">${status}</div>
                        <div class="kanban-column" data-status="${status}" style="flex: 1; padding: 15px; overflow-y: auto; min-height: 200px;">
                            ${tasksHtml}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
        wrapper.innerHTML = window.safeHTML ? window.safeHTML(boardHTML) : boardHTML;
        
        // Initialize SortableJS
        if (typeof Sortable !== 'undefined') {
            document.querySelectorAll('.kanban-column').forEach(col => {
                new Sortable(col, {
                    group: 'kanban',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: async function(evt) {
                        const itemEl = evt.item;
                        const taskId = itemEl.getAttribute('data-task-id');
                        const newStatus = evt.to.getAttribute('data-status');
                        const oldStatus = evt.from.getAttribute('data-status');
                        
                        if (newStatus !== oldStatus) {
                            let task = taskEngineDB.taskz.find(t => t.id === taskId);
                            if (task) task.status = newStatus;
                            
                            const pill = itemEl.querySelector('.status-pill');
                            if (pill) {
                                pill.textContent = newStatus;
                                pill.className = `status-pill status-${newStatus.toLowerCase().replace(' ', '-')}`;
                            }
                            
                            try {
                                let payload = { status: newStatus };
                                
                                if (task) {
                                    let meta = Object.assign({}, task.metadata || {});
                                    let timerUpdate = false;
                                    
                                    if (newStatus === 'In Progress') {
                                        if (!meta.start_date) {
                                            meta.start_date = new Date().toISOString();
                                            timerUpdate = true;
                                        }
                                        if (!meta.timer_start_time) {
                                            meta.timer_start_time = Date.now().toString();
                                            timerUpdate = true;
                                        }
                                    } else if ((newStatus === 'Done' || newStatus === 'Todo') && meta.timer_start_time) {
                                        let startTime = parseInt(meta.timer_start_time);
                                        let elapsedMs = Date.now() - startTime;
                                        let elapsedMinutes = Math.floor(elapsedMs / 60000);
                                        task.actual_minutes = (task.actual_minutes || 0) + Math.max(1, elapsedMinutes);
                                        payload.actual_minutes = task.actual_minutes;
                                        delete meta.timer_start_time;
                                        timerUpdate = true;
                                    }
                                    
                                    if (newStatus === 'Done') {
                                        let dueDate = new Date().toISOString();
                                        task.due_date = dueDate;
                                        payload.due_date = dueDate;
                                        if (!meta.start_date) {
                                            meta.start_date = dueDate;
                                            timerUpdate = true;
                                        }
                                    }
                                    
                                    if (timerUpdate) {
                                        task.metadata = meta;
                                        payload.metadata = meta;
                                    }
                                }

                                await supabaseClient.from('taskz').update(payload).eq('id', taskId);
                                await supabaseClient.from('task_activity').insert([{
                                    task_id: taskId,
                                    actor_type: 'System',
                                    action_text: `Dragged to ${newStatus}`
                                }]);
                            } catch(e) { console.error('[TaskEngine] Sortable update failed', e); }
                        }
                    }
                });
            });
        }
    } else if (view === 'timeline' || view === 'calendar') {
        header.style.display = 'none';
        
        if (typeof window.teCalendarMonth === 'undefined') window.teCalendarMonth = new Date().getMonth();
        if (typeof window.teCalendarYear === 'undefined') window.teCalendarYear = new Date().getFullYear();
        let currentMonth = window.teCalendarMonth;
        let currentYear = window.teCalendarYear;
        
        let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        let calendarHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 10px;">
                <div style="font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.5px;">${monthNames[currentMonth]} ${currentYear}</div>
                <div style="display: flex; gap: 8px;">
                    <button data-click="click_teChangeCalendarMonth_prev" style="padding: 6px 16px; font-size: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; cursor: pointer; transition: all 0.2s;">&lt;</button>
                    <button data-click="click_teChangeCalendarMonth_next" style="padding: 6px 16px; font-size: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; cursor: pointer; transition: all 0.2s;">&gt;</button>
                </div>
            </div>
        `;
        
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        calendarHtml += `
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                ${days.map(d => `<div style="padding: 10px; text-align: center; font-weight: bold; background: var(--bg-panel); color: var(--text-muted); font-size: 12px;">${d}</div>`).join('')}
        `;
        
        let today = new Date();
        let daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        let firstDay = new Date(currentYear, currentMonth, 1).getDay();
        let offset = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0
        
        for (let i = 0; i < offset; i++) {
            calendarHtml += `<div style="background: rgba(0,0,0,0.2); min-height: 100px;"></div>`;
        }
        
        let calendarTasks = taskEngineDB.taskz.filter(t => {
            let meta = t.metadata || {};
            if (!t.due_date && !meta.start_date) return false;
            let sd = meta.start_date ? new Date(meta.start_date) : new Date(t.due_date);
            let ed = t.due_date ? new Date(t.due_date) : new Date(meta.start_date);
            sd.setHours(0,0,0,0);
            ed.setHours(23,59,59,999);
            let monthStart = new Date(currentYear, currentMonth, 1);
            let monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
            return (sd <= monthEnd && ed >= monthStart);
        });
        
        calendarTasks.sort((a, b) => {
            let aMeta = a.metadata || {};
            let bMeta = b.metadata || {};
            let aSd = aMeta.start_date ? new Date(aMeta.start_date) : new Date(a.due_date);
            let bSd = bMeta.start_date ? new Date(bMeta.start_date) : new Date(b.due_date);
            return aSd - bSd;
        });
        
        for (let i = 1; i <= daysInMonth; i++) {
            let currentDayDate = new Date(currentYear, currentMonth, i);
            currentDayDate.setHours(12,0,0,0);
            
            let tasksHtml = calendarTasks.map(t => {
                let meta = t.metadata || {};
                let sd = meta.start_date ? new Date(meta.start_date) : new Date(t.due_date);
                let ed = t.due_date ? new Date(t.due_date) : new Date(meta.start_date);
                sd.setHours(0,0,0,0);
                ed.setHours(23,59,59,999);
                
                let isActive = currentDayDate >= sd && currentDayDate <= ed;
                if (!isActive) return `<div style="height: 20px; margin-top: 4px;"></div>`;
                
                let isStart = currentDayDate.getDate() === sd.getDate() && currentDayDate.getMonth() === sd.getMonth();
                let isEnd = currentDayDate.getDate() === ed.getDate() && currentDayDate.getMonth() === ed.getMonth();
                
                let radius = '0px';
                if (isStart && isEnd) radius = '4px';
                else if (isStart) radius = '4px 0 0 4px';
                else if (isEnd) radius = '0 4px 4px 0';
                
                let borderStyle = '1px solid rgba(45, 212, 191, 0.4)';
                if (!isStart) borderStyle = '1px solid rgba(45, 212, 191, 0.4); border-left: none;';
                if (!isEnd) borderStyle += ' border-right: none;';
                
                let text = isStart ? t.title : '&nbsp;';
                
                return `<div style="background: rgba(45, 212, 191, 0.2); color: #2dd4bf; ${borderStyle} border-radius: ${radius}; height: 20px; font-size: 10px; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; padding-left: ${isStart ? '6px' : '0'}; line-height: 18px;" data-click="click_teOpenTaskContext" data-id="${t.id}">${text}</div>`;
            }).join('');
            
            calendarHtml += `
                <div style="background: var(--bg-container); min-height: 100px; padding: 10px 0; border: 1px solid rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden;">
                    <div style="font-size: 12px; font-weight: bold; color: ${i === today.getDate() ? 'white' : 'var(--text-muted)'}; padding-left: 10px;">${i}</div>
                    <div style="flex-grow: 1; display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden;">
                        ${tasksHtml}
                    </div>
                </div>
            `;
        }
        
        calendarHtml += `</div>`;
        wrapper.innerHTML = window.safeHTML ? window.safeHTML(calendarHtml) : calendarHtml;
    } else if (view === 'overview') {
        header.style.display = 'none';
        wrapper.innerHTML = window.safeHTML ? window.safeHTML(`<div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <h2 style="color: white; font-weight: 300;">Project Overview</h2>
            <p>Welcome to the project overview. High-level summaries and briefs will appear here.</p>
        </div>`) : `<div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <h2 style="color: white; font-weight: 300;">Project Overview</h2>
            <p>Welcome to the project overview. High-level summaries and briefs will appear here.</p>
        </div>`;
    } else if (view === 'dashboard') {
        header.style.display = 'none';
        wrapper.innerHTML = window.safeHTML ? window.safeHTML(`<div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <h2 style="color: white; font-weight: 300;">Dashboard</h2>
            <p>Real-time analytics and charts for this project will render here.</p>
        </div>`) : `<div style="padding: 30px; text-align: center; color: var(--text-muted);">
            <h2 style="color: white; font-weight: 300;">Dashboard</h2>
            <p>Real-time analytics and charts for this project will render here.</p>
        </div>`;
    }
};

window.teChangeCalendarMonth = function(dir) {
    if (typeof window.teCalendarMonth === 'undefined') window.teCalendarMonth = new Date().getMonth();
    if (typeof window.teCalendarYear === 'undefined') window.teCalendarYear = new Date().getFullYear();
    
    window.teCalendarMonth += dir;
    if (window.teCalendarMonth > 11) {
        window.teCalendarMonth = 0;
        window.teCalendarYear += 1;
    } else if (window.teCalendarMonth < 0) {
        window.teCalendarMonth = 11;
        window.teCalendarYear -= 1;
    }
    if (typeof window.teSwitchView === 'function') {
        window.teSwitchView('calendar');
    }
};

window.teToggleTemplateMenu = function() {
    const menu = document.getElementById('te-template-dropdown');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    }
};

window.teSpawnSOP = async function(type) {
    if (window.teToggleTemplateMenu) window.teToggleTemplateMenu(); // Close menu
    let title = 'Automated Workflow';
    let est = 0;
    
    if (type === 'batchez') {
        title = 'SOP: Batchez Production Run';
        est = 120;
    } else if (type === 'print') {
        title = 'SOP: Layerz 3D Print Queue';
        est = 240;
    }
    
    try {
        let payload = {
            title: title,
            status: 'Todo',
            estimated_minutes: est
        };
        if (window.teActiveProjectId) payload.project_id = window.teActiveProjectId;
        
        const { data, error } = await supabaseClient.from('taskz').insert([payload]).select();
        
        if (!error && data && data.length > 0) {
            taskEngineDB.taskz.unshift(data[0]);
            
            // Re-render currently active view
            const activeBtn = document.querySelector('.task-view-btn.active');
            if (activeBtn && window.teSwitchView) {
                let viewType = 'list';
                if (activeBtn.textContent.includes('Board')) viewType = 'board';
                if (activeBtn.textContent.includes('Calendar')) viewType = 'calendar';
                window.teSwitchView(viewType, activeBtn);
            } else {
                teRenderTaskGrid();
            }
            
            // Invoke Cross-Module Modals via global window context
            if (type === 'batchez' && typeof window.openNewWOModal_create === 'function') {
                window.openNewWOModal_create();
            } else if (type === 'print' && typeof window.openManualPrintModal === 'function') {
                window.openManualPrintModal();
            }
        }
    } catch(e) {
        console.error('[TaskEngine] SOP Auto-Spawn Failed:', e);
    }
};

window.openTaskPlanner = function() {
    isTaskPlannerOpen = true;
    const modal = document.getElementById('taskPlannerModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.closeTaskPlanner = function() {
    isTaskPlannerOpen = false;
    const modal = document.getElementById('taskPlannerModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.openTaskContext = function() {
    const flyout = document.getElementById('taskContextFlyout');
    if (flyout) {
        flyout.classList.remove('hidden');
    }
};

window.closeTaskContext = function() {
    const flyout = document.getElementById('taskContextFlyout');
    if (flyout) {
        flyout.classList.add('hidden');
    }
};

// ==========================================
// KEYBOARD ARCHITECTURE (Linear-style)
// ==========================================
document.addEventListener('keydown', (e) => {
    // Cmd+K or Ctrl+K for Global Command Palette
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const palette = document.getElementById('neoCommandPalette');
        const input = document.getElementById('neoCommandInput');
        if (palette) {
            if (palette.classList.contains('hidden')) {
                palette.classList.remove('hidden');
                if (input) {
                    input.value = ''; // clear input
                    input.focus();
                }
            } else {
                palette.classList.add('hidden');
                if (input) input.blur();
            }
        }
        return;
    }

    // Press 'Escape' to close Task Planner, Context Flyout, or Command Palette
    if (e.key === 'Escape') {
        const palette = document.getElementById('neoCommandPalette');
        if (palette && !palette.classList.contains('hidden')) {
            palette.classList.add('hidden');
            return;
        }

        const flyout = document.getElementById('taskContextFlyout');
        if (flyout && !flyout.classList.contains('hidden')) {
            window.closeTaskContext();
        } else if (isTaskPlannerOpen) {
            window.closeTaskPlanner();
        }
        return;
    }

    // Do not intercept generic hotkeys if user is typing in an input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    // Press 'T' to jump to Task Planner, or if already open, activate inline task creation
    if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        
        if (!isTaskPlannerOpen) {
            window.openTaskPlanner();
        } else {
            const noSectionContainer = document.querySelector('.te-inline-add-row[data-cycle-id=""] .te-inline-container');
            if (noSectionContainer && typeof window.teActivateInlineTask === 'function') {
                window.teActivateInlineTask(noSectionContainer);
            }
        }
    }

    // Press 'C' to Create Task (placeholder for now)
    if (e.key.toLowerCase() === 'c' && isTaskPlannerOpen) {
        e.preventDefault();
        // Create Task shortcut triggered
        // FUTURE: document.getElementById('newTaskInput').focus();
    }
});

// --- ARCHIVE LOGIC ---

window.teRenderArchiveView = function() {
    const container = document.getElementById('te-archive-rows-container');
    if (!container) return;
    
    let html = '';
    
    // Get all archived items
    const archivedTasks = taskEngineDB.taskz.filter(t => t.is_archived);
    const archivedCycles = taskEngineDB.cyclez.filter(c => c.is_archived);
    const archivedTeams = taskEngineDB.teams.filter(t => t.is_archived);
    const archivedProjects = taskEngineDB.projectz.filter(p => p.is_archived);
    
    const countSpan = document.getElementById('te-archive-selected-count');
    if (countSpan) countSpan.textContent = '0';
    
    const checkboxAll = document.getElementById('te-archive-select-all');
    if (checkboxAll) checkboxAll.checked = false;

    if (archivedTasks.length === 0 && archivedCycles.length === 0 && archivedTeams.length === 0 && archivedProjects.length === 0) {
        container.innerHTML = window.safeHTML ? window.safeHTML('<div style="padding: 20px; text-align: center; color: var(--text-muted);">No archived items.</div>') : '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No archived items.</div>';
        return;
    }
    
    const renderRow = (id, title, type) => {
        const isTask = type === 'task';
        const clickAttr = isTask ? `data-click="click_teOpenTaskContext" data-task-id="${id}"` : '';
        const cursorStyle = isTask ? 'cursor: pointer; text-decoration: underline; text-decoration-color: rgba(255,255,255,0.3); text-underline-offset: 3px;' : '';
        return `
        <div class="task-row te-archive-row" style="display: flex; align-items: center; padding: 12px 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 4px;">
            <input type="checkbox" class="te-archive-checkbox" data-id="${id}" data-type="${type}" style="cursor: pointer; width:16px; height:16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); accent-color: var(--neon-green); margin-right: 15px; flex-shrink: 0;" data-change="change_teUpdateArchiveSelection">
            <span style="font-weight: bold; color: var(--text-muted); width: 80px; text-transform: uppercase; font-size: 10px;">${type}</span>
            <span ${clickAttr} style="flex-grow: 1; color: white; ${cursorStyle}">${title}</span>
            <div style="display: flex; gap: 8px;">
                <button class="btn-slate" data-click="click_teRestoreEntity" data-id="${id}" data-type="${type}" style="padding: 4px 8px; font-size: 11px;">Restore</button>
                <button class="btn-red" data-click="click_teHardDeleteEntity" data-id="${id}" data-type="${type}" style="padding: 4px 8px; font-size: 11px; background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #ef4444;">Delete</button>
            </div>
        </div>
        `;
    };
    
    archivedProjects.forEach(p => html += renderRow(p.id, p.title, 'project'));
    archivedCycles.forEach(c => html += renderRow(c.id, c.title, 'cycle'));
    archivedTeams.forEach(t => html += renderRow(t.id, t.name, 'team'));
    archivedTasks.forEach(t => html += renderRow(t.id, t.title, 'task'));
    
    container.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
};

window.teArchiveEntity = async function(type, id) {
    try {
        let table = type === 'task' ? 'taskz' : (type === 'project' ? 'projectz' : (type === 'cycle' ? 'cyclez' : 'teams'));
        if (type === 'project') {
            const { error } = await supabaseClient.from(table).delete().eq('id', id);
            if (error) throw error;
            taskEngineDB.projectz = taskEngineDB.projectz.filter(p => p.id !== id);
            window.teActiveProjectId = null;
            teRenderSidebar();
            if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid('inbox');
            return;
        }

        const { error } = await supabaseClient.from(table).update({ is_archived: true }).eq('id', id);
        if (error) throw error;
        
        let item = taskEngineDB[table].find(i => i.id === id);
        if (item) item.is_archived = true;
        
        // Optimistic UI updates
        teRenderSidebar();
        if (typeof window.teSwitchView === 'function') {
            let activeView = document.querySelector('.task-nav-link.active');
            let viewName = 'list';
            if (activeView) {
                let txt = activeView.textContent.toLowerCase();
                if (txt.includes('inbox')) viewName = 'inbox';
                else if (txt.includes('my tasks')) viewName = 'my_tasks';
                else if (txt.includes('in progress')) viewName = 'in_progress';
                else if (txt.includes('completed')) viewName = 'completed';
                else if (txt.includes('archive')) viewName = 'archive';
            }
            window.teSwitchView(viewName, activeView);
        }
        
        // Hide flyout if archiving a task
        if (type === 'task') {
            window.closeTaskContext();
        }
    } catch(e) { console.error('Failed to archive', e); }
};

window.teRestoreEntity = async function(type, id) {
    try {
        let table = type === 'task' ? 'taskz' : (type === 'project' ? 'projectz' : (type === 'cycle' ? 'cyclez' : 'teams'));
        const { error } = await supabaseClient.from(table).update({ is_archived: false }).eq('id', id);
        if (error) throw error;
        
        let item = taskEngineDB[table].find(i => i.id === id);
        if (item) item.is_archived = false;
        
        teRenderSidebar();
        if (typeof window.teRenderArchiveView === 'function') window.teRenderArchiveView();
    } catch(e) { console.error('Failed to restore', e); }
};

window.teHardDeleteEntity = async function(type, id) {
    try {
        let table = type === 'task' ? 'taskz' : (type === 'project' ? 'projectz' : (type === 'cycle' ? 'cyclez' : 'teams'));
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) throw error;
        
        taskEngineDB[table] = taskEngineDB[table].filter(i => i.id !== id);
        
        teRenderSidebar();
        if (typeof window.teRenderArchiveView === 'function') window.teRenderArchiveView();
    } catch(e) { console.error('Failed to hard delete', e); }
};

window.teBulkRestore = async function() {
    const checkboxes = document.querySelectorAll('.te-archive-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    for (const cb of checkboxes) {
        await window.teRestoreEntity(cb.getAttribute('data-type'), cb.getAttribute('data-id'));
    }
};

window.teBulkDelete = async function() {
    const checkboxes = document.querySelectorAll('.te-archive-checkbox:checked');
    if (checkboxes.length === 0) return;
    if (!confirm(`Permanently delete ${checkboxes.length} items? This cannot be undone.`)) return;
    
    for (const cb of checkboxes) {
        await window.teHardDeleteEntity(cb.getAttribute('data-type'), cb.getAttribute('data-id'));
    }
};

window.teUpdateMainSelection = function() {
    const checkboxes = document.querySelectorAll('.te-task-checkbox:checked');
    const bulkBar = document.getElementById('te-bulk-action-bar');
    const countSpan = document.getElementById('te-bulk-count');
    
    if (checkboxes.length > 0) {
        if (countSpan) countSpan.textContent = checkboxes.length;
        if (bulkBar) bulkBar.style.display = 'flex';
    } else {
        if (bulkBar) bulkBar.style.display = 'none';
        const selectAll = document.getElementById('te-main-select-all');
        if (selectAll) selectAll.checked = false;
    }
};

window.teSortColumn = function(colName) {
    if (window.teCurrentSort && window.teCurrentSort.col === colName) {
        // Toggle direction or clear
        if (window.teCurrentSort.dir === 'asc') {
            window.teCurrentSort.dir = 'desc';
        } else {
            window.teCurrentSort = { col: null, dir: 'asc' };
        }
    } else {
        window.teCurrentSort = { col: colName, dir: 'asc' };
    }
    
    // Update header icons
    const headers = document.querySelectorAll('.te-list-header');
    headers.forEach(h => {
        let text = h.textContent.replace(' ▲', '').replace(' ▼', '');
        if (window.teCurrentSort && window.teCurrentSort.col === h.getAttribute('data-col')) {
            text += window.teCurrentSort.dir === 'asc' ? ' ▲' : ' ▼';
        }
        h.textContent = text;
    });
    
    // Re-render
    if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
};

window.teToggleAllMain = function() {
    const selectAll = document.getElementById('te-main-select-all');
    const isChecked = selectAll ? selectAll.checked : false;
    const checkboxes = document.querySelectorAll('.te-task-checkbox');
    checkboxes.forEach(cb => cb.checked = isChecked);
    window.teUpdateMainSelection();
};

window.teBulkStatusDropdown = function(element) {
    const checkboxes = document.querySelectorAll('.te-task-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    window.bulkSelectedIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
    window.bulkStatusMode = true;
    
    let dropdown = document.getElementById('te-status-dropdown');
    if (!dropdown) {
        window.teOpenStatusDropdown(window.bulkSelectedIds[0], element); 
        dropdown = document.getElementById('te-status-dropdown');
    }
    
    dropdown.removeAttribute('data-task-id');
    
    const rect = element.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.display = 'flex';
};

window.teActivateInlineTask = function(containerElement) {
    if (containerElement.querySelector('textarea')) return;
    
    const placeholder = containerElement.querySelector('.te-inline-add-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'te-inline-textarea';
    textarea.placeholder = 'Write a task name';
    textarea.rows = 1;
    textarea.style.cssText = 'width: 100%; background: transparent; border: none; color: white; font-size: 14px; font-family: inherit; resize: none; overflow: hidden; outline: none; padding: 0; margin: 0; line-height: 1.2;';
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
    
    textarea.addEventListener('keydown', async function(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.value = ''; // clear value so blur doesn't create a task
            this.blur(); // Trigger blur to gracefully handle the cleanup
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const val = this.value.trim();
            if (val === '') {
                if (textarea.parentNode) textarea.remove();
                if (placeholder) placeholder.style.display = 'block';
                return;
            }
            
            let cycleId = containerElement.closest('.te-inline-add-row').getAttribute('data-cycle-id') || null;
            this.disabled = true;
            this.style.opacity = '0.5';
            await window.teCreateInlineTask(val, cycleId);
            
            this.value = '';
            this.disabled = false;
            this.style.opacity = '1';
            this.style.height = 'auto';
            this.focus();
        }
    });
    
    textarea.addEventListener('blur', async function() {
        if (!this.disabled) {
            const val = this.value.trim();
            if (val !== '') {
                let cycleId = containerElement.closest('.te-inline-add-row').getAttribute('data-cycle-id') || null;
                await window.teCreateInlineTask(val, cycleId);
            }
            if (textarea.parentNode) textarea.remove();
            if (placeholder) placeholder.style.display = 'block';
        }
    });
    
    containerElement.appendChild(textarea);
    textarea.focus();
};

window.teCreateInlineTask = async function(title, cycleId) {
    try {
        let payload = {
            title: title,
            status: 'Todo',
            estimated_minutes: 30,
        };
        if (window.teActiveProjectId) {
            payload.project_id = window.teActiveProjectId;
            payload.cycle_id = cycleId;
        } else {
            let currentUserId = window.currentUser ? window.currentUser.id : null;
            if (currentUserId) payload.assigned_to_id = currentUserId;
            payload.personal_cycle_id = cycleId;
        }
        
        const { data, error } = await supabaseClient.from('taskz').insert([payload]).select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            taskEngineDB.taskz.push(data[0]);
            if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
        }
    } catch (e) {
        console.error('[TaskEngine] Create Inline Task failed:', e);
    }
};

window.keyup_teTagSuggest = function(event) {
    const input = event.target;
    const suggestBox = document.getElementById('te-flyout-tag-suggest');
    const val = input.value.trim().toLowerCase();
    
    if (!val) {
        if (suggestBox) suggestBox.style.display = 'none';
        return;
    }
    
    let matches = taskEngineDB.tagz.filter(t => t.name.toLowerCase().includes(val));
    
    let html = '';
    matches.forEach(m => {
        html += `<div data-click="click_teAddTagToTask" data-tag-id="${m.id}" style="padding: 8px 12px; cursor: pointer; color: white; font-size: 12px; display: flex; align-items: center; gap: 8px;" class="te-hover-bg-white-10">
            <span style="width: 12px; height: 12px; border-radius: 50%; background: ${m.color_hex || '#64748b'};"></span> ${m.name}
        </div>`;
    });
    
    // Exact match check
    let exactMatch = taskEngineDB.tagz.find(t => t.name.toLowerCase() === val);
    if (!exactMatch) {
        html += `<div data-click="click_teCreateNewTag" data-tag-name="${input.value.trim()}" style="padding: 8px 12px; cursor: pointer; color: #2dd4bf; font-size: 12px; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.1);" class="te-hover-bg-white-10">
            + Create "${input.value.trim()}"
        </div>`;
    }
    
    if (suggestBox) {
        suggestBox.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
        suggestBox.style.display = 'block';
    }
};

window.teHideTagSuggest = function() {
    const suggestBox = document.getElementById('te-flyout-tag-suggest');
    if (suggestBox) suggestBox.style.display = 'none';
};

document.addEventListener('click', function(e) {
    const suggestBox = document.getElementById('te-flyout-tag-suggest');
    const input = document.getElementById('te-flyout-tag-input');
    if (suggestBox && input) {
        if (!suggestBox.contains(e.target) && e.target !== input) {
            suggestBox.style.display = 'none';
        }
    }
});

window.click_teAddTagToTask = async function(element) {
    if (!window.currentOpenTaskId) return;
    const tagId = element.getAttribute('data-tag-id');
    if (!tagId) return;
    
    let task = taskEngineDB.taskz.find(t => t.id === window.currentOpenTaskId);
    if (!task) return;
    
    let meta = JSON.parse(JSON.stringify(task.metadata || {}));
    if (!meta.tag_ids) meta.tag_ids = [];
    
    if (!meta.tag_ids.includes(tagId)) {
        meta.tag_ids.push(tagId);
        task.metadata = meta;
        
        try {
            await supabaseClient.from('taskz').update({ metadata: meta }).eq('id', task.id);
            window.teRenderTagEditor(task.id);
            if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
        } catch(e) { console.error('[TaskEngine] Add Tag failed', e); }
    }
    
    const input = document.getElementById('te-flyout-tag-input');
    if (input) input.value = '';
    window.teHideTagSuggest();
};

window.click_teCreateNewTag = async function(element) {
    if (!window.currentOpenTaskId) return;
    const tagName = element.getAttribute('data-tag-name');
    if (!tagName) return;
    
    // Generate random color for new tag
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    try {
        const { data, error } = await supabaseClient.from('tagz').insert([{ id: generateUUID(), name: tagName, color_hex: randomColor }]).select();
        if (error) throw error;
        
        if (data && data.length > 0) {
            let newTag = data[0];
            taskEngineDB.tagz.push(newTag);
            
            // Re-use click_teAddTagToTask logic by mocking element
            let mockEl = document.createElement('div');
            mockEl.setAttribute('data-tag-id', newTag.id);
            await window.click_teAddTagToTask(mockEl);
        }
    } catch(e) { console.error('[TaskEngine] Create Tag failed', e); }
};

window.click_teRemoveTagFromTask = async function(element) {
    const taskId = element.getAttribute('data-task-id');
    const tagId = element.getAttribute('data-tag-id');
    if (!taskId || !tagId) return;
    
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    let meta = JSON.parse(JSON.stringify(task.metadata || {}));
    if (meta.tag_ids) {
        meta.tag_ids = meta.tag_ids.filter(id => id !== tagId);
        task.metadata = meta;
        
        try {
            await supabaseClient.from('taskz').update({ metadata: meta }).eq('id', task.id);
            window.teRenderTagEditor(task.id);
            if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
        } catch(e) { console.error('[TaskEngine] Remove Tag failed', e); }
    }
};

window.tePopulateTagFilter = function() {
    const filterSelect = document.getElementById('te-tag-filter');
    if (!filterSelect) return;
    
    let html = '<option value="">All Tags</option>';
    let sortedTags = [...taskEngineDB.tagz].sort((a, b) => a.name.localeCompare(b.name));
    sortedTags.forEach(t => {
        html += `<option value="${t.id}">${t.name}</option>`;
    });
    filterSelect.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
};

window.keyup_teFilterTaskSearch = function() {
    if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
};

window.change_teFilterTaskSearch = function() {
    if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
};


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
        list.innerHTML = window.safeHTML ? window.safeHTML('<div style="color:var(--text-muted); font-size:12px; font-style:italic;">No tags created yet.</div>') : '<div style="color:var(--text-muted); font-size:12px; font-style:italic;">No tags created yet.</div>';
        return;
    }
    
    sortedTags.forEach(t => {
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.05); border-radius:6px;">
            <div style="display:flex; align-items:center; gap:10px; flex: 1;">
                <input type="color" data-change="change_teUpdateTagColor" data-tag-id="${t.id}" value="${t.color_hex || '#64748b'}" style="width:24px; height:24px; padding:0; border:none; border-radius:4px; cursor:pointer; background:transparent; flex-shrink:0;">
                <input type="text" data-change="change_teUpdateTagName" data-tag-id="${t.id}" value="${t.name.replace(/"/g, '&quot;')}" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.3); color:white; font-size:13px; font-weight:bold; padding:4px 8px; border-radius:4px; width: 100%; outline:none;" class="te-focus-input-blue">
            </div>
            <button class="btn-red-muted" data-click="click_teDeleteTag" data-tag-id="${t.id}" style="padding:4px 10px; font-size:10px; border-radius:4px; margin-left: 10px; flex-shrink:0; white-space:nowrap; width:max-content; min-width: 80px;">🗑️ Delete</button>
        </div>`;
    });
    
    list.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
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
        const { data, error } = await supabaseClient.from('tagz').insert([{ id: generateUUID(), name: name, color_hex: color }]).select();
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

window.change_teUpdateTagColor = async function(element) {
    const tagId = element.getAttribute('data-tag-id');
    const newColor = element.value;
    if (!tagId || !newColor) return;
    
    let tag = taskEngineDB.tagz.find(t => t.id === tagId);
    if (tag) tag.color_hex = newColor;
    
    if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
    if (window.currentOpenTaskId && typeof teRenderTagEditor === 'function') {
        teRenderTagEditor(window.currentOpenTaskId);
    }
    
    try {
        await supabaseClient.from('tagz').update({ color_hex: newColor }).eq('id', tagId);
    } catch(e) { console.error('[TaskEngine] Update Tag Color failed', e); }
};

window.change_teUpdateTagName = async function(element) {
    const tagId = element.getAttribute('data-tag-id');
    const newName = element.value.trim();
    if (!tagId || !newName) return;
    
    let tag = taskEngineDB.tagz.find(t => t.id === tagId);
    if (tag) tag.name = newName;
    
    if (typeof window.tePopulateTagFilter === 'function') window.tePopulateTagFilter();
    if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
    if (window.currentOpenTaskId && typeof teRenderTagEditor === 'function') {
        teRenderTagEditor(window.currentOpenTaskId);
    }
    
    try {
        await supabaseClient.from('tagz').update({ name: newName }).eq('id', tagId);
    } catch(e) { console.error('[TaskEngine] Update Tag Name failed', e); }
};

window.teDeleteTag = async function(element) {
    const tagId = element.getAttribute('data-tag-id');
    if (!tagId) return;
    
    const tag = taskEngineDB.tagz.find(t => t.id === tagId);
    if (!tag) return;
    
    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all tasks.`)) return;
    
    try {
        const { error } = await supabaseClient.from('tagz').delete().eq('id', tagId);
        if (error) throw error;
        
        // Remove locally
        taskEngineDB.tagz = taskEngineDB.tagz.filter(t => t.id !== tagId);
        
        // Cleanup tasks that had this tag
        taskEngineDB.taskz.forEach(t => {
            if (t.metadata && t.metadata.tag_ids && t.metadata.tag_ids.includes(tagId)) {
                t.metadata.tag_ids = t.metadata.tag_ids.filter(id => id !== tagId);
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

// --- Flyout Resizer ---
let isFlyoutResizing = false;
let startFlyoutX = 0;
let startFlyoutWidth = 0;

window.initFlyoutResizer = function(e) {
    if(e) e.preventDefault();
    isFlyoutResizing = true;
    startFlyoutX = e.clientX;
    const flyout = document.getElementById('taskContextFlyout');
    startFlyoutWidth = flyout.offsetWidth;
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', window.doFlyoutResize);
    document.addEventListener('mouseup', window.stopFlyoutResize);
};

window.doFlyoutResize = function(e) {
    if(!isFlyoutResizing) return;
    const flyout = document.getElementById('taskContextFlyout');
    if(flyout) {
        const delta = startFlyoutX - e.clientX;
        let newWidth = startFlyoutWidth + delta;
        if(newWidth < 300) newWidth = 300;
        if(newWidth > 800) newWidth = 800;
        flyout.style.width = newWidth + 'px';
    }
};

window.stopFlyoutResize = function(_e) {
    isFlyoutResizing = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', window.doFlyoutResize);
    document.removeEventListener('mouseup', window.stopFlyoutResize);
};

let teInFlightSections = {};
window.teGetOrCreateSectionId = async function(title) {
    if (typeof supabaseClient === 'undefined') return null;
    
    let cleanTitle = title.trim();
    let lowerTitle = cleanTitle.toLowerCase();
    
    // 1. Check local cache
    let section = taskEngineDB.cyclez.find(c => c.title.toLowerCase() === lowerTitle);
    if (section) {
        return section.id;
    }
    
    // 2. Check if there is already an in-flight creation request for this title
    if (teInFlightSections[lowerTitle]) {
        return teInFlightSections[lowerTitle];
    }
    
    // 3. Create the section
    let colorMap = {
        'batchez': '#ec4899', // Pink-ish
        'layerz': '#06b6d4',  // Cyan-ish
        'packerz': '#f59e0b'  // Amber/Orange-ish
    };
    let color = colorMap[lowerTitle] || '#10b981';
    
    let payload = {
        id: generateUUID(),
        title: cleanTitle,
        color_hex: color,
        assigned_to_id: null,
        assigned_team_id: null
    };
    
    teInFlightSections[lowerTitle] = (async () => {
        try {
            // Double check local cache inside the promise in case it resolved while waiting
            let doubleCheck = taskEngineDB.cyclez.find(c => c.title.toLowerCase() === lowerTitle);
            if (doubleCheck) return doubleCheck.id;

            const { data, error } = await supabaseClient.from('cyclez').insert([payload]).select();
            if (error) throw error;
            if (data && data.length > 0) {
                taskEngineDB.cyclez.push(data[0]);
                if (typeof teRenderTaskGrid === 'function') teRenderTaskGrid();
                return data[0].id;
            }
        } catch(e) {
            console.error(`[TaskEngine] Failed to auto-create section ${cleanTitle}:`, e);
        } finally {
            delete teInFlightSections[lowerTitle];
        }
        return null;
    })();
    
    return teInFlightSections[lowerTitle];
};

window.teSyncTask = async function(type, entityId, action, params = {}) {
    if (typeof supabaseClient === 'undefined') return;
    let currentUser = window.currentUser ? window.currentUser.id : null;
    
    if (action === 'create') {
        let sectionTitle = null;
        if (type === 'batchez') sectionTitle = 'Batchez';
        else if (type === 'layerz') sectionTitle = 'Layerz';
        else if (type === 'packerz') sectionTitle = 'Packerz';

        let cycleId = null;
        if (sectionTitle) {
            cycleId = await window.teGetOrCreateSectionId(sectionTitle);
        }

        let payload = {
            id: generateUUID(),
            title: params.title || `Task for ${type} ${entityId}`,
            status: 'Todo',
            linked_module: params.linked_module || 'general',
            metadata: Object.assign({ type: type }, params.metadata || {}),
            assigned_to_id: null,
            cycle_id: cycleId,
            description: params.description || null
        };
        try {
            await supabaseClient.from('taskz').insert([payload]);
            taskEngineDB.taskz.unshift(payload);
        } catch(e) { console.error('[TaskEngine] Sync Create failed:', e); }
    } else if (action === 'start') {
        try {
            let selectQuery = supabaseClient.from('taskz').select('id, metadata');
            if (type === 'batchez') selectQuery = selectQuery.filter('metadata->>linked_wo_id', 'eq', entityId);
            else if (type === 'layerz') selectQuery = selectQuery.filter('metadata->>linked_print_id', 'eq', entityId);
            else if (type === 'packerz') selectQuery = selectQuery.filter('metadata->>linked_order_id', 'eq', entityId);
            
            const { data: tasks } = await selectQuery;
            if (tasks && tasks.length > 0) {
                const nowStr = new Date().toISOString();
                for (let t of tasks) {
                    let newMeta = Object.assign({}, t.metadata || {});
                    if (!newMeta.start_date) {
                        newMeta.start_date = nowStr;
                    }
                    if (!newMeta.timer_start_time) {
                        newMeta.timer_start_time = Date.now().toString();
                    }
                    let updatePayload = { status: 'In Progress', metadata: newMeta };
                    if (currentUser) updatePayload.assigned_to_id = currentUser;
                    await supabaseClient.from('taskz').update(updatePayload).eq('id', t.id);
                }
            }
        } catch(e) { console.error('[TaskEngine] Sync Start failed:', e); }
    } else if (action === 'complete') {
        try {
            let selectQuery = supabaseClient.from('taskz').select('id, metadata, actual_minutes');
            if (type === 'batchez') selectQuery = selectQuery.filter('metadata->>linked_wo_id', 'eq', entityId);
            else if (type === 'layerz') selectQuery = selectQuery.filter('metadata->>linked_print_id', 'eq', entityId);
            else if (type === 'packerz') selectQuery = selectQuery.filter('metadata->>linked_order_id', 'eq', entityId);
            
            const { data: tasks } = await selectQuery;
            if (tasks && tasks.length > 0) {
                const nowStr = new Date().toISOString();
                for (let t of tasks) {
                    let newMeta = Object.assign({}, t.metadata || {});
                    let actualMins = t.actual_minutes || 0;
                    if (!newMeta.start_date) {
                        newMeta.start_date = nowStr;
                    }
                    if (newMeta.timer_start_time) {
                        let startTime = parseInt(newMeta.timer_start_time);
                        let elapsedMs = Date.now() - startTime;
                        let elapsedMinutes = Math.floor(elapsedMs / 60000);
                        actualMins += Math.max(1, elapsedMinutes);
                        delete newMeta.timer_start_time;
                    }
                    let updatePayload = { 
                        status: 'Done', 
                        is_archived: true, 
                        due_date: nowStr, 
                        metadata: newMeta,
                        actual_minutes: actualMins 
                    };
                    if (currentUser) updatePayload.assigned_to_id = currentUser;
                    await supabaseClient.from('taskz').update(updatePayload).eq('id', t.id);
                }
            }
        } catch(e) { console.error('[TaskEngine] Sync Complete failed:', e); }
    } else if (action === 'delete') {
        try {
            let query = supabaseClient.from('taskz').delete();
            if (type === 'batchez') query = query.filter('metadata->>linked_wo_id', 'eq', entityId);
            else if (type === 'layerz') query = query.filter('metadata->>linked_print_id', 'eq', entityId);
            else if (type === 'packerz') query = query.filter('metadata->>linked_order_id', 'eq', entityId);
            await query;
        } catch(e) { console.error('[TaskEngine] Sync Delete failed:', e); }
    } else if (action === 'restore') {
        try {
            let selectQuery = supabaseClient.from('taskz').select('id, metadata');
            if (type === 'batchez') selectQuery = selectQuery.filter('metadata->>linked_wo_id', 'eq', entityId);
            else if (type === 'layerz') selectQuery = selectQuery.filter('metadata->>linked_print_id', 'eq', entityId);
            else if (type === 'packerz') selectQuery = selectQuery.filter('metadata->>linked_order_id', 'eq', entityId);
            
            const { data: tasks } = await selectQuery;
            if (tasks && tasks.length > 0) {
                for (let t of tasks) {
                    let updatePayload = { 
                        status: 'Todo', 
                        is_archived: false, 
                        due_date: null
                    };
                    await supabaseClient.from('taskz').update(updatePayload).eq('id', t.id);
                }
            }
        } catch(e) { console.error('[TaskEngine] Sync Restore failed:', e); }
    } else if (action === 'comment') {
        try {
            let selectQuery = supabaseClient.from('taskz').select('id');
            if (type === 'batchez') selectQuery = selectQuery.filter('metadata->>linked_wo_id', 'eq', entityId);
            else if (type === 'layerz') selectQuery = selectQuery.filter('metadata->>linked_print_id', 'eq', entityId);
            else if (type === 'packerz') selectQuery = selectQuery.filter('metadata->>linked_order_id', 'eq', entityId);
            
            const { data: tasks } = await selectQuery;
            if (tasks && tasks.length > 0) {
                let authorName = 'System';
                if (window.currentUser) {
                    let uid = window.currentUser.id;
                    if (TE_OFFICIAL_USERS[uid]) {
                        authorName = TE_OFFICIAL_USERS[uid].name;
                    } else if (window.currentUser.email) {
                        authorName = window.currentUser.email.split('@')[0];
                    } else {
                        authorName = uid;
                    }
                }
                for (let t of tasks) {
                    let commentPayload = {
                        id: generateUUID(),
                        task_id: t.id,
                        author_id: null,
                        content: `SPOOF:${authorName}|||${params.content}`,
                        created_at: new Date().toISOString()
                    };
                    await supabaseClient.from('task_comments').insert([commentPayload]);
                }
            }
        } catch(e) { console.error('[TaskEngine] Sync Comment failed:', e); }
    }
    // Re-fetch all task engine data to sync UI
    await teFetchAllData();
};

window.teEnsureFulfillmentTasks = async function(orders) {
    if (!orders || orders.length === 0 || typeof supabaseClient === 'undefined') return;
    
    try {
        let orderIds = orders.map(o => typeof o === 'object' ? String(o.order_id) : String(o));
        
        const { data: dbTasks, error } = await supabaseClient
            .from('taskz')
            .select('metadata')
            .in('metadata->>linked_order_id', orderIds);
            
        if (error) throw error;
        
        let existingOrderIds = new Set();
        if (dbTasks) {
            dbTasks.forEach(t => {
                if (t.metadata && t.metadata.linked_order_id) {
                    existingOrderIds.add(String(t.metadata.linked_order_id));
                }
            });
        }
        
        let packerzSectionId = await window.teGetOrCreateSectionId('Packerz');
        
        let promises = [];
        for (let order of orders) {
            let orderId = typeof order === 'object' ? String(order.order_id) : String(order);
            if (!existingOrderIds.has(orderId)) {
                let description = '';
                if (typeof order === 'object' && Array.isArray(order.items)) {
                    description = order.items.map(i => `${i.recipe} (Qty: ${i.qty})`).join(', ');
                }
                
                let payload = {
                    id: generateUUID(),
                    title: `🚚 Packerz: Order ${orderId.startsWith('#') ? orderId : '#' + orderId} - Assemble and Pack`,
                    status: 'Todo',
                    linked_module: 'sales',
                    metadata: { linked_order_id: orderId, type: 'packerz' },
                    assigned_to_id: null,
                    cycle_id: packerzSectionId,
                    description: description || `Order #${orderId} Fulfillment`
                };
                promises.push(
                    supabaseClient.from('taskz').insert([payload]).then(() => {
                        taskEngineDB.taskz.push(payload);
                    })
                );
            }
        }
        
        if (promises.length > 0) {
            await Promise.all(promises);
            teRenderTaskGrid();
        }
    } catch(e) {
        console.error('[TaskEngine] Ensure packerz tasks failed:', e);
    }
};
