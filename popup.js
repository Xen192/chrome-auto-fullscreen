import { isProtectedPage } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const toggleFullscreen = document.getElementById("toggleFullscreen");
  const toggleTabFocus = document.getElementById("toggleTabFocus");
  const controlsContainer = document.getElementById("controlsContainer");
  const subSettingsContainer = document.getElementById("subSettingsContainer");

  // Check if current page is protected
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isProtected = isProtectedPage(currentTab.url);

    if (isProtected) {
      toggleFullscreen.disabled = true;
      toggleTabFocus.disabled = true;
      controlsContainer.classList.add("disabled");
    }
  });

  // Load saved state
  chrome.storage.local
    .get(["enabled", "isTabAutoFocusEnabled"])
    .then((result) => {
      toggleFullscreen.checked = result.enabled ?? false;
      toggleTabFocus.checked = result.isTabAutoFocusEnabled ?? false;

      if (!toggleFullscreen.checked) {
        toggleTabFocus.disabled = true;
        subSettingsContainer.classList.add("disabled");
      }
    })
    .catch((error) => {
      console.debug("Failed to load state:", error);
    });

  toggleFullscreen.addEventListener("change", () => {
    const enabled = toggleFullscreen.checked;

    if (enabled) {
      toggleTabFocus.disabled = false;
      subSettingsContainer.classList.remove("disabled");
    } else {
      toggleTabFocus.disabled = true;
      subSettingsContainer.classList.add("disabled");
    }

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
});
