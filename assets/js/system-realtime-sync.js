// system-realtime-sync.js
// Centralized WebSocket listener for global real-time synchronization

(function() {
    console.log("[Realtime Sync] Booting global channel...");
    
    // We access globals safely using typeof to avoid ReferenceErrors for top-level let declarations
    const getGlobal = (name) => {
        try {
            if (name === 'taskEngineDB') return typeof taskEngineDB !== 'undefined' ? taskEngineDB : null;
            if (name === 'inventoryDB') return typeof inventoryDB !== 'undefined' ? inventoryDB : null;
            if (name === 'workOrdersDB') return typeof workOrdersDB !== 'undefined' ? workOrdersDB : null;
            if (name === 'salesDB') return typeof salesDB !== 'undefined' ? salesDB : null;
            
            if (name === 'teRenderTaskGrid') return typeof teRenderTaskGrid === 'function' ? teRenderTaskGrid : null;
            if (name === 'renderInventoryTable') return typeof renderInventoryTable === 'function' ? renderInventoryTable : null;
            if (name === 'renderFgiTable') return typeof renderFgiTable === 'function' ? renderFgiTable : null;
            if (name === 'renderWOList') return typeof renderWOList === 'function' ? renderWOList : null;
            if (name === 'renderSalesTable') return typeof renderSalesTable === 'function' ? renderSalesTable : null;
            
            return null;
        } catch (e) {
            return null;
        }
    };

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.warn("[Realtime Sync] supabaseClient not found. Aborting sync.");
        return;
    }

    const channel = supabaseClient.channel('neogleamz-global-sync');
    
    let pendingRenders = new Set();
    let isBlurListenerAttached = false;

    // ACTIVE FOCUS GUARD
    // Prevents UI focus stealing if a user is currently typing in a grid or pane
    function queueRender(renderFnStr) {
        if (document.activeElement && 
           ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && 
           document.activeElement.closest('.table-wrap, .task-list, .executive-pane, .te-flyout, .te-task-rows-wrapper, .task-item-content')) 
        {
            pendingRenders.add(renderFnStr);
            if (!isBlurListenerAttached) {
                const triggerRenders = () => {
                    document.activeElement.removeEventListener('blur', triggerRenders);
                    isBlurListenerAttached = false;
                    setTimeout(() => {
                        if (!document.activeElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                            pendingRenders.forEach(fn => {
                                const renderFn = getGlobal(fn);
                                if (typeof renderFn === 'function') {
                                    console.log(`[Realtime Sync] Executing queued render: ${fn}`);
                                    renderFn();
                                }
                            });
                            pendingRenders.clear();
                        }
                    }, 150);
                };
                document.activeElement.addEventListener('blur', triggerRenders);
                isBlurListenerAttached = true;
            }
        } else {
            const renderFn = getGlobal(renderFnStr);
            if (typeof renderFn === 'function') {
                renderFn();
            }
        }
    }

    channel.on('postgres_changes', { event: '*', schema: 'public' }, payload => {
        const table = payload.table;
        const eventType = payload.eventType;
        const newRecord = payload.new;
        const oldRecord = payload.old;
        
        console.log(`[Realtime Sync] Mutated [${table}] via [${eventType}]`);
        
        // Dispatch global event for custom listeners that need highly specific granular updates
        window.dispatchEvent(new CustomEvent('neogleamz:realtime', { detail: payload }));

        const taskEngineDB = getGlobal('taskEngineDB');
        const inventoryDB = getGlobal('inventoryDB');
        const workOrdersDB = getGlobal('workOrdersDB');
        const salesDB = getGlobal('salesDB');

        // 1. Task Engine Cache Updates
        const taskTables = ['taskz', 'cyclez', 'projectz', 'teams', 'task_comments', 'task_activity', 'tagz'];
        if (taskTables.includes(table) && taskEngineDB && taskEngineDB[table]) {
            const dbArray = taskEngineDB[table];
            if (eventType === 'INSERT') {
                if (!dbArray.some(r => r.id === newRecord.id)) dbArray.push(newRecord);
            } else if (eventType === 'UPDATE') {
                const idx = dbArray.findIndex(r => r.id === newRecord.id);
                if (idx !== -1) dbArray[idx] = newRecord;
            } else if (eventType === 'DELETE') {
                const idx = dbArray.findIndex(r => r.id === oldRecord.id);
                if (idx !== -1) dbArray.splice(idx, 1);
            }
            queueRender('teRenderTaskGrid');
        }

        // 2. Inventory Cache Updates
        if (table === 'inventory_consumption' && inventoryDB) {
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                inventoryDB[newRecord.item_key] = newRecord;
            } else if (eventType === 'DELETE') {
                delete inventoryDB[oldRecord.item_key];
            }
            queueRender('renderInventoryTable');
            queueRender('renderFgiTable');
        }

        // 3. Work Orders Cache
        if (table === 'work_orders' && workOrdersDB) {
            if (eventType === 'INSERT') {
                if (!workOrdersDB.some(r => r.wo_id === newRecord.wo_id)) workOrdersDB.push(newRecord);
            } else if (eventType === 'UPDATE') {
                const idx = workOrdersDB.findIndex(r => r.wo_id === newRecord.wo_id);
                if (idx !== -1) workOrdersDB[idx] = newRecord;
            } else if (eventType === 'DELETE') {
                const idx = workOrdersDB.findIndex(r => r.wo_id === oldRecord.wo_id);
                if (idx !== -1) workOrdersDB.splice(idx, 1);
            }
            queueRender('renderWOList');
        }

        // 4. Sales Ledger Cache
        if (table === 'sales_ledger' && salesDB) {
            if (eventType === 'INSERT') {
                if (!salesDB.some(r => r.id === newRecord.id)) salesDB.push(newRecord);
            } else if (eventType === 'UPDATE') {
                const idx = salesDB.findIndex(r => r.id === newRecord.id);
                if (idx !== -1) salesDB[idx] = newRecord;
            } else if (eventType === 'DELETE') {
                const idx = salesDB.findIndex(r => r.id === oldRecord.id);
                if (idx !== -1) salesDB.splice(idx, 1);
            }
            queueRender('renderSalesTable');
        }
        
    }).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log("[Realtime Sync] Connected to PostgreSQL replication stream.");
        }
    });

})();
