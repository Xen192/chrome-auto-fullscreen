let isFullscreen = false;
let isEnabled = false;
let timeoutId = null;

const configs = {
  triggerHeight: 10, // pixels from top of screen
  reEnterDelay: 100,
  initialLoadDelay: 500,
};

// Check if extension is still valid
function checkConnection() {
  if (chrome.runtime.id) return true;

  cleanup();
  return false;
}

function cleanup() {
  isConnected = false;
  document.removeEventListener("mousemove", handleMouseMove);
  if (timeoutId) clearTimeout(timeoutId);
}

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) isEnabled = changes.enabled.newValue;
});

// Safely send messages to background script
async function sendMessageToBackground(message) {
  if (!checkConnection()) return;

  try {
    return await chrome.runtime.sendMessage(message).catch((error) => {
      if (error.message.includes("receiving end does not exist")) {
        // Background script not ready, retry after delay
        return new Promise((resolve) => {
          setTimeout(async () => {
            resolve(await chrome.runtime.sendMessage(message));
          }, 100);
        });
      }
      throw error;
    });
  } catch (error) {
    console.debug("Message sending failed:", error);
    return null;
  }
}

// Check if tab and window are focused
async function checkTabAndWindowFocus() {
  const response = await sendMessageToBackground({ action: "checkFocus" });
  return response ? response.isActive : false;
}

// Check if window is devtools
async function checkIfDisabledWindow() {
  const response = await sendMessageToBackground({ action: "checkWindow" });
  return response ? response.isDisabledWindow : false;
}

// Handle mouse movement and toggle fullscreen
async function handleMouseMove(event) {
  if (!isEnabled || !checkConnection() || (await checkIfDisabledWindow())) return;

  const mouseY = event.clientY;

  if (timeoutId) clearTimeout(timeoutId);

  if (mouseY <= configs.triggerHeight && isFullscreen) {
    await sendMessageToBackground({
      action: "toggleFullscreen",
      enterFullscreen: false,
    });
    isFullscreen = false;
  } else if (mouseY > configs.triggerHeight && !isFullscreen) {
    if (await checkTabAndWindowFocus())
      timeoutId = setTimeout(async () => {
        await sendMessageToBackground({
          action: "toggleFullscreen",
          enterFullscreen: true,
        });
        isFullscreen = true;
      }, configs.reEnterDelay);
  }
}

async function initializeFullscreen() {
  if (!checkConnection() || (await checkIfDisabledWindow())) return;

  setTimeout(async () => {
    await sendMessageToBackground({
      action: "toggleFullscreen",
      enterFullscreen: true,
    });
    isFullscreen = true;
  }, configs.initialLoadDelay);
}

// Load initial state
chrome.storage.local
  .get(["enabled"])
  .then(async (result) => {
    isEnabled = result.enabled ?? false;
    if (isEnabled && (await checkTabAndWindowFocus())) await initializeFullscreen();
  })
  .catch((error) => {
    console.debug("Failed to load initial state:", error);
  });

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (!checkConnection() || (await checkIfDisabledWindow())) return;

  if (request.action === "toggleExtension") {
    isEnabled = request.enabled;
    if (isEnabled && !isFullscreen) {
      await initializeFullscreen();
    } else if (isFullscreen) {
      await sendMessageToBackground({
        action: "toggleFullscreen",
        enterFullscreen: false,
      });
      isFullscreen = false;
    }
  }
  // Always send a response
  sendResponse({ received: true });
  return true; // Keep message channel open for async response
});

// Add mouse movement listener with connection check
if (checkConnection()) document.addEventListener("mousemove", handleMouseMove);
