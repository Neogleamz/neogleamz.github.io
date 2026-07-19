/* global supabaseClient, teRenderTaskGrid, finalResults, sopsDB, socialzSkaters, renderInventoryTable, renderFgiTable, renderWOList, renderActiveWO, renderPrintQueue */
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
            if (name === 'aliasDB') return typeof aliasDB !== 'undefined' ? aliasDB : null;
            if (name === 'aliasMetadataDB') return typeof window.aliasMetadataDB !== 'undefined' ? window.aliasMetadataDB : null;
            if (name === 'productsDB') return typeof productsDB !== 'undefined' ? productsDB : null;
            if (name === 'laborDB') return typeof laborDB !== 'undefined' ? laborDB : null;
            if (name === 'pricingDB') return typeof pricingDB !== 'undefined' ? pricingDB : null;
            if (name === 'isSubassemblyDB') return typeof isSubassemblyDB !== 'undefined' ? isSubassemblyDB : null;
            if (name === 'finalResults') return typeof finalResults !== 'undefined' ? finalResults : null;
            if (name === 'sopsDB') return typeof sopsDB !== 'undefined' ? sopsDB : null;
            if (name === 'socialzSkaters') return typeof socialzSkaters !== 'undefined' ? socialzSkaters : null;
            
            if (name === 'teRenderTaskGrid') return typeof teRenderTaskGrid === 'function' ? teRenderTaskGrid : null;
            if (name === 'renderInventoryTable') return typeof renderInventoryTable === 'function' ? renderInventoryTable : null;
            if (name === 'renderFgiTable') return typeof renderFgiTable === 'function' ? renderFgiTable : null;
            if (name === 'renderWOList') return typeof renderWOList === 'function' ? renderWOList : null;
            if (name === 'renderActiveWO') return () => { 
                if (typeof renderActiveWO === 'function' && typeof currentWO !== 'undefined' && currentWO) renderActiveWO(currentWO.wo_id);
            };
            if (name === 'printQueueDB') return typeof printQueueDB !== 'undefined' ? printQueueDB : null;
            if (name === 'renderPrintQueue') return typeof renderPrintQueue === 'function' ? renderPrintQueue : null;
            if (name === 'renderActivePrintJob') return () => {
                if (typeof renderActivePrintJob === 'function' && typeof currentPrintJob !== 'undefined' && currentPrintJob) renderActivePrintJob(currentPrintJob.id);
            };
            if (name === 'teOpenTaskContext') return () => {
                if (typeof window.teOpenTaskContext === 'function' && window.currentOpenTaskId) window.teOpenTaskContext(window.currentOpenTaskId);
            };
            if (name === 'teFetchTaskEngineData') return typeof window.teFetchTaskEngineData === 'function' ? window.teFetchTaskEngineData : null;
            if (name === 'refreshPrintQueue') return typeof window.refreshPrintQueue === 'function' ? window.refreshPrintQueue : null;
            if (name === 'fetchWorkOrders') return typeof window.fetchWorkOrders === 'function' ? window.fetchWorkOrders : null;
            if (name === 'fetchInventoryData') return typeof window.fetchInventoryData === 'function' ? window.fetchInventoryData : null;
            if (name === 'fetchSalesData') return typeof window.fetchSalesData === 'function' ? window.fetchSalesData : null;

            if (name === 'renderSalesTable') return typeof window.renderSalesTable === 'function' ? window.renderSalesTable : null;
            if (name === 'renderAliasManager') return typeof window.renderAliasManager === 'function' ? window.renderAliasManager : null;
            if (name === 'scanOrphanStorefrontSKUs') return typeof window.scanOrphanStorefrontSKUs === 'function' ? window.scanOrphanStorefrontSKUs : null;
            if (name === 'buildBarcodzCache') return typeof window.buildBarcodzCache === 'function' ? window.buildBarcodzCache : null;
            if (name === 'renderBarcodzGrid') return typeof window.renderBarcodzGrid === 'function' ? window.renderBarcodzGrid : null;
            if (name === 'renderLabelzGrid') return typeof window.renderLabelzGrid === 'function' ? window.renderLabelzGrid : null;
            if (name === 'renderProductList') return typeof window.renderProductList === 'function' ? window.renderProductList : null;
            if (name === 'populateDropdowns') return typeof window.populateDropdowns === 'function' ? window.populateDropdowns : null;
            if (name === 'renderAnalyticsDashboard') return typeof window.renderAnalyticsDashboard === 'function' ? window.renderAnalyticsDashboard : null;
            if (name === 'updateHubStats') return typeof window.updateHubStats === 'function' ? window.updateHubStats : null;
            if (name === 'mapToUI') return typeof window.mapToUI === 'function' ? window.mapToUI : null;
            if (name === 'buildCatalogCache') return typeof window.buildCatalogCache === 'function' ? window.buildCatalogCache : null;
            if (name === 'renderColToggles') return typeof window.renderColToggles === 'function' ? window.renderColToggles : null;
            if (name === 'renderActiveTable') return typeof window.renderActiveTable === 'function' ? window.renderActiveTable : null;
            if (name === 'renderSkaters') return typeof window.renderSkaters === 'function' ? window.renderSkaters : null;
            if (name === 'updateFilterDropdownOptions') return typeof window.updateFilterDropdownOptions === 'function' ? window.updateFilterDropdownOptions : null;
            if (name === 'fetchUnfulfilledOrders') return typeof window.fetchUnfulfilledOrders === 'function' ? window.fetchUnfulfilledOrders : null;
            
            // Newly mapped UI modals and grids
            if (name === 'renderProductBOM') return typeof window.renderProductBOM === 'function' ? window.renderProductBOM : null;
            if (name === 'renderRecipeManager') return typeof window.renderRecipeManager === 'function' ? window.renderRecipeManager : null;
            if (name === 'renderBulkAddBody') return typeof window.renderBulkAddBody === 'function' ? window.renderBulkAddBody : null;
            if (name === 'renderMasterSOP') return typeof window.renderMasterSOP === 'function' ? window.renderMasterSOP : null;
            if (name === 'renderStagedBatchItems') return typeof window.renderStagedBatchItems === 'function' ? window.renderStagedBatchItems : null;
            if (name === 'renderArchiveList') return typeof window.renderArchiveList === 'function' ? window.renderArchiveList : null;
            if (name === 'renderProductionTelemetryPreview') return typeof window.renderProductionTelemetryPreview === 'function' ? window.renderProductionTelemetryPreview : null;
            if (name === 'renderVelocityzFGI') return typeof window.renderVelocityzFGI === 'function' ? window.renderVelocityzFGI : null;
            if (name === 'renderSOPAuditLogRows') return typeof window.renderSOPAuditLogRows === 'function' ? window.renderSOPAuditLogRows : null;
            if (name === 'renderSimulatorOrder') return typeof window.renderSimulatorOrder === 'function' ? window.renderSimulatorOrder : null;
            if (name === 'renderActualNetList') return typeof window.renderActualNetList === 'function' ? window.renderActualNetList : null;
            if (name === 'renderCeoTerminal') return typeof window.renderCeoTerminal === 'function' ? window.renderCeoTerminal : null;
            if (name === 'renderUnifiedBuilderTable') return typeof window.renderUnifiedBuilderTable === 'function' ? window.renderUnifiedBuilderTable : null;
            if (name === 'renderLtvWhalesTable') return typeof window.renderLtvWhalesTable === 'function' ? window.renderLtvWhalesTable : null;
            if (name === 'renderDashboardCharts') return typeof window.renderDashboardCharts === 'function' ? window.renderDashboardCharts : null;
            if (name === 'renderSocialzCharts') return typeof window.renderSocialzCharts === 'function' ? window.renderSocialzCharts : null;
            if (name === 'renderPaperProfileTable') return typeof window.renderPaperProfileTable === 'function' ? window.renderPaperProfileTable : null;
            if (name === 'renderPresetDropdown') return typeof window.renderPresetDropdown === 'function' ? window.renderPresetDropdown : null;
            if (name === 'renderParcelPresetDropdown') return typeof window.renderParcelPresetDropdown === 'function' ? window.renderParcelPresetDropdown : null;

            return null;
        } catch (_e) {
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
    let debounceTimers = {};

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
            if (debounceTimers[renderFnStr]) clearTimeout(debounceTimers[renderFnStr]);
            debounceTimers[renderFnStr] = setTimeout(() => {
                const renderFn = getGlobal(renderFnStr);
                if (typeof renderFn === 'function') {
                    renderFn();
                }
            }, 50);
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
                const oldId = (oldRecord || {}).id;
                const idx = dbArray.findIndex(r => String(r.id) === String(oldId));
                if (idx !== -1) {
                    dbArray.splice(idx, 1);
                } else {
                    queueRender('teFetchTaskEngineData');
                }
            }
            queueRender('teRenderTaskGrid');
            queueRender('teOpenTaskContext');
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
            queueRender('renderBarcodzGrid');
            queueRender('renderLabelzGrid');
            queueRender('renderVelocityzFGI');
        }

        // 3. Work Orders Cache
        if (table === 'work_orders' && workOrdersDB) {
            // Rehydrate missing human-readable name from UUID map (Same fix as print_queue)
            if (newRecord && newRecord.product_item_uuid && window.uuidToNameMap) {
                let mappedName = window.uuidToNameMap[newRecord.product_item_uuid];
                if (mappedName) {
                    newRecord.product_name = mappedName.startsWith('RECIPE:::') ? mappedName.replace('RECIPE:::', '') : mappedName;
                }
            }

            if (eventType === 'INSERT') {
                if (!workOrdersDB.some(r => String(r.wo_id) === String(newRecord.wo_id))) workOrdersDB.push(newRecord);
            } else if (eventType === 'UPDATE') {
                const idx = workOrdersDB.findIndex(r => String(r.wo_id) === String(newRecord.wo_id));
                if (idx !== -1) workOrdersDB[idx] = newRecord;
            } else if (eventType === 'DELETE') {
                const oldId = (oldRecord || {}).wo_id;
                const idx = workOrdersDB.findIndex(r => String(r.wo_id) === String(oldId));
                if (idx !== -1) {
                    workOrdersDB.splice(idx, 1);
                } else {
                    queueRender('fetchWorkOrders');
                }
            }
            queueRender('renderWOList');
            queueRender('renderActiveWO');
            queueRender('renderArchiveList');
            queueRender('renderStagedBatchItems');
            queueRender('renderProductionTelemetryPreview');
        }

        // 3b. Print Queue Cache
        const printQueueDB = getGlobal('printQueueDB');
        if (table === 'print_queue' && printQueueDB) {
            if (newRecord) {
                newRecord.part_name = newRecord.part_name || '';
                if (window.uuidToNameMap && newRecord.part_item_uuid) {
                    let mappedName = window.uuidToNameMap[newRecord.part_item_uuid];
                    if (mappedName && mappedName.startsWith('RECIPE:::')) {
                        newRecord.part_name = mappedName.replace('RECIPE:::', '');
                    } else if (mappedName) {
                        newRecord.part_name = mappedName;
                    }
                }
                if (!newRecord.part_name) newRecord.part_name = 'Unknown Part';
            }

            if (eventType === 'INSERT') {
                if (!printQueueDB.some(r => String(r.id) === String(newRecord.id))) printQueueDB.unshift(newRecord);
            } else if (eventType === 'UPDATE') {
                const idx = printQueueDB.findIndex(r => String(r.id) === String(newRecord.id));
                if (idx !== -1) printQueueDB[idx] = newRecord;
            } else if (eventType === 'DELETE') {
                const oldId = (oldRecord || {}).id;
                const idx = printQueueDB.findIndex(r => String(r.id) === String(oldId));
                if (idx !== -1) {
                    printQueueDB.splice(idx, 1);
                } else {
                    queueRender('refreshPrintQueue');
                }
            }
            queueRender('renderPrintQueue');
            queueRender('renderActivePrintJob');
        }

        // 4. Sales Ledger Cache
        if (table === 'sales_ledger' && salesDB) {
            if (newRecord && newRecord.recipe_item_uuid && window.uuidToNameMap && window.uuidToNameMap[newRecord.recipe_item_uuid]) {
                newRecord.internal_recipe_name = window.uuidToNameMap[newRecord.recipe_item_uuid].replace('RECIPE:::', '');
            }
            if (eventType === 'INSERT') {
                if (!salesDB.some(r => String(r.id) === String(newRecord.id))) salesDB.push(newRecord);
            } else if (eventType === 'UPDATE') {
                const idx = salesDB.findIndex(r => String(r.id) === String(newRecord.id));
                if (idx !== -1) salesDB[idx] = newRecord;
            } else if (eventType === 'DELETE') {
                const oldId = (oldRecord || {}).id;
                const idx = salesDB.findIndex(r => String(r.id) === String(oldId));
                if (idx !== -1) {
                    salesDB.splice(idx, 1);
                } else {
                    queueRender('fetchSalesData');
                }
            }
            queueRender('renderSalesTable');
            queueRender('fetchUnfulfilledOrders');
            queueRender('renderActualNetList');
            queueRender('renderSimulatorOrder');
            queueRender('renderCeoTerminal');
            queueRender('renderUnifiedBuilderTable');
            queueRender('renderLtvWhalesTable');
            queueRender('renderVelocityzFGI');
            queueRender('renderAnalyticsDashboard');
            queueRender('updateHubStats');
        }

        // 5. Storefront Aliases Cache
        if (table === 'storefront_aliases') {
            const aliasDB = getGlobal('aliasDB');
            const aliasMetadataDB = getGlobal('aliasMetadataDB');

            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                if (aliasDB) {
                    let mappedRecipeName = (window.uuidToNameMap && newRecord.recipe_item_uuid) ? window.uuidToNameMap[newRecord.recipe_item_uuid] : null;
                    if (mappedRecipeName) {
                        mappedRecipeName = mappedRecipeName.replace('RECIPE:::', '');
                    }
                    const uniqueKey = newRecord.shopify_sku || newRecord.product_sku;
                    aliasDB[uniqueKey] = mappedRecipeName;
                    if (newRecord.shopify_sku && newRecord.product_sku !== newRecord.shopify_sku) {
                        aliasDB[newRecord.product_sku] = mappedRecipeName;
                    }
                }
                if (aliasMetadataDB) {
                    const uniqueKey = newRecord.shopify_sku || newRecord.product_sku;
                    aliasMetadataDB[uniqueKey] = {
                        barcode_value: newRecord.barcode_value || null,
                        is_shopify_synced: !!newRecord.is_shopify_synced,
                        is_primary: !!newRecord.is_primary,
                        platform: newRecord.platform || (newRecord.is_shopify_synced ? 'Shopify Webhook' : 'Local Emulator'),
                        shopify_sku: newRecord.shopify_sku || null,
                        product_sku: newRecord.product_sku || null,
                        matched_shopify_sku: newRecord.matched_shopify_sku || null
                    };
                    if (newRecord.shopify_sku && newRecord.product_sku !== newRecord.shopify_sku) {
                        aliasMetadataDB[newRecord.product_sku] = {
                            ...aliasMetadataDB[uniqueKey],
                            is_memory_only: true
                        };
                    }
                }
            } else if (eventType === 'DELETE') {
                if (aliasDB) {
                    delete aliasDB[oldRecord.product_sku];
                    if (oldRecord.shopify_sku) delete aliasDB[oldRecord.shopify_sku];
                }
                if (aliasMetadataDB) {
                    delete aliasMetadataDB[oldRecord.product_sku];
                    if (oldRecord.shopify_sku) delete aliasMetadataDB[oldRecord.shopify_sku];
                }
            }

            // Re-run orphan scanner to update badge state & local cache
            const scanFn = getGlobal('scanOrphanStorefrontSKUs');
            if (typeof scanFn === 'function') {
                scanFn();
            }

            // Rebuild physical barcode cache and spooler
            const buildCacheFn = getGlobal('buildBarcodzCache');
            if (typeof buildCacheFn === 'function') {
                buildCacheFn();
            }
            const renderGridFn = getGlobal('renderBarcodzGrid');
            if (typeof renderGridFn === 'function') {
                renderGridFn(true);
            }

            queueRender('renderAliasManager');
        }

        // 6. Product Recipes Cache
        if (table === 'product_recipes') {
            const productsDB = getGlobal('productsDB');
            const laborDB = getGlobal('laborDB');
            const pricingDB = getGlobal('pricingDB');
            const isSubassemblyDB = getGlobal('isSubassemblyDB');

            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                try {
                    let mappedName = window.uuidToNameMap ? window.uuidToNameMap[newRecord.product_item_uuid] : undefined;
                    let pName = mappedName ? (mappedName.startsWith('RECIPE:::') ? mappedName.replace('RECIPE:::', '') : mappedName) : undefined;
                    if (!pName) return;

                    let rawComps = (typeof newRecord.components === 'string') ? JSON.parse(newRecord.components) : (newRecord.components || []);
                    let comps = [];
                    rawComps.forEach(c => {
                        let converted = { ...c };
                        if (converted.item_uuid && window.uuidToNameMap) {
                            let mappedKey = window.uuidToNameMap[converted.item_uuid];
                            if (mappedKey) converted.item_key = mappedKey;
                            else converted.item_key = converted.item_uuid;
                        }
                        comps.push(converted);
                    });
                    comps.msrp = parseFloat(newRecord.msrp) || 0;
                    comps.is_subassembly = !!newRecord.is_subassembly;
                    comps.affiliate_pct = parseFloat(newRecord.affiliate_pct) || 0;
                    comps.warranty_pct = parseFloat(newRecord.warranty_pct) || 0;
                    comps.is_3d_print = !!newRecord.is_3d_print;
                    comps.is_label = !!newRecord.is_label;
                    comps.label_emoji = newRecord.label_emoji || '';
                    comps.print_time_mins = parseFloat(newRecord.print_time_mins) || 0;
                    comps.print_grams = parseFloat(newRecord.print_grams) || 0;
                    comps.filament_item_key = newRecord.filament_item_key || "";
                    
                    if (productsDB) productsDB[pName] = comps;
                    if (laborDB) laborDB[pName] = { time: parseFloat(newRecord.labor_time_mins) || 0, rate: parseFloat(newRecord.labor_rate_hr) || 0 };
                    if (pricingDB) pricingDB[pName] = { msrp: parseFloat(newRecord.msrp) || 0, wholesale: parseFloat(newRecord.wholesale_price) || 0 };
                    if (isSubassemblyDB) isSubassemblyDB[pName] = !!newRecord.is_subassembly;
                } catch (e) {
                    console.error("[Realtime Sync] Failed to parse product_recipes components:", e);
                }
            } else if (eventType === 'DELETE') {
                let mappedName = window.uuidToNameMap ? window.uuidToNameMap[oldRecord.product_item_uuid] : undefined;
                let pName = mappedName ? (mappedName.startsWith('RECIPE:::') ? mappedName.replace('RECIPE:::', '') : mappedName) : undefined;
                if (!pName) return;

                if (productsDB) delete productsDB[pName];
                if (laborDB) delete laborDB[pName];
                if (pricingDB) delete pricingDB[pName];
                if (isSubassemblyDB) delete isSubassemblyDB[pName];
            }

            // Trigger UI updates for recipes
            queueRender('renderProductList');
            queueRender('populateDropdowns');
            queueRender('updateHubStats');
            queueRender('renderAnalyticsDashboard');
            queueRender('renderProductBOM');
            queueRender('renderRecipeManager');
            queueRender('renderLabelzGrid');
            queueRender('renderBarcodzGrid');

            // Re-run orphan scanner to update alias status
            const scanFn = getGlobal('scanOrphanStorefrontSKUs');
            if (typeof scanFn === 'function') {
                scanFn();
            }
            queueRender('renderAliasManager');
        }

        // 7. Full Landed Costs Cache
        if (table === 'full_landed_costs') {
            const finalResults = getGlobal('finalResults');
            const mapToUI = getGlobal('mapToUI');

            if (finalResults && typeof mapToUI === 'function') {
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                    const mapped = mapToUI([newRecord])[0];
                    if (mapped) {
                        const idx = finalResults.findIndex(r => r._RowKey === mapped._RowKey);
                        if (idx !== -1) {
                            finalResults[idx] = mapped;
                        } else {
                            finalResults.push(mapped);
                        }
                    }
                } else if (eventType === 'DELETE') {
                    const rowKey = String(oldRecord.parcel_no) + ':::' + String(oldRecord.di_item_id);
                    const idx = finalResults.findIndex(r => r._RowKey === rowKey);
                    if (idx !== -1) {
                        finalResults.splice(idx, 1);
                    }
                }

                // Re-build caches and tables
                const buildCatalogCache = getGlobal('buildCatalogCache');
                if (typeof buildCatalogCache === 'function') {
                    buildCatalogCache();
                }
                const renderColToggles = getGlobal('renderColToggles');
                if (typeof renderColToggles === 'function') {
                    renderColToggles();
                }
                queueRender('renderActiveTable');
            }
        }

        // 8. Production SOPs Cache
        if (table === 'production_sops') {
            const sopsDB = getGlobal('sopsDB');

            if (sopsDB) {
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                    sopsDB[newRecord.product_name] = (typeof newRecord.steps === 'string') ? JSON.parse(newRecord.steps) : (newRecord.steps || []);
                } else if (eventType === 'DELETE') {
                    delete sopsDB[oldRecord.product_name];
                }
                queueRender('renderProductList');
                queueRender('renderMasterSOP');
            }
        }

        // 9. Socialz Audience Cache
        if (table === 'socialz_audience') {
            const socialzSkaters = getGlobal('socialzSkaters');
            const updateFilterDropdownOptions = getGlobal('updateFilterDropdownOptions');

            if (socialzSkaters) {
                const mapSkater = (row) => ({
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
                });

                if (eventType === 'INSERT') {
                    socialzSkaters.push(mapSkater(newRecord));
                } else if (eventType === 'UPDATE') {
                    const idx = socialzSkaters.findIndex(s => s.id === newRecord.id);
                    if (idx !== -1) {
                        socialzSkaters[idx] = mapSkater(newRecord);
                    }
                } else if (eventType === 'DELETE') {
                    const idx = socialzSkaters.findIndex(s => s.id === oldRecord.id);
                    if (idx !== -1) {
                        socialzSkaters.splice(idx, 1);
                    }
                }

                if (typeof updateFilterDropdownOptions === 'function') {
                    updateFilterDropdownOptions();
                }
                queueRender('renderSkaters');
                queueRender('renderDashboardCharts');
                queueRender('renderSocialzCharts');
            }
        }

        // 10. Label Designs & Templates
        if (table === 'label_designs' || table === 'label_templates') {
            queueRender('renderLabelzGrid');
        }

        // 11. Packerz SOPs
        if (table === 'pack_ship_sops') {
            queueRender('renderSOPAuditLogRows');
        }

        // 12. Paper Profiles
        if (table === 'paper_profiles') {
            queueRender('renderPaperProfileTable');
            queueRender('renderPresetDropdown');
            queueRender('renderParcelPresetDropdown');
        }
        
    }).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log("[Realtime Sync] Connected to PostgreSQL replication stream.");
        }
    });

})();
