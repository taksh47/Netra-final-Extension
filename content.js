// content.js - FINAL UNIVERSAL VERSION

const defaultShortcuts = {
  'red':    { element: '#btn-red',    char: 'r' },
  'orange': { element: '#btn-orange', char: 'o' },
  'yellow': { element: '#btn-yellow', char: 'y' },
  'green':  { element: '#btn-green',  char: 'g' },
  'blue':   { element: '#btn-blue',   char: 'b' },
  'indigo': { element: '#btn-indigo', char: 'i' },
  'violet': { element: '#btn-violet', char: 'v' },
  'next':   { element: '#btn-next',   char: 'n' },
  'prev':   { element: '#btn-prev',   char: 'p' }
};

let keyMap = {}; 
let liveRegion = null; // Bridge for Screen Readers

// --- LOAD SETTINGS ---
function loadSettings() {
  chrome.storage.sync.get(['userSettings'], (result) => {
    const settings = result.userSettings || defaultShortcuts;
    keyMap = {};
    for (const [action, config] of Object.entries(settings)) {
      if (config.char && config.element) {
        const shortcutId = `alt+${config.char.toLowerCase()}`;
        keyMap[shortcutId] = { action: action, element: config.element };
      }
    }
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.userSettings) {
    loadSettings();
    speak("Settings updated");
  }
});

// --- 1. SETUP SCREEN READER BRIDGE ---
function setupLiveRegion() {
  if (document.getElementById('netra-a11y-speaker')) return;

  liveRegion = document.createElement('div');
  liveRegion.id = 'netra-a11y-speaker';
  
  // Visually hidden but readable by NVDA/VoiceOver
  liveRegion.style.position = 'absolute';
  liveRegion.style.left = '-10000px';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.overflow = 'hidden';
  
  liveRegion.setAttribute('aria-live', 'assertive');
  liveRegion.setAttribute('role', 'alert');
  
  document.body.appendChild(liveRegion);
}

// --- 2. SPEAK FUNCTION (Browser Audio + Screen Reader) ---
function speak(text) {
  // A. Trigger Browser Audio (Backup)
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }

  // B. Trigger Screen Reader (Primary)
  if (!liveRegion) setupLiveRegion();
  liveRegion.textContent = ''; 
  setTimeout(() => {
    liveRegion.textContent = text;
  }, 100); 
}

// --- 3. TRIGGER ACTION ---
function triggerAction(config) {
  const el = document.querySelector(config.element);
  
  if (!el) {
    speak("Element not found on this page");
    return;
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const oldOutline = el.style.outline;
  el.style.outline = '5px solid #00FF00';
  setTimeout(() => el.style.outline = oldOutline, 500);

  el.click();
  el.focus(); 
  
  speak(`Triggering ${config.action}`);
}

// --- 4. RECORDING LOGIC ---
function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.name) return `[name="${el.name}"]`;
  if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
  if (el.className && typeof el.className === 'string') return `.${el.className.trim().split(/\s+/)[0]}`;
  return el.tagName.toLowerCase();
}

function recordShortcut(char) {
  const focusedEl = document.activeElement;
  
  if (!focusedEl || focusedEl === document.body) {
    speak("Please focus on a button first to record");
    return;
  }
  
  let actionToUpdate = null;
  
  // Read fresh settings
  chrome.storage.sync.get(['userSettings'], (result) => {
    const settings = result.userSettings || defaultShortcuts;
    
    for (const [action, config] of Object.entries(settings)) {
      if (config.char === char) {
        actionToUpdate = action;
        break;
      }
    }

    if (!actionToUpdate) {
      speak(`No shortcut available for letter ${char}`);
      return;
    }

    settings[actionToUpdate].element = getUniqueSelector(focusedEl);
    
    chrome.storage.sync.set({ userSettings: settings }, () => {
      speak(`Saved. ${char.toUpperCase()} is assigned.`);
    });
  });
}

document.addEventListener('keydown', (event) => {
  if (!event.altKey) return; 

  let char = '';
  if (event.code.startsWith('Key')) char = event.code.slice(3).toLowerCase();
  else if (event.code.startsWith('Digit')) char = event.code.slice(5);
  else return;

  const shortcutId = `alt+${char}`;

  // MODE 1: RECORDING (Shift + Alt + Key)
  if (event.shiftKey) {
    event.preventDefault();
    recordShortcut(char);
    return;
  }

  // MODE 2: TRIGGERING (Alt + Key)
  if (keyMap[shortcutId]) {
    event.preventDefault();
    event.stopPropagation();
    triggerAction(keyMap[shortcutId]);
  }
}, true);

setupLiveRegion();
loadSettings();