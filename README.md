# Chrome Auto Fullscreen

![Icon](icons/icon48.png)

## Overview

Chrome Auto Fullscreen is a Chrome extension that automatically manages your browser's fullscreen mode based on mouse position. When enabled, the browser enters fullscreen mode automatically and exits when you move your mouse to the top of the screen, making it easy to access your browser controls and address bar when needed. The extension also supports edge navigation, allowing you to go back or forward in your browsing history by hovering on the left or right edges of the screen.

## Features

- Automatic fullscreen mode management
- Mouse position-based control
- Easy toggle on/off via popup
- State persistence between browser sessions
- Configurable trigger height
- Smoothing delay to prevent accidental triggers
- Auto Switch to New Tab opened in fullscreen mode
- Edge Navigation: Go back/forward by hovering on left/right screen edges

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right corner
4. Click "Load unpacked" and select the directory containing the extension files

## Files Structure

```
chrome-auto-fullscreen/
├── manifest.json      # Extension configuration
├── popup.html         # Toggle interface
├── popup.js           # Popup functionality
├── background.js      # Background service worker
└── content.js         # Main extension logic
```

## Configuration

You can customize the extension by modifying the following parameters in `content.js`:

- `triggerHeight`: Distance from the top of the screen that triggers fullscreen exit (default: 10 pixels)
- `reEnterDelay`: Delay before re-entering fullscreen mode (default: 100ms)
- `initialLoadDelay`: Initial fullscreen delay after page load (default: 500ms)
- `edgeTriggerWidth`: Distance from left/right edge that triggers navigation (default: 15 pixels)
- `edgeHoverDelay`: Time to hover on edge before navigation triggers (default: 250ms)

## Usage

1. Click the extension icon in your Chrome toolbar to open the popup
2. Use the toggle switches to enable or disable features:
   - **Fullscreen Mode**: Automatic fullscreen management
   - **Auto Focus New Tabs**: Automatically focus newly opened tabs
   - **Edge Navigation**: Navigate back/forward using screen edges
3. When Fullscreen Mode is enabled:
   - The browser will automatically enter fullscreen mode
   - Move your mouse to the top of the screen (within 10 pixels) to exit fullscreen
   - Move your mouse away from the top to return to fullscreen mode
4. When Edge Navigation is enabled:
   - Hover your mouse on the left edge of the screen for 250ms to go back
   - Hover your mouse on the right edge of the screen for 250ms to go forward

## Technical Details

### Permissions

- `tabs`: Required for fullscreen management
- `storage`: Used to persist extension state
- `webNavigation`: Used for New Tab Auto Focus
- `scripting`: Used for content.js hot-reload

### Components

- **Popup Interface**: Clean, modern design with toggle switch
- **Background Service Worker**: Handles fullscreen state changes
- **Content Script**: Monitors mouse position and manages fullscreen behavior

### State Management

- Extension state (enabled/disabled) is persisted using Chrome's storage API
- Includes debouncing to prevent rapid state changes

## Development

### Building from Source

1. Clone the repository
2. Make any desired modifications to the source files
3. Load the extension in Chrome using Developer mode

### Making Changes

- Modify trigger heights and delays in `content.js`
- Adjust popup styling in `popup.html`
- Update state management logic in `popup.js`

### Testing

1. Load the unpacked extension
2. Enable Developer mode in Chrome
3. Test functionality across different websites
4. Verify state persistence by restarting Chrome

## Troubleshooting

- If fullscreen mode doesn't activate, check if the extension is enabled in the popup
- If the popup doesn't appear, verify the extension is properly loaded in Chrome
- For performance issues, try increasing the delay values in `content.js`

## Contributing

Feel free to submit issues and enhancement requests. To contribute:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
