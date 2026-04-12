---
name: chartjs_rendering
description: "Strict Vanilla JS rendering constraints, memory-management, and update methodologies for Chart.js."
trigger: "/chartjs, /charts, render chart, build chart"
---

# Chart.js Rendering Rule

When instructed to deploy data visualizations, modify dashboard charts, or inject new `<canvas>` reporting grids, you must adhere to these strict Chart.js constraints to prevent rendering collisions in our Vanilla JS architecture:

1. **Dependency Diet Check**:
   - Before implementing Chart.js for a new feature, verify it has already been approved for this project space. If not, trigger the *Dependency Diet & Anti-Bloat Protocol* first to justify its weight.

2. **The Destruction Mandate (Anti-Ghosting)**:
   - You must NEVER instantiate a `new Chart()` on a canvas without first checking if an instance already exists.
   - If you overwrite a canvas without calling `.destroy()` on the existing chart instance, Chart.js will trigger a "ghosting" memory-leak bug where the old chart flashes on hover.
   - *Implementation*: Store your active chart in a tightly scoped ES6 module variable or class property (e.g., `let activeDashboardChart = null;`). Run `if (activeDashboardChart) activeDashboardChart.destroy();` before rendering the new instance.

3. **Canvas ID Namespace Guarding**:
   - Because our application uses vanilla HTML views, you must enforce highly specific, unique canvas IDs to prevent DOM collisions (e.g., `<canvas id="chart_cfo_waterfall_june"></canvas>` instead of `<canvas id="chart_canvas"></canvas>`).
   
4. **Data Mutation Methodology (Performance)**:
   - Rather than destroying and completely redrawing a chart for minor real-time data tweaks, target the exact dataset array to trigger a CSS transition:
     `activeDashboardChart.data.datasets[0].data = newDataArray;`
     `activeDashboardChart.update();`