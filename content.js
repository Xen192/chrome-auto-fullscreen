let isFullscreen = false;
let isEnabled = false;
let isEdgeNavigationEnabled = false;
let timeoutId = null;
let edgeNavTimeoutId = null;
let isHoveringEdge = null; // 'left', 'right', or null
let edgeHaloElement = null;

const configs = {
  triggerHeight: 10, // pixels from top of screen
  reEnterDelay: 100,
  initialLoadDelay: 500,
  edgeTriggerWidth: 10, // pixels from left/right edge
  edgeHoverDelay: 250, // ms to hover before triggering navigation
  haloWidth: 60, // width of the halo effect
  haloColor: "rgba(0, 200, 0, 0.4)", // green glow color
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
  if (changes.isEdgeNavigationEnabled !== undefined) isEdgeNavigationEnabled = changes.isEdgeNavigationEnabled.newValue;
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

// Create and manage edge halo effect
function createEdgeHalo() {
  if (edgeHaloElement) return edgeHaloElement;

  const halo = document.createElement("div");
  halo.id = "chrome-auto-fullscreen-edge-halo";
  halo.style.cssText = `
    position: fixed;
    top: 0;
    width: ${configs.haloWidth}px;
    height: 100vh;
    pointer-events: none;
    z-index: 2147483647;
    opacity: 0;
    transition: opacity 0.15s ease-out;
  `;
  document.body.appendChild(halo);
  edgeHaloElement = halo;
  return halo;
}

function showEdgeHalo(side, mouseY) {
  const halo = createEdgeHalo();

  // Position based on side
  if (side === "left") {
    halo.style.left = "0";
    halo.style.right = "auto";
    halo.style.background = `radial-gradient(ellipse 100% 150px at 0% ${mouseY}px, ${configs.haloColor}, transparent)`;
  } else {
    halo.style.left = "auto";
    halo.style.right = "0";
    halo.style.background = `radial-gradient(ellipse 100% 150px at 100% ${mouseY}px, ${configs.haloColor}, transparent)`;
  }

  halo.style.opacity = "1";

  // Add fill animation
  halo.style.animation = `edgeHaloFill ${configs.edgeHoverDelay}ms ease-out forwards`;
}

function hideEdgeHalo() {
  if (edgeHaloElement) {
    edgeHaloElement.remove();
    edgeHaloElement = null;
  }
}

// Inject keyframes for the fill animation
function injectHaloStyles() {
  if (document.getElementById("chrome-auto-fullscreen-styles")) return;

  const style = document.createElement("style");
  style.id = "chrome-auto-fullscreen-styles";
  style.textContent = `
    @keyframes edgeHaloFill {
      0% {
        opacity: 0.3;
        filter: blur(15px);
      }
      100% {
        opacity: 1;
        filter: blur(0px);
      }
    }
  `;
  document.head.appendChild(style);
}

// Initialize halo styles
injectHaloStyles();

// Check if navigation is possible using browser history
function canGoBack() {
  return window.history.length > 1 && window.navigation?.canGoBack !== false;
}

function canGoForward() {
  return window.navigation?.canGoForward === true;
}

// Handle edge navigation hover
function handleEdgeNavigation(event) {
  if (!isEdgeNavigationEnabled || !checkConnection()) {
    hideEdgeHalo();
    return;
  }

  const mouseX = event.clientX;
  const mouseY = event.clientY;
  // Use clientWidth to get the actual viewport width (excludes scrollbar)
  const viewportWidth = document.documentElement.clientWidth;

  const haloTriggerWidth = configs.edgeTriggerWidth * 3; // Show halo from 3x distance
  const isInLeftHaloZone = mouseX <= haloTriggerWidth;
  const isInRightHaloZone = mouseX >= viewportWidth - haloTriggerWidth;
  const isInLeftTriggerZone = mouseX <= configs.edgeTriggerWidth;
  const isInRightTriggerZone = mouseX >= viewportWidth - configs.edgeTriggerWidth;

  // Check if mouse is on left side (back navigation)
  if (isInLeftHaloZone && canGoBack()) {
    // Show halo in the wider zone
    showEdgeHalo("left", mouseY);

    // Only trigger navigation in the inner zone
    if (isInLeftTriggerZone) {
      if (isHoveringEdge !== "left") {
        isHoveringEdge = "left";
        if (edgeNavTimeoutId) clearTimeout(edgeNavTimeoutId);
        edgeNavTimeoutId = setTimeout(async () => {
          if (isHoveringEdge === "left") {
            hideEdgeHalo();
            await sendMessageToBackground({ action: "navigateBack" });
            isHoveringEdge = null;
          }
        }, configs.edgeHoverDelay);
      }
    } else {
      // In halo zone but not trigger zone - cancel any pending navigation
      if (isHoveringEdge === "left") {
        isHoveringEdge = null;
        if (edgeNavTimeoutId) clearTimeout(edgeNavTimeoutId);
      }
    }
  }
  // Check if mouse is on right side (forward navigation)
  else if (isInRightHaloZone && canGoForward()) {
    // Show halo in the wider zone
    showEdgeHalo("right", mouseY);

    // Only trigger navigation in the inner zone
    if (isInRightTriggerZone) {
      if (isHoveringEdge !== "right") {
        isHoveringEdge = "right";
        if (edgeNavTimeoutId) clearTimeout(edgeNavTimeoutId);
        edgeNavTimeoutId = setTimeout(async () => {
          if (isHoveringEdge === "right") {
            hideEdgeHalo();
            await sendMessageToBackground({ action: "navigateForward" });
            isHoveringEdge = null;
          }
        }, configs.edgeHoverDelay);
      }
    } else {
      // In halo zone but not trigger zone - cancel any pending navigation
      if (isHoveringEdge === "right") {
        isHoveringEdge = null;
        if (edgeNavTimeoutId) clearTimeout(edgeNavTimeoutId);
      }
    }
  }
  // Mouse moved away from edges or navigation not possible
  else {
    if (isHoveringEdge !== null) {
      isHoveringEdge = null;
      if (edgeNavTimeoutId) clearTimeout(edgeNavTimeoutId);
    }
    hideEdgeHalo();
  }
}

// Handle mouse movement and toggle fullscreen
async function handleMouseMove(event) {
  // Handle edge navigation (independent of fullscreen mode)
  handleEdgeNavigation(event);

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
  .get(["enabled", "isEdgeNavigationEnabled"])
  .then(async (result) => {
    isEnabled = result.enabled ?? false;
    isEdgeNavigationEnabled = result.isEdgeNavigationEnabled ?? false;
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
