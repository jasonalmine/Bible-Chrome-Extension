// Shared verse fetching with API rate limiting
// Used by both newtab and popup
// Priority: ESV API -> NKJV offline fallback

import {
  getCachedDailyVerse,
  cacheDailyVerse,
  getHistory,
  addToHistory,
  canMakeApiCall,
  recordApiCall,
  getTodaysFetchedVerses,
  getVerseRotationIndex,
  incrementVerseRotationIndex,
  getRemainingApiCalls,
  getSettings
} from './storage.js';
import { COPYRIGHT_NOTICES, MAX_VERSE_HISTORY, STORAGE_KEYS } from './constants.js';
import { getDailyIndex, getRandomIndexWithHistory } from '../utils/random.js';
import { ESV_API_CONFIG } from '../utils/api-config.js';

let nkjvVerses = null;

/**
 * Load NKJV verses from the bundled JSON file
 * @returns {Promise<object>} The NKJV verses data
 */
async function loadNKJVVerses() {
  if (nkjvVerses) return nkjvVerses;

  try {
    const response = await fetch(chrome.runtime.getURL('data/nkjv-fallback.json'));
    nkjvVerses = await response.json();
    return nkjvVerses;
  } catch (error) {
    console.error('Failed to load NKJV fallback verses:', error);
    // Return a minimal fallback
    return {
      translation: 'NKJV',
      verses: [
        {
          id: 'john-3-16',
          reference: 'John 3:16',
          text: 'For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.'
        }
      ]
    };
  }
}

/**
 * Get a random verse reference from the offline verses list
 * @returns {Promise<string>} A verse reference like "John 3:16"
 */
async function getRandomVerseReference() {
  const data = await loadNKJVVerses();
  const randomIndex = Math.floor(Math.random() * data.verses.length);
  return data.verses[randomIndex].reference;
}

/**
 * Get the daily verse reference (deterministic based on date)
 * @returns {Promise<string>} A verse reference like "John 3:16"
 */
async function getDailyVerseReference() {
  const data = await loadNKJVVerses();
  const index = getDailyIndex(data.verses.length, 'daily-verse');
  return data.verses[index].reference;
}

/**
 * Fetch a verse from ESV.org API
 * @param {string} reference - The verse reference (e.g., "John 3:16")
 * @returns {Promise<object>} The verse object { reference, text, translation }
 */
async function fetchFromESV(reference) {
  const url = `${ESV_API_CONFIG.baseUrl}/text/?q=${encodeURIComponent(reference)}&include-passage-references=false&include-verse-numbers=false&include-footnotes=false&include-headings=false&include-short-copyright=false`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${ESV_API_CONFIG.apiKey}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ESV API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.passages || data.passages.length === 0) {
    throw new Error('No verse data returned from ESV API');
  }

  // Clean the passage text (remove extra whitespace and formatting)
  let text = data.passages[0]
    .replace(/\s+/g, ' ')
    .trim();

  return {
    reference: data.canonical || reference,
    text: text,
    translation: 'ESV',
    isOffline: false
  };
}

/**
 * Fetch a verse from ESV API
 * @param {string} mode - 'daily' or 'random'
 * @returns {Promise<object>} The verse object
 */
async function fetchVerseFromESV(mode) {
  // Get a verse reference based on mode
  const reference = mode === 'daily'
    ? await getDailyVerseReference()
    : await getRandomVerseReference();

  return await fetchFromESV(reference);
}

/**
 * Get a NKJV verse as fallback (offline)
 * @param {string} mode - 'daily' or 'random'
 * @returns {Promise<object>} The verse object
 */
async function getNKJVFallback(mode) {
  const data = await loadNKJVVerses();
  const verses = data.verses;

  let verse;

  if (mode === 'daily') {
    const index = getDailyIndex(verses.length, 'nkjv-verse');
    verse = verses[index];
  } else {
    const history = await getHistory(STORAGE_KEYS.VERSE_HISTORY);
    const index = getRandomIndexWithHistory(verses, history, 'id');
    verse = verses[index];
    await addToHistory(STORAGE_KEYS.VERSE_HISTORY, verse.id, MAX_VERSE_HISTORY);
  }

  return {
    reference: verse.reference,
    text: verse.text,
    translation: 'NKJV',
    isOffline: true
  };
}

/**
 * Get a verse based on the mode setting
 * Priority: ESV API -> NKJV offline fallback
 * Uses rate limiting: max 3 API calls per day, then cycles through cached verses
 * @param {string} mode - 'daily' or 'random'
 * @param {boolean} forceNewVerse - If true, uses an API call (if available) to get a new verse
 * @returns {Promise<object>} The verse object with reference, text, translation
 */
export async function getVerse(mode = 'daily', forceNewVerse = false) {
  // Get user's translation preference
  const settings = await getSettings();
  const translation = settings.translation || 'ESV';

  // For daily mode without forcing new verse, check cached verse first
  if (mode === 'daily' && !forceNewVerse) {
    const cached = await getCachedDailyVerse();
    if (cached) {
      // If cached verse matches current translation, return it
      if (cached.translation === translation) {
        return cached;
      }
      // Translation changed - need to fetch new verse
    }
  }

  // If user selected NKJV, use offline fallback directly
  if (translation === 'NKJV') {
    const verse = await getNKJVFallback(mode);
    if (mode === 'daily') {
      await cacheDailyVerse(verse);
    }
    return verse;
  }

  // For ESV (or other translations), try ESV API
  // Check if user wants a new verse and we have API calls remaining
  if (forceNewVerse) {
    const canCall = await canMakeApiCall();
    if (canCall) {
      try {
        const verse = await fetchVerseFromESV(mode);
        await recordApiCall(verse);
        await cacheDailyVerse(verse);
        return verse;
      } catch (error) {
        console.warn('ESV API call failed, cycling through cached verses:', error);
      }
    }

    // No API calls left or API failed - cycle through today's fetched verses
    const fetchedVerses = await getTodaysFetchedVerses();
    if (fetchedVerses.length > 0) {
      const index = await getVerseRotationIndex();
      const verse = fetchedVerses[index % fetchedVerses.length];
      await incrementVerseRotationIndex(fetchedVerses.length - 1);
      await cacheDailyVerse(verse);
      return verse;
    }

    // No API verses cached today, fall back to NKJV
    console.log('Falling back to NKJV offline verses');
    return await getNKJVFallback(mode);
  }

  // Normal flow: try ESV API if we have calls remaining
  const canCall = await canMakeApiCall();
  if (canCall) {
    try {
      const verse = await fetchVerseFromESV(mode);
      await recordApiCall(verse);
      if (mode === 'daily') {
        await cacheDailyVerse(verse);
      }
      return verse;
    } catch (error) {
      console.warn('Failed to fetch verse from ESV API, falling back to NKJV:', error);
    }
  }

  // Check if we have any verses fetched today to cycle through
  const fetchedVerses = await getTodaysFetchedVerses();
  if (fetchedVerses.length > 0) {
    const index = await getVerseRotationIndex();
    const verse = fetchedVerses[index % fetchedVerses.length];
    if (mode === 'daily') {
      await cacheDailyVerse(verse);
    }
    return verse;
  }

  // Fall back to NKJV offline verses
  console.log('Falling back to NKJV offline verses');
  return await getNKJVFallback(mode);
}

/**
 * Get remaining API calls for today
 * @returns {Promise<number>} Number of remaining API calls
 */
export async function getApiCallsRemaining() {
  return await getRemainingApiCalls();
}

/**
 * Get the copyright text based on translation
 * @param {string} translation - Translation code (KJV, NKJV, ESV, NIV, NLT, ASV, WEB)
 * @returns {string} Copyright notice
 */
export function getCopyrightText(translation) {
  return COPYRIGHT_NOTICES[translation] || '';
}

// Re-export for convenience
export { loadNKJVVerses, getDailyVerseReference, getRandomVerseReference };
