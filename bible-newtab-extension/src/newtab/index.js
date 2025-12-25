// Main entry point for Bible Verse New Tab

import { getVerse, getCopyrightText } from '../shared/verse.js';
import { getBackgroundImage, preloadImage } from './background.js';
import { initSettings, applyTheme, applyFontSize } from './settings.js';
import { getSettings } from '../shared/storage.js';
import { buildInterpretationPrompt } from '../shared/constants.js';

// DOM elements
let backgroundContainer;
let verseContainer;
let verseTextEl;
let verseReferenceEl;
let copyrightEl;
let photoCredit;
let interpretBtn;

// Current verse data for interpretation
let currentVerse = null;

/**
 * Initialize the new tab page
 */
async function init() {
  // Cache DOM elements
  backgroundContainer = document.getElementById('background-container');
  verseContainer = document.querySelector('.verse-container');
  verseTextEl = document.getElementById('verse-text');
  verseReferenceEl = document.getElementById('verse-reference');
  copyrightEl = document.getElementById('copyright-text');
  photoCredit = document.getElementById('photo-credit');
  interpretBtn = document.getElementById('interpret-btn');

  // Get user settings
  const settings = await getSettings();

  // Apply theme and font size immediately to prevent flash
  applyTheme(settings.theme || 'light');
  applyFontSize(settings.fontSize || 'medium');

  // Load background and verse in parallel for performance
  // Note: Translation setting is synced but verse API currently uses ESV with NKJV fallback
  const [bgImage, verse] = await Promise.all([
    getBackgroundImage(settings.backgroundMode, settings.enabledCategories, settings.backgroundSource || 'unsplash'),
    getVerse(settings.verseMode)
  ]);

  // Apply background (preload for smooth transition)
  await applyBackground(bgImage);

  // Display verse
  displayVerse(verse);

  // Setup interpret button
  if (interpretBtn) {
    interpretBtn.addEventListener('click', handleInterpretClick);
  }

  // Initialize settings panel
  initSettings();
}

/**
 * Apply background image with preloading and fade-in
 * @param {object} image - Image object with path and metadata
 */
async function applyBackground(image) {
  try {
    // Preload the image
    await preloadImage(image.path);

    // Apply to container
    backgroundContainer.style.backgroundImage = `url('${image.path}')`;

    // Trigger fade-in
    backgroundContainer.classList.add('loaded');

    // Show photographer credit for Unsplash images
    setPhotoCredit(image);
  } catch (error) {
    console.warn('Failed to load background image:', error);
    // Apply anyway as fallback
    backgroundContainer.style.backgroundImage = `url('${image.path}')`;
    backgroundContainer.classList.add('loaded');
    setPhotoCredit(image);
  }
}

/**
 * Display verse text and reference with fade-in animation
 * @param {object} verse - Verse object with text, reference, translation
 */
function displayVerse(verse) {
  // Store current verse for interpretation
  currentVerse = verse;

  // Set verse text
  verseTextEl.textContent = `"${verse.text}"`;

  // Set reference with translation indicator
  verseReferenceEl.textContent = '';
  verseReferenceEl.append(document.createTextNode(`${verse.reference} `));
  const translationEl = document.createElement('span');
  translationEl.className = 'translation';
  translationEl.textContent = `(${verse.translation})`;
  verseReferenceEl.append(translationEl);

  // Set copyright if applicable
  const copyright = getCopyrightText(verse.translation);
  if (copyright) {
    copyrightEl.textContent = copyright;
  } else {
    copyrightEl.textContent = '';
  }

  // Trigger fade-in
  verseContainer.classList.add('loaded');
}

/**
 * Handle interpret button click - opens ChatGPT with a biblical exegesis prompt
 */
function handleInterpretClick() {
  if (!currentVerse) return;

  // Build the prompt using shared function
  const prompt = buildInterpretationPrompt(currentVerse);

  // Encode the prompt for URL
  const encodedPrompt = encodeURIComponent(prompt);

  // Open ChatGPT with the prompt
  const chatGptUrl = `https://chat.openai.com/?q=${encodedPrompt}`;

  // Open in new tab
  window.open(chatGptUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Render Unsplash photo credit safely.
 * @param {object} image - Image object with metadata
 */
function setPhotoCredit(image) {
  if (!photoCredit) return;

  if (!image?.isUnsplash || !image.photographer) {
    photoCredit.textContent = '';
    photoCredit.style.display = 'none';
    return;
  }

  photoCredit.textContent = '';
  const photographerLink = document.createElement('a');
  photographerLink.href = `${image.photographerUrl}?utm_source=bible_newtab&utm_medium=referral`;
  photographerLink.target = '_blank';
  photographerLink.rel = 'noopener';
  photographerLink.textContent = image.photographer;

  const unsplashLink = document.createElement('a');
  unsplashLink.href = 'https://unsplash.com?utm_source=bible_newtab&utm_medium=referral';
  unsplashLink.target = '_blank';
  unsplashLink.rel = 'noopener';
  unsplashLink.textContent = 'Unsplash';

  photoCredit.append('Photo by ', photographerLink, ' on ', unsplashLink);
  photoCredit.style.display = 'block';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
