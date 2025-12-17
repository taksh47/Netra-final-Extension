// popup.js - V2.3 (A-Z VALIDATION)

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modLabel = isMac ? 'Option' : 'Alt';
let currentSiteHost = ""; 
let currentLang = 'en';

// --- DICTIONARY ---
const I18N = {
    en: {
        title: "Netra Config",
        readBtn: "🔊 Read Shortcuts",
        resetBtn: "Reset All",
        colName: "Tasks",
        colAction: "Action",
        colKey: "Shortcut",
        langBtn: "हिंदी", 
        rowRead: "Read All", rowReadDesc: "(Reads list audio)",
        rowKey: "Teach (Keyboard)", rowKeyDesc: "(Focus & Record)",
        rowMouse: "Teach (Mouse)", rowMouseDesc: "(Hover & Record)",
        rowOpen: "Open Settings", rowOpenDesc: "(Global Popup)",
        addBtn: "+ Add Shortcut",
        placeholderName: "Name",
        placeholderID: "Selector ID",
        confirmReset: "Clear All Shortcuts?",
        confirmLang: "Change language to Hindi?",
        langChanged: "Language changed to Hindi",
        saved: "Saved",
        deleted: "Shortcut Deleted",
        confirmDelete: "Delete?",
        errorAZ: "Choose only letters from A to Z" // New Error Msg
    },
    hi: {
        title: "नेत्रा कॉन्फ़िगरेशन",
        readBtn: "🔊 शॉर्टकट सुनें",
        resetBtn: "रीसेट करें",
        colName: "कार्य",
        colAction: "कार्रवाई",
        colKey: "शॉर्टकट",
        langBtn: "English", 
        rowRead: "सभी पढ़ें", rowReadDesc: "(सूची पढ़कर सुनाएं)",
        rowKey: "सिखाएं (कीबोर्ड)", rowKeyDesc: "(फोकस और रिकॉर्ड)",
        rowMouse: "सिखाएं (माउस)", rowMouseDesc: "(होवर और रिकॉर्ड)",
        rowOpen: "सेटिंग्स खोलें", rowOpenDesc: "(ग्लोबल पॉपअप)",
        addBtn: "+ शॉर्टकट जोड़ें",
        placeholderName: "नाम",
        placeholderID: "सेलेक्टर आईडी",
        confirmReset: "क्या आप सभी शॉर्टकट हटाना चाहते हैं?",
        confirmLang: "भाषा अंग्रेजी में बदलें?",
        langChanged: "भाषा अंग्रेजी में बदल गई",
        saved: "सहेजा गया",
        deleted: "शॉर्टकट हटा दिया गया",
        confirmDelete: "हटाएं?",
        errorAZ: "केवल A से Z तक के अक्षर चुनें" // New Error Msg
    }
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['netraLang'], (res) => {
      if (res.netraLang) currentLang = res.netraLang;
      applyLanguage(); 
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs.length > 0 && tabs[0].url) {
          try { const urlObj = new URL(tabs[0].url); currentSiteHost = urlObj.hostname; } 
          catch (e) { currentSiteHost = "unknown"; }
        }
        chrome.storage.sync.get(['userSettings'], (res) => buildUI(res.userSettings || {}));
      });
  });
});

// --- I18N LOGIC ---
function toggleLanguage() {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    if (confirm(I18N[currentLang].confirmLang)) {
        currentLang = nextLang;
        chrome.storage.sync.set({ netraLang: currentLang });
        applyLanguage();
        chrome.storage.sync.get(['userSettings'], (res) => buildUI(res.userSettings || {}));
        speak(I18N[currentLang].langChanged); // Fixed to use NEW language dict
    }
}

function applyLanguage() {
    const texts = I18N[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) el.innerText = texts[key];
    });
    document.getElementById('btn-lang').innerText = texts.langBtn;
}

// --- UI BUILDER ---
function buildUI(allSettings) {
  const tbody = document.getElementById('settings-body');
  if (!tbody) return;
  tbody.innerHTML = ''; 
  const T = I18N[currentLang]; 

  const staticRows = [
      { name: T.rowRead, desc: T.rowReadDesc, key: "?" },
      { name: T.rowKey, desc: T.rowKeyDesc, key: "T" },
      { name: T.rowMouse, desc: T.rowMouseDesc, key: "M" },
      { name: T.rowOpen, desc: T.rowOpenDesc, key: "N" }
  ];

  staticRows.forEach(item => {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = "#fafafa";
      tr.innerHTML = `<td>-</td><td colspan="2" style="font-weight:600;">${item.name}</td><td style="color:#777;font-style:italic;font-size:13px;">${item.desc}</td><td><div class="key-wrapper" style="font-size:12px;font-weight:bold;">Shift+${modLabel}+${item.key}</div></td><td></td>`;
      tbody.appendChild(tr);
  });

  const addRow = document.createElement('tr');
  addRow.className = 'add-row';
  addRow.innerHTML = `<td colspan="6" class="add-cell" style="text-align:center;font-weight:bold;color:#2e7d32;padding:10px;cursor:pointer;">${T.addBtn}</td>`;
  addRow.addEventListener('click', addNewShortcut);
  tbody.appendChild(addRow);

  let index = 1;
  Object.keys(allSettings).forEach(id => {
    const config = allSettings[id];
    if (!config.url || !currentSiteHost.includes(config.url)) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index++}</td>
      <td><input type="text" class="url-input" value="${config.url}" disabled style="width:90%;color:#999;border:1px solid #ddd;padding:5px;"></td>
      <td><input type="text" class="label-input" data-id="${id}" value="${config.label}" placeholder="${T.placeholderName}" style="width:90%;border:1px solid #ddd;padding:5px;"></td>
      <td><input type="text" class="elm-input" data-id="${id}" value="${config.element}" placeholder="${T.placeholderID}" style="width:90%;border:1px solid #ddd;padding:5px;"></td>
      <td><div style="font-weight:bold;font-size:12px;">${modLabel}+<input type="text" class="key-input" data-id="${id}" value="${config.char}" maxlength="1" style="width:20px;text-align:center;font-weight:bold;"></div></td>
      <td><button class="delete-btn" data-id="${id}" style="color:red;border:none;background:none;cursor:pointer;">✕</button></td>`;
    tbody.appendChild(row);
  });

  attachListeners();
}

function attachListeners() {
  document.querySelectorAll('.key-input').forEach(input => {
      input.addEventListener('input', (e) => {
          const rawChar = e.target.value;
          
          // VALIDATION: Only A-Z allowed
          if (!/^[a-zA-Z]$/.test(rawChar) && rawChar !== "") {
              e.target.value = ""; // Clear invalid input
              showStatus(I18N[currentLang].errorAZ, true); // True = Error (Red)
              speak(I18N[currentLang].errorAZ);
              return;
          }

          const id = e.target.dataset.id;
          saveSingleRow(id, 'char', rawChar.toLowerCase());
      });
  });

  document.querySelectorAll('.label-input, .elm-input').forEach(input => {
      input.addEventListener('blur', (e) => {
          const field = e.target.classList.contains('label-input') ? 'label' : 'element';
          saveSingleRow(e.target.dataset.id, field, e.target.value);
      });
  });
  document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', (e) => deleteRow(e.target.dataset.id)));
  document.getElementById('btn-lang').addEventListener('click', toggleLanguage);
}

function speak(text) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    if (currentLang === 'hi' || /[\u0900-\u097F]/.test(text)) {
        const voices = window.speechSynthesis.getVoices();
        const hindi = voices.find(v => v.lang.includes('hi'));
        if (hindi) msg.voice = hindi;
    }
    window.speechSynthesis.speak(msg);
}

function showStatus(msg, isError = false) {
    const el = document.getElementById('status');
    el.innerText = msg;
    el.style.backgroundColor = isError ? "#d93025" : "#27ae60"; // Red for Error, Green for Success
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
}

function saveSingleRow(id, field, value) {
    chrome.storage.sync.get(['userSettings'], (res) => {
        const s = res.userSettings || {};
        if (!s[id]) return;

        if (field === 'char') {
            const newKey = value.toLowerCase();
            s[id].char = newKey;
            if (newKey) {
                Object.keys(s).forEach(otherId => {
                    if (otherId !== id && s[otherId].url === currentSiteHost && s[otherId].char === newKey) {
                        s[otherId].char = ""; 
                        const otherInput = document.querySelector(`.key-input[data-id="${otherId}"]`);
                        if (otherInput) {
                            otherInput.value = ""; 
                            otherInput.style.backgroundColor = "#ffebee";
                            setTimeout(() => otherInput.style.backgroundColor = "white", 500);
                        }
                    }
                });
            }
        } else {
            s[id][field] = value;
        }

        chrome.storage.sync.set({ userSettings: s }, () => {
            if (field === 'char' && value) {
                const msg = `${I18N[currentLang].saved}: Option + ${value.toUpperCase()}`;
                showStatus(msg);
                speak(msg);
                const currentInput = document.querySelector(`.key-input[data-id="${id}"]`);
                if(currentInput) {
                    currentInput.style.backgroundColor = "#d4edda";
                    setTimeout(() => currentInput.style.backgroundColor = "white", 500);
                }
            }
        });
    });
}

function addNewShortcut() {
    const id = Date.now().toString();
    chrome.storage.sync.get(['userSettings'], (res) => {
        const s = res.userSettings || {};
        s[id] = { label: "", element: "", char: "", url: currentSiteHost };
        chrome.storage.sync.set({ userSettings: s }, () => buildUI(s));
    });
}

function deleteRow(id) {
    if(!confirm(I18N[currentLang].confirmDelete)) return;
    chrome.storage.sync.get(['userSettings'], (res) => {
        const s = res.userSettings || {};
        delete s[id];
        chrome.storage.sync.set({ userSettings: s }, () => {
            buildUI(s);
            speak(I18N[currentLang].deleted);
        });
    });
}

document.getElementById('btn-reset').addEventListener('click', () => {
    if(confirm(I18N[currentLang].confirmReset)) {
        chrome.storage.sync.set({ userSettings: {} }, () => buildUI({}));
    }
});