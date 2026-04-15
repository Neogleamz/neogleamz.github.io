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
        const el = event.target.closest('[data-click]');
        if (!el) return;
        const action = el.getAttribute('data-click');
        
        try {
            switch(action) {
                case 'click_switchTab_invhub':
                    switchTab('invhub');
                    break;
                case 'click_switchTab_prodhub':
                    switchTab('prodhub');
                    break;
                case 'click_switchTab_fulfillzhub':
                    switchTab('fulfillzhub');
                    break;
                case 'click_switchTab_salezhub':
                    switchTab('salezhub');
                    break;
                case 'click_switchTab_socialzhub':
                    switchTab('socialzhub');
                    break;
                case 'click_switchTab_synchub':
                    switchTab('synchub');
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
                case 'click_window_openCycleCountManager':
                    window.openCycleCountManager();
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
                    window.printSOP();
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
                case 'click_window_openPrintSOP_currentPri':
                    window.openPrintSOP(currentPrintJob.part_name);
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
                case 'click_showNexuzPane_importz':
                    showNexuzPane('importz');
                    break;
                case 'click_showNexuzPane_salez':
                    showNexuzPane('salez');
                    break;
                case 'click_showNexuzPane_brainz':
                    showNexuzPane('brainz');
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
                case 'click_backfillFinancials':
                    backfillFinancials();
                    break;
                case 'click_alert_BACKFILL_FINANCIALS_n_nT':
                    alert('BACKFILL FINANCIALS:\\n\\nThis mathematical tool sequentially loops through all historical orders and dynamically recalculates your exact Net Profit and Transaction Fees based on your currently active Engine specifications (like updated BOM costs and Live eBay/Stripe Fee logic) and pushes those two specific fields up to your master database.\\n\\nIt strictly performs read operations on your original imported CSV physical parameters to execute el, explicitly refusing to overwrite your established Shopify source data strings.');
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
                    break;
                case 'click_openMediaManager_telemetry':
                    openMediaManager('telemetry');
                    break;
                case 'click_openSOPTokenGuide':
                    openSOPTokenGuide();
                    break;
                case 'click_if_typeof_toggleHorizontalPrev':
                    if(typeof toggleHorizontalPreview==='function') toggleHorizontalPreview('productionSopLeftPane', 'masterSopPreviewCol', this);;
                    break;
                case 'click_addSOPRow_this':
                    addSOPRow(el);
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
                    addPackerzSOPRow(el);
                    break;
                case 'click_if_event_target_this_closeSOPM':
                    if(event.target===this)closeSOPMediaPicker();
                    break;
                case 'click_createSOPMediaFolder':
                    createSOPMediaFolder();
                    break;
                case 'click_closeSOPMediaPicker':
                    closeSOPMediaPicker();
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
                case 'click_printPackerzSOP':
                    printPackerzSOP();
                    break;
                case 'click_if_typeof_togglePackerzLiveInl':
                    if(typeof togglePackerzLiveInlineSOP==='function') togglePackerzLiveInlineSOP();;
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
                case 'click_window_filterCcMngrItems':
                    window.filterCcMngrItems();
                    break;
                case 'click_window_saveManualCycleCount':
                    window.saveManualCycleCount();
                    break;
                case 'click_stopCycleCount':
                    stopCycleCount();
                    break;
                case 'click_executeRestore':
                    if (typeof executeRestore === 'function') executeRestore();
                    break;
                case 'click_cancelRestore':
                    if (typeof cancelRestore === 'function') cancelRestore();
                    break;
                case 'click_executeExport':
                    if (typeof executeExport === 'function') executeExport();
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
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('keyup', function(event) {
        const el = event.target.closest('[data-keyup]');
        if (!el) return;
        const action = el.getAttribute('data-keyup');
        
        try {
            switch(action) {
                case 'keyup_window_renderActiveTable':
                    window.renderActiveTable();
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
                case 'keyup_sandboxSearch':
                    if (typeof window.sandboxSearchDict === 'function') {
                        window.sandboxSearchDict(el.getAttribute('data-sheet-name'), el.value);
                    }
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('mousedown', function(event) {
        const el = event.target.closest('[data-mousedown]');
        if (!el) return;
        const action = el.getAttribute('data-mousedown');
        
        try {
            switch(action) {
                case 'mousedown_initNeoSidebarResizer_event':
                    initNeoSidebarResizer(event);
                    break;
                case 'mousedown_initProductionSopResize_event':
                    initProductionSopResize(event);
                    break;
                case 'mousedown_initPackerzSopResize_event':
                    initPackerzSopResize(event);
                    break;
                case 'mousedown_initPackerzLiveSopResize_event':
                    initPackerzLiveSopResize(event);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('change', function(event) {
        const el = event.target.closest('[data-change]');
        if (!el) return;
        const action = el.getAttribute('data-change');
        
        try {
            switch(action) {
                case 'change_updateLaborCosts':
                    updateLaborCosts();
                    break;
                case 'change_updateCeoEngine':
                    updateCeoEngine();
                    break;
                case 'change_updateLabelCanvasSize':
                    updateLabelCanvasSize();
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
                case 'change_handleFileSelect_this':
                    handleFileSelect(el);
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
                case 'change_window_updateCcMngrStock':
                    window.updateCcMngrStock();
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('input', function(event) {
        const el = event.target.closest('[data-input]');
        if (!el) return;
        const action = el.getAttribute('data-input');
        
        try {
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
                case 'input_checkWORouting':
                    checkWORouting();
                    break;
                case 'input_renderProductionTelemetryPrevi':
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
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('mouseover', function(event) {
        const el = event.target.closest('[data-mouseover]');
        if (!el) return;
        const action = el.getAttribute('data-mouseover');
        
        try {
            switch(action) {
                case 'mouseover_this_style_borderColor_var_pri':
                    el.style.borderColor='var(--primary-color)';
                    break;
                case 'mouseover_this_style_opacity_1':
                    el.style.opacity='1';
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('mouseout', function(event) {
        const el = event.target.closest('[data-mouseout]');
        if (!el) return;
        const action = el.getAttribute('data-mouseout');
        
        try {
            switch(action) {
                case 'mouseout_this_style_borderColor_var_bor':
                    el.style.borderColor='var(--border-input)';
                    break;
                case 'mouseout_this_style_opacity_0_8':
                    el.style.opacity='0.8';
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('submit', function(event) {
        const el = event.target.closest('[data-submit]');
        if (!el) return;
        const action = el.getAttribute('data-submit');
        
        try {
            switch(action) {
                case 'submit_handleFormSubmit_event':
                    handleFormSubmit(event);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, false);

    document.body.addEventListener('focus', function(event) {
        const el = event.target.closest('[data-focus]');
        if (!el) return;
        const action = el.getAttribute('data-focus');
        
        try {
            switch(action) {
                case 'focus_storeOldVal_this':
                    storeOldVal(el);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, true);

    document.body.addEventListener('blur', function(event) {
        const el = event.target.closest('[data-blur]');
        if (!el) return;
        const action = el.getAttribute('data-blur');
        
        try {
            switch(action) {
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
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on ${eventName}:`, error);
        }
    }, true);

    document.body.addEventListener('change', function(event) {
        const el = event.target.closest('[data-change]');
        if (!el) return;
        const action = el.getAttribute('data-change');
        
        try {
            switch(action) {
                case 'change_handleFileSelect_this':
                    if (typeof handleFileSelect === 'function') handleFileSelect(el, false);
                    break;
                case 'change_handleFileSelectTest_this':
                    if (typeof handleFileSelect === 'function') handleFileSelect(el, true);
                    break;
            }
        } catch (error) {
            console.error(`[Event Delegator] Error executing ${action} on change:`, error);
        }
    }, false);

});
