// content.js - SAFETY CHECK & SOFT DELETE

// 1. Context Safeguard
if (window.netraLoaded) {
    throw new Error("Netra: Already loaded on this page");
}
window.netraLoaded = true;

const isContextValid = () => {
    try {
        return !!chrome.runtime.id;
    } catch (e) {
        return false;
    }
};

console.log("Netra: Loaded and ready.");

// --- STATE VARIABLES ---
let isTeachMode = false;
let shortcuts = {};
let bannerEl = null;
let pendingConfirm = null; // Tracks overwrite attempts

// --- INITIAL LOAD ---
if (isContextValid()) {
    chrome.storage.sync.get(['userSettings'], (res) => {
        updateShortcutsMap(res.userSettings);
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.userSettings) {
            updateShortcutsMap(changes.userSettings.newValue);
        }
    });
}

// --- LOGIC: MAP SHORTCUTS WITH IDs ---
function updateShortcutsMap(settings) {
    shortcuts = {};
    if (!settings) return;
    
    const currentHost = window.location.hostname; 

    // We use Object.entries so we can capture the 'id' (key) of each setting
    Object.entries(settings).forEach(([id, item]) => {
        // Only load if matches current site AND has a char assigned
        if (item.char && item.element && currentHost.includes(item.url)) {
            shortcuts[item.char.toLowerCase()] = { ...item, id: id };
        }
    });
}

// --- HELPER: NORMALIZE KEY CODE ---
function getCodeChar(event) {
    if (event.code.startsWith('Key')) return event.code.slice(3).toLowerCase(); 
    if (event.code.startsWith('Digit')) return event.code.slice(5);
    return null;
}

// --- UI: BANNER ---
function createBanner() {
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-200%);
        background-color: #d93025; color: white; padding: 12px 24px;
        border-radius: 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600; font-size: 16px; letter-spacing: 0.5px;
        z-index: 2147483647; display: flex; align-items: center; gap: 10px;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: none;
    `;
    banner.innerHTML = `<span>🔴</span><span>Teach Mode ON &bull; Tab to button & Press Key</span>`;
    document.body.appendChild(banner);
    return banner;
}

function toggleTeachMode(forceState) {
    if (typeof forceState === 'boolean') {
        isTeachMode = forceState;
    } else {
        isTeachMode = !isTeachMode;
    }

    if (!bannerEl) bannerEl = createBanner();

    if (isTeachMode) {
        bannerEl.style.transform = "translateX(-50%) translateY(0)";
        document.body.style.cursor = "default";
        speak("Teach Mode On");
        pendingConfirm = null; // Reset any pending confirmations
    } else {
        bannerEl.style.transform = "translateX(-50%) translateY(-200%)";
        document.body.style.cursor = "default";
    }
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.1; 
    window.speechSynthesis.speak(msg);
}

function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
    if (el.name) return `[name="${el.name}"]`;
    if (el.className && typeof el.className === 'string' && el.className.trim() !== "") {
        return `.${el.className.trim().split(/\s+/)[0]}`;
    }
    return el.tagName.toLowerCase();
}

// --- LOGIC: SAFETY CHECK SAVING ---
function handleTeachInput(event) {
    if (event.code === 'Escape') {
        toggleTeachMode(false);
        speak("Cancelled");
        return;
    }

    const char = getCodeChar(event);
    if (!char) return; 

    const el = document.activeElement;
    if (!el || el === document.body) {
        speak("Tab to a button first");
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    // --- SAFETY CHECK START ---
    // If this key is already used AND we haven't confirmed yet
    if (shortcuts[char] && pendingConfirm !== char) {
        const oldName = shortcuts[char].label || "another button";
        speak(`Option ${char.toUpperCase()} is already used for ${oldName}. Press again to replace it.`);
        
        // Flash Orange to warn
        const oldOutline = el.style.outline;
        el.style.outline = "4px solid #f1c40f"; 
        setTimeout(() => el.style.outline = oldOutline, 800);
        
        pendingConfirm = char; // Set waiting state
        return; 
    }
    // --- SAFETY CHECK END ---

    // Proceeding to save (either no conflict, or confirmed)
    pendingConfirm = null;

    // Visual Feedback (Green)
    const oldOutline = el.style.outline;
    el.style.outline = "4px solid #2ecc71"; 
    setTimeout(() => el.style.outline = oldOutline, 800);

    const selector = getUniqueSelector(el);
    const label = el.innerText || el.getAttribute('aria-label') || "Button";
    const siteUrl = window.location.hostname; 

    if (isContextValid()) {
        chrome.storage.sync.get(['userSettings'], (res) => {
            const settings = res.userSettings || {};
            const newId = Date.now().toString();
            
            // SOFT DELETE LOGIC:
            // Find if this char is used, and just clear the 'char' field
            // This keeps the row in the table, but blank.
            let replacedName = null;
            
            Object.keys(settings).forEach(id => {
                if (settings[id].char === char && settings[id].url === siteUrl) {
                    settings[id].char = ""; // Clear key, keep data
                    replacedName = settings[id].label;
                }
            });

            settings[newId] = {
                char: char,
                element: selector,
                label: label,
                url: siteUrl
            };

            chrome.storage.sync.set({ userSettings: settings }, () => {
                if (replacedName) {
                    speak(`Reassigned Option ${char.toUpperCase()} to new button.`);
                } else {
                    speak(`Saved.`);
                }
                toggleTeachMode(false);
            });
        });
    } else {
        alert("Please refresh page.");
    }
}

// --- EXECUTE ---
function executeShortcut(char) {
    const config = shortcuts[char];
    if (!config) return;

    const el = document.querySelector(config.element);
    if (el) {
        speak(`Clicking ${config.label}`);
        const oldOutline = el.style.outline;
        el.style.outline = "4px solid #2ecc71";
        el.click();
        el.focus();
        setTimeout(() => el.style.outline = oldOutline, 400);
    } else {
        speak("Button not found");
    }
}

// --- LISTENER ---
window.addEventListener('keydown', (event) => {
    if (!isContextValid()) return;

    if (event.code === 'KeyT' && event.shiftKey && event.altKey) {
        event.preventDefault();
        toggleTeachMode();
        return;
    }

    if (isTeachMode) {
        if (["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            return; 
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        handleTeachInput(event);
        return;
    }

    if (event.altKey && !event.shiftKey && !event.ctrlKey) {
        const char = getCodeChar(event); 
        if (char && shortcuts[char]) {
            event.preventDefault();
            event.stopImmediatePropagation();
            executeShortcut(char);
        }
    }
}, true);