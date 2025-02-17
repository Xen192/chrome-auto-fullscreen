chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkFocus") {
    chrome.windows.get(sender.tab.windowId, (window) => {
      const isActive = window.focused && sender.tab.active;
      sendResponse({ isActive });
    });

    return true; // Indicate that we will send a response asynchronously
  } else if (request.action === "toggleFullscreen") {
    chrome.windows.getCurrent((window) => {
      chrome.windows.update(window.id, {
        state: request.enterFullscreen ? "fullscreen" : "maximized",
      });
    });
  }
});
