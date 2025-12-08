// popup.js - ALLOWS BLANK SHORTCUTS

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modLabel = isMac ? 'Option' : 'Alt';

function buildUI(settings) {
  const tbody = document.getElementById('settings-body');
  if (!tbody) return;
  tbody.innerHTML = ''; 

  // 1. READ ALL
  const readRow = document.createElement('tr');
  readRow.innerHTML = `
    <td>-</td>
    <td style="font-weight:bold; color:#444;">Read All</td>
    <td colspan="3"><input type="text" value="(Reads list audio)" disabled 
          style="background:white; border:none; width:100%; color:#777; font-style:italic;"></td>
    <td><div class="key-wrapper"><span>Shift+</span><input type="text" class="key-input" value="?" disabled></div></td>
    <td></td>`;
  tbody.appendChild(readRow);

  // 2. TEACH MODE
  const teachRow = document.createElement('tr');
  teachRow.innerHTML = `
    <td>-</td>
    <td style="font-weight:bold; color:#444;">Teach Mode</td>
    <td colspan="3"><input type="text" value="(Focus & Record)" disabled 
          style="background:white; border:none; width:100%; color:#777; font-style:italic;"></td>
    <td><div class="key-wrapper"><span style="font-size:10px">Shift+${modLabel}+</span><input type="text" class="key-input" value="T" disabled></div></td>
    <td></td>`;
  tbody.appendChild(teachRow);

  // 3. ADD BUTTON
  const addRow = document.createElement('tr');
  addRow.className = 'add-row';
  addRow.innerHTML = `<td colspan="6" class="add-cell">+ Add New Shortcut</td>`;
  addRow.addEventListener('click', addNewShortcut);
  tbody.appendChild(addRow);

  // 4. DATA ROWS
  let index = 1;
  Object.keys(settings).forEach(id => {
    const config = settings[id];
    const urlDisplay = config.url || "";
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index++}</td>
      <td><input type="text" class="url-input" data-id="${id}" value="${urlDisplay}" placeholder="https://example.com"></td>
      <td><input type="text" class="label-input" data-id="${id}" value="${config.label}" placeholder="Name"></td>
      <td><input type="text" class="elm-input" data-id="${id}" value="${config.element}" placeholder="#id"></td>
      <td><div class="key-wrapper"><span>${modLabel}+</span><input type="text" class="key-input" data-id="${id}" value="${config.char}" maxlength="1"></div></td>
      <td style="display:flex; align-items:center;">
        <button class="test-btn" data-id="${id}">Test</button>
        <button class="delete-btn" data-id="${id}">✕</button>
      </td>`;
    tbody.appendChild(row);
  });

  attachListeners();
}

function attachListeners() {
  document.querySelectorAll('input').forEach(input => {
    if(!input.disabled) input.addEventListener('input', debouncedSave);
  });
  document.querySelectorAll('.test-btn').forEach(btn => btn.addEventListener('click', (e) => testElement(e.target.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteRow(e.target.dataset.id)));
}

function addNewShortcut() {
    const newId = Date.now().toString();
    chrome.storage.sync.get(['userSettings'], (res) => {
        const settings = res.userSettings || {};
        settings[newId] = { label: "", element: "", char: "", url: "" };
        chrome.storage.sync.set({ userSettings: settings }, () => {
            buildUI(settings);
            showStatus();
        });
    });
}

function deleteRow(id) {
    if(!confirm("Delete?")) return;
    chrome.storage.sync.get(['userSettings'], (res) => {
        const settings = res.userSettings || {};
        delete settings[id];
        chrome.storage.sync.set({ userSettings: settings }, () => buildUI(settings));
    });
}

function saveSettings() {
  const settings = {};
  document.querySelectorAll('.elm-input').forEach(input => {
    const id = input.dataset.id;
    const url = document.querySelector(`.url-input[data-id="${id}"]`).value;
    const label = document.querySelector(`.label-input[data-id="${id}"]`).value;
    const char = document.querySelector(`.key-input[data-id="${id}"]`).value;
    const element = input.value;
    
    // FIX: SAVE EVEN IF CHAR IS EMPTY (as long as we have an element or label)
    if (element || label || char) {
        settings[id] = { 
            label: label || "Untitled", 
            element: element, 
            char: char ? char.toLowerCase() : "", // Allow blank string
            url: url
        };
    }
  });
  chrome.storage.sync.set({ userSettings: settings }, () => showStatus());
}

const debouncedSave = debounce(saveSettings, 1000);

function debounce(func, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => func(...args), delay); };
}

function showStatus() {
  const el = document.getElementById('status');
  if(el) { 
      el.classList.add('show'); 
      setTimeout(() => el.classList.remove('show'), 1500); 
  }
}

function testElement(id) {
  const selector = document.querySelector(`.elm-input[data-id="${id}"]`).value;
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: (sel) => {
        const el = document.querySelector(sel);
        if(el) {
          el.style.outline = "5px solid red";
          setTimeout(()=>el.style.outline="", 1000);
          el.scrollIntoView({behavior:"smooth", block:"center"});
        } else { alert("Not Found on this page"); }
      },
      args: [selector]
    });
  });
}

document.getElementById('btn-reset').addEventListener('click', () => {
    if(confirm("Clear All?")) {
        chrome.storage.sync.set({ userSettings: {} }, () => buildUI({}));
    }
});

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['userSettings'], (res) => {
    buildUI(res.userSettings || {});
  });
});