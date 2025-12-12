// content.js - SMART & CRASH-PROOF

// Prevent double-loading
if (window.hasNetraRun) {
    console.log("Netra: Already active.");
} else {
    window.hasNetraRun = true;
    initNetra();
}

function initNetra() {
    console.log("Netra: Engine Started.");

    let keyMap = {}; 
    let isTeachMode = false;
    let banner = null; 

    // --- 1. SAFE STORAGE LOADER ---
    function loadSettings() {
        // Safety check to prevent crashing if extension updates
        if (!chrome || !chrome.storage || !chrome.storage.sync) return;

        try {
            chrome.storage.sync.get(['userSettings'], (result) => {
                if (chrome.runtime.lastError) return;
                const settings = result.userSettings || {};
                keyMap = {};
                for (const [id, config] of Object.entries(settings)) {
                    if (config.char && config.element) {
                        const shortcutId = `alt+${config.char.toLowerCase()}`;
                        keyMap[shortcutId] = { id: id, action: config.label, element: config.element };
                    }
                }
                console.log("Netra Keys:", Object.keys(keyMap));
            });
        } catch (e) { console.warn("Netra: Context invalid, waiting for reload."); }
    }

    // Listener for live updates
    try {
        chrome.storage.onChanged.addListener(() => {
            loadSettings();
            speak("Updated.");
        });
    } catch(e) {}

    // --- 2. SMART SELECTOR ENGINE (Self-Healing) ---
    function getUniqueSelector(el) {
        // A. GOLD STANDARD: Accessibility Attributes (Stable)
        if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
        if (el.getAttribute('name')) return `[name="${el.name}"]`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        if (el.getAttribute('title')) return `[title="${el.getAttribute('title')}"]`;
        
        // B. SILVER STANDARD: Text Content (Simple buttons)
        // If it's a button with unique text like "Submit Order", trust it.
        if ((el.tagName === 'BUTTON' || el.tagName === 'A') && el.innerText && el.innerText.length < 20) {
             // We prioritize attributes, but text can be a backup logic if implemented with xpath.
             // For CSS selectors, we stick to attributes.
        }

        // C. BRONZE STANDARD: IDs (Filtered)
        // Only use ID if it looks human-made (no numbers, no colons)
        if (el.id) {
            if (!/[:.]/.test(el.id) && !/\d{3,}/.test(el.id)) {
                return `#${el.id}`;
            }
        }

        // D. FALLBACK: Stable Classes
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(/\s+/).filter(c => {
                return c.length > 4 && !/\d/.test(c) && !c.includes(':');
            });
            if (classes.length > 0) return `.${classes[0]}`; 
        }
        
        // E. LAST RESORT: DOM Path
        return getDomPath(el);
    }

    // Helper for path
    function getDomPath(el) {
        if (!(el instanceof Element)) return;
        const path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id && !/\d/.test(el.id) && !selector.includes(':')) {
                selector += '#' + el.id;
                path.unshift(selector);
                break;
            } else {
                let sib = el, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector) nth++;
                }
                if (nth != 1) selector += ":nth-of-type("+nth+")";
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(" > ");
    }

    function getLabel(el) {
        return el.getAttribute('aria-label') || el.innerText || el.placeholder || "Button";
    }

    // --- 3. UI FEEDBACK ---
    function toggleBanner(show) {
        if (show) {
            if (!banner) {
                banner = document.createElement('div');
                banner.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 50px;
                    background: #e74c3c; color: white; z-index: 2147483647;
                    display: flex; align-items: center; justify-content: center;
                    font-family: sans-serif; font-weight: bold; font-size: 18px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.5); pointer-events: none;
                `;
                banner.innerText = "🎓 TEACH MODE ON - Tab to element & Press Key";
                document.body.appendChild(banner);
            }
            banner.style.display = 'flex';
        } else {
            if (banner) banner.style.display = 'none';
        }
    }

    function speak(text) {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(msg);
        }
    }

    // --- 4. TEACH LOGIC ---
    function toggleTeachMode() {
        isTeachMode = !isTeachMode;
        toggleBanner(isTeachMode);
        speak(isTeachMode ? "Teach Mode On" : "Teach Mode Off");
    }

    function handleInstantTeach(event) {
        const char = event.key.toLowerCase();
        if (!/^[a-z0-9]$/.test(char)) return; 

        const focusedEl = document.activeElement;
        
        if (!focusedEl || focusedEl === document.body) {
            speak("Please Tab to a button first.");
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        // Highlight Gold
        const oldOutline = focusedEl.style.outline;
        focusedEl.style.outline = "5px solid #FFD700";
        setTimeout(() => focusedEl.style.outline = oldOutline, 1000);

        // Safe Save
        if (chrome && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['userSettings'], (result) => {
                let settings = result.userSettings || {};
                
                // Clear old key
                for (const [id, config] of Object.entries(settings)) {
                    if (config.char === char) delete settings[id];
                }

                const newId = Date.now().toString();
                // USE SMART SELECTOR HERE
                const smartSelector = getUniqueSelector(focusedEl);

                settings[newId] = { 
                    label: getLabel(focusedEl), 
                    element: smartSelector, 
                    char: char 
                };

                chrome.storage.sync.set({ userSettings: settings }, () => {
                    speak(`Saved. ${char.toUpperCase()} assigned.`);
                    toggleTeachMode(); // Auto-off
                });
            });
        }
    }

    function triggerAction(config) {
        const el = document.querySelector(config.element);
        if (!el) {
            speak(`Element not found.`);
            return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '5px solid #00FF00';
        setTimeout(() => el.style.outline = '', 500);
        el.click();
        el.focus();
        speak(`Clicking ${config.action}`);
    }

    // --- 5. KEY LISTENER ---
    window.addEventListener('keydown', (event) => {
        try { if (!chrome.runtime || !chrome.runtime.id) return; } catch(e) { return; }

        // A. Toggle Teach (Shift+Alt+T)
        if (event.altKey && event.shiftKey && event.key.toLowerCase() === 't') {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleTeachMode();
            return;
        }

        // B. Teach Input
        if (isTeachMode) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.key === 'Escape') toggleTeachMode();
            else if (!event.altKey && !event.ctrlKey) handleInstantTeach(event);
            return;
        }

        // C. Trigger Shortcut
        if (event.altKey) {
            const char = event.key.toLowerCase();
            const shortcutId = `alt+${char}`;
            if (keyMap[shortcutId]) {
                event.preventDefault();
                event.stopImmediatePropagation();
                triggerAction(keyMap[shortcutId]);
            }
        }
    }, true);

    loadSettings();
}