// background.js - AUTO HEALER

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Netra: Updated. Healing tabs...");
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

  for (const tab of tabs) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (err) {
      // Ignore errors on restricted pages
    }
  }
});