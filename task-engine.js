/* =========================================================================
   TASK ENGINE (PHASE 3)
   A.I. Generated UI Takeover Module
   ========================================================================= */

let isTaskPlannerOpen = false;

let taskEngineDB = { taskz: [], cyclez: [], teams: [] };

window.initTaskEngine = async function() {
    console.log('[TaskEngine] Initialization check complete.');
    if (typeof supabaseClient !== 'undefined') {
        await teFetchAllData();
    } else {
        console.warn('[TaskEngine] supabaseClient not defined.');
    }
};

/**
 * Asynchronously boots the Task Engine data cache by executing parallel
 * read operations against the Supabase `taskz`, `cyclez`, and `teams` tables.
 * Safely parses the payloads and passes them to the Vanilla DOM renderers.
 */
async function teFetchAllData() {
    try {
        const [taskzRes, cyclezRes, teamsRes] = await Promise.all([
            supabaseClient.from('taskz').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('cyclez').select('*').order('start_date', { ascending: false }),
            supabaseClient.from('teams').select('*').order('name', { ascending: true })
        ]);
        if (taskzRes.data) taskEngineDB.taskz = taskzRes.data;
        if (cyclezRes.data) taskEngineDB.cyclez = cyclezRes.data;
        if (teamsRes.data) taskEngineDB.teams = teamsRes.data;
        
        teRenderSidebar();
        teRenderTaskGrid();
    } catch (err) {
        console.error('[TaskEngine] Failed to fetch data', err);
    }
}

function teRenderSidebar() {
    const cyclezList = document.getElementById('te-cyclez-list');
    const teamsList = document.getElementById('te-teams-list');
    
    if (cyclezList) {
        let cycleHTML = '';
        taskEngineDB.cyclez.forEach(c => {
            cycleHTML += `
                <div class="task-nav-link" style="flex-direction: column; align-items: flex-start;" data-cycle-id="${c.id}">
                    <span style="margin-bottom: 4px;">${c.title}</span>
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
            teamsHTML += `<div class="task-nav-link" data-team-id="${t.id}">${t.name}</div>`;
        });
        teamsList.innerHTML = window.safeHTML ? window.safeHTML(teamsHTML) : teamsHTML;
    }
}

function teRenderTaskGrid() {
    const wrapper = document.getElementById('te-task-rows-wrapper');
    if (!wrapper) return;
    
    let html = '';
    taskEngineDB.taskz.forEach(t => {
        let statusColorClass = 'status-in-progress';
        if (t.status === 'Done') statusColorClass = 'status-done';
        if (t.status === 'Todo' || t.status === 'Backlog') statusColorClass = 'status-todo';
        if (t.status === 'Blocked') statusColorClass = 'status-blocked';
        
        let ownerInitials = 'UN';
        let ownerBg = '#3b82f6';
        if (t.assigned_team_id) {
            let team = taskEngineDB.teams.find(tm => tm.id === t.assigned_team_id);
            if (team) { ownerInitials = team.name.substring(0,2).toUpperCase(); ownerBg = team.color_hex || ownerBg; }
        }

        let dueStr = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No Date';

        html += `
        <div class="task-row" data-task-id="${t.id}" data-click="click_teOpenTaskContext">
            <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                <div class="task-checkbox" style="flex-shrink: 0;" data-click="click_teToggleTaskDone"></div>
                <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                    <span style="color: white; font-weight: 500; font-size: 14px; overflow: hidden; text-overflow: ellipsis;">${t.title}</span>
                    <div style="display: flex; gap: 10px; font-size: 11px; color: var(--text-muted);">
                        <span>⏱️ ${t.estimated_minutes}m</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${ownerBg}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid var(--bg-panel);">${ownerInitials}</div>
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
    });
    
    wrapper.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
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
    const flyout = document.getElementById('taskContextFlyout');
    if (flyout) {
        const task = taskEngineDB.taskz.find(t => t.id === taskId);
        if (task) {
            // Update Flyout Header Title
            const flyoutTitle = flyout.querySelector('h2');
            if (flyoutTitle) flyoutTitle.textContent = task.title;
            // Additional updates to flyout DOM would go here based on task ID
            teFetchTaskActivity(taskId);
        }
        flyout.classList.remove('hidden');
    }
};

window.teCycleStatus = async function(taskId) {
    // Prevent event bubbling if necessary (done in delegator conceptually, but just in case)
    if (!taskId) return;
    
    let task = taskEngineDB.taskz.find(t => t.id === taskId);
    if (!task) return;
    
    const statusCycle = ['Todo', 'In Progress', 'Blocked', 'Done'];
    let idx = statusCycle.indexOf(task.status);
    let nextStatus = statusCycle[(idx + 1) % statusCycle.length];
    
    // Update local cache optimistically
    task.status = nextStatus;
    teRenderTaskGrid();
    
    try {
        await supabaseClient.from('taskz').update({ status: nextStatus }).eq('id', taskId);
        await supabaseClient.from('task_activity').insert([{
            task_id: taskId,
            actor_type: 'System',
            action_text: `Status changed to ${nextStatus}`
        }]);
        
        // Refresh context flyout activity feed if it is currently open for this task
        teFetchTaskActivity(taskId);
    } catch(e) {
        console.error('[TaskEngine] Status update failed:', e);
    }
};

async function teFetchTaskActivity(taskId) {
    // Scaffold for Phase 5 to render task_activity into the context flyout timeline
    try {
        const { data, error } = await supabaseClient.from('task_activity')
            .select('*')
            .eq('task_id', taskId)
            .order('timestamp', { ascending: false });
            
        if (!error && data) {
            // We would dynamically render this into the flyout's timeline container
            console.log(`[TaskEngine] Fetched ${data.length} activity logs for task ${taskId}`);
        }
    } catch (e) {
        console.error('[TaskEngine] Activity fetch failed:', e);
    }
}

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
        teRenderTaskGrid();
    } else if (view === 'board') {
        header.style.display = 'none';
        wrapper.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted);"><h3>Kanban Board</h3><p>Live payloads fetched: ${taskEngineDB.taskz.length} tasks. CSS Grid scaffold pending Phase 6.</p></div>`;
    } else if (view === 'calendar') {
        header.style.display = 'none';
        wrapper.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted);"><h3>Calendar View</h3><p>Live payloads fetched: ${taskEngineDB.taskz.length} tasks. Calendar scaffold pending Phase 6.</p></div>`;
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
