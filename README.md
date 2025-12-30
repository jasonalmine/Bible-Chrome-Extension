# Bible Verse New Tab

A beautiful Chrome extension that displays an inspiring Bible verse with stunning background imagery every time you open a new tab.

![Bible Verse New Tab Screenshot](screenshot.png)

## Features

- **Daily Bible Verse**: Fresh verse each day from a curated collection of 365 verses
- **Multiple Translations**: ESV (default) with NKJV offline fallback
- **Beautiful Backgrounds**: High-quality images from Unsplash across 5 categories:
  - Nature
  - Galaxy/Space
  - Oceans
  - Mountains
  - Underwater
- **Custom Backgrounds**: Upload your own images
- **Offline Support**: Works without internet using bundled NKJV verses
- **Favorites**: Save your favorite verses (up to 20)
- **Reading Streak**: Track your daily Bible reading
- **Interpret with AI**: Send verses to ChatGPT for biblical exegesis
- **Customizable Settings**:
  - Daily or random verse mode
  - Daily or random background mode
  - Light or dark theme
  - Font size options
  - Enable/disable specific image categories
- **Privacy-Focused**: No tracking, no analytics, no personal data collection

## Project Structure

```
Bible Chrome Extension/
├── bible-newtab-extension/    # Chrome extension (frontend)
│   ├── manifest.json
│   ├── newtab.html            # New tab page
│   ├── popup.html             # Extension popup
│   ├── src/
│   │   ├── shared/            # Shared modules
│   │   │   ├── constants.js   # App constants & defaults
│   │   │   ├── storage.js     # Chrome storage wrapper
│   │   │   ├── verse.js       # Verse fetching (ESV API + NKJV fallback)
│   │   │   └── date-utils.js  # Date formatting helpers
│   │   ├── newtab/
│   │   │   ├── index.js       # New tab entry point
│   │   │   ├── background.js  # Background image logic
│   │   │   └── settings.js    # Settings panel
│   │   ├── popup/
│   │   │   └── popup.js       # Popup functionality
│   │   └── utils/
│   │       └── api-config.js  # API configuration
│   ├── styles/
│   ├── data/
│   │   ├── nkjv-fallback.json # Offline NKJV verses
│   │   └── images.json        # Image metadata
│   └── images/
│
└── backend/                   # Vercel serverless backend
    └── api/
        └── background-image.js # Unsplash API endpoint
```

## Installation

### For Users
Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/elbkjkbdmhneiedgifliimkfncibklnn)

### For Developers

#### Prerequisites
- Chrome browser
- ESV API key (free from https://api.esv.org/) - optional, key included
- Unsplash API key (free from https://unsplash.com/developers) - for backend

#### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bible-newtab.git
   cd bible-newtab
   ```

2. **Load the extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `bible-newtab-extension` folder

3. **Open a new tab** to see the extension in action!

## API Integration

### ESV API (Direct)
The extension calls the ESV.org API directly from the client for verse fetching:
- Endpoint: `https://api.esv.org/v3/passage/text/`
- Rate limited to 3 API calls per day to respect API limits
- Cycles through cached verses when limit reached

### Unsplash API (Backend)
Background images are fetched via a Vercel serverless function:
- Endpoint: `/api/background-image`
- Query parameters:
  - `category`: nature, galaxy, oceans, mountains, underwater
  - `mode`: daily, random

## Deployment

### Backend (Vercel)

```bash
cd backend
vercel login
vercel --prod
```

Add environment variables in Vercel Dashboard:
- `UNSPLASH_ACCESS_KEY`

### Extension (Chrome Web Store)

1. Create a ZIP of the `bible-newtab-extension` folder
2. Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time $5 developer fee
4. Submit for review

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules), CSS3, Chrome Extensions API (Manifest V3)
- **Backend**: Vercel Serverless Functions
- **APIs**: ESV.org Bible API, Unsplash API
- **Storage**: Chrome Storage Sync, IndexedDB (for custom images)

## Privacy

This extension respects your privacy:
- No personal data collection
- No analytics or tracking
- All settings stored locally via Chrome Storage
- Only network requests are to fetch verses (ESV API) and images (Unsplash)

See [PRIVACY.md](bible-newtab-extension/PRIVACY.md) for details.

## Version History

### v1.3.0
- Switched to ESV as default translation with NKJV offline fallback
- Refactored codebase with shared modules
- Removed API.Bible dependency
- Added interpretation feature with ChatGPT
- Improved font loading performance

### v1.2.0
- Added custom background uploads
- Added favorites system
- Added reading streak tracking

### v1.0.0
- Initial release

## Credits

- **ESV Bible Text**: Scripture quotations are from the ESV® Bible, copyright © 2001 by Crossway
- **NKJV Bible Text**: Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson
- **Background Images**: Provided by [Unsplash](https://unsplash.com)

## License

MIT License - see [LICENSE](LICENSE) for details
