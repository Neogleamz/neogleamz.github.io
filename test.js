
        const frame = document.getElementById('target-frame');
        const select = document.getElementById('viewport-select');
        const btnResize = document.getElementById('btn-resize');
        const btnScan = document.getElementById('btn-scan');
        const btnCycle = document.getElementById('btn-cycle');
        const btnDeepScan = document.getElementById('btn-deep-scan');
        const btnClear = document.getElementById('btn-clear');
        const chkTurbo = document.getElementById('chk-turbo');
        const reportPanel = document.getElementById('report-panel');
        const statusEl = document.getElementById('status');

        let isAutoCycling = false;
        let globalErrorsFound = 0;

        function logToPanel(msg, type = 'error') {
            const div = document.createElement('div');
            let cls = 'log-entry';
            if (type === 'info') cls += ' log-info';
            if (type === 'success') cls += ' log-success';
            div.className = cls;
            div.innerHTML = msg; // allow basic HTML formatting
            reportPanel.prepend(div);
        }

        btnClear.addEventListener('click', () => {
            reportPanel.innerHTML = '<div class="log-entry log-info">Logs cleared.</div>';
            globalErrorsFound = 0;
        });

        function setViewport(w, h) {
            frame.width = w;
            frame.height = h;
            statusEl.textContent = `Viewport active: ${w}px \u00d7 ${h}px`;
            
            // Auto-scale iframe so you can see the whole thing, even if it's 2560px wide!
            const container = document.querySelector('.iframe-container');
            const scaleW = (container.clientWidth - 40) / w; 
            const scaleH = (container.clientHeight - 40) / h;
            let scale = Math.min(scaleW, scaleH);
            if (scale > 1) scale = 1; // Never scale above 100%
            
            frame.style.transform = `scale(${scale})`;
            frame.style.transformOrigin = 'top center';
        }

        window.addEventListener('resize', () => {
            const [w, h] = select.value.split('x');
            setViewport(w, h);
        });

        btnResize.addEventListener('click', () => {
            const [w, h] = select.value.split('x');
            setViewport(w, h);
        });

        // The AI Diagnostics Scanner Logic
        async function runScannerForCurrentViewport() {
            logToPanel(`[🔍 Scanning] Executing geometric pass at <strong>${frame.width}x${frame.height}</strong>...`, 'info');
            return new Promise((resolve) => {
                try {
                    const doc = frame.contentWindow.document;
                    if(!doc || !doc.body) {
                        logToPanel(`CORS Error: Cannot read iframe DOM. Ensure you are running on 127.0.0.1.`, 'error');
                        return resolve(false);
                    }
                    
                    let localIssues = 0;
                    
                    // 1. Check root document horizontal overflow
                    if (doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 5) {
                        logToPanel(`[${frame.width}x${frame.height}] <strong>CRITICAL:</strong> Document horizontal overflow! (Scroll: ${doc.documentElement.scrollWidth}px, Client: ${doc.documentElement.clientWidth}px)`);
                        localIssues++;
                    }

                    let emptySpaceIssues = 0;
                    
                    // 2. Iterate all elements for nested collisions & density checks
                    const allNodes = doc.querySelectorAll('div, section, header, nav, button, input, table');
                    allNodes.forEach(node => {
                        // Ignore hidden elements
                        const style = frame.contentWindow.getComputedStyle(node);
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
                        
                        const rect = node.getBoundingClientRect();
                        const parent = node.parentElement;
                        
                        // Ignore non-rendered geometry
                        if (rect.width === 0 || rect.height === 0) return;

                        // Tap Target Density Check (Mobile constraints)
                        if ((node.tagName === 'BUTTON' || node.tagName === 'INPUT') && frame.width <= 768) {
                            if (rect.width < 44 || rect.height < 44) {
                                logToPanel(`[${frame.width}x${frame.height}] <strong>Usability:</strong> Tap target too small on &lt;${node.tagName.toLowerCase()} id="${node.id || ''}" class="${node.className}"&gt; (${rect.width}x${rect.height}). Recommended 44x44px.`, 'info');
                                localIssues++;
                            }
                        }

                        // Wasted Space / Low Density Check
                        if (['DIV', 'SECTION', 'MAIN'].includes(node.tagName) && rect.width > 300 && rect.height > 200) {
                            // Calculate children area
                            let childrenArea = 0;
                            let childCount = 0;
                            Array.from(node.children).forEach(child => {
                                const cStyle = frame.contentWindow.getComputedStyle(child);
                                if (cStyle.position !== 'absolute' && cStyle.display !== 'none') {
                                    const cRect = child.getBoundingClientRect();
                                    childrenArea += (cRect.width * cRect.height);
                                    childCount++;
                                }
                            });
                            
                            const nodeArea = rect.width * rect.height;
                            if (childCount > 0 && nodeArea > 0) {
                                const density = (childrenArea / nodeArea) * 100;
                                if (density < 15) { // If content takes up less than 15% of a large container
                                    logToPanel(`[${frame.width}x${frame.height}] <strong>Layout Density:</strong> &lt;${node.tagName.toLowerCase()} class="${node.className}"&gt; has excessive wasted space (Density: ${density.toFixed(1)}%). Consider flexing children or adjusting width.`, 'info');
                                    emptySpaceIssues++;
                                }
                            }
                        }

                        // Check horizontal overflow of container
                        if (node.scrollWidth > node.clientWidth && style.overflowX !== 'auto' && style.overflowX !== 'scroll' && style.overflow !== 'hidden') {
                            // Text inputs often have scrollWidth > clientWidth, ignore them
                            if (node.tagName !== 'INPUT' && node.tagName !== 'TEXTAREA') {
                                logToPanel(`[${frame.width}x${frame.height}] <strong>Internal Overflow:</strong> &lt;${node.tagName.toLowerCase()} id="${node.id}" class="${node.className}"&gt; is hiding content (Scroll: ${node.scrollWidth}px > Client: ${node.clientWidth}px).`);
                                localIssues++;
                            }
                        }

                        // Check boundary violation (child breaching parent)
                        if (parent) {
                            const parentRect = parent.getBoundingClientRect();
                            if (parentRect.width > 0) {
                                // 5px tolerance for border box anomalies
                                if (rect.right > parentRect.right + 5) {
                                    const ignoreTags = ['BODY', 'HTML', 'MAIN'];
                                    if (!ignoreTags.includes(node.tagName) && !ignoreTags.includes(parent.tagName)) {
                                        logToPanel(`[${frame.width}x${frame.height}] <strong>Boundary Breach:</strong> &lt;${node.tagName.toLowerCase()} id="${node.id || ''}" class="${node.className}"&gt; clipped right edge of parent &lt;${parent.tagName.toLowerCase()} class="${parent.className}"&gt;.`);
                                        localIssues++;
                                    }
                                }
                            }
                        }
                    });

                    if (localIssues === 0 && emptySpaceIssues === 0) {
                        logToPanel(`[${frame.width}x${frame.height}] ✅ Clean geometry. Optimal layout density.`, 'success');
                    }
                    
                    globalErrorsFound += localIssues;
                    resolve(true);

                } catch (e) {
                    logToPanel(`Error accessing iframe DOM. Are we strictly on a local HTTP server? (${e.message})`, 'error');
                    resolve(false);
                }
            });
        }

        btnScan.addEventListener('click', async () => {
            await runScannerForCurrentViewport();
        });

        const sleep = ms => new Promise(r => setTimeout(r, ms));

        btnCycle.addEventListener('click', async () => {
            if (isAutoCycling) return;
            isAutoCycling = true;
            btnCycle.textContent = "Cycling (Do not touch)...";
            btnCycle.disabled = true;
            
            globalErrorsFound = 0;
            logToPanel(`--- <strong>INITIATING AUTOMATED AI AUDIT</strong> ---`, 'info');

            // Select all options across optgroups
            const options = Array.from(document.querySelectorAll('#viewport-select option')).map(opt => opt.value);
            const isTurbo = chkTurbo.checked;

            for (const res of options) {
                const [w, h] = res.split('x');
                select.value = res;
                setViewport(w, h);
                await sleep(isTurbo ? 250 : 1200);
                await runScannerForCurrentViewport();
                await sleep(isTurbo ? 50 : 400);
            }

            logToPanel(`--- <strong>AUDIT COMPLETE</strong> ---<br>Total Layout Violations Detected: ${globalErrorsFound}`, globalErrorsFound > 0 ? 'error' : 'success');
            
            btnCycle.textContent = "Auto-Cycle View";
            btnCycle.disabled = false;
            isAutoCycling = false;
        });

        btnDeepScan.addEventListener('click', async () => {
            if (isAutoCycling) return;
            
            try {
                const doc = frame.contentWindow.document;
                
                // Instead of getComputedStyle which might fail or be tricky, let's just check if the tab buttons exist!
                // If there are tab buttons, we are logged in.
                const tabs = Array.from(doc.querySelectorAll('.tab-btn'));
                if (tabs.length === 0) {
                    logToPanel("Error: No Hub tabs found. Are you logged in?", "error");
                    alert("Please log into the application inside the iframe first!");
                    return;
                }

                isAutoCycling = true;
                btnDeepScan.textContent = "DEEP SCAN RUNNING (Do not touch)...";
                btnDeepScan.disabled = true;
                
                globalErrorsFound = 0;
                logToPanel(`--- <strong>INITIATING MASSIVE DEEP SCAN (ALL HUBS)</strong> ---`, 'info');

                const options = Array.from(document.querySelectorAll('#viewport-select option')).map(opt => opt.value);
                const isTurbo = chkTurbo.checked;

                for (const tab of tabs) {
                    const hubName = tab.textContent.trim();
                    logToPanel(`<h2>Navigating to Hub: ${hubName}</h2>`, 'info');
                    
                    // Click the tab in the iframe
                    tab.click();
                    await sleep(isTurbo ? 600 : 1500); // Fast PCs can render hub data in 600ms

                    // Run the resolution cycler for this Hub
                    for (const res of options) {
                        const [w, h] = res.split('x');
                        select.value = res;
                        setViewport(w, h);
                        await sleep(isTurbo ? 150 : 1000); // Layout reflow takes barely ~30ms on modern PCs
                        await runScannerForCurrentViewport();
                        await sleep(isTurbo ? 50 : 200);
                    }
                }

                logToPanel(`--- <strong>DEEP SCAN COMPLETE</strong> ---<br>Total Layout Violations Detected Globally: ${globalErrorsFound}`, globalErrorsFound > 0 ? 'error' : 'success');
                
            } catch (err) {
                logToPanel(`FATAL ERROR in Deep Scan: ${err.message}`, 'error');
                console.error(err);
            } finally {
                btnDeepScan.textContent = "🚀 DEEP SCAN (All Hubs)";
                btnDeepScan.disabled = false;
                isAutoCycling = false;
            }
        });

        // Initialize viewport on load
        window.onload = () => {
            const [w, h] = select.value.split('x');
            setViewport(w, h);
        };
    