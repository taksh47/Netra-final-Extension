// background.js - CONNECTION MANAGER & AUTO HEALER

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Netra: Service Worker Active. Injecting content scripts...");
  
  // Re-inject content script into all open tabs to prevent context invalidation
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

  for (const tab of tabs) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (err) {
      // Ignore errors on restricted pages (e.g., chrome:// URLs)
    }
  }
});