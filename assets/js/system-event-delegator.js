/**
 * @typedef {Object} EventMap
 * @property {string} event_type
 * @property {string} action_token
 * @property {Element} target_element
 */

// ==========================================
// SYSTEM EVENT DELEGATOR
// Replaces inline HTML handlers per Native Vanilla DOM Rules
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    document.body.addEventListener('click', function(event) {
        if (event.target.type === 'checkbox') return;
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-click]');
        if (!el) return;
        
        if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'FORM') {
            event.preventDefault();
        }

        const action = el.getAttribute('data-click');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'click_startAvatarMigration':
                    if (typeof window.click_startAvatarMigration === 'function') window.click_startAvatarMigration();
                    break;
                case 'click_runMigrationEngine':
                    if (typeof window.click_runMigrationEngine === 'function') window.click_runMigrationEngine();
                    break;
                case 'click_closeMigrationModal': {
                    const migrationModal = document.getElementById('migration-modal');
                    if (migrationModal) migrationModal.style.display = 'none';
                    break;
                }
                case 'click_renderSimulatorOrder':
                    if (typeof window.renderSimulatorOrder === 'function') window.renderSimulatorOrder(el.getAttribute('data-oid'));
                    break;
                case 'click_window_openRecipeManager':
                    if (typeof window.openRecipeManager === 'function') window.openRecipeManager();
                    break;
                case 'click_window_closeRecipeManager':
                    document.getElementById('recipeManagerModal').style.display='none';
                    break;
                case 'click_applyAllRecipeSuggestions':
                    if (typeof window.applyAllRecipeSuggestions === 'function') window.applyAllRecipeSuggestions();
                    break;
                case 'click_window_commitRecipeManager':
                    if (typeof window.commitRecipeManager === 'function') window.commitRecipeManager();
                    break;
                case 'click_window_openEditzBulkModal':
                    window.click_window_openEditzBulkModal();
                    break;
                case 'click_window_closeEditzBulkModal':
                    window.click_window_closeEditzBulkModal();
                    break;
                case 'click_window_applyBulkFindReplace':
                    window.click_window_applyBulkFindReplace();
                    break;
                case 'click_window_commitEditzBulkChanges':
                    window.click_window_commitEditzBulkChanges();
                    break;
                case 'click_switchTab_stockpilez':
                    switchTab('stockpilez');
                    break;
                case 'click_switchTab_makerz':
                    switchTab('makerz');
                    break;
                case 'click_switchTab_fulfillz':
                    switchTab('fulfillz');
                    break;
                case 'click_switchTab_revenuez':
                    switchTab('revenuez');
                    break;
                case 'click_switchTab_socialz':
                    switchTab('socialz');
                    break;
                case 'click_switchTab_nexl':
                    switchTab('nexuz');
                    break;
                case 'click_openForceSyncModal':
                    if (typeof window.openForceSyncModal === 'function') window.openForceSyncModal();
                    break;
                case 'click_window_closeForceSyncModal':
                    if (typeof window.closeForceSyncModal === 'function') window.closeForceSyncModal();
                    break;
                case 'click_triggerForceSync':
                    if (typeof window.triggerForceSync === 'function') window.triggerForceSync();
                    break;
                case 'click_openTipzModal':
                    openTipzModal();
                    break;
                case 'click_toggleTheme':
                    toggleTheme();
                    break;
                case 'click_handleLogout':
                    handleLogout();
                    break;
                case 'click_openTaskPlanner':
                    if (window.openTaskPlanner) window.openTaskPlanner();
                    break;
                case 'click_closeTaskPlanner':
                    if (window.closeTaskPlanner) window.closeTaskPlanner();
                    break;
                case 'click_openTaskContext':
                    if (window.openTaskContext) window.openTaskContext();
                    break;
                case 'click_closeTaskContext':
                    if (window.closeTaskContext) window.closeTaskContext();
                    break;
                case 'click_teToggleTimer':
                    if (typeof window.teToggleTimer === 'function' && window.currentOpenTaskId) {
                        window.teToggleTimer(window.currentOpenTaskId);
                    }
                    break;
                case 'click_teChangeCalendarMonth_prev':
                    if (typeof window.teChangeCalendarMonth === 'function') window.teChangeCalendarMonth(-1);
                    break;
                case 'click_teChangeCalendarMonth_next':
                    if (typeof window.teChangeCalendarMonth === 'function') window.teChangeCalendarMonth(1);
                    break;
                case 'click_teCreateNewTask':
                    if (window.teCreateNewTask) window.teCreateNewTask();
                    break;
                case 'click_teOpenTagManager':
                    if (typeof window.teOpenTagManager === 'function') window.teOpenTagManager();
                    break;
                case 'click_teCreateNewTag':
                    if (typeof window.click_teCreateNewTag === 'function') window.click_teCreateNewTag(el);
                    break;
                case 'click_teAddTagToTask':
                    if (typeof window.click_teAddTagToTask === 'function') window.click_teAddTagToTask(el);
                    break;
                case 'click_teRemoveTagFromTask':
                    if (typeof window.click_teRemoveTagFromTask === 'function') window.click_teRemoveTagFromTask(el);
                    break;
                case 'click_teCloseTaskContext':
                    if (typeof window.teCloseTaskContext === 'function') window.teCloseTaskContext();
                    break;
                case 'click_window_closeTagManager':
                    if (typeof window.teCloseTagManager === 'function') window.teCloseTagManager();
                    break;
                case 'click_closeScraperFoundry':
                    if (typeof window.closeScraperFoundry === 'function') window.closeScraperFoundry();
                    break;
                case 'click_scraperSetContainerBounds':
                    if (typeof window.scraperSetContainerBounds === 'function') window.scraperSetContainerBounds();
                    break;
                case 'click_scraperMapChildColumn':
                    if (typeof window.scraperMapChildColumn === 'function') window.scraperMapChildColumn();
                    break;
                case 'click_scraperExportXLSX':
                    if (typeof window.scraperExportXLSX === 'function') window.scraperExportXLSX();
                    break;
                case 'click_scraperCopyJSON':
                    if (typeof window.scraperCopyJSON === 'function') window.scraperCopyJSON();
                    break;
                case 'click_scraperClearDataset':
                    if (typeof window.scraperClearDataset === 'function') window.scraperClearDataset();
                    break;
                case 'click_teCreateTagFromManager':
                    if (typeof window.teCreateTagFromManager === 'function') window.teCreateTagFromManager();
                    break;
                case 'click_teDeleteTag':
                    if (typeof window.teDeleteTag === 'function') window.teDeleteTag(el);
                    break;
                case 'click_teOpenTaskContext':
                    if (window.teOpenTaskContext) window.teOpenTaskContext(el.getAttribute('data-task-id'));
                    break;
                case 'click_teOpenStatusDropdown':
                    if (window.teOpenStatusDropdown) {
                        const taskId = el.closest('[data-task-id]') ? el.closest('[data-task-id]').getAttribute('data-task-id') : el.getAttribute('data-task-id');
                        window.teOpenStatusDropdown(taskId, el);
                    }
                    break;
                case 'click_teSetStatus':
                    if (window.teSetStatus) window.teSetStatus(el.getAttribute('data-status'));
                    break;
                case 'click_teSwitchView_overview':
                    if (window.teSwitchView) window.teSwitchView('overview', el);
                    break;
                case 'click_teSwitchView_list':
                    if (window.teSwitchView) window.teSwitchView('list', el);
                    break;
                case 'click_teSwitchView_board':
                    if (window.teSwitchView) window.teSwitchView('board', el);
                    break;
                case 'click_teSwitchView_timeline':
                    if (window.teSwitchView) window.teSwitchView('timeline', el);
                    break;
                case 'click_teSwitchView_dashboard':
                    if (window.teSwitchView) window.teSwitchView('dashboard', el);
                    break;
                case 'click_teToggleTemplateMenu':
                    if (window.teToggleTemplateMenu) window.teToggleTemplateMenu();
                    break;
                case 'click_teSpawnSOP_Batchez':
                    if (window.teSpawnSOP) window.teSpawnSOP('batchez');
                    break;
                case 'click_teSpawnSOP_Print':
                    if (window.teSpawnSOP) window.teSpawnSOP('print');
                    break;
                case 'click_toggleTerminal':
                    toggleTerminal();
                    break;
                case 'click_clearLog':
                    clearLog();
                    break;
                case 'click_showInventoryPane_pipeline':
                    showInventoryPane('pipeline');
                    break;
                case 'click_showInventoryPane_simple':
                    showInventoryPane('simple');
                    break;
                case 'click_showInventoryPane_inventory':
                    showInventoryPane('inventory');
                    break;
                case 'click_autofillNeoNames':
                    autofillNeoNames();
                    break;
                case 'click_addManualItem':
                    addManualItem();
                    break;
                case 'click_window_resetInventoryConsumpti':
                    window.resetInventoryConsumption();
                    break;
                case 'click_window_openSnapshotManager':
                    if (window.openSnapshotManager) window.openSnapshotManager();
                    break;
                case 'click_window_closeSnapshotManager':
                    if (window.closeSnapshotManager) window.closeSnapshotManager();
                    break;
                case 'click_window_handleCreateSnapshot':
                    if (window.handleCreateSnapshot) window.handleCreateSnapshot();
                    break;
                case 'click_window_openCycleCountManager':
                    window.openCycleCountManager();
                    break;
                case 'click_updateLocalIPQRCode_cc':
                    if (typeof window.click_updateLocalIPQRCode_cc === 'function') window.click_updateLocalIPQRCode_cc();
                    break;
                case 'click_toggleStockzAuditScanner':
                    if (window.toggleStockzAuditScanner) window.toggleStockzAuditScanner();
                    break;
                case 'click_selectStockzAuditItem':
                    if (window.selectStockzAuditItem) window.selectStockzAuditItem(el.getAttribute('data-val'));
                    break;
                case 'click_updateLocalIPQRCode_audit':
                    if (window.updateLocalIPQRCode_audit) window.updateLocalIPQRCode_audit();
                    break;
                case 'click_window_filterStockzAuditItems':
                    if (window.filterStockzAuditItems) window.filterStockzAuditItems();
                    break;
                case 'click_window_openVelocityzModal':
                    window.openVelocityzModal();
                    break;
                case 'click_window_editGlobalLeadTime':
                    window.editGlobalLeadTime();
                    break;
                case 'click_printReorderReport':
                    printReorderReport();
                    break;
                case 'click_showProductionPane_builder':
                    showProductionPane('builder');
                    break;
                case 'click_showProductionPane_production':
                    showProductionPane('production');
                    break;
                case 'click_showProductionPane_print':
                    showProductionPane('print');
                    break;
                case 'click_window_showRecipeModal_create':
                    window.showRecipeModal('create');
                    break;
                case 'click_renameCurrentProduct':
                    renameCurrentProduct();
                    break;
                case 'click_addPartToProduct':
                    addPartToProduct();
                    break;
                case 'click_openBulkAddModal':
                    openBulkAddModal();
                    break;
                case 'click_showRecipeModal_delete':
                    showRecipeModal('delete');
                    break;
                case 'click_window_openNewWOModal_create':
                    window.openNewWOModal('create');
                    break;
                case 'click_window_openMultiBatchModal':
                    window.openMultiBatchModal();
                    break;
                case 'click_window_openSOPMasterModal_prod':
                    window.openSOPMasterModal('production');
                    break;
                case 'click_window_openSOPMasterModal_packerz':
                    window.openSOPMasterModal('packerz');
                    break;
                case 'click_window_openArchiveExplorer_bat':
                    window.openArchiveExplorer('batchez');
                    break;
                case 'click_window_deleteWorkOrder':
                    window.deleteWorkOrder();
                    break;
                case 'click_window_advanceWO_Queued':
                    window.advanceWO('Queued');
                    break;
                case 'click_window_advanceWO_Picking':
                    window.advanceWO('Picking');
                    break;
                case 'click_window_advanceWO_In_Production':
                    window.advanceWO('In Production');
                    break;
                case 'click_window_advanceWO_Completed':
                    window.advanceWO('Completed');
                    break;
                case 'click_window_printPickList':
                    window.printPickList();
                    break;
                case 'click_window_openDraftScrapModal':
                    window.openDraftScrapModal();
                    break;
                case 'click_window_printSOP':
                case 'click_window_openPrintSOP_currentPri':
                case 'click_window_openSopPrintModal_prod':
                    if (typeof window.openSopPrintModal === 'function') {
                        window.openSopPrintModal('production');
                    } else {
                        window.printSOP(); // Fallback
                    }
                    break;
                case 'click_window_openSopPrintModal_pack':
                    if (typeof window.openSopPrintModal === 'function') {
                        window.openSopPrintModal('packerz');
                    }
                    break;
                case 'click_printPackerzSOP':
                    if (typeof window.openSopPrintModal === 'function') {
                        window.openSopPrintModal('packerz');
                    }
                    break;
                case 'click_window_closeSopPrintModal':
                    if (typeof window.closeSopPrintModal === 'function') window.closeSopPrintModal();
                    break;
                case 'click_executeSopPrint_checklist':
                    if (typeof window.executeSopPrint === 'function') window.executeSopPrint('checklist');
                    break;
                case 'click_executeSopPrint_richtext':
                    if (typeof window.executeSopPrint === 'function') window.executeSopPrint('richtext');
                    break;
                case 'click_executeSopPrint_full':
                    if (typeof window.executeSopPrint === 'function') window.executeSopPrint('full');
                    break;
                case 'click_saveInlineSOP':
                    saveInlineSOP();
                    break;
                case 'click_openManualPrintModal':
                    openManualPrintModal();
                    break;
                case 'click_window_openMultiBatchModal_3d':
                    window.openMultiBatchModal('3d');
                    break;
                case 'click_teSwitchView_inbox':
                    if(typeof window.teSwitchView==='function') window.teSwitchView('inbox', el);
                    break;
                case 'click_teSwitchView_my_tasks':
                    if(typeof window.teSwitchView==='function') window.teSwitchView('my_tasks', el);
                    break;
                case 'click_teSwitchView_in_progress':
                    if(typeof window.teSwitchView==='function') window.teSwitchView('in_progress', el);
                    break;
                case 'click_teSwitchView_completed':
                    if(typeof window.teSwitchView==='function') window.teSwitchView('completed', el);
                    break;
                case 'click_teToggleGlobalCreateMenu':
                    if(typeof window.teToggleGlobalCreateMenu==='function') window.teToggleGlobalCreateMenu();
                    break;
                case 'click_teCmdPalette_GoToInbox':
                    {
                        const p = document.getElementById('neoCommandPalette');
                        if (p) p.classList.add('hidden');
                        if (typeof window.openTaskPlanner === 'function') window.openTaskPlanner();
                        if (typeof window.teSwitchView === 'function') window.teSwitchView('inbox', el);
                    }
                    break;
                case 'click_teCmdPalette_CreateTask':
                    {
                        const p2 = document.getElementById('neoCommandPalette');
                        if (p2) p2.classList.add('hidden');
                        if (typeof window.openTaskPlanner === 'function') window.openTaskPlanner();
                        if (typeof window.teToggleGlobalCreateMenu === 'function') {
                            const dropdown = document.getElementById('te-global-create-dropdown');
                            if (!dropdown || dropdown.style.display !== 'flex') {
                                window.teToggleGlobalCreateMenu();
                            }
                        }
                    }
                    break;
                case 'click_teActivateInlineTask':
                    if(typeof window.teActivateInlineTask==='function') window.teActivateInlineTask(el);
                    break;

                case 'click_teCreateCycle':
                    if(typeof window.teCreateCycle==='function') window.teCreateCycle();
                    break;
                case 'click_teCreateProject':
                    if(typeof window.teCreateProject==='function') window.teCreateProject();
                    break;
                case 'click_teCreateTeam':
                    if(typeof window.teCreateTeam==='function') window.teCreateTeam();
                    break;
                case 'click_teSelectProject':
                    if(typeof window.teSelectProject==='function') window.teSelectProject(el.getAttribute('data-project-id'));
                    break;
                case 'click_teOpenEditProject':
                    if(typeof window.click_teOpenEditProject==='function') window.click_teOpenEditProject(el);
                    break;
                case 'click_window_closeEditProject':
                    if(typeof window.click_window_closeEditProject==='function') window.click_window_closeEditProject();
                    break;
                case 'click_teSaveProjectEdit':
                    if(typeof window.click_teSaveProjectEdit==='function') window.click_teSaveProjectEdit(el);
                    break;

                case 'click_teDeleteCycle':
                    event.stopPropagation();
                    if(typeof window.teArchiveEntity==='function') window.teArchiveEntity('cycle', el.getAttribute('data-cycle-id'));
                    break;
                case 'click_teDeleteProject':
                    event.stopPropagation();
                    if(typeof window.teArchiveEntity==='function') window.teArchiveEntity('project', el.getAttribute('data-project-id'));
                    break;
                case 'click_teDeleteTeam':
                    event.stopPropagation();
                    if(typeof window.teArchiveEntity==='function') window.teArchiveEntity('team', el.getAttribute('data-team-id'));
                    break;
                case 'click_teSwitchView_archive':
                    if(typeof window.teSwitchView==='function') window.teSwitchView('archive', el);
                    break;
                case 'click_teArchiveTaskFromFlyout':
                    if(typeof window.teArchiveEntity==='function') window.teArchiveEntity('task', window.currentOpenTaskId);
                    break;
                case 'click_teRestoreEntity':
                    if(typeof window.teRestoreEntity==='function') window.teRestoreEntity(el.getAttribute('data-type'), el.getAttribute('data-id'));
                    break;
                case 'click_teHardDeleteEntity':
                    if(typeof window.teHardDeleteEntity==='function') window.teHardDeleteEntity(el.getAttribute('data-type'), el.getAttribute('data-id'));
                    break;
                case 'click_teBulkRestore':
                    if(typeof window.teBulkRestore==='function') window.teBulkRestore();
                    break;
                case 'click_teBulkStatusDropdown':
                    if(typeof window.teBulkStatusDropdown==='function') window.teBulkStatusDropdown(el);
                    break;
                case 'click_teBulkDelete':
                    if(typeof window.teBulkDelete==='function') window.teBulkDelete();
                    break;
                case 'click_teSortColumn':
                    if(typeof window.teSortColumn==='function') window.teSortColumn(el.getAttribute('data-col'));
                    break;
                case 'click_teToggleTeamMembers':
                    {
                        const teamId = el.getAttribute('data-team-id');
                        const memDiv = document.getElementById('te-team-members-' + teamId);
                        if (memDiv) {
                            memDiv.style.display = memDiv.style.display === 'none' ? 'flex' : 'none';
                        }
                    }
                    break;
                case 'click_teAddTeamMember':
                    event.stopPropagation();
                    if(typeof window.teAddTeamMember==='function') window.teAddTeamMember(el.getAttribute('data-team-id'));
                    break;
                case 'click_teRemoveTeamMember':
                    event.stopPropagation();
                    if(typeof window.teRemoveTeamMember==='function') window.teRemoveTeamMember(el.getAttribute('data-team-id'), el.getAttribute('data-member-name'));
                    break;
                case 'click_teEditSectionTitle':
                    if(typeof window.teEditSectionTitle==='function') window.teEditSectionTitle(el.getAttribute('data-cycle-id'), el);
                    break;
                case 'click_teToggleCycleGroup':
                    {
                        const cycleId = el.getAttribute('data-cycle-id');
                        const groupEl = document.getElementById('te-cycle-group-' + cycleId);
                        if (groupEl) {
                            let collapsedCache;
                            try {
                                collapsedCache = JSON.parse(localStorage.getItem('neogleamz_task_sections_collapsed') || '{}') || {};
                            } catch(_e) { collapsedCache = {}; }
                            
                            if (groupEl.style.display === 'none') {
                                groupEl.style.display = 'flex';
                                el.textContent = '▼';
                                collapsedCache[cycleId] = false;
                            } else {
                                groupEl.style.display = 'none';
                                el.textContent = '▶';
                                collapsedCache[cycleId] = true;
                            }
                            localStorage.setItem('neogleamz_task_sections_collapsed', JSON.stringify(collapsedCache));
                        }
                    }
                    break;
                case 'click_teToggleTaskDone':
                    event.stopPropagation();
                    if(typeof window.teToggleTaskDone==='function') window.teToggleTaskDone(el.closest('.task-row').getAttribute('data-task-id'));
                    break;
                case 'click_teToggleSubtaskVisibility':
                    {
                        const tId = el.getAttribute('data-task-id');
                        const wrapperEl = document.getElementById('te-subtasks-wrapper-' + tId);
                        if (wrapperEl) {
                            event.stopPropagation();
                            let isCollapsed = window['teSubtaskState_' + tId] === 'collapsed';
                            if (isCollapsed) {
                                wrapperEl.style.display = 'flex';
                                el.textContent = '▼';
                                window['teSubtaskState_' + tId] = 'expanded';
                            } else {
                                wrapperEl.style.display = 'none';
                                el.textContent = '▶';
                                window['teSubtaskState_' + tId] = 'collapsed';
                            }
                        }
                    }
                    break;
                case 'click_teToggleTaskDoneInFlyout':
                    if(typeof window.teToggleTaskDone==='function' && window.currentOpenTaskId) {
                        window.teToggleTaskDone(window.currentOpenTaskId);
                    }
                    break;
                case 'click_teAddSubtask':
                    if(typeof window.teAddSubtask==='function') window.teAddSubtask();
                    break;
                case 'click_teToggleSubtask':
                    if(typeof window.teToggleSubtask==='function') window.teToggleSubtask(el.getAttribute('data-subtask-id'));
                    break;
                case 'click_tePostComment':
                    if(typeof window.tePostComment==='function') window.tePostComment();
                    break;
                case 'click_window_openSOPMasterModal_bat':
                    window.openSOPMasterModal('batchez');
                    break;
                case 'click_window_openSOPMasterModal_3d':
                    window.openSOPMasterModal('3d');
                    break;
                case 'click_window_openArchiveExplorer_lay':
                    window.openArchiveExplorer('layerz');
                    break;
                case 'click_deletePrintJob':
                    deletePrintJob();
                    break;
                case 'click_advancePrintStatus_Queued':
                    advancePrintStatus('Queued');
                    break;
                case 'click_advancePrintStatus_Printing':
                    advancePrintStatus('Printing');
                    break;
                case 'click_advancePrintStatus_Cleaned':
                    advancePrintStatus('Cleaned');
                    break;
                case 'click_advancePrintStatus_Completed':
                    advancePrintStatus('Completed');
                    break;
                case 'click_window_openLayerzPrintSOP_currentPri':
                    if(window.openSopPrintModal && typeof currentPrintJob !== 'undefined' && currentPrintJob) {
                        let cleanName = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
                        window.openSopPrintModal('production', cleanName);
                    }
                    break;
                case 'click_showSalezPane_bridge':
                    showSalezPane('bridge');
                    break;
                case 'click_showSalezPane_analyticz':
                    showSalezPane('analyticz');
                    break;
                case 'click_showSalezPane_commandz':
                    showSalezPane('commandz');
                    break;
                case 'click_openActualNetModal':
                    if (typeof openActualNetModal === 'function') openActualNetModal();
                    break;
                case 'click_closeActualNetModal':
                    if (typeof closeActualNetModal === 'function') closeActualNetModal();
                    break;
                case 'click_runMathSimulator':
                    if (typeof initMathSimulator === 'function') initMathSimulator();
                    break;
                case 'click_runGlobalReconciliationAudit':
                    if (typeof window.runGlobalReconciliationAudit === 'function') window.runGlobalReconciliationAudit();
                    break;
                case 'click_closeMathSimulator':
                    if (typeof closeMathSimulator === 'function') closeMathSimulator();
                    break;
                case 'click_commitSimToLedger':
                    if (typeof window.click_commitSimToLedger === 'function') window.click_commitSimToLedger();
                    break;
                case 'click_actualNetSort_o':
                    if (typeof actualNetSort === 'function') actualNetSort('o');
                    break;
                case 'click_actualNetSort_d':
                    if (typeof actualNetSort === 'function') actualNetSort('d');
                    break;
                case 'click_actualNetSort_g':
                    if (typeof actualNetSort === 'function') actualNetSort('g');
                    break;
                case 'click_actualNetSort_c':
                    if (typeof actualNetSort === 'function') actualNetSort('c');
                    break;
                case 'click_actualNetSort_s':
                    if (typeof actualNetSort === 'function') actualNetSort('s');
                    break;
                case 'click_actualNetSort_t':
                    if (typeof actualNetSort === 'function') actualNetSort('t');
                    break;
                case 'click_actualNetSort_f':
                    if (typeof actualNetSort === 'function') actualNetSort('f');
                    break;
                case 'click_actualNetSort_n':
                    if (typeof actualNetSort === 'function') actualNetSort('n');
                    break;
                case 'click_openLtvModal':
                    openLtvModal();
                    break;
                case 'click_showFulfillzPane_packerz':
                    showFulfillzPane('packerz');
                    break;
                case 'click_showFulfillzPane_barcodz':
                    showFulfillzPane('barcodz');
                    break;
                case 'click_showFulfillzPane_labelz':
                    showFulfillzPane('labelz');
                    break;
                case 'click_document_getElementById_paneFu':
                    document.getElementById('paneFulfillzSopAdmin').style.display='flex';;
                    break;
                case 'click_openSOPAuditLog':
                    openSOPAuditLog();
                    break;
                case 'click_document_getElementById_paperP':
                    document.getElementById('paperProfileModal').style.display='flex';
                    break;
                case 'click_executeBatchPrint':
                    executeBatchPrint();
                    break;
                case 'click_openCreateLabelModal':
                    openCreateLabelModal();
                    break;
                case 'click_toggleLabelzEmojiPicker':
                    toggleLabelzEmojiPicker();
                    break;
                case 'click_lblzUndo':
                    lblzUndo();
                    break;
                case 'click_lblzRedo':
                    lblzRedo();
                    break;
                case 'click_saveLabelzDesign':
                    saveLabelzDesign();
                    break;
                case 'click_deleteLabelzDesign':
                    deleteLabelzDesign();
                    break;
                case 'click_closeLabelzDesigner':
                    closeLabelzDesigner();
                    break;
                case 'click_addLabelzText':
                    addLabelzText();
                    break;
                case 'click_addLabelzDynamicText':
                    addLabelzDynamicText();
                    break;
                case 'click_addLabelzBarcode':
                    addLabelzBarcode();
                    break;
                case 'click_addLabelzQR':
                    addLabelzQR();
                    break;
                case 'click_addLabelzImage':
                    addLabelzImage();
                    break;
                case 'click_toggleLabelzDrawingMode_this':
                    toggleLabelzDrawingMode(el);
                    break;
                case 'click_addLabelzRect':
                    addLabelzRect();
                    break;
                case 'click_addLabelzCircle':
                    addLabelzCircle();
                    break;
                case 'click_clearLabelCanvasBg':
                    clearLabelCanvasBg();
                    break;
                case 'click_zoomLabelzCanvas_0_1':
                    zoomLabelzCanvas(-0.1);
                    break;
                case 'click_zoomLabelzCanvas_0_1_1':
                    zoomLabelzCanvas(0.1);
                    break;
                case 'click_zoomLabelzCanvas_fit':
                    zoomLabelzCanvas('fit');
                    break;
                case 'click_exportLabelzPDF':
                    exportLabelzPDF();
                    break;
                case 'click_showNexlPane_importz':
                    if (typeof window.showNexlPane === 'function') window.showNexlPane('importz');
                    break;
                case 'click_showNexlPane_salez':
                    if (typeof window.showNexlPane === 'function') window.showNexlPane('salez');
                    break;
                case 'click_showNexlPane_brainz':
                    if (typeof window.showNexlPane === 'function') window.showNexlPane('brainz');
                    break;
                case 'click_document_getElementById_orderF':
                    document.getElementById('orderFiles').click();
                    break;
                case 'click_document_getElementById_orderF_2':
                    document.getElementById('orderFilesTest').click();
                    break;
                case 'click_openParserConfig':
                    openParserConfig();
                    break;
                case 'click_document_getElementById_parcel':
                    document.getElementById('parcelFiles').click();
                    break;
                case 'click_document_getElementById_parcel_3':
                    document.getElementById('parcelFilesTest').click();
                    break;
                case 'click_openParcelConfig':
                    openParcelConfig();
                    break;
                case 'click_document_getElementById_salesC':
                    document.getElementById('salesCsvFile').click();
                    break;
                case 'click_document_getElementById_salesC_5':
                    document.getElementById('salesCsvFileTest').click();
                    break;
                case 'click_document_getElementById_ceoBillingCsvUpload':
                    document.getElementById('ceoBillingCsvUpload').click();
                    break;
                case 'click_document_getElementById_ceoBillingCsvUploadTest':
                    document.getElementById('ceoBillingCsvUploadTest').click();
                    break;
                case 'click_backfillFinancials_sales':
                    backfillFinancials('sales');
                    break;
                case 'click_backfillFinancials_billing':
                    backfillFinancials('billing');
                    break;
                case 'click_alert_BACKFILL_FINANCIALS_n_nT':
                    alert('BACKFILL FINANCIALS:\\n\\nThis mathematical tool sequentially loops through all historical orders and dynamically recalculates your exact Net Profit and Transaction Fees based on your currently active Engine specifications.\\n\\nIt strictly performs read operations on your original imported CSV physical parameters to execute, explicitly refusing to overwrite your established Shopify source data strings.');
                    break;
                case 'click_alert_BILLING_BACKFILL_GUIDE_n_nT':
                    alert('BILLING BACKFILL GUIDE:\\n\\nThis mathematical tool sequentially loops through all historical orders and dynamically recalculates your exact Net Profit and Transaction Fees based on your currently active Engine specifications and true actual_shipping_cost label values.\\n\\nUse this immediately after importing historical labels via the Shopify Billing CSV to mathematically purge legacy flat-rate shipping assumptions and align all historical data to reality.');
                    break;
                case 'click_openAliasModal':
                    openAliasModal('');
                    break;
                case 'click_executeExport':
                    executeExport();
                    break;
                case 'click_executeRestore':
                    executeRestore();
                    break;
                case 'click_syncAndCalculate':
                    syncAndCalculate();
                    break;
                case 'click_alert_FORCE_RECALCULATION_n_nT':
                    alert('FORCE RECALCULATION:\\n\\nThis mathematical tool sequentially pulls down your entire live database (Operations Ledger, Materials Ledger, etc.), processes every record through the local Master Engine, and verifies alignment.\\n\\nIt serves to instantly correct drift or refresh local caching, and will not execute dangerous overwrites without your explicit permission.');
                    break;
                case 'click_openAnalyticsDashboard':
                    openAnalyticsDashboard();
                    break;
                case 'click_document_getElementById_csv_in':
                    document.getElementById('csv-input').click();
                    break;
                case 'click_exportCSV':
                    exportCSV();
                    break;
                case 'click_openModal':
                    openModal();
                    break;
                case 'click_toggleViewMode_false':
                    toggleViewMode(false);
                    break;
                case 'click_toggleViewMode_true':
                    toggleViewMode(true);
                    break;
                case 'click_toggleSortDirection':
                    toggleSortDirection();
                    break;
                case 'click_toggleMultiSelect_style':
                    toggleMultiSelect('style');
                    break;
                case 'click_closeLtvModal':
                    closeLtvModal();
                    break;
                case 'click_closeAnalyticsDashboard':
                    closeAnalyticsDashboard();
                    break;
                case 'click_closeModal':
                    closeModal();
                    break;
                case 'click_deleteSkaterFromModal':
                    deleteSkaterFromModal();
                    break;
                case 'click_toggleFavorite':
                    if (typeof toggleFavorite === 'function') toggleFavorite(parseInt(el.getAttribute('data-index'), 10), event);
                    break;
                case 'click_editSkater':
                    if (typeof editSkater === 'function') editSkater(parseInt(el.getAttribute('data-index'), 10));
                    break;
                case 'click_socialzSort':
                    if (typeof handleSortChange === 'function') handleSortChange(el.getAttribute('data-sort'));
                    break;
                case 'click_document_getElementById_recipe':
                    document.getElementById('recipeActionModal').style.display='none';
                    break;
                case 'click_submitRecipeModal':
                    submitRecipeModal();
                    break;
                case 'click_document_getElementById_bulkAd':
                    document.getElementById('bulkAddModal').style.display='none';
                    break;
                case 'click_saveBulkAdd':
                    saveBulkAdd();
                    break;
                case 'click_document_getElementById_newWOM':
                    document.getElementById('newWOModal').style.display='none';
                    break;
                case 'click_window_validateAndCreateWO':
                    window.validateAndCreateWO();
                    break;
                case 'click_stageBatchItem':
                    stageBatchItem();
                    break;
                case 'click_document_getElementById_multiB':
                    document.getElementById('multiBatchOrderModal').style.display='none';
                    break;
                case 'click_generateMultiBatchOrderReport':
                    generateMultiBatchOrderReport();
                    break;
                case 'click_printBatchOrderReport':
                    printBatchOrderReport();
                    break;
                case 'click_document_getElementById_batchO':
                    document.getElementById('batchOrderReportModal').style.display='none';
                    break;
                case 'click_saveMasterSOP':
                    saveMasterSOP();
                    break;
                case 'click_document_getElementById_sopMas':
                    document.getElementById('sopMasterModal').style.display='none';
                    if (window.currentActiveSopOrderId && window.currentActiveSopRecipe && window.currentActiveSopSku) {
                        if (typeof window.loadActiveSOP === 'function') {
                            window.loadActiveSOP(window.currentActiveSopOrderId, window.currentActiveSopSku, window.currentActiveSopRecipe, window.currentActiveSopType);
                        }
                    }
                    break;
                case 'click_openMediaManager_telemetry':
                    openMediaManager('telemetry');
                    break;
                case 'click_openSOPTokenGuide':
                    openSOPTokenGuide();
                    break;
                case 'click_toggleDashboardPreview':
                    if (typeof window.toggleHorizontalPreview === 'function') {
                        window.toggleHorizontalPreview('productionSopLeftPane', 'masterSopPreviewCol', el);
                    }
                    break;
                case 'click_printActiveSOP':
                    if (typeof window.openSopPrintModal === 'function') {
                        let activeCtx = window.currentActiveSopType === 'packerz' ? 'packerz' : 'production';
                        window.openSopPrintModal(activeCtx, window.currentActiveSopRecipe);
                    }
                    break;
                case 'click_openActiveSOPEditor':
                    {
                        const savedType = window.currentActiveSopType;
                        const savedRecipe = window.currentActiveSopRecipe;
                        const savedOrderId = window.currentActiveSopOrderId;
                        const savedSku = window.currentActiveSopSku;
                        
                        // Hide modal directly so we don't wipe active state variables
                        const modal = document.getElementById('sopViewerModal');
                        if (modal) modal.style.display = 'none';
                        
                        // Set the live editing states
                        window.isActiveSopLiveEditing = true;
                        window.isPackerzLiveEditing = true;
                        
                        // Ensure context remains preserved
                        window.currentActiveSopOrderId = savedOrderId;
                        window.currentActiveSopSku = savedSku;
                        window.currentActiveSopRecipe = savedRecipe;
                        window.currentActiveSopType = savedType;
                        
                        if (typeof window.openSOPMasterModal === 'function') {
                            window.openSOPMasterModal(savedType, savedRecipe);
                        }
                    }
                    break;
                case 'click_openLayerzSOPEditor':
                    if (typeof window.openSOPMasterModal === 'function') {
                        window.openSOPMasterModal('3d', el.getAttribute('data-name'));
                    }
                    break;
                case 'click_addDashboardSOPRow':
                    if (typeof window.addSOPRow === 'function') {
                        window.addSOPRow(el);
                    }
                    break;
                case 'click_addSOPRow_this':
                    if (typeof window.addSOPRow === 'function') {
                        window.addSOPRow(el);
                    }
                    break;
                case 'click_window_closeArchiveExplorer':
                    window.closeArchiveExplorer();
                    break;
                case 'click_window_switchArchiveTab_batche':
                    window.switchArchiveTab('batchez');
                    break;
                case 'click_window_switchArchiveTab_layerz':
                    window.switchArchiveTab('layerz');
                    break;
                case 'click_window_deleteAllArchive':
                    window.deleteAllArchive();
                    break;
                case 'click_window_closeVelocityzModal':
                    window.closeVelocityzModal();
                    break;
                case 'click_window_resetVelocityzForecast':
                    window.resetVelocityzForecast();
                    break;
                case 'click_closeMediaModal':
                    closeMediaModal();
                    break;
                case 'click_document_getElementById_aliasM':
                    document.getElementById('aliasModal').style.display='none';
                    break;
                case 'click_saveAliasMapping':
                    saveAliasMapping();
                    break;
                case 'click_document_getElementById_ceoAdd':
                    document.getElementById('ceoAddModal').style.display='none';
                    break;
                case 'click_addCeoSessionTestItem':
                    addCeoSessionTestItem();
                    break;
                case 'click_addCeoUnifiedSelection':
                    addCeoUnifiedSelection();
                    break;
                case 'click_savePackerzSOPToDB':
                    savePackerzSOPToDB();
                    break;
                case 'click_document_getElementById_paneFu_11':
                    document.getElementById('paneFulfillzSopAdmin').style.display='none';
                    break;
                case 'click_if_typeof_toggleHorizontalPrev_12':
                    if(typeof toggleHorizontalPreview==='function') toggleHorizontalPreview('packerzSopLeftPane', 'packerzSopPreviewCol', this);;
                    break;
                case 'click_addPackerzSOPRow_this':
                    if (typeof window.addPackerzSOPRow === 'function') {
                        window.addPackerzSOPRow(el);
                    }
                    break;
                case 'click_if_event_target_this_closeSOPM':
                    if(event.target===this)closeSOPMediaPicker();
                    break;
                case 'click_createSOPMediaFolder':
                    createSOPMediaFolder();
                    break;
                case 'click_closeSOPMediaPicker':
                    if (typeof closeSOPMediaPicker === 'function') closeSOPMediaPicker();
                    break;
                case 'click_openSOPSnapshotCamera':
                    if (typeof window.click_openSOPSnapshotCamera === 'function') window.click_openSOPSnapshotCamera();
                    break;
                case 'click_closeSOPSnapshotCamera':
                    if (typeof window.click_closeSOPSnapshotCamera === 'function') window.click_closeSOPSnapshotCamera();
                    break;
                case 'click_startSOPWebcamMode':
                    if (typeof window.startSOPWebcamMode === 'function') window.startSOPWebcamMode();
                    break;
                case 'click_startSOPRemoteMobileMode':
                    if (typeof window.startSOPRemoteMobileMode === 'function') window.startSOPRemoteMobileMode();
                    break;
                case 'click_backToSOPCameraSelection':
                    if (typeof window.click_backToSOPCameraSelection === 'function') window.click_backToSOPCameraSelection();
                    break;
                case 'click_discardRemoteMobileStagedPhotos':
                    if (typeof window.click_discardRemoteMobileStagedPhotos === 'function') window.click_discardRemoteMobileStagedPhotos();
                    break;
                case 'click_saveRemoteMobileStagedPhotos':
                    if (typeof window.click_saveRemoteMobileStagedPhotos === 'function') window.click_saveRemoteMobileStagedPhotos();
                    break;
                case 'click_handleMobileRemoteOverlayTap':
                    if (typeof window.click_handleMobileRemoteOverlayTap === 'function') window.click_handleMobileRemoteOverlayTap();
                    break;
                case 'click_updateLocalIPQRCode':
                    if (typeof window.click_updateLocalIPQRCode === 'function') window.click_updateLocalIPQRCode();
                    break;
                case 'click_captureSOPSnapshot':
                    if (typeof window.click_captureSOPSnapshot === 'function') window.click_captureSOPSnapshot();
                    break;
                case 'click_workerTakePhoto':
                    if (typeof window.click_workerTakePhoto === 'function') window.click_workerTakePhoto(event);
                    break;
                case 'click_openSOPSnapshotCamera_production':
                    if (typeof window.click_openSOPSnapshotCamera_production === 'function') window.click_openSOPSnapshotCamera_production(event);
                    break;
                case 'click_openSOPSnapshotCamera_packerz':
                    if (typeof window.click_openSOPSnapshotCamera_packerz === 'function') window.click_openSOPSnapshotCamera_packerz(event);
                    break;
                case 'click_openSOPSnapshotCamera_smart':
                    if (typeof window.click_openSOPSnapshotCamera_smart === 'function') window.click_openSOPSnapshotCamera_smart(el);
                    break;
                case 'click_moveSOPUp':
                    if (typeof window.moveSOPUp === 'function') window.moveSOPUp(el);
                    break;
                case 'click_moveSOPDown':
                    if (typeof window.moveSOPDown === 'function') window.moveSOPDown(el);
                    break;
                case 'click_addSOPRow':
                    if (typeof window.addSOPRow === 'function') window.addSOPRow(el);
                    break;
                case 'click_removeSOPRow':
                    if (typeof window.removeSOPRow === 'function') window.removeSOPRow(el);
                    break;
                case 'click_removeAttachmentRow': {
                    let row = event.target.closest('.media-row');
                    if (row) row.remove();
                    break;
                }
                case 'click_openSOPSnapshotCamera_inlineProduction':
                    if (typeof window.click_openSOPSnapshotCamera_inlineProduction === 'function') window.click_openSOPSnapshotCamera_inlineProduction(event.target.closest('[data-click="click_openSOPSnapshotCamera_inlineProduction"]'));
                    break;
                case 'click_if_event_target_this_closeSOPA':
                    if(event.target===this)closeSOPAuditLog();
                    break;
                case 'click_closeSOPAuditLog':
                    closeSOPAuditLog();
                    break;
                case 'click_closeManualPrintModal':
                    closeManualPrintModal();
                    break;
                case 'click_submitManualPrint':
                    submitManualPrint();
                    break;
                case 'click_submitTipzSuggestion':
                    submitTipzSuggestion();
                    break;
                case 'click_closeTipzModal':
                    closeTipzModal();
                    break;
                case 'click_setNewTipPriority_High':
                    setNewTipPriority('High');
                    break;
                case 'click_setNewTipPriority_Medium':
                    setNewTipPriority('Medium');
                    break;
                case 'click_setNewTipPriority_Low':
                    setNewTipPriority('Low');
                    break;
                case 'click_fetchAndRenderTipz':
                    fetchAndRenderTipz();
                    break;
                case 'click_if_event_target_this_this_styl':
                    if(event.target===this) el.style.display='none';
                    break;
                case 'click_document_getElementById_packer':
                    document.getElementById('packerzArchiveModal').style.display='none';
                    break;
                case 'click_printPackerzSOP_legacy':
                    printPackerzSOP();
                    break;

                case 'click_closePackerzSopViewer':
                    closePackerzSopViewer();
                    break;
                case 'click_signoffPackerzQA':
                    signoffPackerzQA();
                    break;
                case 'click_closeCameraScanner':
                    closeCameraScanner();
                    break;
                case 'click_if_event_target_this_closeSOPT':
                    if(event.target===this)closeSOPTokenGuide();
                    break;
                case 'click_closeSOPTokenGuide':
                    closeSOPTokenGuide();
                    break;
                case 'click_if_window_cancelSandboxImport':
                    if(window.cancelSandboxImport) window.cancelSandboxImport(); else { document.getElementById('sandboxDataModal').style.display='none'; };
                    break;
                case 'click_if_window_commitSandboxImport':
                    if(window.commitSandboxImport) window.commitSandboxImport();;
                    break;
                case 'click_if_window_cancelSandboxImport_13':
                    if(window.cancelSandboxImport) window.cancelSandboxImport(); else document.getElementById('sandboxDataModal').style.display='none';;
                    break;
                case 'click_document_getElementById_finali':
                    document.getElementById('finalizeWoModal').style.display='none';;
                    break;

                case 'click_document_getElementById_finali_14':
                    document.getElementById('finalizePrintModal').style.display='none';
                    break;
                case 'click_submitFinalizePrint':
                    submitFinalizePrint();
                    break;
                case 'click_document_getElementById_paperP_15':
                    document.getElementById('paperProfileModal').style.display='none';
                    break;
                case 'click_addPaperProfile':
                    addPaperProfile();
                    break;
                case 'click_window_closeCycleCountManager':
                    window.closeCycleCountManager();
                    break;
                case 'click_window_startCycleCount':
                    window.startCycleCount();
                    break;
                case 'click_startLocalCycleCount':
                    if (typeof window.startLocalCycleCount === 'function') window.startLocalCycleCount();
                    break;
                case 'click_startRemoteCycleCount':
                    if (typeof window.startRemoteCycleCount === 'function') window.startRemoteCycleCount();
                    break;
                case 'click_setCCRoutePhone':
                    if (typeof window.click_setCCRoutePhone === 'function') window.click_setCCRoutePhone();
                    break;
                case 'click_setCCRoutePC':
                    if (typeof window.click_setCCRoutePC === 'function') window.click_setCCRoutePC();
                    break;
                case 'click_setCCRouteBoth':
                    if (typeof window.click_setCCRouteBoth === 'function') window.click_setCCRouteBoth();
                    break;
                case 'click_window_filterCcMngrItems':
                    window.filterCcMngrItems();
                    break;
                case 'click_window_saveManualCycleCount':
                    window.saveManualCycleCount();
                    break;
                case 'click_stopCycleCount':
                    stopCycleCount();
                    break;
                case 'click_openStockzAuditModal':
                    if (typeof window.openStockzAuditModal === 'function') {
                        const key = el.getAttribute('data-key');
                        const tab = el.getAttribute('data-tab') || 'audit';
                        window.openStockzAuditModal(key, tab);
                    }
                    break;
                case 'click_closeStockzAuditModal':
                    if (typeof window.closeStockzAuditModal === 'function') window.closeStockzAuditModal();
                    break;
                case 'click_switchStockzAuditTab':
                    if (typeof window.switchStockzAuditTab === 'function') window.switchStockzAuditTab(el);
                    break;
                case 'click_refreshStockzAuditHistory':
                    if (typeof window.refreshStockzAuditHistory === 'function') window.refreshStockzAuditHistory();
                    break;
                case 'click_clearStockzAuditHistory':
                    if (typeof window.clearStockzAuditHistory === 'function') window.clearStockzAuditHistory();
                    break;
                case 'click_submitStockzAudit':
                    if (typeof window.submitStockzAudit === 'function') window.submitStockzAudit();
                    break;
                case 'click_switchStockzAuditMode':
                    if (typeof window.switchStockzAuditMode === 'function') window.switchStockzAuditMode(el);
                    break;
                case 'click_switchStockzAuditCameraRoute':
                    if (typeof window.switchStockzAuditCameraRoute === 'function') window.switchStockzAuditCameraRoute(el);
                    break;
                case 'click_startStockzAuditWebcam':
                    if (typeof window.startStockzAuditWebcam === 'function') window.startStockzAuditWebcam();
                    break;
                case 'click_stopStockzAuditWebcam':
                    if (typeof window.stopStockzAuditWebcam === 'function') window.stopStockzAuditWebcam();
                    break;
                case 'click_decrementStockzAuditDelta':
                    if (typeof window.decrementStockzAuditDelta === 'function') window.decrementStockzAuditDelta();
                    break;
                case 'click_incrementStockzAuditDelta':
                    if (typeof window.incrementStockzAuditDelta === 'function') window.incrementStockzAuditDelta();
                    break;
                case 'click_decrementStockzAuditCount':
                    if (typeof window.decrementStockzAuditCount === 'function') window.decrementStockzAuditCount();
                    break;
                case 'click_incrementStockzAuditCount':
                    if (typeof window.incrementStockzAuditCount === 'function') window.incrementStockzAuditCount();
                    break;

                case 'click_document_getElementById_importBackupFile':
                    document.getElementById('importBackupFile').click();
                    break;
                case 'click_document_getElementById_importBackupFileTest':
                    document.getElementById('importBackupFileTest').click();
                    break;
                case 'click_sandboxToggleSheet':
                    if (typeof window.sandboxToggleSheet === 'function') {
                        window.sandboxToggleSheet(el.getAttribute('data-sheet-name'));
                    }
                    break;
                case 'click_sortSandboxDict':
                    if (typeof window.sortSandboxDict === 'function') {
                        window.sortSandboxDict(el.getAttribute('data-sort-col'), el.getAttribute('data-sheet-name'));
                    }
                    break;
                case 'click_sortSandboxModal':
                    if (typeof window.sortSandboxModal === 'function') {
                        window.sortSandboxModal(el.getAttribute('data-sort-col'), parseInt(el.getAttribute('data-table-num'), 10));
                    }
                    break;
                case 'click_openScraperFoundry':
                    if (typeof openScraperFoundry === 'function') openScraperFoundry();
                    break;
                case 'togglePipelinePause':
                    if (typeof window.togglePipelinePause === 'function') window.togglePipelinePause();
                    break;
                case 'toggleArchiveDetail':
                    if (typeof window.toggleArchiveDetail === 'function') window.toggleArchiveDetail(el.getAttribute('data-arc-id'));
                    break;
                case 'hardDeleteArchive':
                    if (typeof window.hardDeleteArchive === 'function') {
                        event.stopPropagation();
                        window.hardDeleteArchive(el.getAttribute('data-arc-type'), el.getAttribute('data-arc-id'));
                    }
                    break;
                case 'click_openPdf':
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(el.getAttribute('data-url'), '_blank');
                    break;
                case 'click_openVideo':
                    event.preventDefault();
                    event.stopPropagation();
                    if(window.openMediaModal) window.openMediaModal(el.getAttribute('data-url'), 'vid');
                    break;
                case 'click_openImage':
                    event.preventDefault();
                    event.stopPropagation();
                    if(window.openMediaModal) window.openMediaModal(el.getAttribute('data-url'), 'img');
                    break;

                case 'click_removeBatchItem':
                    if(window.removeBatchItem) window.removeBatchItem(el.getAttribute('data-index'));
                    break;
                case 'click_toggleRouteChildren':
                    {
                        let safeK = el.getAttribute('data-route'); 
                        let rc = document.getElementById('route_children_'+safeK); 
                        let ic = document.getElementById('route_icon_'+safeK); 
                        if(rc && ic){
                            if(rc.style.display==='none'){
                                rc.style.display='flex';
                                ic.style.transform='rotate(0deg)';
                            }else{
                                rc.style.display='none';
                                ic.style.transform='rotate(-90deg)';
                            }
                        }
                    }
                    break;
                case 'click_sortReportTable':
                    if(window.sortReportTable) window.sortReportTable(el, el.getAttribute('data-col'), el.getAttribute('data-desc') === 'true');
                    break;
                case 'click_selectWO':
                    if(window.selectWO) window.selectWO(el.getAttribute('data-id'));
                    break;
                case 'click_editWOQty':
                    if(window.editWOQty) window.editWOQty(el.getAttribute('data-id'));
                    break;
                case 'click_openMediaManager':
                    if(window.openMediaManager) window.openMediaManager(el.getAttribute('data-type'));
                    break;
                case 'click_selectPrintJob':
                    if(window.selectPrintJob) window.selectPrintJob(el.getAttribute('data-id'));
                    break;
                case 'click_startLayerzRun':
                    if(window.startLayerzRun) window.startLayerzRun();
                    break;
                case 'click_toggleLayerzRunPause':
                    if(window.toggleLayerzRunPause) window.toggleLayerzRunPause();
                    break;
                case 'click_togglePrintTimerPause':
                    if(window.togglePrintTimerPause) window.togglePrintTimerPause();
                    break;
                case 'click_openLayerzRunCompleteModal':
                    if(window.openLayerzRunCompleteModal) window.openLayerzRunCompleteModal();
                    break;
                case 'click_closeLayerzRunCompleteModal':
                    if(window.closeLayerzRunCompleteModal) window.closeLayerzRunCompleteModal();
                    break;
                case 'click_submitLayerzRun':
                    if(window.submitLayerzRun) window.submitLayerzRun();
                    break;
                case 'click_stopPropagation':
                    event.stopPropagation();
                    break;
                case 'click_toggleLayerzSopGroup':
                    {
                        let grpId = el.getAttribute('data-grp');
                        let d = document.getElementById('sopgrp_body_'+grpId);
                        let ic = document.getElementById('sopgrp_icon_'+grpId);
                        if(d && ic) {
                            if(d.style.display==='none'){
                                d.style.display='block';
                                ic.innerText='▼';
                                localStorage.setItem('layerzSopExpanded_'+grpId,'true');
                            } else {
                                d.style.display='none';
                                ic.innerText='▶';
                                localStorage.setItem('layerzSopExpanded_'+grpId,'false');
                            }
                        }
                    }
                    break;
                case 'click_openLayerzPrintSOP':
                    if(window.openSopPrintModal) window.openSopPrintModal('production', el.getAttribute('data-name'));
                    break;
                case 'click_openPrintSOP':
                    if(window.openPrintSOP) window.openPrintSOP(el.getAttribute('data-name'));
                    break;

                case 'click_movePackerzSOPUp':
                    if(window.movePackerzSOPUp) window.movePackerzSOPUp(el);
                    break;
                case 'click_movePackerzSOPDown':
                    if(window.movePackerzSOPDown) window.movePackerzSOPDown(el);
                    break;
                case 'click_addPackerzSOPRow':
                    if(window.addPackerzSOPRow) window.addPackerzSOPRow(el);
                    break;
                case 'click_removePackerzSOPRow':
                    if(window.removePackerzSOPRow) window.removePackerzSOPRow(el);
                    break;
                case 'click_closePackerzAuditOverlay':
                    {
                        let ol = document.getElementById('packerzAuditOverlay');
                        if (ol) ol.remove();
                    }
                    break;
                case 'click_navigateSOPMediaFolder':
                    if(window.navigateSOPMediaFolder) window.navigateSOPMediaFolder(el.getAttribute('data-path'));
                    break;
                case 'click_deleteSOPMedia':
                    if(window.deleteSOPMedia) window.deleteSOPMedia(el.getAttribute('data-path'), el.getAttribute('data-folder') === 'true');
                    break;
                case 'click_insertSOPToken':
                    if(window.insertSOPToken) window.insertSOPToken(el.getAttribute('data-token'));
                    break;
                case 'click_toggleOriginalBlueprint':
                    {
                        let nextEl = el.nextElementSibling;
                        if(nextEl) {
                            if(nextEl.style.display==='none'){
                                nextEl.style.display='block';
                                el.innerText='Hide Original Blueprint';
                            } else {
                                nextEl.style.display='none';
                                el.innerText='View Original Blueprint';
                            }
                        }
                    }
                    break;
                case 'click_toggleSOPAuditDetail':
                    if(window.toggleSOPAuditDetail) window.toggleSOPAuditDetail(el.getAttribute('data-target'));
                    break;
                case 'click_unarchivePackerzOrder':
                    event.stopPropagation();
                    if(window.unarchivePackerzOrder) window.unarchivePackerzOrder(el.getAttribute('data-id'));
                    break;

                case 'click_addLabelzToSpool':
                    if(window.addLabelzToSpool) window.addLabelzToSpool(el.getAttribute('data-name'), el.getAttribute('data-emoji'));
                    break;
                case 'click_openEditLabelModal':
                    if(window.openEditLabelModal) window.openEditLabelModal(el.getAttribute('data-name'));
                    break;
                case 'click_labelzBringForward':
                    if(window.fCanvas && window.saveLabelzHistory) {
                        window.fCanvas.bringForward(window.fCanvas.getActiveObject());
                        window.saveLabelzHistory();
                        window.fCanvas.renderAll();
                    }
                    break;
                case 'click_labelzSendBackward':
                    if(window.fCanvas && window.saveLabelzHistory) {
                        window.fCanvas.sendBackwards(window.fCanvas.getActiveObject());
                        window.saveLabelzHistory();
                        window.fCanvas.renderAll();
                    }
                    break;
                case 'click_lblzDuplicateSelected':
                    if(window.lblzDuplicateSelected) window.lblzDuplicateSelected();
                    break;
                case 'click_lblzUpdObj':
                    if(window.updObj) window.updObj(el.getAttribute('data-key'), el.getAttribute('data-val'));
                    break;
                case 'click_lblzToggleLock':
                    if(window.updObj && window.fCanvas && window.onCanvasSelection) {
                        const isLockedStr = el.getAttribute('data-locked');
                        const isLocked = isLockedStr === 'true';
                        window.updObj('lockMovementX', !isLocked);
                        window.updObj('lockMovementY', !isLocked);
                        window.updObj('lockScalingX', !isLocked);
                        window.updObj('lockScalingY', !isLocked);
                        window.onCanvasSelection({target: window.fCanvas.getActiveObject()});
                    }
                    break;
                case 'click_lblzDeleteSelected':
                    if(window.lblzDeleteSelected) window.lblzDeleteSelected();
                    break;
                case 'click_applyCatalogData':
                    if(window.applyCatalogData) window.applyCatalogData(el.getAttribute('data-name'), el.getAttribute('data-val'), Number(el.getAttribute('data-cogs')));
                    break;

                case 'click_toggleCeoBtn':
                    if(window.toggleCeoBtn) window.toggleCeoBtn(Number(el.getAttribute('data-index')), el.getAttribute('data-field'));
                    break;
                case 'click_addBarcodzToSpool':
                    if(window.addBarcodzToSpool) window.addBarcodzToSpool(el.getAttribute('data-name'), el.getAttribute('data-slug'), el.getAttribute('data-icon'), el.getAttribute('data-type'));
                    break;
                case 'click_updateSpoolItem':
                    if(window.updateSpoolItem) window.updateSpoolItem(el.getAttribute('data-slug'), Number(el.getAttribute('data-amt')));
                    break;
                case 'click_sortAnalytics':
                    if(window.sortAnalytics) window.sortAnalytics(el.getAttribute('data-col'));
                    break;

                case 'click_openCeoAddModal':
                    if(window.openCeoAddModal) window.openCeoAddModal();
                    break;

                case 'click_removeAliasMapping':
                    if(window.removeAliasMapping) window.removeAliasMapping(el.getAttribute('data-sku'));
                    break;
                case 'click_toggleSimpleCol':
                    if(window.toggleSimpleCol) window.toggleSimpleCol(el.getAttribute('data-key'));
                    break;
                case 'click_sortData':
                    if(window.sortData) window.sortData(el.getAttribute('data-key'));
                    break;
                case 'click_stopProp':
                    event.stopPropagation();
                    break;
                case 'click_setTipzPriority':
                    if(window.setTipzPriority) window.setTipzPriority(Number(el.getAttribute('data-id')), el.getAttribute('data-label'));
                    break;
                case 'click_toggleTipzStatus':
                    if(window.toggleTipzStatus) window.toggleTipzStatus(Number(el.getAttribute('data-id')), el.getAttribute('data-st'));
                    break;
                case 'click_deleteTipz':
                    if(window.deleteTipz) window.deleteTipz(Number(el.getAttribute('data-id')));
                    break;

                case 'click_toggleHorizontalPreview':
                    if(window.toggleHorizontalPreview) window.toggleHorizontalPreview(el.getAttribute('data-left'), el.getAttribute('data-preview'), el);
                    break;
                case 'click_deleteAllArchive':
                    if(window.deleteAllArchive) window.deleteAllArchive();
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('keyup', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-keyup]');
        if (!el) return;
        const action = el.getAttribute('data-keyup');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'keyup_window_updateColumnFilter':
                    if (typeof window.keyup_window_updateColumnFilter === 'function') window.keyup_window_updateColumnFilter(el);
                    break;
                case 'keyup_window_updateInvColumnFilter':
                    if (typeof window.keyup_window_updateInvColumnFilter === 'function') window.keyup_window_updateInvColumnFilter(el);
                    break;
                case 'keyup_window_renderEditzBulkTable':
                    window.keyup_window_renderEditzBulkTable();
                    break;
                case 'keyup_window_renderActiveTable':
                    window.renderActiveTable();
                    break;
                case 'keyup_window_renderInventoryTable':
                    if (typeof window.renderInventoryTable === 'function') window.renderInventoryTable();
                    break;
                case 'keyup_renderAliasManager':
                    renderAliasManager();
                    break;
                case 'keyup_filterBulkList':
                    filterBulkList();
                    break;
                case 'keyup_filterUnifiedBuilderList':
                    filterUnifiedBuilderList();
                    break;
                case 'keyup_window_filterCcMngrItems':
                    window.filterCcMngrItems();
                    break;
                case 'keyup_window_filterStockzAuditItems':
                    if (window.filterStockzAuditItems) window.filterStockzAuditItems();
                    break;
                case 'keyup_sandboxSearch':
                    if (typeof window.sandboxSearchDict === 'function') {
                        window.sandboxSearchDict(el.getAttribute('data-sheet-name'), el.value);
                    }
                    break;
                case 'keyup_teTagSuggest':
                    if (window.keyup_teTagSuggest) window.keyup_teTagSuggest(event);
                    break;
                case 'keyup_teFilterTaskSearch':
                    if (window.keyup_teFilterTaskSearch) window.keyup_teFilterTaskSearch(event);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('mousedown', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-mousedown]');
        if (!el) return;
        const action = el.getAttribute('data-mousedown');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'mousedown_initNeoSidebarResizer_event':
                    initNeoSidebarResizer(event);
                    break;
                case 'mousedown_initNeoSimulatorVResizer_event':
                    if (typeof initNeoSimulatorVResizer === 'function') initNeoSimulatorVResizer(event);
                    break;
                case 'mousedown_initProductionSopResize_event':
                    if (typeof window.initUnifiedSopResizer === 'function') window.initUnifiedSopResizer(event, 'productionSopLeftPane', 'productionSopSplitWrapper', 'masterSopPreviewCol', false);
                    break;
                case 'mousedown_initPackerzSopResize_event':
                    if (typeof window.initUnifiedSopResizer === 'function') window.initUnifiedSopResizer(event, 'packerzSopLeftPane', 'packerzSopSplitWrapper', 'packerzSopPreviewCol', false);
                    break;
                case 'mousedown_initLiveSopResize_event':
                    if (typeof window.initUnifiedSopResizer === 'function') {
                        window.initUnifiedSopResizer(event, 'sopViewerLeftPane', 'sopViewerSplitWrapper', 'sopViewerRightPane', true);
                    }
                    break;

                case 'mousedown_initFlyoutResizer_event':
                    if (typeof initFlyoutResizer === 'function') initFlyoutResizer(event);
                    break;
                case 'mousedown_smartPhotoPaste':
                    event.preventDefault();
                    if (typeof window.click_openSOPSnapshotCamera_smart === 'function') window.click_openSOPSnapshotCamera_smart(el);
                    break;
                case 'mousedown_smartAttachmentUrl':
                    event.preventDefault();
                    if (typeof window.click_addAttachmentRow === 'function') window.click_addAttachmentRow(el);
                    break;
                case 'mousedown_execRT':
                    event.preventDefault();
                    if (typeof window.execRT === 'function') window.execRT(el.getAttribute('data-action'));
                    break;
                case 'mousedown_sopDirectUpload':
                    event.preventDefault();
                    if (typeof window.triggerSopDirectUpload === 'function') window.triggerSopDirectUpload(el);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('change', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-change]');
        if (!el) return;
        const action = el.getAttribute('data-change');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'change_updateSaleType':
                    if (typeof window.updateSaleType === 'function') window.updateSaleType(el, el.getAttribute('data-order'), el.getAttribute('data-sku'));
                    break;
                case 'change_handleNativeMobileCameraCapture':
                    if (typeof window.change_handleNativeMobileCameraCapture === 'function') window.change_handleNativeMobileCameraCapture(event);
                    break;
                case 'change_window_onEditzBulkChange':
                    if (typeof window.change_window_onEditzBulkChange === 'function') window.change_window_onEditzBulkChange(el);
                    break;
                case 'change_window_renderRecipeManager':
                    if (typeof window.openRecipeManager === 'function') window.openRecipeManager();
                    break;
                case 'change_execRT':
                    if (typeof window.execRT === 'function') window.execRT(el.getAttribute('data-action'), el.value);
                    break;
                case 'change_window_updateRecipeManagerStaging':
                    if (typeof window.updateRecipeManagerStaging === 'function') window.updateRecipeManagerStaging(el);
                    break;
                case 'change_updateLaborCosts':
                    updateLaborCosts();
                    break;
                case 'change_updateCeoEngine':
                    updateCeoEngine();
                    break;
                case 'change_updateLabelCanvasSize':
                    updateLabelCanvasSize();
                    break;
                case 'change_updateLabelCanvasOrientation':
                    if (typeof window.updateLabelCanvasOrientation === 'function') window.updateLabelCanvasOrientation();
                    break;
                case 'change_updateLabelCanvasBg':
                    updateLabelCanvasBg();
                    break;
                case 'change_handleLabelzImageUpload_event':
                    handleLabelzImageUpload(event);
                    break;
                case 'change_executeWithButtonAction_btnSal':
                    executeWithButtonAction('btnSalezImport', '⏳ PARSING...', '📋 READY FOR REVIEW', () => processSalesCSV(false));
                    break;
                case 'change_executeWithButtonAction_btnSal_4':
                    executeWithButtonAction('btnSalezImportTest', '⏳ PARSING...', '📋 READY FOR TEST', () => processSalesCSV(true));
                    break;
                case 'change_handleShopifyBillingUpload':
                    if (typeof window.change_handleShopifyBillingUpload === 'function') window.change_handleShopifyBillingUpload(event);
                    break;
                case 'change_handleFileSelect_this':
                    if (typeof handleFileSelect === 'function') handleFileSelect(el, false);
                    break;
                case 'change_handleFileSelectTest_this':
                    if (typeof handleFileSelect === 'function') handleFileSelect(el, true);
                    break;
                case 'change_handleCSVImport_this':
                    handleCSVImport(el);
                    break;
                case 'change_handleSortChange_this_value':
                    handleSortChange(el.value);
                    break;
                case 'change_renderSkaters':
                    renderSkaters();
                    break;
                case 'change_if_this_value_document_getElem':
                    if(el.value){document.getElementById('newWOProductSub').value=''; document.getElementById('newWOProductPrint').value='';}; checkWORouting();
                    break;
                case 'change_if_this_value_document_getElem_6':
                    if(el.value){document.getElementById('newWOProductRetail').value=''; document.getElementById('newWOProductPrint').value='';}; checkWORouting();
                    break;
                case 'change_if_this_value_document_getElem_7':
                    if(el.value){document.getElementById('newWOProductRetail').value=''; document.getElementById('newWOProductSub').value='';}; checkWORouting();
                    break;
                case 'change_if_this_value_document_getElem_8':
                    if(el.value){document.getElementById('multiBatchProductSub').value=''; document.getElementById('multiBatchProductPrint').value='';};
                    break;
                case 'change_if_this_value_document_getElem_9':
                    if(el.value){document.getElementById('multiBatchProductRetail').value=''; document.getElementById('multiBatchProductPrint').value='';};
                    break;
                case 'change_if_this_value_document_getElem_10':
                    if(el.value){document.getElementById('multiBatchProductRetail').value=''; document.getElementById('multiBatchProductSub').value='';};
                    break;
                case 'change_renderMasterSOP':
                    renderMasterSOP();
                    break;
                case 'change_window_recomputeVelocityzBasel':
                    window.recomputeVelocityzBaseline();
                    break;
                case 'change_loadPackerzSopFromDB':
                    loadPackerzSopFromDB();
                    break;
                case 'change_uploadSOPMedia_this_files_0':
                    uploadSOPMedia(el.files[0]);
                    break;
                case 'change_handleSOPWebcamDeviceChange':
                    if (typeof window.change_handleSOPWebcamDeviceChange === 'function') window.change_handleSOPWebcamDeviceChange(el);
                    break;
                case 'change_handleCCLocalDeviceChange':
                    if (typeof window.change_handleCCLocalDeviceChange === 'function') window.change_handleCCLocalDeviceChange(event);
                    break;
                case 'change_handleStockzAuditDeviceChange':
                    if (typeof window.change_handleStockzAuditDeviceChange === 'function') window.change_handleStockzAuditDeviceChange(event);
                    break;
                case 'change_window_updateStockzAuditItem':
                    if (typeof window.selectStockzAuditItem === 'function') window.selectStockzAuditItem(el.value);
                    break;
                case 'change_window_updateCcMngrStock':
                    window.updateCcMngrStock();
                    break;
                case 'change_teAssignUser':
                    if(typeof window.teUpdateTaskAssignee==='function' && window.currentOpenTaskId) {
                        window.teUpdateTaskAssignee(window.currentOpenTaskId, el.value);
                    }
                    break;
                case 'change_teAssignCycle':
                    if(typeof window.teUpdateTaskCycle==='function' && window.currentOpenTaskId) {
                        window.teUpdateTaskCycle(window.currentOpenTaskId, el.value);
                    }
                    break;
                case 'change_teToggleAllMain':
                    if (typeof window.teToggleAllMain === 'function') window.teToggleAllMain();
                    break;
                case 'change_teToggleSubtaskDone':
                    if(typeof window.teToggleTaskDone==='function') {
                        window.teToggleTaskDone(el.getAttribute('data-id'));
                    }
                    break;
                case 'change_teUpdateMainSelection':
                    if (typeof window.teUpdateMainSelection === 'function') window.teUpdateMainSelection();
                    break;
                case 'change_teToggleAllArchive': {
                    const archiveCbs = document.querySelectorAll('.te-archive-checkbox');
                    archiveCbs.forEach(cb => cb.checked = el.checked);
                    const count1 = document.getElementById('te-archive-selected-count');
                    if(count1) count1.textContent = document.querySelectorAll('.te-archive-checkbox:checked').length;
                    break;
                }
                case 'change_teUpdateArchiveSelection': {
                    const count2 = document.getElementById('te-archive-selected-count');
                    if(count2) count2.textContent = document.querySelectorAll('.te-archive-checkbox:checked').length;
                    
                    const allCbs = document.querySelectorAll('.te-archive-checkbox');
                    const allChecked = document.querySelectorAll('.te-archive-checkbox:checked');
                    const selectAllCb = document.getElementById('te-archive-select-all');
                    if (selectAllCb) {
                        selectAllCb.checked = (allCbs.length > 0 && allChecked.length === allCbs.length);
                    }
                    break;
                }
                case 'change_handleStyleToggle_this':
                    if (typeof window.handleStyleToggle === 'function') {
                        window.handleStyleToggle(el.getAttribute('data-style'));
                    }
                    break;
                case 'change_handleManualAvatarUpload':
                    if (typeof window.handleManualAvatarUpload === 'function') window.handleManualAvatarUpload(el);
                    break;
                case 'change_scraperFileInput':
                    if (typeof window.change_scraperFileInput === 'function') window.change_scraperFileInput(event);
                    break;
                case 'change_teUpdateTagColor':
                    if (typeof window.change_teUpdateTagColor === 'function') window.change_teUpdateTagColor(el);
                    break;
                case 'change_teUpdateTagName':
                    if (typeof window.change_teUpdateTagName === 'function') window.change_teUpdateTagName(el);
                    break;
                case 'change_teChangeIdentity':
                    if (typeof window.teChangeIdentity === 'function') window.teChangeIdentity(el.value);
                    break;
                case 'change_teUpdateStartDate':
                    if (typeof window.teUpdateStartDate === 'function' && window.currentOpenTaskId) window.teUpdateStartDate(window.currentOpenTaskId, el.value);
                    break;
                case 'change_teUpdateDueDate':
                    if (typeof window.teUpdateDueDate === 'function' && window.currentOpenTaskId) window.teUpdateDueDate(window.currentOpenTaskId, el.value);
                    break;
                case 'change_teFilterTaskSearch':
                    if (window.change_teFilterTaskSearch) window.change_teFilterTaskSearch(event);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('input', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-input]');
        if (!el) return;
        const action = el.getAttribute('data-input');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'input_renderBarcodzGrid':
                    renderBarcodzGrid();
                    break;
                case 'input_renderLabelzGrid':
                    renderLabelzGrid();
                    break;
                case 'input_searchLabelzCatalog':
                    searchLabelzCatalog();
                    break;
                case 'input_balanceRoute':
                    if (typeof window.balanceRoute === 'function') {
                        window.balanceRoute(
                            el.getAttribute('data-safek'),
                            parseFloat(el.getAttribute('data-req')),
                            el.getAttribute('data-type'),
                            parseFloat(el.getAttribute('data-maxpull'))
                        );
                    }
                    break;
                case 'input_checkWORouting':
                    checkWORouting();
                    break;
                case 'input_renderProductionTelemetryPrevi':
                case 'input_renderDashboardTelemetryPreview':
                    renderProductionTelemetryPreview();
                    break;
                case 'input_filterArchiveList_this_value':
                    filterArchiveList(el.value);
                    break;
                case 'input_renderPackerzTelemetryPreview':
                    renderPackerzTelemetryPreview();
                    break;
                case 'input_filterSOPAuditLog':
                    filterSOPAuditLog();
                    break;
                case 'input_actualNetSearch':
                    if (typeof renderActualNetList === 'function') renderActualNetList();
                    break;
                case 'input_renderSkaters':
                    if (typeof window.renderSkaters === 'function') window.renderSkaters();
                    break;
                case 'input_window_updateRecipeManagerStaging':
                    if (typeof window.updateRecipeManagerStaging === 'function') {
                        window.updateRecipeManagerStaging(el);
                    }
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('mouseover', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-mouseover]');
        if (!el) return;
        const action = el.getAttribute('data-mouseover');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'mouseover_this_style_borderColor_var_pri':
                    el.style.borderColor='var(--primary-color)';
                    break;
                case 'mouseover_this_style_opacity_1':
                    el.style.opacity='1';
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('mouseout', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-mouseout]');
        if (!el) return;
        const action = el.getAttribute('data-mouseout');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'mouseout_this_style_borderColor_var_bor':
                    el.style.borderColor='var(--border-input)';
                    break;
                case 'mouseout_this_style_opacity_0_8':
                    el.style.opacity='0.8';
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('submit', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-submit]');
        if (!el) return;
        const action = el.getAttribute('data-submit');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'submit_handleFormSubmit_event':
                    handleFormSubmit(event);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, false);

    document.body.addEventListener('focus', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-focus]');
        if (!el) return;
        const action = el.getAttribute('data-focus');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'focus_storeOldVal':
                    if (typeof window.focus_storeOldVal === 'function') window.focus_storeOldVal(el);
                    break;
                case 'focus_storeOldVal_this':
                    storeOldVal(el);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
            if (typeof window.sysLog === 'function') { window.sysLog(`[Event Delegator] Error: ${action} - ${error.message}`, true, error.stack); }
        }
    }, true);

    document.body.addEventListener('blur', function(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;
        const el = event.target.closest('[data-blur]');
        if (!el) return;
        const action = el.getAttribute('data-blur');
        
        try {
            if (typeof window.sysLog === 'function') { window.sysLog(`[Telemetry] ${event.type.toUpperCase()}: ${action}`, false, null, true); }
            switch(action) {
                case 'blur_updateSaleCell':
                    if (typeof window.updateSaleCell === 'function') window.updateSaleCell(el, el.getAttribute('data-order'), el.getAttribute('data-sku'), el.getAttribute('data-col'), el.getAttribute('data-isnum') === 'true');
                    break;
                case 'blur_updateDBCell':
                    if (typeof window.blur_updateDBCell === 'function') window.blur_updateDBCell(el);
                    break;
                case 'blur_window_handleCcMngrTelemetryEd':
                    window.handleCcMngrTelemetryEdit(el, 1);
                    break;
                case 'blur_window_handleCcMngrTelemetryEd_16':
                    window.handleCcMngrTelemetryEdit(el, 2);
                    break;
                case 'blur_window_handleCcMngrTelemetryEd_17':
                    window.handleCcMngrTelemetryEdit(el, 3);
                    break;
                case 'blur_window_handleCcMngrTelemetryEd_18':
                    window.handleCcMngrTelemetryEdit(el, 4);
                    break;
                case 'blur_window_handleCcMngrTelemetryEd_19':
                    window.handleCcMngrTelemetryEdit(el, 5);
                    break;
                case 'blur_teSaveTitle':
                    if(typeof window.teUpdateTaskTitle==='function' && window.currentOpenTaskId) {
                        window.teUpdateTaskTitle(window.currentOpenTaskId, el.value);
                    }
                    break;
                case 'blur_teSaveDescription':
                    if(typeof window.teUpdateTaskDescription==='function' && window.currentOpenTaskId) {
                        window.teUpdateTaskDescription(window.currentOpenTaskId, el.value);
                    }
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${event.type}:`, error);
        }
    }, true);


});
