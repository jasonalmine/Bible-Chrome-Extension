// Shared constants for Bible Verse New Tab extension

// API Rate Limiting
export const MAX_DAILY_API_CALLS = 5;
export const MAX_FAVORITES = 20;
export const MAX_VERSE_HISTORY = 20;
export const MAX_IMAGE_HISTORY = 5;
export const MAX_CUSTOM_IMAGES = 10;
export const MAX_IMAGE_SIZE_MB = 5;

// Default Settings
export const DEFAULT_SETTINGS = {
  verseMode: 'daily',        // 'daily' | 'random'
  backgroundMode: 'daily',   // 'daily' | 'random'
  backgroundSource: 'unsplash', // 'unsplash' | 'custom' | 'both'
  theme: 'light',            // 'light' | 'dark'
  translation: 'NKJV',       // Bible translation
  fontSize: 'medium',        // 'small' | 'medium' | 'large'
  enabledCategories: {
    nature: true,
    galaxy: true,
    oceans: true,
    mountains: true,
    underwater: true
  }
};

// Storage Keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  VERSE_HISTORY: 'verse-history',
  IMAGE_HISTORY: 'image-history',
  CACHED_DAILY_VERSE: 'cached-daily-verse',
  CACHED_DAILY_IMAGE: 'cached-daily-image',
  FAVORITES: 'favorites',
  STREAK_DATA: 'streakData',
  API_USAGE: 'api-usage',
  VERSE_ROTATION: 'verse-rotation',
  BACKEND_URL: 'backend-url',
  CUSTOM_IMAGE_HISTORY: 'custom-image-history'
};

// Copyright notices by translation
export const COPYRIGHT_NOTICES = {
  KJV: '', // Public domain
  NKJV: 'Scripture taken from the New King James Version\u00AE. Copyright \u00A9 1982 by Thomas Nelson.',
  ESV: 'Scripture quotations are from the ESV\u00AE Bible, copyright \u00A9 2001 by Crossway.',
  NIV: 'Scripture taken from the Holy Bible, New International Version\u00AE, NIV\u00AE. Copyright \u00A9 1973, 1978, 1984, 2011 by Biblica, Inc.',
  NLT: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright \u00A9 1996, 2004, 2015 by Tyndale House Foundation.',
  ASV: '', // Public domain
  WEB: ''  // Public domain
};

// ChatGPT interpretation prompt template
export const INTERPRETATION_PROMPT_TEMPLATE = `Please provide a brief biblical interpretation of this verse:

"{{TEXT}}"
— {{REFERENCE}} ({{TRANSLATION}})

Please follow these guidelines for your interpretation:

1. **EXEGESIS (not eisegesis)**: Draw meaning OUT of the text based on what the original author intended, rather than reading personal ideas INTO the text.

2. **Historical-Grammatical Context**:
   - What is the historical setting and audience?
   - What is the literary genre and context within the book?
   - What do the original Hebrew/Greek words reveal?

3. **Immediate & Broader Context**:
   - What verses surround this passage?
   - How does this fit into the chapter/book's overall message?
   - How does this connect to the whole Bible's narrative?

4. **Theological Significance**:
   - What does this teach about God's character?
   - How does this point to or relate to Jesus Christ?
   - What theological truths are revealed?

5. **Evangelical Christian Doctrine**:
   - Interpret through the lens of evangelical Christianity
   - Affirm the authority and inerrancy of Scripture
   - Show how this aligns with core doctrines (Trinity, salvation by grace through faith, etc.)

6. **Practical Application**:
   - How should this transform our thinking and living today?
   - What specific actions or attitudes does this call for?

Please be thorough yet accessible, helping me understand both the meaning and the life application of this Scripture.`;

/**
 * Build the interpretation prompt for a verse
 * @param {object} verse - The verse object with text, reference, translation
 * @returns {string} The formatted prompt
 */
export function buildInterpretationPrompt(verse) {
  return INTERPRETATION_PROMPT_TEMPLATE
    .replace('{{TEXT}}', verse.text)
    .replace('{{REFERENCE}}', verse.reference)
    .replace('{{TRANSLATION}}', verse.translation);
}

// Font sizes for popup display
export const POPUP_FONT_SIZES = {
  small: '12px',
  medium: '13px',
  large: '15px'
};
