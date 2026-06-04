beforeAll(() => {
    // Clear require cache to ensure fresh module load with updated window bindings
    delete require.cache[require.resolve('../assets/js/production-module.js')];
    delete require.cache[require.resolve('../assets/js/print-module.js')];

    // Provide global variables needed for production-module and print-module logic
    window.productsDB = {};
    window.catalogCache = {};
    window.inventoryDB = {};
    window.workOrdersDB = [];
    window.printQueueDB = [];
    window.catalogByName = {};
    window.sopsDB = {};
    window.uuidMap = {};
    window.sysLog = jest.fn((msg) => console.log("sysLog:", msg));
    window.setMasterStatus = jest.fn();
    window.showToast = jest.fn();
    window.safeHTML = jest.fn(val => val);
    Object.defineProperty(window, 'confirm', { value: () => true, writable: true, configurable: true });
    Object.defineProperty(window, 'alert', { value: jest.fn(), writable: true, configurable: true });
    Object.defineProperty(global, 'confirm', { value: () => true, writable: true, configurable: true });
    Object.defineProperty(global, 'alert', { value: jest.fn(), writable: true, configurable: true });

    // Mock document.getElementById to return dummy elements if they don't exist in DOM
    const originalGetElementById = document.getElementById;
    document.getElementById = jest.fn((id) => {
        const el = originalGetElementById.call(document, id);
        if (el) return el;
        return {
            style: {},
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            innerHTML: '',
            value: ''
        };
    });

    // Mock supabaseClient
    const mockSupabaseQuery = {
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { product_name: 'RECIPE:::Mock', wip_state: {} }, error: null })
            })
        })
    };
    window.supabaseClient = {
        from: jest.fn().mockReturnValue(mockSupabaseQuery)
    };

    window.teSyncTask = jest.fn();
    window.executeWithButtonAction = jest.fn((btnId, loadingStr, successStr, callback) => callback());
    window.executePrintInventoryMath = jest.fn();
    window.executeCleaningInventoryMath = jest.fn();
    window.calculateExactWODeductions = jest.fn().mockReturnValue({
        raws: {},
        raws_production: {},
        raws_assembly: {},
        built_subs: {},
        pulls: {}
    });

    // Mock DOM elements
    document.body.innerHTML = `
        <div id="mediaContainer"></div>
        <div id="mediaModal"></div>
        <div id="finalizeWoModal"></div>
        <div id="finalizeWoActionBtn"></div>
        <div id="printMainArea"></div>
        <div id="layerzRunCompleteModal"></div>
    `;

    require('../assets/js/production-module.js');
    require('../assets/js/print-module.js');
});

describe("Comment Sync and Task Engine Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = `
            <div id="mediaContainer"></div>
            <div id="mediaModal"></div>
            <div id="finalizeWoModal"></div>
            <div id="finalizeWoActionBtn"></div>
            <div id="printMainArea"></div>
            <ul id="printListUI"></ul>
            <div id="layerzRunCompleteModal"></div>
        `;
    });

    test("toggleWIPCheckbox logs comment to Task Engine", async () => {
        const wo = { wo_id: "WO-1234", wip_state: {} };
        window.currentWO = wo;

        const parent = document.createElement('div');
        const chkText = document.createElement('div');
        chkText.className = 'chk-text';
        chkText.innerText = "Step description text";
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = true;
        parent.appendChild(chk);
        parent.appendChild(chkText);

        await window.toggleWIPCheckbox(chk, "wip_chk_1");

        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            'WO-1234',
            'comment',
            expect.objectContaining({
                content: expect.stringContaining('Step "Step description text" marked as Completed')
            })
        );
    });

    test("checkAllInGroup logs group completion to Task Engine", async () => {
        const wo = { wo_id: "WO-1234", wip_state: {} };
        window.currentWO = wo;

        const grpId = "kitting";
        // Mock a checkbox and button structure in the DOM by appending
        const div = document.createElement('div');
        div.innerHTML = `
            <div>
                <h4>
                    Kitting Group Title
                    <button class="btn-blue btn-check-all" data-grp-id="${grpId}">✓ All</button>
                </h4>
                <div class="checklist-item">
                    <input type="checkbox" class="${grpId}-chk wip-checkbox" data-key="chk_1">
                </div>
            </div>
        `;
        document.body.appendChild(div);

        await window.checkAllInGroup(grpId);

        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            'WO-1234',
            'comment',
            expect.objectContaining({
                content: expect.stringContaining('Completed all tasks in checklist group "Kitting Group Title"')
            })
        );
    });

    test("advanceWO logs status transition comment", async () => {
        const wo = { wo_id: "WO-1234", status: 'Queued', wip_state: {} };
        window.currentWO = wo;

        await window.advanceWO('Picking', true);

        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            'WO-1234',
            'comment',
            expect.objectContaining({
                content: '📋 Work Order moved to Picking stage.'
            })
        );
    });

    test("submitFinalizeWo logs yield and scrap tally report", async () => {
        const wo = { wo_id: "WO-1234", product_name: "Glow Widget", qty: 10, wip_state: {} };
        window.currentWO = wo;

        // Mock scrap inputs in DOM by appending
        const div = document.createElement('div');
        div.innerHTML = `
            <input class="wo-scrap-input" data-key="RAW-FILAMENT-BLK" value="2.5">
            <input class="wo-scrap-input" data-key="RAW-BEARING" value="1">
        `;
        document.body.appendChild(div);

        await window.submitFinalizeWo();

        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            'WO-1234',
            'comment',
            expect.objectContaining({
                content: expect.stringContaining('Batch Finalized: Yielded 10 of Glow Widget')
            })
        );
        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            'WO-1234',
            'comment',
            expect.objectContaining({
                content: expect.stringContaining('RAW-FILAMENT-BLK: 2.5')
            })
        );
    });

    test("submitFinalizeWo spawns scrap rebuild WO and syncs task to Task Engine", async () => {
        const wo = { wo_id: "WO-1234", product_name: "Glow Widget", qty: 10, wip_state: {} };
        window.currentWO = wo;

        const div = document.createElement('div');
        div.innerHTML = `
            <input class="wo-scrap-input" data-key="COMP-PCB__BUILD" value="3">
        `;
        document.body.appendChild(div);

        await window.submitFinalizeWo();

        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            expect.stringMatching(/^WO-/),
            'create',
            expect.objectContaining({
                title: expect.stringContaining('COMP-PCB'),
                linked_module: 'work_orders',
                description: 'COMP-PCB (Qty: 3)',
                metadata: expect.objectContaining({ linked_wo_id: expect.stringMatching(/^WO-/) })
            })
        );
    });

    test("deletePrintJob calls Task Engine delete action", async () => {
        const printJob = { id: "print-999", part_name: "WHEEL-CORE-ASY", status: "Queued" };
        window.printQueueDB = [printJob];
        console.log("DOM HTML before select:", document.body.innerHTML);
        window.selectPrintJob("print-999");
        window.refreshPrintQueue = jest.fn();

        await window.deletePrintJob();

        expect(window.teSyncTask).toHaveBeenCalledWith(
            'layerz',
            'print-999',
            'delete'
        );
    });

    test("saveDraftScrap logs draft scrap tally to Task Engine", async () => {
        const wo = { wo_id: "WO-1234", product_name: "Glow Widget", qty: 10, wip_state: {} };
        window.currentWO = wo;

        // Mock scrap inputs in DOM
        const div = document.createElement('div');
        div.innerHTML = `
            <input class="wo-scrap-input" data-key="RAW-FILAMENT-BLK" value="1.5">
        `;
        document.body.appendChild(div);

        await window.saveDraftScrap();

        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            'WO-1234',
            'comment',
            expect.objectContaining({
                content: expect.stringContaining('Draft Raw Material Scrap:\n- RAW-FILAMENT-BLK: 1.5')
            })
        );
    });

    test("submitLayerzRun propagates comments to parent work order task", async () => {
        const printJob = { 
            id: "print-888", 
            part_name: "WHEEL-CORE-ASY", 
            qty: 10,
            wo_id: "WO-1234", 
            wip_state: { 
                active_run: { success_qty: 0, scrap_qty: 0, start_time: Date.now() - 1000 },
                runs: []
            } 
        };
        window.printQueueDB = [printJob];
        window.selectPrintJob("print-888");

        // Mock run inputs
        const runSuccessInput = document.createElement('input');
        runSuccessInput.id = 'layerzRunSuccessQty';
        runSuccessInput.value = '8';
        const runScrapInput = document.createElement('input');
        runScrapInput.id = 'layerzRunScrapQty';
        runScrapInput.value = '2';
        
        document.body.appendChild(runSuccessInput);
        document.body.appendChild(runScrapInput);

        await window.submitLayerzRun();

        // Should log to both print task and parent WO task
        expect(window.teSyncTask).toHaveBeenCalledWith(
            'layerz',
            'print-888',
            'comment',
            expect.objectContaining({
                content: expect.stringContaining('Print Run #1 Completed: 8 parts successful, 2 parts scrapped')
            })
        );
        expect(window.teSyncTask).toHaveBeenCalledWith(
            'batchez',
            'WO-1234',
            'comment',
            expect.objectContaining({
                content: expect.stringContaining('Print Run #1 Completed (Part: WHEEL-CORE-ASY): 8 parts successful, 2 parts scrapped')
            })
        );
    });
});

describe("Task Engine teSyncTask Implementation", () => {
    let originalSyncTask;

    beforeAll(() => {
        // Save the mocked teSyncTask
        originalSyncTask = window.teSyncTask;
        
        // Define additional functions required by task-engine.js if not already defined
        window.teRenderSidebar = jest.fn();
        window.teRenderTaskGrid = jest.fn();
        window.teUpdateInboxBadge = jest.fn();

        delete require.cache[require.resolve('../assets/js/task-engine.js')];
        require('../assets/js/task-engine.js');
    });

    afterAll(() => {
        // Restore the mock for other suites if needed
        window.teSyncTask = originalSyncTask;
    });

    test("teSyncTask comment action uses SPOOF and sets author_id to null", async () => {
        const mockTasks = [{ id: "task-uuid-111" }];
        
        const makeMockBuilder = (data) => {
            const builder = {
                filter: jest.fn().mockImplementation(() => builder),
                order: jest.fn().mockImplementation(() => builder),
                then: (resolve) => resolve({ data: data, error: null })
            };
            builder.select = jest.fn().mockReturnValue(builder);
            return builder;
        };

        const mockInsert = jest.fn().mockResolvedValue({ error: null });
        let capturedFilterArgs = null;

        window.supabaseClient = {
            from: jest.fn().mockImplementation((table) => {
                if (table === 'taskz') {
                    const builder = makeMockBuilder(mockTasks);
                    builder.filter = jest.fn().mockImplementation((...args) => {
                        capturedFilterArgs = args;
                        return builder;
                    });
                    return builder;
                }
                if (table === 'task_comments') {
                    const builder = makeMockBuilder([]);
                    builder.insert = mockInsert;
                    return builder;
                }
                return makeMockBuilder([]);
            })
        };

        // Set logged in user to Chris
        window.currentUser = { id: 'ef25fcf4-3521-45ef-990f-6361d416a53b', email: 'chrisl@neogleamz.com' };

        await window.teSyncTask('batchez', 'WO-1234', 'comment', { content: 'Test Scrap: 5' });

        // Verify select was called with the correct filter
        expect(capturedFilterArgs).toEqual(['metadata->>linked_wo_id', 'eq', 'WO-1234']);

        // Verify insert was called on task_comments with author_id: null and SPOOF content
        expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                task_id: 'task-uuid-111',
                author_id: null,
                content: 'SPOOF:Chris|||Test Scrap: 5'
            })
        ]));
    });

    test("teRenderArchiveView renders clickable span for archived tasks", () => {
        window.taskEngineDB.taskz = [{ id: "task-999", title: "Archived Task Title", is_archived: true }];
        window.taskEngineDB.cyclez = [];
        window.taskEngineDB.teams = [];
        window.taskEngineDB.projectz = [];
        
        document.body.innerHTML = `
            <div id="te-archive-rows-container"></div>
        `;
        
        window.teRenderArchiveView();
        
        const span = document.querySelector('#te-archive-rows-container span[data-click="click_teOpenTaskContext"]');
        expect(span).not.toBeNull();
        expect(span.getAttribute('data-task-id')).toBe('task-999');
        expect(span.textContent).toBe('Archived Task Title');
        expect(span.style.cursor).toBe('pointer');
    });
});

