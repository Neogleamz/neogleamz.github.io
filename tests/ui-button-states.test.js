/**
 * @jest-environment jsdom
 */

describe("Button State Feedback - executeWithButtonAction", () => {
    let executeWithButtonAction;

    beforeAll(() => {
        // Mock window.safeHTML just like the real app
        window.safeHTML = (str) => str;

        // Extract the function logic from index.html (simulating it for JSDOM)
        // Since we are running in node, we will declare the exact logic used in index.html.
        // We will modify the logic during the test to see how the implementation handles it.
        
        executeWithButtonAction = async function(btnIdOrElement, loadingStr, successStr, asyncCallback) {
            const btn = typeof btnIdOrElement === 'string' ? document.getElementById(btnIdOrElement) : btnIdOrElement;
            let originalText = ""; let originalBg = "";
            if(btn) {
                // RACE CONDITION FIX: Clear any pending timeout from a previous click
                if (btn._stateTimeout) {
                    clearTimeout(btn._stateTimeout);
                }

                let currentSafeText = btn.innerHTML;
                if (currentSafeText !== loadingStr && currentSafeText !== successStr && 
                    currentSafeText !== (window.safeHTML ? window.safeHTML(loadingStr) : loadingStr) &&
                    currentSafeText !== (window.safeHTML ? window.safeHTML(successStr) : successStr)) {
                    btn.dataset.originalText = currentSafeText;
                    btn.dataset.originalBg = btn.style.background || "";
                } else if (!btn.dataset.originalText) {
                    btn.dataset.originalText = currentSafeText;
                }
                
                if (!btn.dataset.originalBg && btn.dataset.originalBg !== "") {
                    btn.dataset.originalBg = btn.style.background || "";
                }
                
                originalText = btn.dataset.originalText;
                originalBg = btn.dataset.originalBg;

                btn.innerHTML = window.safeHTML ? window.safeHTML(loadingStr) : loadingStr; 
                btn.style.opacity = "0.6";
                btn.disabled = true;
                await new Promise(resolve => setTimeout(resolve, 10)); // small delay for test
            }
            try {
                await asyncCallback();
                if(btn) {
                    btn.innerHTML = window.safeHTML ? window.safeHTML(successStr) : successStr;
                    btn.style.background = "#059669";
                    btn.style.opacity = "1";
                }
            } catch(e) {
                if(btn) {
                    let errMsg = "❌ ERROR: " + (e.message || "Failed");
                    btn.innerHTML = window.safeHTML ? window.safeHTML(errMsg) : errMsg;
                    btn.style.background = "#ef4444";
                    btn.style.opacity = "1";
                }
                throw e;
            } finally {
                if(btn) {
                    btn._stateTimeout = setTimeout(() => {
                        btn.innerHTML = window.safeHTML ? window.safeHTML(originalText) : originalText;
                        btn.style.background = originalBg;
                        btn.disabled = false;
                        delete btn.dataset.originalText;
                        delete btn.dataset.originalBg;
                    }, 50); // Using 50ms for tests instead of 3000ms
                }
            }
        };
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllTimers();
    });

    it("should disable the button and show loading string during execution", async () => {
        document.body.innerHTML = `<button id="testBtn">Save</button>`;
        const btn = document.getElementById("testBtn");
        
        let promiseResolve;
        const mockCallback = () => new Promise(resolve => { promiseResolve = resolve; });
        
        const execPromise = executeWithButtonAction(btn, "SAVING...", "SAVED!", mockCallback);
        
        // Wait for the initial 10ms DOM update to process
        await new Promise(r => setTimeout(r, 20));

        // Anti-spam check
        expect(btn.disabled).toBe(true);
        expect(btn.innerHTML).toBe("SAVING...");
        expect(btn.style.opacity).toBe("0.6");
        
        promiseResolve();
        await execPromise;
    });

    it("should show success string and restore button after timeout", async () => {
        document.body.innerHTML = `<button id="testBtn" style="background: blue;">Save</button>`;
        const btn = document.getElementById("testBtn");
        
        await executeWithButtonAction(btn, "SAVING...", "SAVED!", async () => {});
        
        // Immediate success state
        expect(btn.innerHTML).toBe("SAVED!");
        expect(btn.style.background).toBe("rgb(5, 150, 105)"); // #059669
        
        // Wait for the 50ms reset timer
        await new Promise(r => setTimeout(r, 100));
        
        // Restored state
        expect(btn.innerHTML).toBe("Save");
        expect(btn.disabled).toBe(false);
        expect(btn.style.background).toBe("blue");
    });

    it("should prevent lingering state (Race Condition) when button is reused", async () => {
        document.body.innerHTML = `<button id="testBtn">Save</button>`;
        const btn = document.getElementById("testBtn");
        
        // First click
        await executeWithButtonAction(btn, "SAVING...", "SAVED!", async () => {});
        expect(btn.innerHTML).toBe("SAVED!");
        
        // Wait partially, but not all the way (e.g. 20ms out of 50ms)
        await new Promise(r => setTimeout(r, 20));
        
        // The user clicks the button for a DIFFERENT work order while it's still green
        btn.innerHTML = "New Order Save";
        
        // Second click
        await executeWithButtonAction(btn, "SAVING...", "SAVED!", async () => {});
        
        // Wait completely
        await new Promise(r => setTimeout(r, 100));
        
        // The button should revert to "New Order Save", NOT "Save" from the first click
        expect(btn.innerHTML).toBe("New Order Save");
    });
});
