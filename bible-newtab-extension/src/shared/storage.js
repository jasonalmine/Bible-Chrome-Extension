// Shared storage wrapper for chrome.storage.sync
// Used by both newtab and popup

import {
  DEFAULT_SETTINGS,
  MAX_DAILY_API_CALLS,
  MAX_VERSE_HISTORY,
  MAX_IMAGE_HISTORY,
  STORAGE_KEYS
} from './constants.js';
import { getToday } from './date-utils.js';

/**
 * Get a value from chrome.storage.sync
 * @param {string} key - The key to retrieve
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} The stored value or default
 */
export async function get(key, defaultValue = null) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], (result) => {
      if (result[key] !== undefined) {
        resolve(result[key]);
      } else {
        resolve(defaultValue);
      }
    });
  });
}

/**
 * Set a value in chrome.storage.sync
 * @param {string} key - The key to set
 * @param {any} value - The value to store
 * @returns {Promise<void>}
 */
export async function set(key, value) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key]: value }, resolve);
  });
}

/**
 * Get the current settings
 * @returns {Promise<object>} The settings object
 */
export async function getSettings() {
  const settings = await get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  // Merge with defaults to ensure all keys exist
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    enabledCategories: {
      ...DEFAULT_SETTINGS.enabledCategories,
      ...(settings?.enabledCategories || {})
    }
  };
}

/**
 * Update settings with partial values
 * @param {object} partial - Partial settings to update
 * @returns {Promise<object>} The updated settings
 */
export async function updateSettings(partial) {
  const current = await getSettings();
  const updated = {
    ...current,
    ...partial,
    enabledCategories: {
      ...current.enabledCategories,
      ...(partial.enabledCategories || {})
    }
  };
  await set(STORAGE_KEYS.SETTINGS, updated);

  // Clear cached daily image if background-related settings changed
  const backgroundKeys = ['backgroundMode', 'backgroundSource', 'enabledCategories'];
  const backgroundChanged = backgroundKeys.some(key => key in partial);
  if (backgroundChanged) {
    await set('cached-daily-image', null);
  }

  return updated;
}

/**
 * Reset all settings to defaults
 * @returns {Promise<object>} The default settings
 */
export async function resetSettings() {
  await set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

/**
 * Subscribe to settings changes from other contexts (popup <-> newtab)
 * @param {function} callback - Called with (newSettings, changedKeys) when settings change
 * @returns {function} Unsubscribe function
 */
export function onSettingsChange(callback) {
  const listener = (changes, areaName) => {
    if (areaName !== 'sync' || !changes[STORAGE_KEYS.SETTINGS]) return;

    const newValue = changes[STORAGE_KEYS.SETTINGS].newValue;
    const oldValue = changes[STORAGE_KEYS.SETTINGS].oldValue || {};

    // Merge with defaults to ensure all keys exist
    const newSettings = {
      ...DEFAULT_SETTINGS,
      ...newValue,
      enabledCategories: {
        ...DEFAULT_SETTINGS.enabledCategories,
        ...(newValue?.enabledCategories || {})
      }
    };

    // Determine which keys changed
    const changedKeys = Object.keys(newSettings).filter(key => {
      if (key === 'enabledCategories') {
        return JSON.stringify(newSettings[key]) !== JSON.stringify(oldValue[key]);
      }
      return newSettings[key] !== oldValue[key];
    });

    if (changedKeys.length > 0) {
      callback(newSettings, changedKeys);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/**
 * Add an item to a history array, maintaining max size
 * @param {string} historyKey - The history key
 * @param {string} itemId - The item ID to add
 * @param {number} maxSize - Maximum history size
 * @returns {Promise<string[]>} The updated history
 */
export async function addToHistory(historyKey, itemId, maxSize = MAX_VERSE_HISTORY) {
  const history = await get(historyKey, []);

  // Remove if already exists
  const filtered = history.filter(id => id !== itemId);

  // Add to front
  filtered.unshift(itemId);

  // Trim to max size
  const trimmed = filtered.slice(0, maxSize);

  await set(historyKey, trimmed);
  return trimmed;
}

/**
 * Get the history array
 * @param {string} historyKey - The history key
 * @returns {Promise<string[]>} The history array
 */
export async function getHistory(historyKey) {
  return await get(historyKey, []);
}

/**
 * Cache the daily verse
 * @param {object} verse - The verse object to cache
 * @returns {Promise<void>}
 */
export async function cacheDailyVerse(verse) {
  const today = getToday();
  await set(STORAGE_KEYS.CACHED_DAILY_VERSE, { date: today, verse });
}

/**
 * Get the cached daily verse if it's from today
 * @returns {Promise<object|null>} The cached verse or null
 */
export async function getCachedDailyVerse() {
  const cached = await get(STORAGE_KEYS.CACHED_DAILY_VERSE);
  if (!cached) return null;

  const today = getToday();
  if (cached.date === today) {
    return cached.verse;
  }

  return null;
}

// --- API Rate Limiting ---

/**
 * Get today's API usage data
 * @returns {Promise<object>} { date: string, callCount: number, fetchedVerses: array }
 */
export async function getApiUsage() {
  const today = getToday();
  const usage = await get(STORAGE_KEYS.API_USAGE);

  // Reset if it's a new day
  if (!usage || usage.date !== today) {
    return { date: today, callCount: 0, fetchedVerses: [] };
  }

  return usage;
}

/**
 * Record an API call and cache the fetched verse
 * @param {object} verse - The verse fetched from the API
 * @returns {Promise<object>} Updated usage data
 */
export async function recordApiCall(verse) {
  const usage = await getApiUsage();

  // Add verse to fetched verses if not already present
  const exists = usage.fetchedVerses.some(v => v.reference === verse.reference);
  if (!exists) {
    usage.fetchedVerses.push(verse);
  }

  usage.callCount++;
  await set(STORAGE_KEYS.API_USAGE, usage);
  return usage;
}

/**
 * Check if we can make another API call today
 * @returns {Promise<boolean>} True if under the daily limit
 */
export async function canMakeApiCall() {
  const usage = await getApiUsage();
  return usage.callCount < MAX_DAILY_API_CALLS;
}

/**
 * Get the number of remaining API calls for today
 * @returns {Promise<number>} Remaining calls
 */
export async function getRemainingApiCalls() {
  const usage = await getApiUsage();
  return Math.max(0, MAX_DAILY_API_CALLS - usage.callCount);
}

/**
 * Get all verses fetched today (for cycling)
 * @returns {Promise<array>} Array of fetched verses
 */
export async function getTodaysFetchedVerses() {
  const usage = await getApiUsage();
  return usage.fetchedVerses || [];
}

/**
 * Get the current verse index for cycling through fetched verses
 * @returns {Promise<number>} Current index
 */
export async function getVerseRotationIndex() {
  const data = await get(STORAGE_KEYS.VERSE_ROTATION);
  if (!data) {
    return 0;
  }
  return data.index || 0;
}

/**
 * Increment and save the verse rotation index
 * @param {number} maxIndex - Maximum index (number of verses - 1)
 * @returns {Promise<number>} New index
 */
export async function incrementVerseRotationIndex(maxIndex) {
  const data = await get(STORAGE_KEYS.VERSE_ROTATION, { index: 0 });
  const newIndex = (data.index + 1) % (maxIndex + 1);
  await set(STORAGE_KEYS.VERSE_ROTATION, { index: newIndex, updatedAt: Date.now() });
  return newIndex;
}

// --- Favorites ---

/**
 * Get all favorites
 * @returns {Promise<array>} Array of favorite verses
 */
export async function getFavorites() {
  return await get(STORAGE_KEYS.FAVORITES, []);
}

/**
 * Save favorites
 * @param {array} favorites - Array of favorite verses
 * @returns {Promise<void>}
 */
export async function saveFavorites(favorites) {
  await set(STORAGE_KEYS.FAVORITES, favorites);
}

// --- Streak ---

/**
 * Get streak data
 * @returns {Promise<object>} { count: number, lastVisit: string }
 */
export async function getStreakData() {
  return await get(STORAGE_KEYS.STREAK_DATA, { count: 0, lastVisit: null });
}

/**
 * Save streak data
 * @param {object} streakData - { count: number, lastVisit: string }
 * @returns {Promise<void>}
 */
export async function saveStreakData(streakData) {
  await set(STORAGE_KEYS.STREAK_DATA, streakData);
}
