let isFullscreen = false;
let isEnabled = false;
const TRIGGER_HEIGHT = 10; // pixels from top of screen
let timeoutId = null;
let isConnected = false;

// Check if extension is still valid
function checkConnection() {
  if (chrome.runtime.id) {
    isConnected = true;
    return true;
  }
  cleanup();
  return false;
}

function cleanup() {
  isConnected = false;
  document.removeEventListener("mousemove", handleMouseMove);
  if (timeoutId) clearTimeout(timeoutId);
}

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
    console.log("Message sending failed:", error);
    return null;
  }
}

async function checkTabAndWindowFocus() {
  const response = await sendMessageToBackground({ action: "checkFocus" });
  return response ? response.isActive : false;
}

async function handleMouseMove(event) {
  if (!isEnabled || !isConnected) return;

  const mouseY = event.clientY;

  if (timeoutId) clearTimeout(timeoutId);

  if (mouseY <= TRIGGER_HEIGHT && isFullscreen) {
    sendMessageToBackground({
      action: "toggleFullscreen",
      enterFullscreen: false,
    });
    isFullscreen = false;
  } else if (mouseY > TRIGGER_HEIGHT && !isFullscreen) {
    if (await checkTabAndWindowFocus())
      timeoutId = setTimeout(() => {
        sendMessageToBackground({
          action: "toggleFullscreen",
          enterFullscreen: true,
        });
        isFullscreen = true;
      }, 500);
  }
}

function initializeFullscreen() {
  if (!checkConnection()) return;

  setTimeout(() => {
    sendMessageToBackground({
      action: "toggleFullscreen",
      enterFullscreen: true,
    });
    isFullscreen = true;
  }, 500);
}

// Load initial state
chrome.storage.local
  .get(["enabled"])
  .then(async (result) => {
    isEnabled = result.enabled ?? false;
    if (isEnabled && (await checkTabAndWindowFocus())) initializeFullscreen();
  })
  .catch((error) => {
    console.log("Failed to load initial state:", error);
  });

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!checkConnection()) return;

  if (request.action === "toggleExtension") {
    isEnabled = request.enabled;
    if (isEnabled && !isFullscreen) {
      initializeFullscreen();
    } else if (isFullscreen) {
      sendMessageToBackground({
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
