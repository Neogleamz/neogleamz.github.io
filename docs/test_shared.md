`mermaid
graph LR
    subgraph Global [Global Header Triggers]
        TipzModal[TIPZ Modal<br>Btn: 💡 TIPZ]
        TaskzModal[TASKZ Modal<br>Btn: 🎯 TASKZ] -.-> TaskzBoardActions[Kanban & Task Actions<br>Btns: Create, Archive, Status...]
    end
    
    subgraph H1 [STOCKPILEZ HUB Architecture]
        Stockpilez[STOCKPILEZ Hub] -.-> SP_Inventory[STOCKZ Pane]
        SP_Inventory --> SnapshotManagerModal[Snapshot Manager Modal]
    end
    
    subgraph H2 [MAKERZ HUB Architecture]
        Makerz[MAKERZ Hub] -.-> MK_Control[BATCHEZ Pane]
        MK_Control --> ArchiveExplorerModal_Bat[Archive Explorer Modal]
    end
    
    subgraph H3 [FULFILLZ HUB Architecture]
        Fulfillz[FULFILLZ Hub] -.-> FZ_Packerz[PACKERZ Pane]
        FZ_Packerz --> PackerzArchiveModal[Archive Explorer Modal]
    end

    ArchiveExplorerModal_Bat -.-> SharedArchive[Shared: Archive Explorer]
    PackerzArchiveModal -.-> SharedArchive
`