/* global supabaseClient, teRenderTaskGrid, finalResults, sopsDB, socialzSkaters, renderInventoryTable, renderFgiTable, renderWOList, renderSalesTable, renderAliasManager, buildBarcodzCache, renderBarcodzGrid, renderProductList, populateDropdowns, renderAnalyticsDashboard, updateHubStats, mapToUI, buildCatalogCache, renderColToggles, renderActiveTable, renderSkaters, updateFilterDropdownOptions */
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
            if (name === 'renderSalesTable') return typeof renderSalesTable === 'function' ? renderSalesTable : null;
            if (name === 'renderAliasManager') return typeof renderAliasManager === 'function' ? renderAliasManager : null;
            if (name === 'scanOrphanStorefrontSKUs') return typeof window.scanOrphanStorefrontSKUs === 'function' ? window.scanOrphanStorefrontSKUs : null;
            if (name === 'buildBarcodzCache') return typeof buildBarcodzCache === 'function' ? buildBarcodzCache : null;
            if (name === 'renderBarcodzGrid') return typeof renderBarcodzGrid === 'function' ? renderBarcodzGrid : null;
            if (name === 'renderProductList') return typeof renderProductList === 'function' ? renderProductList : null;
            if (name === 'populateDropdowns') return typeof populateDropdowns === 'function' ? populateDropdowns : null;
            if (name === 'renderAnalyticsDashboard') return typeof renderAnalyticsDashboard === 'function' ? renderAnalyticsDashboard : null;
            if (name === 'updateHubStats') return typeof updateHubStats === 'function' ? updateHubStats : null;
            if (name === 'mapToUI') return typeof mapToUI === 'function' ? mapToUI : null;
            if (name === 'buildCatalogCache') return typeof buildCatalogCache === 'function' ? buildCatalogCache : null;
            if (name === 'renderColToggles') return typeof renderColToggles === 'function' ? renderColToggles : null;
            if (name === 'renderActiveTable') return typeof renderActiveTable === 'function' ? renderActiveTable : null;
            if (name === 'renderSkaters') return typeof renderSkaters === 'function' ? renderSkaters : null;
            if (name === 'updateFilterDropdownOptions') return typeof updateFilterDropdownOptions === 'function' ? updateFilterDropdownOptions : null;
            if (name === 'fetchUnfulfilledOrders') return typeof fetchUnfulfilledOrders === 'function' ? fetchUnfulfilledOrders : null;
            
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
            queueRender('fetchUnfulfilledOrders');
        }

        // 5. Storefront Aliases Cache
        if (table === 'storefront_aliases') {
            const aliasDB = getGlobal('aliasDB');
            const aliasMetadataDB = getGlobal('aliasMetadataDB');

            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                if (aliasDB) {
                    aliasDB[newRecord.product_sku] = newRecord.internal_recipe_name;
                }
                if (aliasMetadataDB) {
                    aliasMetadataDB[newRecord.product_sku] = {
                        barcode_value: newRecord.barcode_value || null,
                        is_shopify_synced: !!newRecord.is_shopify_synced,
                        is_primary: !!newRecord.is_primary,
                        platform: newRecord.platform || (newRecord.is_shopify_synced ? 'Shopify Webhook' : 'Local Emulator'),
                        shopify_sku: newRecord.shopify_sku || null
                    };
                }
            } else if (eventType === 'DELETE') {
                if (aliasDB) {
                    delete aliasDB[oldRecord.product_sku];
                }
                if (aliasMetadataDB) {
                    delete aliasMetadataDB[oldRecord.product_sku];
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
                    let comps = (typeof newRecord.components === 'string') ? JSON.parse(newRecord.components) : (newRecord.components || []);
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
                    
                    if (productsDB) productsDB[newRecord.product_name] = comps;
                    if (laborDB) laborDB[newRecord.product_name] = { time: parseFloat(newRecord.labor_time_mins) || 0, rate: parseFloat(newRecord.labor_rate_hr) || 0 };
                    if (pricingDB) pricingDB[newRecord.product_name] = { msrp: parseFloat(newRecord.msrp) || 0, wholesale: parseFloat(newRecord.wholesale_price) || 0 };
                    if (isSubassemblyDB) isSubassemblyDB[newRecord.product_name] = !!newRecord.is_subassembly;
                } catch (e) {
                    console.error("[Realtime Sync] Failed to parse product_recipes components:", e);
                }
            } else if (eventType === 'DELETE') {
                if (productsDB) delete productsDB[oldRecord.product_name];
                if (laborDB) delete laborDB[oldRecord.product_name];
                if (pricingDB) delete pricingDB[oldRecord.product_name];
                if (isSubassemblyDB) delete isSubassemblyDB[oldRecord.product_name];
            }

            // Trigger UI updates for recipes
            queueRender('renderProductList');
            queueRender('populateDropdowns');
            queueRender('updateHubStats');
            queueRender('renderAnalyticsDashboard');

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
            }
        }
        
    }).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log("[Realtime Sync] Connected to PostgreSQL replication stream.");
        }
    });

})();
