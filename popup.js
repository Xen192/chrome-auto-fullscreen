import { isProtectedPage } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const toggleFullscreen = document.getElementById("toggleFullscreen");
  const toggleTabFocus = document.getElementById("toggleTabFocus");
  const toggleEdgeNavigation = document.getElementById("toggleEdgeNavigation");
  const controlsContainer = document.getElementById("controlsContainer");

  // Check if current page is protected
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isProtected = isProtectedPage(currentTab.url);

    if (isProtected) {
      toggleFullscreen.disabled = true;
      toggleTabFocus.disabled = true;
      toggleEdgeNavigation.disabled = true;
      controlsContainer.classList.add("disabled");
    }
  });

  // Load saved state
  chrome.storage.local
    .get(["enabled", "isTabAutoFocusEnabled", "isEdgeNavigationEnabled"])
    .then((result) => {
      toggleFullscreen.checked = result.enabled ?? false;
      toggleTabFocus.checked = result.isTabAutoFocusEnabled ?? false;
      toggleEdgeNavigation.checked = result.isEdgeNavigationEnabled ?? false;
    })
    .catch((error) => {
      console.debug("Failed to load state:", error);
    });

  toggleFullscreen.addEventListener("change", () => {
    const enabled = toggleFullscreen.checked;

    // Save state
    chrome.storage.local
      .set({ enabled })
      .then(() => {
        // Notify content script
        return chrome.tabs.query({ active: true, currentWindow: true });
      })
      .then((tabs) => {
        if (tabs[0]) {
          return chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggleExtension",
            enabled,
          });
        }
      })
      .catch((error) => {
        console.debug("Failed to update state:", error);
      });
  });

  toggleTabFocus.addEventListener("change", () => {
    const isTabAutoFocusEnabled = toggleTabFocus.checked;

    chrome.storage.local.set({ isTabAutoFocusEnabled }).catch((error) => {
      console.debug("Failed to update state:", error);
    });
  });

  toggleEdgeNavigation.addEventListener("change", () => {
    const isEdgeNavigationEnabled = toggleEdgeNavigation.checked;

    chrome.storage.local.set({ isEdgeNavigationEnabled }).catch((error) => {
      console.debug("Failed to update state:", error);
    });
  });
});
