/* =========================================================================
   TASK ENGINE (PHASE 3)
   A.I. Generated UI Takeover Module
   ========================================================================= */

let isTaskPlannerOpen = false;

let taskEngineDB = { taskz: [], cyclez: [], teams: [], comments: [], activity: [] };

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
        const [taskzRes, cyclezRes, teamsRes, commentsRes, activityRes] = await Promise.all([
            supabaseClient.from('taskz').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('cyclez').select('*').order('start_date', { ascending: false }),
            supabaseClient.from('teams').select('*').order('name', { ascending: true }),
            supabaseClient.from('task_comments').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('task_activity').select('*').order('timestamp', { ascending: false })
        ]);
        if (taskzRes.data) taskEngineDB.taskz = taskzRes.data;
        if (cyclezRes.data) taskEngineDB.cyclez = cyclezRes.data;
        if (teamsRes.data) taskEngineDB.teams = teamsRes.data;
        if (commentsRes.data) taskEngineDB.comments = commentsRes.data;
        if (activityRes.data) taskEngineDB.activity = activityRes.data;
        
        // Ensure dropdown matches local storage identity
        let currentUser = localStorage.getItem('neogleamz_current_user') || 'none';
        let spoofer = document.getElementById('te-identity-spoofer');
        if (spoofer) spoofer.value = currentUser;
        
        teRenderSidebar();
        teRenderTaskGrid();
        teUpdateInboxBadge();
    } catch (err) {
        console.error('[TaskEngine] Failed to fetch data', err);
    }
}

window.teChangeIdentity = function(userId) {
    if (!userId || userId === 'none') {
        localStorage.removeItem('neogleamz_current_user');
    } else {
        localStorage.setItem('neogleamz_current_user', userId);
    }
    teUpdateInboxBadge();
    // Refresh inbox if that's what we are viewing
    let title = document.getElementById('te-main-header-title');
    if (title && title.textContent === 'Inbox View') {
        window.teSwitchView('inbox');
    }
};

function teUpdateInboxBadge() {
    const badge = document.getElementById('te-inbox-badge');
    if (!badge) return;
    let currentUser = localStorage.getItem('neogleamz_current_user');
    if (!currentUser || currentUser === 'none') {
        badge.style.display = 'none';
        return;
    }
    // Count unread or relevant items (e.g. mentions in comments or activity on tasks they own)
    // For now, let's just count comments containing "@" + currentUser
    let count = taskEngineDB.comments.filter(c => c.comment_text && c.comment_text.includes('@' + currentUser)).length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function teRenderSidebar() {
    const cyclezList = document.getElementById('te-cyclez-list');
    const teamsList = document.getElementById('te-teams-list');
    
    if (cyclezList) {
        let cycleHTML = '';
        taskEngineDB.cyclez.forEach(c => {
            cycleHTML += `
                <div class="task-nav-link" style="flex-direction: column; align-items: flex-start; position: relative;" data-cycle-id="${c.id}">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 4px;">
                        <span>${c.title}</span>
                        <span data-click="click_teDeleteCycle" data-cycle-id="${c.id}" style="color: var(--text-muted); font-size: 10px; cursor: pointer; padding: 2px;">✖</span>
                    </div>
                    <div style="width: 100%; background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px; overflow: hidden;">
                        <div style="width: 0%; background: ${c.color_hex || '#2dd4bf'}; height: 100%;"></div>
                    </div>
                </div>
            `;
        });
        cyclezList.innerHTML = window.safeHTML ? window.safeHTML(cycleHTML) : cycleHTML;
    }
    
    if (teamsList) {
        let teamsHTML = '';
        taskEngineDB.teams.forEach(t => {
            let membersList = (t.members || []).map(m => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 4px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${window.teGetStringColor(m)}; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: white;">${m.substring(0,1).toUpperCase()}</div>
                        <span style="font-size: 11px; color: #ccc;">${m}</span>
                    </div>
                    <span data-click="click_teRemoveTeamMember" data-team-id="${t.id}" data-member-name="${m}" style="color: var(--text-muted); font-size: 10px; cursor: pointer; padding: 2px;">✖</span>
                </div>
            `).join('');

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

function teRenderTaskGrid(filter = 'list') {
    const wrapper = document.getElementById('te-task-rows-wrapper');
    if (!wrapper) return;
    
    let html = '';
    
    // Determine filters
    let currentUser = localStorage.getItem('neogleamz_current_user');
    let taskList = taskEngineDB.taskz;
    
    if (filter === 'my_tasks' && currentUser && currentUser !== 'none') {
        // filter by assignee or by created_by if no assignee logic is robust yet. We'll check assigned_to_id or created_by_id? 
        // We only have the name in currentUser right now. We should map it to an actual user ID if we had one, but we are spoofing.
        // Let's assume for spoofing we just match the metadata or title temporarily, or if we assign via teams.
        // Actually, the assignment dropdown sets the value to "Chris", "Andy", etc. We will store that in `metadata.spoofed_assignee`.
    }
    
    // Filter tasks based on view
    let displayTasks = taskList.filter(t => {
        if (filter === 'blocked') return t.status === 'Blocked';
        if (filter === 'completed') return t.status === 'Done';
        if (filter === 'inbox') return t.status !== 'Done' && !t.parent_task_id;
        if (filter === 'my_tasks') {
            let meta = t.metadata || {};
            if (meta.spoofed_assignee === currentUser) return true;
            if (meta.assigned_team_id) {
                let team = taskEngineDB.teams.find(tm => tm.id === meta.assigned_team_id);
                if (team && team.members && team.members.includes(currentUser)) return true;
            }
            return false;
        }
        return t.status !== 'Done'; // Default 'list' view hides done
    });
    
    // Group by Cycle
    let cycleGroups = {
        'unassigned': { title: 'No Cycle', tasks: [] }
    };
    
    taskEngineDB.cyclez.forEach(c => {
        cycleGroups[c.id] = { title: c.title, color: c.color_hex || '#2dd4bf', tasks: [] };
    });
    
    // Sort tasks into cycles (only top-level tasks)
    displayTasks.filter(t => !t.parent_task_id).forEach(t => {
        let cid = t.cycle_id;
        if (cid && cycleGroups[cid]) {
            cycleGroups[cid].tasks.push(t);
        } else {
            cycleGroups['unassigned'].tasks.push(t);
        }
    });
    
    // Render loop
    for (const [cid, group] of Object.entries(cycleGroups)) {
        if (group.tasks.length === 0) continue;
        
        let headerColor = group.color || '#64748b';
        html += `
        <div style="margin-top: 15px; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
            <div data-click="click_teToggleCycleGroup" data-cycle-id="${cid}" style="cursor: pointer; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-muted);">▼</div>
            <div style="font-size: 14px; font-weight: bold; color: white;">${group.title}</div>
            <div style="flex-grow: 1; height: 1px; background: rgba(255,255,255,0.1); margin-left: 10px;"></div>
        </div>
        <div id="te-cycle-group-${cid}" style="display: flex; flex-direction: column; gap: 4px;">
        `;
        
        group.tasks.forEach(t => {
            html += teBuildTaskRowHTML(t, false);
            // Render children
            let children = displayTasks.filter(child => child.parent_task_id === t.id);
            if (children.length > 0) {
                html += `<div id="te-subtasks-wrapper-${t.id}" style="padding-left: 24px; display: flex; flex-direction: column; gap: 2px;">`;
                children.forEach(child => {
                    html += teBuildTaskRowHTML(child, true);
                });
                html += `</div>`;
            }
        });
        
        html += `</div>`;
    }
    
    wrapper.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
}

function teBuildTaskRowHTML(t, isChild) {
    let statusColorClass = 'status-in-progress';
    if (t.status === 'Done') statusColorClass = 'status-done';
    if (t.status === 'Todo' || t.status === 'Backlog') statusColorClass = 'status-todo';
    if (t.status === 'Blocked') statusColorClass = 'status-blocked';
    
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
    } else if (meta.spoofed_assignee) {
        ownerInitials = meta.spoofed_assignee.substring(0,2).toUpperCase();
        ownerBg = window.teGetStringColor(meta.spoofed_assignee);
        ownerTitle = meta.spoofed_assignee;
    }

    let dueStr = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No Date';
    let rowPadding = isChild ? '5px 15px' : '10px 15px';
    let titleWeight = isChild ? '400' : '500';

    return `
    <div class="task-row" data-task-id="${t.id}" data-click="click_teOpenTaskContext" style="padding: ${rowPadding}; min-height: unset;">
        <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
            <div class="task-checkbox" style="flex-shrink: 0;" data-click="click_teToggleTaskDone"></div>
            <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                <span style="color: white; font-weight: ${titleWeight}; font-size: 14px; overflow: hidden; text-overflow: ellipsis;">${t.title}</span>
            </div>
        </div>
        <div style="display: flex; align-items: center;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${ownerBg}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid var(--bg-panel);" title="${ownerTitle}">${ownerInitials}</div>
        </div>
        <div>
            <span class="status-pill ${statusColorClass}" data-click="click_teCycleStatus" style="position: relative; z-index: 2;">${t.status}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); font-weight: bold; display: flex; align-items: center;">
            ${dueStr}
        </div>
        <div style="font-size: 11px; color: var(--text-muted); font-weight: bold; display: flex; align-items: center;">
            #normal
        </div>
    </div>
    `;
}

window.teCreateNewTask = async function() {
    try {
        const { data, error } = await supabaseClient.from('taskz').insert([{
            title: 'Untitled Task',
            status: 'Todo',
            estimated_minutes: 30
        }]).select();
        
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
                opts += '<option value="Chris">Chris</option><option value="Andy">Andy</option><option value="Tyson">Tyson</option>';
                opts += '</optgroup>';
                
                if (taskEngineDB.teams && taskEngineDB.teams.length > 0) {
                    opts += '<optgroup label="Teams">';
                    taskEngineDB.teams.forEach(team => {
                        opts += `<option value="team_${team.id}">${team.name}</option>`;
                    });
                    opts += '</optgroup>';
                }
                assigneeSelect.innerHTML = opts;
                
                let meta = task.metadata || {};
                if (meta.assigned_team_id) {
                    assigneeSelect.value = 'team_' + meta.assigned_team_id;
                } else {
                    assigneeSelect.value = meta.spoofed_assignee || '';
                }
            }
            
            const cycleSelect = document.getElementById('te-flyout-cycle');
            if (cycleSelect) {
                // Populate options first
                let opts = '<option value="">No Cycle</option>';
                taskEngineDB.cyclez.forEach(c => {
                    opts += `<option value="${c.id}">${c.title}</option>`;
                });
                cycleSelect.innerHTML = opts;
                cycleSelect.value = task.cycle_id || '';
            }
            
            teRenderSubtasks(taskId);
            teRenderActivityFeed(taskId);
        }
        flyout.classList.remove('hidden');
    }
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
        let doneCount = subtasks.filter(t => t.status === 'Done').length;
        header.textContent = `SUBTASKS (${doneCount}/${subtasks.length})`;
    }
    
    let html = '';
    subtasks.forEach(st => {
        let isDone = st.status === 'Done';
        html += `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div data-click="click_teCycleStatus" data-task-id="${st.id}" style="width: 16px; height: 16px; border-radius: 4px; border: 1px solid var(--border-input); cursor: pointer; display: flex; align-items: center; justify-content: center; background: ${isDone ? 'var(--primary-color)' : 'transparent'};">
                ${isDone ? '<span style="color:white; font-size:10px;">✓</span>' : ''}
            </div>
            <span data-click="click_teOpenTaskContext" data-task-id="${st.id}" style="color: ${isDone ? 'var(--text-muted)' : 'white'}; text-decoration: ${isDone ? 'line-through' : 'none'}; font-size: 13px; cursor: pointer; flex-grow: 1;">${st.title}</span>
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
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center;">No activity yet.</div>';
        return;
    }
    
    let html = '';
    relevantEvents.forEach(ev => {
        if (ev.type === 'comment') {
            html += `
            <div style="margin-bottom: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong style="font-size: 11px; color: var(--text-muted);">${ev.data.author_id}</strong>
                    <span style="font-size: 10px; color: var(--text-muted);">${new Date(ev.data.created_at).toLocaleString()}</span>
                </div>
                <div style="font-size: 13px; color: white;">${ev.data.comment_text}</div>
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

window.teCycleStatus = async function(taskId) {
    if (!taskId) return;
    
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    const statusCycle = ['Todo', 'In Progress', 'Blocked', 'Done'];
    let idx = statusCycle.indexOf(task.status);
    let nextStatus = statusCycle[(idx + 1) % statusCycle.length];
    
    let currentUser = localStorage.getItem('neogleamz_current_user') || 'System';
    
    task.status = nextStatus;
    teRenderTaskGrid();
    
    try {
        await supabaseClient.from('taskz').update({ status: nextStatus }).eq('id', taskId);
        
        const newAct = {
            task_id: taskId,
            actor_type: currentUser,
            action_text: `Status changed to ${nextStatus}`,
            timestamp: new Date().toISOString()
        };
        
        await supabaseClient.from('task_activity').insert([newAct]);
        taskEngineDB.activity.push(newAct);
        
        if (window.currentOpenTaskId === taskId) {
            teRenderActivityFeed(taskId);
        }
    } catch(e) {
        console.error('[TaskEngine] Status update failed:', e);
    }
};

window.teAddSubtask = async function() {
    if (!window.currentOpenTaskId) return;
    let input = document.getElementById('te-flyout-subtask-input');
    if (!input || !input.value.trim()) return;
    
    let title = input.value.trim();
    input.value = '';
    
    try {
        const { data, error } = await supabaseClient.from('taskz').insert([{
            title: title,
            status: 'Todo',
            parent_task_id: window.currentOpenTaskId
        }]).select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            taskEngineDB.taskz.push(data[0]);
            teRenderSubtasks(window.currentOpenTaskId);
            
            // Re-render list to show the new subtask
            let titleEl = document.getElementById('te-main-header-title');
            if (titleEl && titleEl.textContent === 'All Tasks') {
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

window.teUpdateTaskAssignee = async function(taskId, assignee) {
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    let meta = task.metadata || {};
    
    if (assignee && assignee.startsWith('team_')) {
        let teamId = assignee.replace('team_', '');
        meta.assigned_team_id = teamId;
        delete meta.spoofed_assignee;
    } else {
        delete meta.assigned_team_id;
        meta.spoofed_assignee = assignee;
    }
    
    task.metadata = meta;
    teRenderTaskGrid();
    
    try {
        await supabaseClient.from('taskz').update({ metadata: meta }).eq('id', taskId);
    } catch(e) { console.error(e); }
};

window.teUpdateTaskCycle = async function(taskId, cycleId) {
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    task.cycle_id = cycleId || null;
    teRenderTaskGrid();
    
    try {
        await supabaseClient.from('taskz').update({ cycle_id: cycleId || null }).eq('id', taskId);
    } catch(e) { console.error(e); }
};

window.teCreateCycle = async function() {
    let title = prompt("Enter new cycle name:");
    if (!title) return;
    
    try {
        const { data, error } = await supabaseClient.from('cyclez').insert([{
            title: title,
            color_hex: '#10b981'
        }]).select();
        
        if (error) throw error;
        if (data && data.length > 0) {
            taskEngineDB.cyclez.push(data[0]);
            teRenderSidebar();
        }
    } catch(e) { console.error(e); }
};

window.teCreateTeam = async function() {
    let title = prompt("Enter new team name:");
    if (!title || !title.trim()) return;
    
    const newTeam = { name: title.trim(), color_hex: '#8b5cf6' };
    try {
        const { data, error } = await supabaseClient.from('teams').insert([newTeam]).select();
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
            let meta = task.metadata || {};
            delete meta.assigned_team_id;
            await supabaseClient.from('taskz').update({ metadata: meta }).eq('id', task.id);
        }
        await supabaseClient.from('teams').delete().eq('id', teamId);
    } catch(e) { console.error(e); }
};

window.teAddTeamMember = async function(teamId) {
    let name = prompt("Enter member name (e.g. Chris):");
    if (!name || !name.trim()) return;
    name = name.trim();
    
    let team = taskEngineDB.teams.find(t => t.id === teamId);
    if (!team) return;
    
    let members = team.members || [];
    if (members.includes(name)) return;
    
    members.push(name);
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
    
    let currentUser = localStorage.getItem('neogleamz_current_user') || 'System';
    let text = input.value.trim();
    
    let newComment = {
        task_id: window.currentOpenTaskId,
        author_id: currentUser,
        comment_text: text,
        created_at: new Date().toISOString()
    };
    
    input.value = '';
    
    try {
        const { data, error } = await supabaseClient.from('task_comments').insert([newComment]).select();
        if (!error && data && data.length > 0) {
            taskEngineDB.comments.push(data[0]);
        } else {
            // fallback optimistic if no return
            taskEngineDB.comments.push(newComment);
        }
        teRenderActivityFeed(window.currentOpenTaskId);
    } catch(e) {
        console.error('Failed to post comment', e);
    }
};

window.teSwitchView = function(view, btnEl) {
    // Update UI buttons
    document.querySelectorAll('.task-view-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
    });
    
    if (btnEl) {
        btnEl.classList.add('active');
        btnEl.style.background = 'rgba(255,255,255,0.1)';
        btnEl.style.color = 'white';
    }
    
    const wrapper = document.getElementById('te-task-rows-wrapper');
    const header = document.querySelector('.task-grid-header');
    if (!wrapper || !header) return;
    
    if (view === 'list') {
        header.style.display = 'grid';
        teRenderTaskGrid('list');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = 'All Tasks';
    } else if (view === 'my_tasks') {
        header.style.display = 'grid';
        teRenderTaskGrid('my_tasks');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = 'My Tasks';
    } else if (view === 'blocked') {
        header.style.display = 'grid';
        teRenderTaskGrid('blocked');
        let title = document.getElementById('te-main-header-title');
        if (title) title.textContent = 'Blocked Tasks';
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
                ${['Todo', 'In Progress', 'Blocked', 'Done'].map(status => {
                    let tasksHtml = taskEngineDB.taskz.filter(t => t.status === status).map(t => {
                        let color = status === 'Done' ? '#10b981' : (status === 'Blocked' ? '#ef4444' : (status === 'Todo' ? '#64748b' : '#3b82f6'));
                        return `
                        <div class="kanban-card" data-task-id="${t.id}" style="background: var(--bg-container); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 10px; cursor: grab; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border-left: 3px solid ${color};">
                            <div style="font-weight: 500; font-size: 14px; margin-bottom: 8px; color: white;">${t.title}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: var(--text-muted);">⏱️ ${t.estimated_minutes || 0}m</span>
                                <span class="status-pill status-${status.toLowerCase().replace(' ', '-')}" style="font-size: 10px; padding: 2px 6px;">${status}</span>
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
                                await supabaseClient.from('taskz').update({ status: newStatus }).eq('id', taskId);
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
    } else if (view === 'calendar') {
        header.style.display = 'none';
        
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let calendarHtml = `
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                ${days.map(d => `<div style="padding: 10px; text-align: center; font-weight: bold; background: var(--bg-panel); color: var(--text-muted); font-size: 12px;">${d}</div>`).join('')}
        `;
        
        let today = new Date();
        let currentMonth = today.getMonth();
        let currentYear = today.getFullYear();
        let daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        let firstDay = new Date(currentYear, currentMonth, 1).getDay();
        let offset = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0
        
        for (let i = 0; i < offset; i++) {
            calendarHtml += `<div style="background: rgba(0,0,0,0.2); min-height: 100px;"></div>`;
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            let dayTasks = taskEngineDB.taskz.filter(t => {
                if (!t.due_date) return false;
                let d = new Date(t.due_date);
                return d.getDate() === i && d.getMonth() === currentMonth;
            });
            
            let tasksHtml = dayTasks.map(t => `<div style="background: rgba(45, 212, 191, 0.2); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.4); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;" onclick="window.teOpenTaskContext('${t.id}')">${t.title}</div>`).join('');
            
            calendarHtml += `
                <div style="background: var(--bg-container); min-height: 100px; padding: 10px; border: 1px solid rgba(0,0,0,0.5);">
                    <div style="font-size: 12px; font-weight: bold; color: ${i === today.getDate() ? 'white' : 'var(--text-muted)'};">${i}</div>
                    ${tasksHtml}
                </div>
            `;
        }
        
        calendarHtml += `</div>`;
        wrapper.innerHTML = window.safeHTML ? window.safeHTML(calendarHtml) : calendarHtml;
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
        const { data, error } = await supabaseClient.from('taskz').insert([{
            title: title,
            status: 'Todo',
            estimated_minutes: est
        }]).select();
        
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
        console.log('[TaskEngine] Modal Opened.');
    }
};

window.closeTaskPlanner = function() {
    isTaskPlannerOpen = false;
    const modal = document.getElementById('taskPlannerModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('[TaskEngine] Modal Closed.');
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

    // Press 'T' to toggle Task Planner
    if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (isTaskPlannerOpen) {
            window.closeTaskPlanner();
        } else {
            window.openTaskPlanner();
        }
    }

    // Press 'C' to Create Task (placeholder for now)
    if (e.key.toLowerCase() === 'c' && isTaskPlannerOpen) {
        e.preventDefault();
        console.log('[TaskEngine] Create Task triggered via keyboard shortcut.');
        // FUTURE: document.getElementById('newTaskInput').focus();
    }
});
