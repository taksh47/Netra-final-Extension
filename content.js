// content.js - SELF-HEALING VERSION

// --- SAFETY CHECK (Prevent Double Loading) ---
if (window.hasNetraRun) {
  // If Netra is already running here, stop. This prevents echo.
  throw new Error("Netra already loaded");
}
window.hasNetraRun = true;

// --- CONFIGURATION ---
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
let liveRegion = null; 

// --- SMART SITE ID ---
function getSiteID() {
  if (window.location.hostname && window.location.hostname !== "") {
    return window.location.hostname;
  }
  return window.location.pathname;
}
const currentSite = getSiteID();

// --- LOAD SETTINGS ---
function loadSettings() {
  // Catch errors if extension context is invalid (The Zombie Check)
  try {
    chrome.storage.sync.get(['userSettings', 'siteMemories'], (result) => {
      if (chrome.runtime.lastError) return; // Stop if broken

      const globalSettings = result.userSettings || defaultShortcuts;
      const allSiteMemories = result.siteMemories || {};
      const thisPageMemory = allSiteMemories[currentSite] || {};

      keyMap = {};

      for (const [action, config] of Object.entries(globalSettings)) {
        if (config.char) {
          const shortcutId = `alt+${config.char.toLowerCase()}`;
          keyMap[shortcutId] = { action: action, element: config.element };
        }
      }

      for (const [char, selector] of Object.entries(thisPageMemory)) {
          const shortcutId = `alt+${char}`;
          keyMap[shortcutId] = { action: "Custom Action", element: selector };
      }
    });
  } catch (e) {
    console.log("Netra: Connection lost. Waiting for auto-heal.");
  }
}

// Reload listener with Error Catching
try {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.userSettings || changes.siteMemories) {
      loadSettings();
      speak("Settings updated");
    }
  });
} catch (e) {}

// --- AUDIO & HELPERS ---
function setupLiveRegion() {
  if (document.getElementById('netra-a11y-speaker')) return;
  liveRegion = document.createElement('div');
  liveRegion.id = 'netra-a11y-speaker';
  liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
  liveRegion.setAttribute('aria-live', 'assertive');
  liveRegion.setAttribute('role', 'alert');
  document.body.appendChild(liveRegion);
}

function speak(text) {
  // Backup: Browser Voice
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
  // Primary: Screen Reader
  if (!liveRegion) setupLiveRegion();
  liveRegion.textContent = ''; 
  setTimeout(() => { liveRegion.textContent = text; }, 100); 
}

function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.name) return `[name="${el.name}"]`;
  if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
  if (el.className && typeof el.className === 'string') return `.${el.className.trim().split(/\s+/)[0]}`;
  return el.tagName.toLowerCase();
}

function triggerAction(config) {
  const el = document.querySelector(config.element);
  if (!el) {
    speak("Element not found");
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

function recordShortcut(char) {
  const focusedEl = document.activeElement;
  if (!focusedEl || focusedEl === document.body) {
    speak("Focus on a button first");
    return;
  }
  const selector = getUniqueSelector(focusedEl);

  try {
    chrome.storage.sync.get(['siteMemories'], (result) => {
      let allMemories = result.siteMemories || {};
      if (!allMemories[currentSite]) allMemories[currentSite] = {};
      allMemories[currentSite][char] = selector;

      chrome.storage.sync.set({ siteMemories: allMemories }, () => {
          speak(`Saved. ${char.toUpperCase()} assigned.`);
          loadSettings();
      });
    });
  } catch(e) { speak("Extension updating. Please try again in 1 second."); }
}

// --- SAFE EVENT LISTENER ---
document.addEventListener('keydown', (event) => {
  // If the extension context is dead, don't run logic
  try {
    if (!chrome.runtime.id) return;
  } catch(e) { return; }

  if (!event.altKey) return; 

  let char = '';
  if (event.code.startsWith('Key')) char = event.code.slice(3).toLowerCase();
  else if (event.code.startsWith('Digit')) char = event.code.slice(5);
  else return;

  const shortcutId = `alt+${char}`;

  if (event.shiftKey) {
    event.preventDefault();
    recordShortcut(char);
    return;
  }

  if (keyMap[shortcutId]) {
    event.preventDefault();
    event.stopPropagation();
    triggerAction(keyMap[shortcutId]);
  }
}, true);

// Initialize
setupLiveRegion();
loadSettings();

// Announce we are back online (optional, good for debugging)
console.log("Netra: Connected and Ready");