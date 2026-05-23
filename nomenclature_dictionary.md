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
graph TD
    App[index.html SPA]
    
    %% Global
    App --> TipzModal[Tipz Modal <br> 💡 Global Header]
    
    %% STOCKPILEZ HUB
    App --> Stockpilez[STOCKPILEZ Hub<br>DOM: stockpilez-tab]
    Stockpilez -.-> SP_Landing[stockpilezHubLanding]
    Stockpilez -.-> SP_Pipeline[panePipeline]
    Stockpilez -.-> SP_Simple[paneSimple]
    Stockpilez -.-> SP_Inventory[paneInventory]
    
    SP_Simple --> EditzBulkModal[EditzBulk Modal]
    SP_Inventory --> VelocityzModal[Velocityz Modal]
    
    %% MAKERZ HUB
    App --> Makerz[MAKERZ Hub<br>DOM: makerz-tab]
    Makerz -.-> MK_Landing[makerzHubLanding]
    Makerz -.-> MK_Builder[paneProdBuilder]
    Makerz -.-> MK_Control[paneProdControl]
    Makerz -.-> MK_Print[paneProdPrint]
    
    MK_Builder --> RecipeModal[Recipe Modal]
    MK_Builder --> BulkAddModal[Bulk Add Modal]
    MK_Control --> NewWOModal[New WO Modal]
    MK_Control --> MultiBatchModal[Multi Batch Modal]
    MK_Control --> SOPMasterModal[SOP Master Modal]
    MK_Control --> DraftScrapModal[Draft Scrap Modal]
    MK_Print --> ManualPrintModal[Manual Print Modal]
    
    %% FULFILLZ HUB
    App --> Fulfillz[FULFILLZ Hub<br>DOM: fulfillz-tab]
    Fulfillz -.-> FZ_Packerz[paneFulfillzPackerz]
    Fulfillz -.-> FZ_Barcodz[paneFulfillzBarcodz]
    Fulfillz -.-> FZ_Labelz[paneFulfillzLabelz]
    
    FZ_Packerz --> SOPMasterModal
    FZ_Labelz --> CreateLabelModal[Create Label Modal]
    
    %% REVENUEZ HUB
    App --> Revenuez[REVENUEZ Hub<br>DOM: revenuez-tab]
    Revenuez -.-> RV_Landing[revenuezHubLanding]
    Revenuez -.-> RV_Bridge[paneSalezBridge]
    Revenuez -.-> RV_Analyticz[paneSalezAnalyticz]
    Revenuez -.-> RV_Commandz[paneSalezCommandz]
    
    RV_Bridge --> ActualNetModal[Actual Net Modal]
    RV_Commandz --> CeoAddModal[CEO Add Modal]
    RV_Commandz --> LtvModal[LTV Modal]
    
    %% SOCIALZ HUB
    App --> Socialz[SOCIALZ Hub<br>DOM: socialz-tab]
    Socialz -.-> SZ_Roster[paneSocialzRoster]
    
    SZ_Roster --> SkaterModal[Skater Modal]
    
    %% NEXUZ HUB
    App --> Nexuz[NEXUZ Hub<br>DOM: nexuz-tab]
    Nexuz -.-> NX_Landing[nexuzHubLanding]
    Nexuz -.-> NX_Importz[paneNexuzImportz]
    Nexuz -.-> NX_Salez[paneNexuzSalez]
    Nexuz -.-> NX_Brainz[paneNexuzBrainz]
    
    NX_Salez --> AliasModal[Alias Modal]
```
