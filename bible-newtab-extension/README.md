# Bible Verse New Tab - Chrome Extension

A beautiful Chrome extension that displays an inspiring Bible verse with stunning background imagery every time you open a new tab.

## Features

- **Daily Verse**: Start each day with a curated Bible verse from the ESV translation
- **Beautiful Backgrounds**: Rotating collection of stunning images across 5 categories:
  - Nature
  - Galaxy/Space
  - Oceans
  - Mountains
  - Underwater
- **Offline Support**: Works without internet using bundled NKJV verses
- **Customizable Settings**:
  - Choose between daily or random verse mode
  - Choose between daily or random background mode
  - Enable/disable specific image categories
- **Privacy-Focused**: No tracking, no analytics, no personal data collection

## Installation

### From Chrome Web Store
(Coming soon)

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `bible-newtab-extension` folder
6. Open a new tab to see it in action!

## Development

### Prerequisites
- Chrome browser
- Node.js (for the backend)

### Extension Structure

```
bible-newtab-extension/
├── manifest.json          # Extension configuration
├── newtab.html            # Main new tab page
├── src/
│   ├── newtab/
│   │   ├── index.js       # Main entry point
│   │   ├── verse.js       # Verse fetching logic
│   │   ├── background.js  # Background image logic
│   │   ├── settings.js    # Settings panel
│   │   └── storage.js     # Chrome storage wrapper
│   ├── utils/
│   │   └── random.js      # Randomization helpers
│   └── service-worker.js  # Background service worker
├── styles/
│   ├── newtab.css         # Main styles
│   └── settings.css       # Settings panel styles
├── data/
│   ├── nkjv-fallback.json # Offline NKJV verses
│   └── images.json        # Image metadata
└── images/
    ├── backgrounds/       # Background images (WebP format)
    └── icons/             # Extension icons
```

### Adding Background Images

1. Source high-quality images (recommended: 1920x1080 or higher)
2. Convert to WebP format and optimize to under 300KB
3. Add to the appropriate category folder in `images/backgrounds/`
4. Update `data/images.json` with the new image metadata

## Backend

The extension fetches daily ESV verses from a Vercel-hosted backend. See the `bible-newtab-backend/` folder for backend code.

## Privacy

This extension respects your privacy:
- No personal data collection
- No analytics or tracking
- All settings stored locally
- Only network request is to fetch daily verses

See [PRIVACY.md](PRIVACY.md) for full details.

## Credits

- **ESV Bible Text**: Scripture quotations are from the ESV® Bible, copyright © 2001 by Crossway
- **NKJV Bible Text**: Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson

## License

MIT License - see LICENSE file for details
