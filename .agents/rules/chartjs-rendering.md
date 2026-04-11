---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
trigger: "always_on"
---

# Skill: Chart.js Rendering

When instructed to deploy data visualizations, modify the CFO Waterfall charts, or inject new `<canvas>` reporting grids, you must deploy these strict Chart.js skills to prevent rendering collisions in our vanilla architecture:

1. **The Destruction Mandate (Anti-Ghosting)**:
   - You must never instantiate `new Chart()` on a canvas without first checking if an instance already exists.
   - If you overwrite a canvas without calling `.destroy()` on the existing chart instance, Chart.js will trigger a "ghosting" bug where the old chart flashes when the user hovers over it.
   - *Implementation*: Store your active chart in a global or scoped variable (e.g., `let activeCfoChart = null`). Run `if (activeCfoChart) activeCfoChart.destroy();` before rendering.

2. **Canvas ID Namespace Guarding**:
   - If building multiple dashboards that share a single `.html` view, you must enforce incredibly unique canvas IDs (e.g., `canvas_cfo_waterfall_june` instead of `chart_canvas`).
   
3. **Data Mutation Methodology**:
   - Rather than destroying and completely redrawing a chart for minor data tweaks (like changing a single metric), target the exact dataset array:
     `activeCfoChart.data.datasets[0].data = newDataArray;`
     `activeCfoChart.update();`
