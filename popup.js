// popup.js - CLEAN UI & HELP

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
let popupUtterance = null; 

// --- UI BUILDER ---
function buildUI(settings) {
  const tbody = document.getElementById('settings-body');
  tbody.innerHTML = ''; 

  Object.keys(settings).forEach(action => {
    const config = settings[action];
    const defChar = defaultShortcuts[action].char;
    
    // IF DEFAULT, SHOW BLANK
    const isDefault = String(config.char).toLowerCase().trim() === String(defChar).toLowerCase().trim();
    const displayChar = isDefault ? '' : config.char;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="color-dot" style="background:${action === 'prev' || action === 'next' ? '#ccc' : action}"></span>${capitalize(action)}</td>
      <td><input type="text" class="elm-input" data-action="${action}" value="${config.element}"></td>
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
    const charToSave = keyInput.value.toLowerCase().trim() || defaultShortcuts[action].char;
    settings[action] = { element: input.value, char: charToSave };
  });
  chrome.storage.sync.set({ userSettings: settings }, () => showStatus());
}

function speak(text) {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    popupUtterance = msg; 
    window.speechSynthesis.speak(msg);
  }
}

const triggerSaveAndSpeak = (action, newChar) => {
  saveSettings();
  const spokenChar = newChar || "Default";
  speak(`${action} changed to ${modLabel} plus ${spokenChar}`);
};

const debouncedSave = debounce(saveSettings, 1000);

// HELP BUTTON
document.getElementById('btn-help').addEventListener('click', () => {
  let speechText = "Here are your shortcuts. ";
  document.querySelectorAll('.elm-input').forEach(input => {
    const action = input.dataset.action;
    const keyInput = document.querySelector(`.key-input[data-action="${action}"]`);
    const activeChar = keyInput.value.toLowerCase().trim() || defaultShortcuts[action].char;
    speechText += `${capitalize(action)} is ${modLabel} plus ${activeChar}. `;
  });
  speak(speechText);
});

// RESET BUTTON
document.getElementById('btn-reset').addEventListener('click', () => {
  if(confirm("Reset defaults?")) {
    chrome.storage.sync.set({ userSettings: defaultShortcuts }, () => {
      buildUI(defaultShortcuts);
      speak("Settings reset");
      showStatus();
    });
  }
});

function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

function showStatus() {
  const el = document.getElementById('status');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
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
  chrome.storage.sync.get(['userSettings'], (res) => {
    const settings = res.userSettings || defaultShortcuts;
    buildUI(settings);
  });
});