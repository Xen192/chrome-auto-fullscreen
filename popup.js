function isProtectedPage(url) {
  const protectedPatterns = [
    /^chrome:\/\//i, // Chrome internal pages
    /^chrome-extension:\/\//i, // Extension pages
    /^devtools:\/\//i, // Developer tools
    /^view-source:\/\//i, // View source pages
    /^about:/i, // About pages
    /^edge:\/\//i, // Edge internal pages (for compatibility)
    /^file:\/\//i, // Local files
  ];

  return protectedPatterns.some((pattern) => pattern.test(url));
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggleSwitch");
  const statusText = document.getElementById("statusText");
  const controlsContainer = document.getElementById("controlsContainer");

  // Check if current page is protected
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isProtected = isProtectedPage(currentTab.url);

    if (isProtected) {
      toggleSwitch.disabled = true;
      controlsContainer.classList.add("disabled");
    }
  });

  // Load saved state
  chrome.storage.local
    .get(["enabled"])
    .then((result) => {
      toggleSwitch.checked = result.enabled ?? false;
      statusText.textContent = toggleSwitch.checked ? "Enabled" : "Disabled";
    })
    .catch((error) => {
      console.log("Failed to load state:", error);
      statusText.textContent = "Error loading state";
    });

  toggleSwitch.addEventListener("change", () => {
    const enabled = toggleSwitch.checked;
    statusText.textContent = enabled ? "Enabled" : "Disabled";

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
        console.log("Failed to update state:", error);
        statusText.textContent = "Error updating state";
      });
  });
});
