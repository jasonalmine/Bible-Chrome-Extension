// Popup script for Bible Verse New Tab
// Refactored to use shared modules

import { getVerse, getApiCallsRemaining } from '../shared/verse.js';
import {
  getSettings,
  updateSettings,
  getFavorites,
  saveFavorites,
  getStreakData,
  saveStreakData,
  getApiUsage,
  getVerseRotationIndex,
  set,
  cacheDailyVerse,
  onSettingsChange
} from '../shared/storage.js';
import {
  DEFAULT_SETTINGS,
  MAX_FAVORITES,
  POPUP_FONT_SIZES,
  STORAGE_KEYS,
  buildInterpretationPrompt
} from '../shared/constants.js';
import { getToday, getYesterday, isToday, isYesterday } from '../shared/date-utils.js';

let currentSettings = { ...DEFAULT_SETTINGS };
let currentVerse = null;
let favorites = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Load current settings first (for theme)
  await loadSettings();
  await loadFavorites();

  // Apply theme immediately
  applyTheme(currentSettings.theme);

  // Load and display streak
  await updateStreak();

  // Load cached verse or fetch new one
  await loadVerse();

  // Setup event listeners
  setupEventListeners();
  setupKeyboardShortcuts();

  // Render favorites
  renderFavorites();

  // Update refresh button with remaining API calls
  await updateRefreshButtonState();

  // Listen for settings changes from other contexts (e.g., newtab settings panel)
  onSettingsChange((newSettings, changedKeys) => {
    currentSettings = newSettings;
    updateSettingsUI();

    // Apply theme if it changed
    if (changedKeys.includes('theme')) {
      applyTheme(newSettings.theme);
    }

    // Update font size if it changed
    if (changedKeys.includes('fontSize')) {
      const verseText = document.getElementById('popup-verse-text');
      verseText.style.fontSize = getFontSize();
    }
  });
});

/**
 * Load and display today's verse
 */
async function loadVerse() {
  const verseText = document.getElementById('popup-verse-text');
  const verseRef = document.getElementById('popup-verse-ref');

  try {
    const mode = currentSettings.verseMode || 'daily';
    const verse = await getVerse(mode);

    currentVerse = verse;
    displayVerse(verse);
    updateFavoriteButton();
  } catch (error) {
    console.error('Failed to load verse:', error);
    verseText.textContent = 'Open a new tab to see today\'s verse';
    verseText.classList.remove('loading');
    verseRef.textContent = '';
  }
}

/**
 * Display verse in the popup
 */
function displayVerse(verse) {
  const verseText = document.getElementById('popup-verse-text');
  const verseRef = document.getElementById('popup-verse-ref');

  // Apply font size
  verseText.style.fontSize = getFontSize();

  // Truncate long verses for popup
  let text = verse.text;
  if (text.length > 200) {
    text = text.substring(0, 197) + '...';
  }

  verseText.textContent = `"${text}"`;
  verseRef.textContent = `${verse.reference} (${verse.translation})`;
  verseText.classList.remove('loading');
}

/**
 * Get font size based on setting
 */
function getFontSize() {
  return POPUP_FONT_SIZES[currentSettings.fontSize] || POPUP_FONT_SIZES.medium;
}

/**
 * Load current settings and update UI
 */
async function loadSettings() {
  try {
    currentSettings = await getSettings();
    updateSettingsUI();
  } catch (error) {
    console.error('Failed to load settings:', error);
    updateSettingsUI();
  }
}

/**
 * Load favorites from storage
 */
async function loadFavorites() {
  try {
    favorites = await getFavorites();
  } catch (error) {
    console.error('Failed to load favorites:', error);
    favorites = [];
  }
}

/**
 * Update refresh button state based on remaining API calls
 */
async function updateRefreshButtonState() {
  const btn = document.getElementById('refresh-btn');
  const remaining = await getApiCallsRemaining();

  if (remaining > 0) {
    btn.title = `Get new verse (${remaining} remaining today)`;
    btn.classList.remove('exhausted');
  } else {
    btn.title = 'Cycling through today\'s verses (API limit reached)';
    btn.classList.add('exhausted');
  }
}

/**
 * Update the settings UI to reflect current settings
 */
function updateSettingsUI() {
  // Update toggle buttons for verse mode
  document.querySelectorAll('.toggle-btn[data-setting="verseMode"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === currentSettings.verseMode);
  });

  // Update toggle buttons for background mode
  document.querySelectorAll('.toggle-btn[data-setting="backgroundMode"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === currentSettings.backgroundMode);
  });

  // Update translation select
  const translationSelect = document.getElementById('translation-select');
  if (translationSelect) {
    translationSelect.value = currentSettings.translation;
  }

  // Update font size buttons
  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === currentSettings.fontSize);
  });
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    await updateSettings(currentSettings);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Setup event listeners for buttons
 */
function setupEventListeners() {
  // Theme toggle button
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Open new tab button
  document.getElementById('new-tab-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://newtab' });
    window.close();
  });

  // Refresh/New verse button
  document.getElementById('refresh-btn').addEventListener('click', handleRefresh);

  // Interpret button
  document.getElementById('interpret-btn').addEventListener('click', handleInterpret);

  // Copy button
  document.getElementById('copy-btn').addEventListener('click', copyVerse);

  // Favorite button
  document.getElementById('favorite-btn').addEventListener('click', toggleFavorite);

  // Share button
  document.getElementById('share-btn').addEventListener('click', toggleShareMenu);

  // Share menu items
  document.querySelectorAll('.share-menu-item').forEach(item => {
    item.addEventListener('click', () => handleShare(item.dataset.share));
  });

  // Close share menu when clicking outside
  document.addEventListener('click', (e) => {
    const shareMenu = document.getElementById('share-menu');
    const shareBtn = document.getElementById('share-btn');
    if (!shareMenu.contains(e.target) && !shareBtn.contains(e.target)) {
      shareMenu.classList.remove('visible');
    }
  });

  // Toggle buttons (verse mode and background mode)
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const setting = btn.dataset.setting;
      const value = btn.dataset.value;

      currentSettings[setting] = value;
      updateSettingsUI();
      await saveSettings();
    });
  });

  // Translation select
  document.getElementById('translation-select').addEventListener('change', async (e) => {
    currentSettings.translation = e.target.value;
    await saveSettings();
    showToast(`Translation changed to ${e.target.value}`);
  });

  // Font size buttons
  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentSettings.fontSize = btn.dataset.size;
      updateSettingsUI();
      await saveSettings();

      // Update displayed verse font size
      const verseText = document.getElementById('popup-verse-text');
      verseText.style.fontSize = getFontSize();
    });
  });

  // Collapsible sections
  document.getElementById('favorites-header').addEventListener('click', () => {
    toggleCollapsible('favorites-header', 'favorites-content');
  });

  document.getElementById('settings-header').addEventListener('click', () => {
    toggleCollapsible('settings-header', 'settings-content');
  });

  // More Settings button - opens new tab with settings panel
  const moreSettingsBtn = document.getElementById('more-settings-btn');
  if (moreSettingsBtn) {
    moreSettingsBtn.addEventListener('click', openFullSettings);
  }
}

/**
 * Open new tab and trigger the settings panel to open
 */
function openFullSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html#settings') });
  window.close();
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'r':
        handleRefresh();
        break;
      case 't':
        toggleTheme();
        break;
      case 'c':
        copyVerse();
        break;
      case 'f':
        toggleFavorite();
        break;
      case 's':
        toggleShareMenu();
        break;
      case 'i':
        handleInterpret();
        break;
    }
  });
}

/**
 * Handle refresh button click - get a new verse
 */
async function handleRefresh() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('refreshing');

  try {
    const remaining = await getApiCallsRemaining();
    const mode = currentSettings.verseMode || 'daily';

    // Force a new verse fetch
    const verse = await getVerse(mode, true);
    currentVerse = verse;
    displayVerse(verse);
    updateFavoriteButton();

    if (remaining > 0) {
      showToast(`New verse fetched (${remaining - 1} calls left today)`);
    } else {
      showToast('Showing saved verse');
    }
  } catch (error) {
    console.error('Failed to refresh verse:', error);
    showToast('Could not load new verse');
  }

  await updateRefreshButtonState();

  setTimeout(() => {
    btn.classList.remove('refreshing');
  }, 500);
}

/**
 * Handle interpret button click - opens ChatGPT with a biblical exegesis prompt
 */
function handleInterpret() {
  if (!currentVerse) return;

  const prompt = buildInterpretationPrompt(currentVerse);
  const encodedPrompt = encodeURIComponent(prompt);
  const chatGptUrl = `https://chat.openai.com/?q=${encodedPrompt}`;

  window.open(chatGptUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Copy verse to clipboard
 */
async function copyVerse() {
  if (!currentVerse) return;

  const text = `"${currentVerse.text}" - ${currentVerse.reference} (${currentVerse.translation})`;

  try {
    await navigator.clipboard.writeText(text);

    const copyBtn = document.getElementById('copy-btn');
    copyBtn.classList.add('copied');
    showToast('Verse copied to clipboard!');

    setTimeout(() => {
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Failed to copy verse');
  }
}

/**
 * Toggle favorite for current verse
 */
async function toggleFavorite() {
  if (!currentVerse) return;

  const existingIndex = favorites.findIndex(
    f => f.reference === currentVerse.reference
  );

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    showToast('Removed from favorites');
  } else {
    favorites.unshift({
      text: currentVerse.text,
      reference: currentVerse.reference,
      translation: currentVerse.translation,
      savedAt: Date.now()
    });
    // Keep only max favorites
    if (favorites.length > MAX_FAVORITES) {
      favorites = favorites.slice(0, MAX_FAVORITES);
    }
    showToast('Added to favorites!');
  }

  await saveFavorites(favorites);
  updateFavoriteButton();
  renderFavorites();
}

/**
 * Update favorite button state
 */
function updateFavoriteButton() {
  const btn = document.getElementById('favorite-btn');
  if (!currentVerse) return;

  const isFavorite = favorites.some(f => f.reference === currentVerse.reference);
  btn.classList.toggle('active', isFavorite);

  // Update icon fill
  const svg = btn.querySelector('svg');
  if (isFavorite) {
    svg.setAttribute('fill', 'currentColor');
  } else {
    svg.setAttribute('fill', 'none');
  }
}

/**
 * Render favorites list
 */
function renderFavorites() {
  const container = document.getElementById('favorites-list');

  if (favorites.length === 0) {
    container.innerHTML = '<p class="no-favorites">No favorites yet. Click the heart icon to save verses.</p>';
    return;
  }

  container.innerHTML = favorites.map((fav, index) => `
    <div class="favorite-item" data-index="${index}">
      <span class="favorite-item-text">"${fav.text.substring(0, 50)}${fav.text.length > 50 ? '...' : ''}"</span>
      <span class="favorite-item-ref">${fav.reference}</span>
      <button class="favorite-remove-btn" data-index="${index}" title="Remove">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');

  // Add click listeners for favorite items
  container.querySelectorAll('.favorite-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking remove button
      if (e.target.closest('.favorite-remove-btn')) return;

      const index = parseInt(item.dataset.index);
      const fav = favorites[index];
      currentVerse = fav;
      displayVerse(fav);
      updateFavoriteButton();
    });
  });

  // Add click listeners for remove buttons
  container.querySelectorAll('.favorite-remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      favorites.splice(index, 1);
      await saveFavorites(favorites);
      renderFavorites();
      updateFavoriteButton();
      showToast('Removed from favorites');
    });
  });
}

/**
 * Toggle share menu visibility
 */
function toggleShareMenu() {
  const menu = document.getElementById('share-menu');
  menu.classList.toggle('visible');
}

/**
 * Handle share action
 */
function handleShare(platform) {
  if (!currentVerse) return;

  const text = `"${currentVerse.text}" - ${currentVerse.reference}`;
  const encodedText = encodeURIComponent(text);

  switch (platform) {
    case 'twitter':
      window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
      break;
    case 'copy-link':
      copyVerse();
      break;
  }

  document.getElementById('share-menu').classList.remove('visible');
}

/**
 * Toggle collapsible section
 */
function toggleCollapsible(headerId, contentId) {
  const header = document.getElementById(headerId);
  const content = document.getElementById(contentId);

  header.classList.toggle('expanded');
  content.classList.toggle('expanded');
}

/**
 * Update and display streak
 */
async function updateStreak() {
  try {
    let streakData = await getStreakData();
    const today = getToday();

    if (isToday(streakData.lastVisit)) {
      // Already visited today, just display
    } else if (isYesterday(streakData.lastVisit)) {
      // Continuing streak
      streakData.count++;
      streakData.lastVisit = today;
      await saveStreakData(streakData);
    } else if (streakData.lastVisit !== today) {
      // Streak broken or first visit
      streakData.count = 1;
      streakData.lastVisit = today;
      await saveStreakData(streakData);
    }

    // Display streak badge if > 0
    const badge = document.getElementById('streak-badge');
    const countEl = document.getElementById('streak-count');

    if (streakData.count > 0) {
      badge.style.display = 'flex';
      countEl.textContent = streakData.count;

      // Add milestone class for special streaks
      if (streakData.count >= 7 && streakData.count % 7 === 0) {
        badge.classList.add('milestone');
      } else {
        badge.classList.remove('milestone');
      }
    }
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
}

/**
 * Show toast notification
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

/**
 * Apply theme to the document
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Toggle between light and dark themes
 */
async function toggleTheme() {
  currentSettings.theme = currentSettings.theme === 'light' ? 'dark' : 'light';
  applyTheme(currentSettings.theme);
  await saveSettings();
}
