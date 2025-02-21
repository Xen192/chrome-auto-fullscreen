import { isProtectedPage } from "./utils.js";

let isTabAutoFocusEnabled = false;
let previousState = null;

// Listen for extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  // Inject into all existing tabs
  const tabs = await chrome.tabs.query({ url: "<all_urls>" });
  for (const tab of tabs) {
    if (isProtectedPage(tab.url)) continue;
    // Inject content script into a tab
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
    } catch (err) {
      console.error(`Failed to inject content script: ${err}`);
    }
  }
});

// Load initial state
chrome.storage.local.get(["isTabAutoFocusEnabled"], (result) => {
  isTabAutoFocusEnabled = result.isTabAutoFocusEnabled ?? false;
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isTabAutoFocusEnabled) isTabAutoFocusEnabled = changes.isTabAutoFocusEnabled.newValue;
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (!isTabAutoFocusEnabled) return;

  // Only handle new tab navigations
  if (["link", "auto_bookmark"].includes(details.transitionType))
    // Small delay to ensure tab is fully created
    setTimeout(async () => await chrome.tabs.update(details.tabId, { active: true }), 100);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "checkFocus":
      chrome.windows.get(sender.tab.windowId, (window) => {
        const isActive = window.focused && sender.tab.active;
        sendResponse({ isActive });
      });
      return true; // Indicate that we will send a response asynchronously

    case "checkWindow":
      chrome.windows.get(sender.tab.windowId, (window) => sendResponse({ isDisabledWindow: window.type !== "normal" }));
      return true;

    case "toggleFullscreen":
      chrome.windows.get(sender.tab.windowId, async (window) => {
        if (window.type !== "normal" || isProtectedPage(sender.tab.url)) return;

        await chrome.windows.update(window.id, {
          state: request.enterFullscreen ? "fullscreen" : previousState || "maximized",
        });

        if (request.enterFullscreen && window.state !== "fullscreen") previousState = window.state;
      });
      break;
  }
});
