// popup.js - CRASH PROOF VERSION

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

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modLabel = isMac ? 'Option' : 'Alt';
let liveRegion = null; 

// --- UI BUILDER ---
function buildUI(settings) {
  const tbody = document.getElementById('settings-body');
  if (!tbody) return; // Safety check
  tbody.innerHTML = ''; 

  // 1. READ SHORTCUTS ROW (Clean White)
  const readRow = document.createElement('tr');
  readRow.innerHTML = `
    <td><span class="color-dot" style="background:#4CAF50"></span>Read All</td>
    <td>
      <input type="text" value="(Reads list audio)" disabled 
             style="background:#fff; border:1px solid #ddd; color:#555; border-radius:4px; font-style:italic;">
    </td>
    <td>
      <div class="key-wrapper">
        <span>Shift + </span>
        <input type="text" class="key-input" value="?" disabled 
               style="background:#fff; border:1px solid #ccc; color:#333; cursor:default;">
      </div>
    </td>
    <td></td>
  `;
  tbody.appendChild(readRow);

  // 2. TEACH MODE ROW (Clean White)
  const teachRow = document.createElement('tr');
  teachRow.innerHTML = `
    <td><span class="color-dot" style="background:#2196F3"></span>Teach Mode</td>
    <td>
      <input type="text" value="(Focus on any button)" disabled 
             style="background:#fff; border:1px solid #ddd; color:#555; border-radius:4px; font-style:italic;">
    </td>
    <td>
      <div class="key-wrapper">
        <span style="font-size:11px">Shift + ${modLabel} + </span>
        <input type="text" class="key-input" value="Key" disabled 
               style="background:#f9f9f9; border:1px dashed #999; color:#555;">
      </div>
    </td>
    <td></td>
  `;
  tbody.appendChild(teachRow);

  // 3. SHORTCUT ROWS (Iterate over DEFAULTS to prevent crashing)
  Object.keys(defaultShortcuts).forEach(action => {
    // Get saved config OR fallback to default
    const savedConfig = settings[action] || defaultShortcuts[action];
    
    const defChar = defaultShortcuts[action].char;
    const userChar = savedConfig.char || defChar;
    const userElement = savedConfig.element || defaultShortcuts[action].element;

    // Check if default
    const isDefault = String(userChar).toLowerCase().trim() === String(defChar).toLowerCase().trim();
    const displayChar = isDefault ? '' : userChar;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="color-dot" style="background:${action === 'prev' || action === 'next' ? '#ccc' : action}"></span>${capitalize(action)}</td>
      <td><input type="text" class="elm-input" data-action="${action}" value="${userElement}"></td>
      <td>
        <div class="key-wrapper">
          <span>${modLabel} + </span>
          <input type="text" class="key-input" data-action="${action}" value="${displayChar}" maxlength="1">
        </div>
      </td>
      <td><button class="test-btn" data-action="${action}">Test</button></td>
    `;
    tbody.appendChild(row);
  });
  
  attachListeners();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function attachListeners() {
  document.querySelectorAll('.elm-input').forEach(input => input.addEventListener('input', debouncedSave));
  document.querySelectorAll('.key-input').forEach(input => {
    input.addEventListener('focus', (e) => e.target.select());
    input.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      if(val && !val.match(/[a-z0-9]/)) { e.target.value = ''; return; }
      triggerSaveAndSpeak(e.target.dataset.action, val);
    });
  });
  document.querySelectorAll('.test-btn').forEach(btn => btn.addEventListener('click', (e) => testElement(e.target.dataset.action)));
}

function saveSettings() {
  const settings = {};
  document.querySelectorAll('.elm-input').forEach(input => {
    const action = input.dataset.action;
    const keyInput = document.querySelector(`.key-input[data-action="${action}"]`);
    if(keyInput && defaultShortcuts[action]) {
      const charToSave = keyInput.value.toLowerCase().trim() || defaultShortcuts[action].char;
      settings[action] = { element: input.value, char: charToSave };
    }
  });
  chrome.storage.sync.set({ userSettings: settings }, () => showStatus());
}

// --- SCREEN READER BRIDGE ---
function setupLiveRegion() {
  if (document.getElementById('netra-popup-speaker')) return;
  liveRegion = document.createElement('div');
  liveRegion.id = 'netra-popup-speaker';
  liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
  liveRegion.setAttribute('aria-live', 'assertive');
  liveRegion.setAttribute('role', 'alert');
  document.body.appendChild(liveRegion);
}

function speak(text) {
  if (!liveRegion) setupLiveRegion();
  liveRegion.textContent = ''; 
  setTimeout(() => { liveRegion.textContent = text; }, 50);

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
}

const triggerSaveAndSpeak = (action, newChar) => {
  saveSettings();
  const spokenChar = newChar || "Default";
  speak(`${action} changed to ${modLabel} plus ${spokenChar}`);
};

const debouncedSave = debounce(saveSettings, 1000);

// --- READ SHORTCUTS LOGIC ---
function readAllShortcuts() {
  let speechText = `Global Read command is Shift plus Question mark. `;
  speechText += `Teach Mode is Shift plus ${modLabel} plus any key. `;
  speechText += "Here are your saved shortcuts. ";
  
  document.querySelectorAll('.elm-input').forEach(input => {
    const action = input.dataset.action;
    const keyInput = document.querySelector(`.key-input[data-action="${action}"]`);
    
    if (keyInput && defaultShortcuts[action]) {
        const visibleValue = keyInput.value.toLowerCase().trim();
        const activeChar = visibleValue !== "" ? visibleValue : defaultShortcuts[action].char;
        speechText += `${capitalize(action)} is ${modLabel} plus ${activeChar}. `;
    }
  });
  
  speak(speechText);
}

const helpBtn = document.getElementById('btn-help');
if(helpBtn) helpBtn.addEventListener('click', readAllShortcuts);

document.addEventListener('keydown', (e) => {
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    readAllShortcuts();
  }
});

// RESET BUTTON
const resetBtn = document.getElementById('btn-reset');
if(resetBtn) {
    resetBtn.addEventListener('click', () => {
      if(confirm("Reset all shortcuts to defaults?")) {
        chrome.storage.sync.set({ userSettings: defaultShortcuts }, () => {
          buildUI(defaultShortcuts);
          speak("Settings reset");
          showStatus();
        });
      }
    });
}

function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

function showStatus() {
  const el = document.getElementById('status');
  if(el) {
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1500);
  }
}

function testElement(action) {
  const selector = document.querySelector(`.elm-input[data-action="${action}"]`).value;
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: (sel) => {
        const el = document.querySelector(sel);
        if(el) {
          el.style.outline = "5px solid red";
          setTimeout(()=>el.style.outline="", 1000);
          el.scrollIntoView({behavior:"smooth", block:"center"});
        } else { alert("Not Found"); }
      },
      args: [selector]
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLiveRegion(); 
  // Load settings with fallback to defaults to prevent empty screen
  chrome.storage.sync.get(['userSettings'], (res) => {
    const settings = res.userSettings || defaultShortcuts;
    buildUI(settings);
  });
});