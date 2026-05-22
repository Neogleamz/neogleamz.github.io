# Responsive Flex QA Framework

Develop a standardized testing protocol to test every page and modal at varying desktop/mobile resolutions, ensuring 100% adherence to pure Flex standards.

### Design Decisions & Rationale
To strictly adhere to the Vanilla Exclusivity rule while fulfilling your requirement that **I (the AI)** can thoroughly analyze the results, we will build a pure-web `qa-dashboard.html` equipped with an **Automated DOM Diagnostics Scanner**. 

Instead of relying on me taking screenshots (which can be unreliable for AI vision), this Vanilla JS scanner will autonomously cycle the `iframe` through the requested granular resolutions (1440p down to 720p with multiple intermediate steps, plus tablets/mobile). At each step, it will use `getBoundingClientRect()` to mathematically calculate horizontal overflows, parent-child clipping, and flex collisions. It will then spit out a precise JSON/Markdown report of exactly which DOM IDs broke at which resolution. I can then read that report and surgically fix the CSS in `index.css`.

## Proposed Changes

### QA Tooling & AI Scanner
#### [NEW] [qa-dashboard.html](file:///d:/GitHub/neogleamz.github.io/qa-dashboard.html)
- Create a standalone dashboard UI with an `iframe` target loading `./index.html`.
- **Target Breakpoints**:
  - Desktop: 2560x1440, 1920x1080, 1600x900, 1366x768, 1280x720, plus 3 intermediate steps between each major gap to ensure fluid scaling without dead zones.
  - Tablet: iPad Pro (1024x1366), Android Tablet (800x1280).
  - Mobile: iPhone 15 Pro, Pixel 8, iPhone SE.
- **The AI Scanner Logic**: A built-in Vanilla JS engine that cycles through every resolution, injecting a diagnostic script into the iframe that checks for:
  - `scrollWidth > clientWidth` (Hidden overflows).
  - Child elements structurally violating parent boundaries.
  - Buttons or headers pushed off-screen.
- The tool will compile a final text report on the screen.

### Core System CSS Audit
#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Extract hardcoded `width`/`height` pixel values in the primary structural classes.
- Implement root typography scaling via `clamp()`.
- (The actual CSS fixes will be executed in a follow-up step *after* we run the newly built QA tool and analyze the diagnostic report).

## Verification Plan

### Automated AI Verification
1. Once built, I will ask you to open `qa-dashboard.html`, click "Run AI Diagnostics", and paste the resulting text report back to me (or I can write a tiny script to read it directly from the console).
2. I will use that data to formulate the exact CSS Flexbox fixes.
