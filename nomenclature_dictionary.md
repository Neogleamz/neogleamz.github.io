# Canonical Nomenclature Dictionary

### Canonical Nomenclature Dictionary
| UI Tab Label (Found) | DOM ID (Legacy) | Canonical Name (Mandated) | Associated JS Modules |
| --- | --- | --- | --- |
| 📊 STOCKPILEZ | `invhub-tab` | **STOCKPILEZ** | `inventory-module.js`, `bom-module.js` |
| 🏭 MAKERZ | `prodhub-tab` | **MAKERZ** | `production-module.js`, `barcodz-module.js` |
| 📦 FULFILLZ | `fulfillzhub-tab` | **FULFILLZ** | `packerz-module.js`, `print-module.js`, `labelz-module.js` |
| 🛒 REVENUEZ | `salezhub-tab` | **REVENUEZ** | `sales-module.js`, `ceo-module.js` |
| 👥 SOCIALZ | `socialzhub-tab` | **SOCIALZ** | `socialz-module.js` |
| ⚡ NEXUZ | `synchub-tab` | **NEXUZ** | `system-tools-module.js`, `task-engine.js` |

### Architectural Hierarchy Diagram
```mermaid
graph LR
    subgraph Global [Global Header Triggers]
        TipzModal[TIPZ Modal<br>Btn: 💡 TIPZ]
        TaskzModal[TASKZ Modal<br>Btn: 🎯 TASKZ]
    end
    
    subgraph H1 [STOCKPILEZ HUB Architecture]
        Stockpilez[STOCKPILEZ Hub<br>DOM: stockpilez-tab] -.-> SP_Inventory[STOCKZ Pane<br>DOM: paneInventory]
        Stockpilez -.-> SP_Pipeline[DATAZ Pane<br>DOM: panePipeline]
        Stockpilez -.-> SP_Simple[EDITZ Pane<br>DOM: paneSimple]
        
        SP_Inventory --> SnapshotManagerModal[Snapshot Manager Modal<br>Btn: 🗂️ SNAPSHOTS]
        SP_Inventory --> CycleCountManagerModal[Cycle Count Manager Modal<br>Btn: 🔄 CYCLE COUNTS]
        SP_Inventory --> VelocityzModal[Map Unknown SKU Modal<br>Btn: ⏳ VELOCITYZ]
        SP_Inventory --> GlobalLeadModal[Global Lead Editor Modal<br>Btn: ✏️ EDIT GLOBAL LEAD]
        SP_Inventory --> LowStockzReport[Low Stockz Report Trigger<br>Btn: 📉 LOW STOCKZ REPORT]
        SP_Inventory --> ResetStockLevels[Reset Stock Levels Trigger<br>Btn: ⚠️ RESET STOCK LEVELS]
        
        SP_Simple --> EditzBulkModal[EDITZ BULK STAGING Modal<br>Btn: Bulk Edit]
    end
    
    subgraph H2 [MAKERZ HUB Architecture]
        Makerz[MAKERZ Hub<br>DOM: makerz-tab] -.-> MK_Builder[RECIPEZ Pane<br>DOM: paneProdBuilder]
        Makerz -.-> MK_Control[BATCHEZ Pane<br>DOM: paneProdControl]
        Makerz -.-> MK_Print[LAYERZ Pane<br>DOM: paneProdPrint]
        
        MK_Builder --> RecipeModal[Recipe Action Modal<br>Btn: + CREATE]
        MK_Builder --> RecipeManagerModal[RECIPE MANAGER STAGING Modal<br>Btn: 🛠️ MANAGER]
        MK_Builder --> BulkAddModal[Bulk Add Modal<br>Btn: BULK ADD]
        
        MK_Control --> NewWOModal[Start Production Batch Modal<br>Btn: + CreateBatch]
        MK_Control --> MultiBatchModal[Multi-Item Batch Estimator Modal<br>Btn: + BatchOrder]
        MK_Control --> SOPMasterModal_Prod[SOP EDITOR Modal<br>Btn: BATCHEZ SOP EDITOR]
        MK_Control --> DraftScrapModal[Draft Scrap Modal<br>Btn: Update Scrap Tally]
        MK_Control --> ArchiveExplorerModal_Bat[Archive Explorer Modal<br>Btn: 🗄️ Archives]
        
        MK_Print --> ManualPrintModal[Manual Print Modal<br>Btn: + PRINTBATCH]
        MK_Print --> MultiBatchModal_3d[Multi-Item Batch Estimator Modal<br>Btn: + BatchOrder]
        MK_Print --> SOPMasterModal_Print[SOP EDITOR Modal<br>Btn: LAYERZ SOP EDITOR]
        MK_Print --> ArchiveExplorerModal_Lay[Archive Explorer Modal<br>Btn: 🗄️ Archives]
    end
    
    subgraph H3 [FULFILLZ HUB Architecture]
        Fulfillz[FULFILLZ Hub<br>DOM: fulfillz-tab] -.-> FZ_Packerz[PACKERZ Pane<br>DOM: paneFulfillzPackerz]
        Fulfillz -.-> FZ_Barcodz[BARCODZ Pane<br>DOM: paneFulfillzBarcodz]
        Fulfillz -.-> FZ_Labelz[LABELZ Pane<br>DOM: paneFulfillzLabelz]
        
        FZ_Packerz --> SOPMasterModal_Pack[SOP EDITOR Modal<br>Btn: PACKERZ SOP EDITOR]
        FZ_Packerz --> PackerzArchiveModal[Archive Explorer Modal<br>Btn: 🗄️ Archives]
        
        FZ_Barcodz --> PaperSettingsModal_Bar[Paper Profile Modal<br>Btn: ⚙️ PAPER SETTINGS]
        FZ_Barcodz --> PrintBatchModal_Bar[Execute Batch Print Trigger<br>Btn: 🖨️ PRINT BATCH]
        
        FZ_Labelz --> CreateLabelModal[Create Label Modal<br>Btn: + NEW LABEL]
        FZ_Labelz --> PaperSettingsModal_Lab[Paper Profile Modal<br>Btn: ⚙️ PAPER SETTINGS]
        FZ_Labelz --> PrintBatchModal_Lab[Execute Batch Print Trigger<br>Btn: 🖨️ PRINT BATCH]
    end
    
    subgraph H4 [REVENUEZ HUB Architecture]
        Revenuez[REVENUEZ Hub<br>DOM: revenuez-tab] -.-> RV_Bridge[ORDERZ Pane<br>DOM: paneSalezBridge]
        Revenuez -.-> RV_Analyticz[STATZ Pane<br>DOM: paneSalezAnalyticz]
        Revenuez -.-> RV_Commandz[SIMULATORZ Pane<br>DOM: paneSalezCommandz]
        
        RV_Bridge --> ActualNetModal[Actual Net Breakdown Modal<br>Btn: ACTUAL NET]
        RV_Commandz --> CeoAddModal[CEO Terminal Modal<br>Btn: +PRODUCT ANALYSIS]
        RV_Commandz --> LtvModal[Cohort Intelligence Modal<br>Btn: LTV]
    end
    
    subgraph H5 [SOCIALZ HUB Architecture]
        Socialz[SOCIALZ Hub<br>DOM: socialz-tab] -.-> SZ_Roster[ROSTER Pane<br>DOM: paneSocialzRoster]
        
        SZ_Roster --> SkaterModal[Profile Information Modal<br>Btn: Open Skater]
    end
    
    subgraph H6 [NEXUZ HUB Architecture]
        Nexuz[NEXUZ Hub<br>DOM: nexuz-tab] -.-> NX_Importz[IMPORTZ Pane<br>DOM: paneNexuzImportz]
        Nexuz -.-> NX_Salez[SALEZ Pane<br>DOM: paneNexuzSalez]
        Nexuz -.-> NX_Brainz[BRAINZ Pane<br>DOM: paneNexuzBrainz]
        
        NX_Salez --> AliasModal[Alias Modal<br>Btn: + ADD NEW]
    end
```
