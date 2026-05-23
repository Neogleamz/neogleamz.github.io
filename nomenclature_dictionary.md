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
    App[index.html SPA]
    
    %% Global Header Modals
    App --> TipzModal[Tipz Board & Suggestions <br> 💡 Global Header]
    App --> TaskPlannerModal[Manage Tags <br> 🎯 Global Header]
    
    %% STOCKPILEZ HUB
    App --> Stockpilez[STOCKPILEZ Hub<br>DOM: stockpilez-tab]
    Stockpilez -.-> SP_Pipeline[DATAZ Pane<br>DOM: panePipeline]
    Stockpilez -.-> SP_Simple[EDITZ Pane<br>DOM: paneSimple]
    Stockpilez -.-> SP_Inventory[STOCKZ Pane<br>DOM: paneInventory]
    
    SP_Simple --> EditzBulkModal[EDITZ BULK STAGING Modal<br>Btn: Bulk Edit]
    SP_Inventory --> VelocityzModal[Map Unknown SKU Modal<br>Btn: Velocityz]
    
    %% MAKERZ HUB
    App --> Makerz[MAKERZ Hub<br>DOM: makerz-tab]
    Makerz -.-> MK_Builder[RECIPEZ Pane<br>DOM: paneProdBuilder]
    Makerz -.-> MK_Control[BATCHEZ Pane<br>DOM: paneProdControl]
    Makerz -.-> MK_Print[LAYERZ Pane<br>DOM: paneProdPrint]
    
    MK_Builder --> RecipeModal[Recipe Action Modal<br>Btn: + Create]
    MK_Builder --> BulkAddModal[Bulk Add Modal<br>Btn: Bulk Add]
    MK_Control --> NewWOModal[Start Production Batch Modal<br>Btn: + CreateBatch]
    MK_Control --> MultiBatchModal[Multi-Item Batch Estimator Modal<br>Btn: + BatchOrder]
    MK_Control --> SOPMasterModal[SOP EDITOR Modal<br>Btn: BATCHEZ SOP EDITOR]
    MK_Control --> DraftScrapModal[Draft Scrap Modal<br>Btn: Update Scrap Tally]
    MK_Print --> ManualPrintModal[Manual Print Modal<br>Btn: + PRINTBATCH]
    
    %% FULFILLZ HUB
    App --> Fulfillz[FULFILLZ Hub<br>DOM: fulfillz-tab]
    Fulfillz -.-> FZ_Packerz[PACKERZ Pane<br>DOM: paneFulfillzPackerz]
    Fulfillz -.-> FZ_Barcodz[BARCODZ Pane<br>DOM: paneFulfillzBarcodz]
    Fulfillz -.-> FZ_Labelz[LABELZ Pane<br>DOM: paneFulfillzLabelz]
    
    FZ_Packerz --> SOPMasterModal
    FZ_Labelz --> CreateLabelModal[Create Label Modal<br>Btn: + NEW LABEL]
    
    %% REVENUEZ HUB
    App --> Revenuez[REVENUEZ Hub<br>DOM: revenuez-tab]
    Revenuez -.-> RV_Bridge[ORDERZ Pane<br>DOM: paneSalezBridge]
    Revenuez -.-> RV_Analyticz[STATZ Pane<br>DOM: paneSalezAnalyticz]
    Revenuez -.-> RV_Commandz[SIMULATORZ Pane<br>DOM: paneSalezCommandz]
    
    RV_Bridge --> ActualNetModal[Actual Net Breakdown Modal<br>Btn: ACTUAL NET]
    RV_Commandz --> CeoAddModal[CEO Terminal Modal<br>Btn: +PRODUCT ANALYSIS]
    RV_Commandz --> LtvModal[Cohort Intelligence Modal<br>Btn: LTV]
    
    %% SOCIALZ HUB
    App --> Socialz[SOCIALZ Hub<br>DOM: socialz-tab]
    Socialz -.-> SZ_Roster[ROSTER Pane<br>DOM: paneSocialzRoster]
    
    SZ_Roster --> SkaterModal[Profile Information Modal<br>Btn: Open Skater]
    
    %% NEXUZ HUB
    App --> Nexuz[NEXUZ Hub<br>DOM: nexuz-tab]
    Nexuz -.-> NX_Importz[IMPORTZ Pane<br>DOM: paneNexuzImportz]
    Nexuz -.-> NX_Salez[SALEZ Pane<br>DOM: paneNexuzSalez]
    Nexuz -.-> NX_Brainz[BRAINZ Pane<br>DOM: paneNexuzBrainz]
    
    NX_Salez --> AliasModal[Alias Modal<br>Btn: + ADD NEW]
```
