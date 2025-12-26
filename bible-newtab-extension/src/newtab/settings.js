// Settings panel controller

import { getSettings, updateSettings, onSettingsChange, resetSettings } from '../shared/storage.js';
import { getAllImages, addImage, deleteImage, getThumbnailUrl, getImageCount } from './imageDB.js';
import { MAX_CUSTOM_IMAGES, DEFAULT_SETTINGS } from '../shared/constants.js';

let settingsPanel;
let settingsOverlay;
let settingsBtn;
let settingsClose;
let themeToggleBtn;
let translationSelect;
let fontSizeButtons;
let imageUploadInput;
let customImagesGrid;
let imageCountEl;
let uploadLabel;
let categoriesSection;

const MAX_IMAGES = MAX_CUSTOM_IMAGES;

// Flag to prevent feedback loops when settings change from external sources
let isUpdatingFromExternal = false;

/**
 * Initialize the settings panel
 */
export function initSettings() {
  // Cache DOM elements
  settingsPanel = document.getElementById('settings-panel');
  settingsOverlay = document.getElementById('settings-overlay');
  settingsBtn = document.getElementById('settings-btn');
  settingsClose = document.getElementById('settings-close');
  themeToggleBtn = document.getElementById('theme-toggle-btn');
  translationSelect = document.getElementById('translation-select');
  fontSizeButtons = settingsPanel.querySelectorAll('.font-size-btn');
  imageUploadInput = document.getElementById('image-upload');
  customImagesGrid = document.getElementById('custom-images-grid');
  imageCountEl = document.getElementById('image-count');
  uploadLabel = document.getElementById('upload-label');
  categoriesSection = document.getElementById('categories-section');

  // Load and apply current settings to UI
  loadSettingsToUI();

  // Load custom images
  loadCustomImages();

  // Attach event listeners
  settingsBtn.addEventListener('click', () => toggleSettingsPanel(true));
  settingsClose.addEventListener('click', () => toggleSettingsPanel(false));
  settingsOverlay.addEventListener('click', () => toggleSettingsPanel(false));

  // Theme toggle
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Translation select
  translationSelect.addEventListener('change', saveSettings);

  // Font size buttons
  fontSizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      fontSizeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFontSize(btn.dataset.size);
      saveSettings();
    });
  });

  // Image upload
  if (imageUploadInput) {
    imageUploadInput.addEventListener('change', handleImageUpload);
  }

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsPanel.classList.contains('active')) {
      toggleSettingsPanel(false);
    }
  });

  // Add change listeners to all inputs
  const radioInputs = settingsPanel.querySelectorAll('input[type="radio"]');
  const checkboxInputs = settingsPanel.querySelectorAll('input[type="checkbox"]');

  radioInputs.forEach(input => {
    input.addEventListener('change', () => {
      saveSettings();
      // Update categories section visibility based on source
      updateCategoriesVisibility();
    });
  });

  checkboxInputs.forEach(input => {
    input.addEventListener('change', saveSettings);
  });

  // Reset to defaults button
  const resetBtn = document.getElementById('reset-defaults-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleResetToDefaults);
  }

  // Listen for settings changes from other contexts (e.g., popup)
  onSettingsChange((newSettings, changedKeys) => {
    // Prevent feedback loop when we made the change
    if (isUpdatingFromExternal) return;

    isUpdatingFromExternal = true;

    // Apply theme if changed
    if (changedKeys.includes('theme')) {
      applyTheme(newSettings.theme);
    }

    // Apply font size if changed
    if (changedKeys.includes('fontSize')) {
      applyFontSize(newSettings.fontSize);
    }

    // Update UI controls to reflect new settings
    updateSettingsUIFromExternal(newSettings);

    isUpdatingFromExternal = false;
  });

  // Check if URL hash indicates we should open settings
  if (window.location.hash === '#settings') {
    // Small delay to ensure everything is loaded
    setTimeout(() => {
      toggleSettingsPanel(true);
      // Clear the hash so it doesn't persist on refresh
      history.replaceState(null, '', window.location.pathname);
    }, 100);
  }
}

/**
 * Toggle the theme between light and dark
 */
async function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  await updateSettings({ theme: newTheme });
}

/**
 * Apply theme to the document
 * @param {string} theme - 'light' or 'dark'
 */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Apply font size to the document
 * @param {string} size - 'small', 'medium', or 'large'
 */
export function applyFontSize(size) {
  document.documentElement.setAttribute('data-font-size', size);
}

/**
 * Toggle the settings panel visibility
 * @param {boolean} show - Whether to show or hide the panel
 */
function toggleSettingsPanel(show) {
  if (show) {
    settingsPanel.classList.add('active');
    settingsOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus the close button for accessibility
    settingsClose.focus();
  } else {
    settingsPanel.classList.remove('active');
    settingsOverlay.classList.remove('active');
    document.body.style.overflow = '';

    // Return focus to settings button
    settingsBtn.focus();
  }
}

/**
 * Load current settings and apply to UI controls
 */
async function loadSettingsToUI() {
  const settings = await getSettings();

  // Apply theme
  applyTheme(settings.theme || 'light');

  // Apply font size
  applyFontSize(settings.fontSize || 'medium');

  // Set translation select
  if (translationSelect) {
    translationSelect.value = settings.translation;
  }

  // Set font size button active state
  fontSizeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === (settings.fontSize || 'medium'));
  });

  // Set verse mode radio
  const verseModeRadio = settingsPanel.querySelector(`input[name="verseMode"][value="${settings.verseMode}"]`);
  if (verseModeRadio) {
    verseModeRadio.checked = true;
  }

  // Set background mode radio
  const bgModeRadio = settingsPanel.querySelector(`input[name="backgroundMode"][value="${settings.backgroundMode}"]`);
  if (bgModeRadio) {
    bgModeRadio.checked = true;
  }

  // Set background source radio
  const bgSourceRadio = settingsPanel.querySelector(`input[name="backgroundSource"][value="${settings.backgroundSource || 'unsplash'}"]`);
  if (bgSourceRadio) {
    bgSourceRadio.checked = true;
  }

  // Update categories section visibility
  updateCategoriesVisibility();

  // Set category toggles
  Object.entries(settings.enabledCategories).forEach(([category, enabled]) => {
    const checkbox = settingsPanel.querySelector(`input[name="category-${category}"]`);
    if (checkbox) {
      checkbox.checked = enabled;
    }
  });
}

/**
 * Save current UI state to settings
 */
async function saveSettings() {
  isUpdatingFromExternal = true;

  const verseMode = settingsPanel.querySelector('input[name="verseMode"]:checked')?.value || 'daily';
  const backgroundMode = settingsPanel.querySelector('input[name="backgroundMode"]:checked')?.value || 'daily';
  const backgroundSource = settingsPanel.querySelector('input[name="backgroundSource"]:checked')?.value || 'unsplash';
  const translation = translationSelect?.value || DEFAULT_SETTINGS.translation;

  // Get active font size
  const activeFontBtn = settingsPanel.querySelector('.font-size-btn.active');
  const fontSize = activeFontBtn?.dataset.size || 'medium';

  const enabledCategories = {};
  const categoryInputs = settingsPanel.querySelectorAll('input[type="checkbox"][name^="category-"]');

  categoryInputs.forEach(input => {
    const category = input.name.replace('category-', '');
    enabledCategories[category] = input.checked;
  });

  // Ensure at least one category is enabled
  const anyEnabled = Object.values(enabledCategories).some(v => v);
  if (!anyEnabled) {
    // Re-enable all categories
    Object.keys(enabledCategories).forEach(key => {
      enabledCategories[key] = true;
    });
    // Update UI to reflect this
    categoryInputs.forEach(input => {
      input.checked = true;
    });
  }

  await updateSettings({
    verseMode,
    backgroundMode,
    backgroundSource,
    translation,
    fontSize,
    enabledCategories
  });

  isUpdatingFromExternal = false;
}

/**
 * Update categories section visibility based on background source
 */
function updateCategoriesVisibility() {
  if (!categoriesSection) return;

  const source = settingsPanel.querySelector('input[name="backgroundSource"]:checked')?.value || 'unsplash';

  // Hide categories section if using only custom images
  if (source === 'custom') {
    categoriesSection.style.display = 'none';
  } else {
    categoriesSection.style.display = 'block';
  }
}

/**
 * Load and display custom images in the grid
 */
async function loadCustomImages() {
  if (!customImagesGrid) return;

  try {
    const images = await getAllImages();
    const count = images.length;

    // Update count display
    if (imageCountEl) {
      imageCountEl.textContent = `(${count}/${MAX_IMAGES})`;
    }

    // Update upload button state
    if (uploadLabel) {
      if (count >= MAX_IMAGES) {
        uploadLabel.classList.add('disabled');
      } else {
        uploadLabel.classList.remove('disabled');
      }
    }

    // Clear grid
    customImagesGrid.innerHTML = '';

    // Add thumbnails
    for (const image of images) {
      const thumbUrl = await getThumbnailUrl(image.id);
      if (thumbUrl) {
        const thumb = createImageThumbnail(image.id, thumbUrl, image.name);
        customImagesGrid.appendChild(thumb);
      }
    }
  } catch (error) {
    console.error('Failed to load custom images:', error);
  }
}

/**
 * Create a thumbnail element for a custom image
 * @param {string} id - Image ID
 * @param {string} thumbUrl - Thumbnail URL
 * @param {string} name - Image name
 * @returns {HTMLElement}
 */
function createImageThumbnail(id, thumbUrl, name) {
  const div = document.createElement('div');
  div.className = 'custom-image-thumb';
  div.dataset.imageId = id;

  const img = document.createElement('img');
  img.src = thumbUrl;
  img.alt = name || 'Custom background';
  img.loading = 'lazy';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.title = 'Remove image';
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await handleDeleteImage(id);
  });

  div.appendChild(img);
  div.appendChild(deleteBtn);

  return div;
}

/**
 * Handle image upload
 * @param {Event} event - File input change event
 */
async function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const currentCount = await getImageCount();
  const availableSlots = MAX_IMAGES - currentCount;

  if (availableSlots <= 0) {
    alert(`Maximum of ${MAX_IMAGES} images reached. Please remove some images first.`);
    event.target.value = '';
    return;
  }

  const filesToUpload = Array.from(files).slice(0, availableSlots);

  for (const file of filesToUpload) {
    try {
      await addImage(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert(error.message || 'Failed to upload image');
    }
  }

  // Refresh the grid
  await loadCustomImages();

  // Clear the input
  event.target.value = '';
}

/**
 * Handle image deletion
 * @param {string} id - Image ID to delete
 */
async function handleDeleteImage(id) {
  try {
    await deleteImage(id);
    await loadCustomImages();
  } catch (error) {
    console.error('Failed to delete image:', error);
    alert('Failed to delete image');
  }
}

/**
 * Update UI controls from external settings change (no save triggered)
 * @param {object} settings - The new settings object
 */
function updateSettingsUIFromExternal(settings) {
  // Set translation select
  if (translationSelect) {
    translationSelect.value = settings.translation;
  }

  // Set font size button active state
  fontSizeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === settings.fontSize);
  });

  // Set verse mode radio
  const verseModeRadio = settingsPanel.querySelector(`input[name="verseMode"][value="${settings.verseMode}"]`);
  if (verseModeRadio) verseModeRadio.checked = true;

  // Set background mode radio
  const bgModeRadio = settingsPanel.querySelector(`input[name="backgroundMode"][value="${settings.backgroundMode}"]`);
  if (bgModeRadio) bgModeRadio.checked = true;

  // Set background source radio
  const bgSourceRadio = settingsPanel.querySelector(`input[name="backgroundSource"][value="${settings.backgroundSource}"]`);
  if (bgSourceRadio) bgSourceRadio.checked = true;

  // Update categories visibility
  updateCategoriesVisibility();

  // Set category toggles
  Object.entries(settings.enabledCategories).forEach(([category, enabled]) => {
    const checkbox = settingsPanel.querySelector(`input[name="category-${category}"]`);
    if (checkbox) checkbox.checked = enabled;
  });
}

/**
 * Handle reset to defaults button click
 */
async function handleResetToDefaults() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
    return;
  }

  try {
    const defaults = await resetSettings();

    // Apply theme and font size immediately
    applyTheme(defaults.theme);
    applyFontSize(defaults.fontSize);

    // Reload UI
    await loadSettingsToUI();
  } catch (error) {
    console.error('Failed to reset settings:', error);
    alert('Failed to reset settings. Please try again.');
  }
}

/**
 * Export for potential external access
 */
export { toggleSettingsPanel };
