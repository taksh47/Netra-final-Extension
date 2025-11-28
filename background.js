// background.js - THE SELF-HEALER

// This runs when the extension is Installed, Updated, or Reloaded
chrome.runtime.onInstalled.addListener(() => {
  console.log("Netra Installed/Updated. Healing open tabs...");

  // Find all open tabs (websites and local files)
  chrome.tabs.query({url: ["<all_urls>"]}, (tabs) => {
    for (let tab of tabs) {
      // Skip chrome:// settings pages (we can't run there)
      if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) continue;

      // Force-inject the content script again
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        console.log(`Healed tab: ${tab.title}`);
      }).catch((err) => {
        // Ignore errors on tabs we don't have permission for
        console.log(`Skipped tab: ${tab.url}`);
      });
    }
  });
});