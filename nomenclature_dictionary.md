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
    App --> TipzModal[Tipz Modal <br> 💡 Global Header]
    App --> TaskPlannerModal[Task Planner Modal <br> 🎯 Global Header]
    
    %% STOCKPILEZ HUB
    App --> Stockpilez[STOCKPILEZ Hub<br>DOM: stockpilez-tab]
    Stockpilez -.-> SP_Pipeline[DATAZ Pane<br>DOM: panePipeline]
    Stockpilez -.-> SP_Simple[EDITZ Pane<br>DOM: paneSimple]
    Stockpilez -.-> SP_Inventory[STOCKZ Pane<br>DOM: paneInventory]
    
    SP_Simple --> EditzBulkModal[EditzBulk Modal]
    SP_Inventory --> VelocityzModal[Velocityz Modal]
    
    %% MAKERZ HUB
    App --> Makerz[MAKERZ Hub<br>DOM: makerz-tab]
    Makerz -.-> MK_Builder[RECIPEZ Pane<br>DOM: paneProdBuilder]
    Makerz -.-> MK_Control[BATCHEZ Pane<br>DOM: paneProdControl]
    Makerz -.-> MK_Print[LAYERZ Pane<br>DOM: paneProdPrint]
    
    MK_Builder --> RecipeModal[Recipe Modal]
    MK_Builder --> BulkAddModal[Bulk Add Modal]
    MK_Control --> NewWOModal[New WO Modal]
    MK_Control --> MultiBatchModal[Multi Batch Modal]
    MK_Control --> SOPMasterModal[SOP Master Modal]
    MK_Control --> DraftScrapModal[Draft Scrap Modal]
    MK_Print --> ManualPrintModal[Manual Print Modal]
    
    %% FULFILLZ HUB
    App --> Fulfillz[FULFILLZ Hub<br>DOM: fulfillz-tab]
    Fulfillz -.-> FZ_Packerz[PACKERZ Pane<br>DOM: paneFulfillzPackerz]
    Fulfillz -.-> FZ_Barcodz[BARCODZ Pane<br>DOM: paneFulfillzBarcodz]
    Fulfillz -.-> FZ_Labelz[LABELZ Pane<br>DOM: paneFulfillzLabelz]
    
    FZ_Packerz --> SOPMasterModal
    FZ_Labelz --> CreateLabelModal[Create Label Modal]
    
    %% REVENUEZ HUB
    App --> Revenuez[REVENUEZ Hub<br>DOM: revenuez-tab]
    Revenuez -.-> RV_Bridge[ORDERZ Pane<br>DOM: paneSalezBridge]
    Revenuez -.-> RV_Analyticz[STATZ Pane<br>DOM: paneSalezAnalyticz]
    Revenuez -.-> RV_Commandz[SIMULATORZ Pane<br>DOM: paneSalezCommandz]
    
    RV_Bridge --> ActualNetModal[Actual Net Modal]
    RV_Commandz --> CeoAddModal[CEO Add Modal]
    RV_Commandz --> LtvModal[LTV Modal]
    
    %% SOCIALZ HUB
    App --> Socialz[SOCIALZ Hub<br>DOM: socialz-tab]
    Socialz -.-> SZ_Roster[ROSTER Pane<br>DOM: paneSocialzRoster]
    
    SZ_Roster --> SkaterModal[Skater Modal]
    
    %% NEXUZ HUB
    App --> Nexuz[NEXUZ Hub<br>DOM: nexuz-tab]
    Nexuz -.-> NX_Importz[IMPORTZ Pane<br>DOM: paneNexuzImportz]
    Nexuz -.-> NX_Salez[SALEZ Pane<br>DOM: paneNexuzSalez]
    Nexuz -.-> NX_Brainz[BRAINZ Pane<br>DOM: paneNexuzBrainz]
    
    NX_Salez --> AliasModal[Alias Modal]
```
