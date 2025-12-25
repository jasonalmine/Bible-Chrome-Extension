# Privacy Policy for Bible Verse New Tab

**Last updated:** December 2024

## Overview

Bible Verse New Tab is committed to protecting your privacy. This extension is designed with privacy as a core principle.

## Data Collection

**We do not collect any personal data.**

### What we store locally:
- Your settings preferences (verse mode, background mode, enabled image categories)
- Recently shown verse IDs (to provide variety)
- Recently shown image IDs (to provide variety)
- Cached daily verse (to reduce API calls)

All of this data is stored locally on your device using Chrome's storage API and is never transmitted to any external servers.

### Network Requests

The extension makes the following network requests:

1. **Daily Verse API** (https://bible-newtab-api.vercel.app)
   - Purpose: Fetch the daily Bible verse in ESV translation
   - Data sent: None (simple GET request)
   - Data received: Bible verse text and reference
   - When: Once per day, or when no cached verse exists

No personal information, browsing history, or identifying data is ever sent to our servers or any third party.

## Data Storage

All user preferences and cached data are stored locally using Chrome's `chrome.storage.local` API. This data:
- Never leaves your device
- Is not synced across devices
- Can be cleared by uninstalling the extension

## Third-Party Services

This extension uses the ESV API (api.esv.org) through our backend server to fetch Bible verses. The ESV API does not receive any information about you or your browsing activity.

## Permissions

This extension requires minimal permissions:
- **storage**: To save your preferences locally
- **Host permission for our API**: To fetch daily verses

We do not request access to your browsing history, bookmarks, or any other sensitive data.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.
