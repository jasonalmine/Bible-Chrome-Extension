// API Configuration for Bible Verse Extension
//
// Note: For Chrome extensions, API keys are bundled with the extension.
// This is acceptable because:
// 1. The extension is client-side only
// 2. API calls are rate-limited per client
// 3. Keys are for free-tier Bible APIs with generous limits

// API.Bible Configuration
// Endpoint: https://api.scripture.api.bible (primary) or https://rest.api.bible (alternative)
// Includes 5,000 API calls per month
export const API_BIBLE_CONFIG = {
  apiKey: 'IWSf1mAtVrM2pi0tuLJHi',
  baseUrl: 'https://api.scripture.api.bible/v1'
  // Alternative: 'https://rest.api.bible/v1'
};

// ESV.org API Configuration
// Endpoint: https://api.esv.org
// Better quality ESV text with proper formatting
export const ESV_API_CONFIG = {
  apiKey: '88ab560967cee80bebf74c95f970d4f1e3969766',
  baseUrl: 'https://api.esv.org/v3/passage'
};
