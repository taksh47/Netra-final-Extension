// content.js - NETRA V2.3 (A-Z VALIDATION)

if (window.netraLoaded) throw new Error("Netra: Already loaded");
window.netraLoaded = true;

const isContextValid = () => { try { return !!chrome.runtime.id; } catch (e) { return false; } };
console.log("Netra: Loaded.");

// --- STATE VARIABLES ---
let teachModeType = 'OFF'; 
let shortcuts = {};
let bannerEl = null;
let pendingConfirm = null; 
let currentHoveredEl = null;
let removeHoverHighlight = null; 

// --- INITIALIZATION ---
if (isContextValid()) {
    chrome.storage.sync.get(['userSettings'], (res) => updateShortcutsMap(res.userSettings));
    chrome.storage.onChanged.addListener((c) => { if(c.userSettings) updateShortcutsMap(c.userSettings.newValue); });
}

function updateShortcutsMap(settings) {
    shortcuts = {};
    if (!settings) return;
    const host = window.location.hostname; 
    Object.entries(settings).forEach(([id, item]) => {
        if (item.char && item.element && host.includes(item.url)) {
            shortcuts[item.char.toLowerCase()] = { ...item, id: id };
        }
    });
}

function getCodeChar(e) {
    // Only accept physical KeyA...KeyZ
    if (e.code.startsWith('Key')) return e.code.slice(3).toLowerCase();
    // Reject Digits, Symbols, etc. explicitly by returning null
    return null; 
}

// --- UI: BANNER & AUDIO ---
function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1.1; 
    window.speechSynthesis.speak(msg);
}

function createBanner() {
    const b = document.createElement('div');
    b.setAttribute('role', 'alert');
    b.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-200%);
        padding: 12px 24px; border-radius: 50px; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        background: #d93025; color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600; font-size: 16px; letter-spacing: 0.5px;
        z-index: 2147483647; display: flex; align-items: center; gap: 10px;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: none;
    `;
    document.body.appendChild(b);
    return b;
}

function setBannerState(type) {
    if (!bannerEl) bannerEl = createBanner();
    
    if (type === 'KEYBOARD') {
        bannerEl.style.backgroundColor = "#d93025"; 
        bannerEl.innerHTML = `<span>🔴</span><span>Teach (Keyboard) ON &bull; Tab to Button & Press Key</span>`;
        bannerEl.style.transform = "translateX(-50%) translateY(0)";
        speak("Teach Mode Keyboard.");
    } else if (type === 'MOUSE') {
        bannerEl.style.backgroundColor = "#2980b9"; 
        bannerEl.innerHTML = `<span>🖱️</span><span>Teach (Mouse) ON &bull; Hover over Button & Press Key</span>`;
        bannerEl.style.transform = "translateX(-50%) translateY(0)";
        speak("Teach Mode Mouse.");
    } else {
        bannerEl.style.transform = "translateX(-50%) translateY(-200%)";
    }
}

function toggleTeachMode(mode) {
    if (teachModeType === mode || mode === 'OFF') {
        teachModeType = 'OFF';
        if (removeHoverHighlight) {
            removeHoverHighlight();
            removeHoverHighlight = null;
        }
        currentHoveredEl = null;
        setBannerState('OFF');
        speak("Teach Mode Off."); 
        document.body.style.cursor = "default";
        return;
    }
    teachModeType = mode;
    setBannerState(teachModeType);
    pendingConfirm = null;
    document.body.style.cursor = "default";
}

// --- VISUALS ---
function highlight(el, color, duration = 0) {
    if (!el) return;
    const originalOutline = el.style.outline;
    const originalBoxShadow = el.style.boxShadow;
    const originalTransition = el.style.transition;

    el.style.setProperty('outline', `4px solid ${color}`, 'important');
    el.style.setProperty('box-shadow', `0 0 0 4px ${color}, 0 0 15px ${color}`, 'important');
    el.style.setProperty('transition', 'none', 'important');

    if (duration > 0) {
        setTimeout(() => {
            el.style.outline = originalOutline;
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
        }, duration);
    } else {
        return () => {
            el.style.outline = originalOutline;
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
        };
    }
}

// --- SELECTOR ENGINE ---
function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    const attrs = ['aria-label', 'name', 'data-testid', 'title', 'placeholder', 'role'];
    for (const a of attrs) {
        if (el.hasAttribute(a)) {
            const val = el.getAttribute(a);
            if (val && val.trim() !== "") {
                const s = `[${a}="${val.replace(/"/g, '\\"')}"]`;
                if (document.querySelectorAll(s).length === 1) return s;
            }
        }
    }
    return getCSSPath(el);
}

function getCSSPath(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let sel = el.nodeName.toLowerCase();
        if (el.id) { sel += '#' + el.id; path.unshift(sel); break; }
        else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) { if (sib.nodeName.toLowerCase() == sel) nth++; }
            if (nth != 1) sel += ":nth-of-type("+nth+")";
        }
        path.unshift(sel);
        el = el.parentNode;
    }
    return path.join(" > ");
}

// --- MOUSE TRACKING ---
document.addEventListener('mouseover', (e) => {
    if (teachModeType !== 'MOUSE') return;
    const target = e.target.closest('button, a, input, [role="button"], [onclick]') || e.target;
    if (currentHoveredEl !== target) {
        if (removeHoverHighlight) removeHoverHighlight();
        currentHoveredEl = target;
        removeHoverHighlight = highlight(target, '#3498db'); 
    }
}, true);

document.addEventListener('mouseout', (e) => {
    if (teachModeType !== 'MOUSE') return;
}, true);

// --- SAVING LOGIC (VALIDATION ADDED) ---
function handleTeachInput(e) {
    if (e.code === 'Escape') { toggleTeachMode('OFF'); return; }
    
    // 1. VALIDATION: Check if it's A-Z
    const char = getCodeChar(e);
    if (!char) {
        // If user pressed something else (Digit, Symbol), warn them
        if (!['Shift', 'Alt', 'Control', 'Option', 'Meta'].includes(e.key)) {
            speak("Choose only letters from A to Z.");
        }
        return;
    }

    let el = (teachModeType === 'KEYBOARD') ? document.activeElement : currentHoveredEl;
    if (!el || el === document.body) { speak("Select a button first"); return; }

    e.preventDefault(); e.stopPropagation();

    if (shortcuts[char] && pendingConfirm !== char) {
        speak(`Option ${char.toUpperCase()} is used. Press again to replace.`);
        highlight(el, '#f1c40f', 800); 
        pendingConfirm = char; 
        return; 
    }
    pendingConfirm = null;

    if (removeHoverHighlight) {
        removeHoverHighlight(); 
        removeHoverHighlight = null;
    }

    highlight(el, '#2ecc71', 800); 

    const selector = getUniqueSelector(el);
    let label = el.innerText || el.getAttribute('aria-label') || "Button";
    if (label.length > 25) label = label.substring(0, 25) + "...";
    const siteUrl = window.location.hostname;

    chrome.storage.sync.get(['userSettings'], (res) => {
        const settings = res.userSettings || {};
        let targetId = Date.now().toString(); 
        
        Object.keys(settings).forEach(id => {
            if (settings[id].url === siteUrl && settings[id].element === selector) {
                targetId = id;
            }
        });

        Object.keys(settings).forEach(id => {
            if (id !== targetId && settings[id].url === siteUrl && settings[id].char === char) {
                settings[id].char = ""; 
            }
        });

        settings[targetId] = { char: char, element: selector, label: label, url: siteUrl };

        chrome.storage.sync.set({ userSettings: settings }, () => {
            speak(`Saved Option ${char.toUpperCase()}.`);
            toggleTeachMode('OFF'); 
        });
    });
}

// --- EXECUTE ---
function triggerClick(el) {
    el.focus();
    ['mousedown','mouseup','click'].forEach(evt => 
        el.dispatchEvent(new MouseEvent(evt, {bubbles:true, cancelable:true, view:window}))
    );
}

function executeShortcut(char) {
    const cfg = shortcuts[char];
    if (!cfg) return;
    const el = document.querySelector(cfg.element);
    if (el) {
        speak(`Clicking ${cfg.label}`);
        highlight(el, '#2ecc71', 400); 
        triggerClick(el);
    } else { 
        speak("Button not found."); 
    }
}

// --- LISTENERS ---
window.addEventListener('keydown', (e) => {
    if (!isContextValid()) return;

    if (e.code === 'KeyT' && e.shiftKey && e.altKey) { e.preventDefault(); toggleTeachMode('KEYBOARD'); return; }
    if (e.code === 'KeyM' && e.shiftKey && e.altKey) { e.preventDefault(); toggleTeachMode('MOUSE'); return; }

    if (teachModeType !== 'OFF') {
        if (['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
        e.preventDefault(); e.stopImmediatePropagation();
        handleTeachInput(e);
        return;
    }

    if (e.altKey && !e.shiftKey && !e.ctrlKey) {
        const char = getCodeChar(e);
        // Only run if it's a valid letter char
        if (char && shortcuts[char]) { e.preventDefault(); e.stopImmediatePropagation(); executeShortcut(char); }
    }
}, true);