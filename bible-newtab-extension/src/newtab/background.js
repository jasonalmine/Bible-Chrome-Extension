// Background image selection - supports local images and custom user images

import { getHistory, addToHistory, get, set } from '../shared/storage.js';
import { getDailyIndex, getRandomIndexWithHistory } from '../utils/random.js';
import { getAllImages, getImageUrl, getImageCount } from './imageDB.js';
import { STORAGE_KEYS, MAX_IMAGE_HISTORY } from '../shared/constants.js';

let imagesData = null;

/**
 * Load image metadata from the bundled JSON file
 * @returns {Promise<object>} The images data
 */
async function loadImagesData() {
  if (imagesData) return imagesData;

  try {
    const response = await fetch(chrome.runtime.getURL('data/images.json'));
    imagesData = await response.json();
    return imagesData;
  } catch (error) {
    console.error('Failed to load images data:', error);
    return {
      images: [
        {
          id: 'nature-01',
          category: 'nature',
          filename: 'backgrounds/nature/nature-01.webp',
          alt: 'Nature background'
        }
      ]
    };
  }
}

/**
 * Filter images by enabled categories
 * @param {object[]} images - All images
 * @param {object} enabledCategories - Object with category: boolean
 * @returns {object[]} Filtered images
 */
function filterByCategories(images, enabledCategories) {
  const filtered = images.filter(img => enabledCategories[img.category] === true);
  if (filtered.length === 0) {
    return images;
  }
  return filtered;
}

/**
 * Unsplash Source was deprecated in 2023 - this function returns null
 * to fall back to local images.
 * @returns {Promise<null>} Always returns null
 */
async function fetchUnsplashImage() {
  // Unsplash Source (source.unsplash.com) was deprecated and shut down.
  // Return null to trigger local image fallback.
  return null;
}

/**
 * Get a local fallback image
 * @param {string} mode - 'daily' or 'random'
 * @param {object} enabledCategories - Object with category: boolean
 * @returns {Promise<object>} Image object
 */
async function getLocalImage(mode, enabledCategories) {
  const data = await loadImagesData();
  const filteredImages = filterByCategories(data.images, enabledCategories);

  let image;

  if (mode === 'daily') {
    const index = getDailyIndex(filteredImages.length, 'bg-image');
    image = filteredImages[index];
  } else {
    const history = await getHistory(STORAGE_KEYS.IMAGE_HISTORY);
    const index = getRandomIndexWithHistory(filteredImages, history, 'id');
    image = filteredImages[index];
    await addToHistory(STORAGE_KEYS.IMAGE_HISTORY, image.id, MAX_IMAGE_HISTORY);
  }

  return {
    id: image.id,
    path: chrome.runtime.getURL(`images/${image.filename}`),
    alt: image.alt,
    category: image.category,
    isUnsplash: false
  };
}

/**
 * Get a custom user-uploaded image
 * @param {string} mode - 'daily' or 'random'
 * @returns {Promise<object|null>} Image object or null if no custom images
 */
async function getCustomImage(mode) {
  const customImages = await getAllImages();

  if (customImages.length === 0) {
    return null;
  }

  let selectedImage;

  if (mode === 'daily') {
    // Use consistent daily index based on date
    const index = getDailyIndex(customImages.length, 'custom-image');
    selectedImage = customImages[index];
  } else {
    // Get random image, trying to avoid recently shown ones
    const history = await getHistory('custom-image-history');
    const available = customImages.filter(img => !history.includes(img.id));

    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      selectedImage = available[randomIndex];
    } else {
      // All images shown recently, pick any
      const randomIndex = Math.floor(Math.random() * customImages.length);
      selectedImage = customImages[randomIndex];
    }

    // Add to history
    await addToHistory('custom-image-history', selectedImage.id, 5);
  }

  // Get the blob URL for the image
  const imageUrl = await getImageUrl(selectedImage.id);

  if (!imageUrl) {
    return null;
  }

  return {
    id: selectedImage.id,
    path: imageUrl,
    alt: selectedImage.name || 'Custom background',
    category: 'custom',
    isCustom: true,
    isUnsplash: false
  };
}

/**
 * Get a background image based on mode, source, and enabled categories
 * @param {string} mode - 'daily' or 'random'
 * @param {object} enabledCategories - Object with category: boolean
 * @param {string} source - 'unsplash' | 'custom' | 'both' (default: 'unsplash')
 * @returns {Promise<object>} Image object with path and metadata
 */
export async function getBackgroundImage(mode, enabledCategories, source = 'unsplash', forceRefresh = false) {
  // For daily mode, check cache first (unless forceRefresh is true)
  if (mode === 'daily' && !forceRefresh) {
    const cached = await get('cached-daily-image');
    const today = new Date().toISOString().split('T')[0];

    if (cached && cached.date === today && cached.image) {
      // Verify the cached image source matches current setting
      const isCustom = cached.image.isCustom;
      const sourceMatches =
        (source === 'custom' && isCustom) ||
        (source === 'unsplash' && !isCustom) ||
        source === 'both';

      // Also verify category matches (for non-custom images)
      const categoryMatches = isCustom ||
        (cached.image.category && enabledCategories[cached.image.category] === true);

      if (sourceMatches && categoryMatches) {
        return cached.image;
      }
    }
  }

  let image = null;

  // Handle different source modes
  if (source === 'custom') {
    // Only use custom images
    image = await getCustomImage(mode);
    // Fall back to local if no custom images
    if (!image) {
      image = await getLocalImage(mode, enabledCategories);
    }
  } else if (source === 'both') {
    // Randomly choose between custom and Unsplash
    const customCount = await getImageCount();
    const useCustom = customCount > 0 && Math.random() < 0.5;

    if (useCustom) {
      image = await getCustomImage(mode);
    }

    if (!image) {
      image = await fetchUnsplashImage();

      // Verify remote image loads
      if (image?.isUnsplash) {
        try {
          await preloadImage(image.path);
        } catch (error) {
          console.warn('Unsplash image failed to load, using local fallback:', error);
          image = null;
        }
      }
    }

    // Fall back to local images
    if (!image) {
      image = await getLocalImage(mode, enabledCategories);
    }
  } else {
    // Default: 'unsplash' - Try Unsplash API first
    image = await fetchUnsplashImage();

    // Verify remote image loads; fall back to local if blocked.
    if (image?.isUnsplash) {
      try {
        await preloadImage(image.path);
      } catch (error) {
        console.warn('Unsplash image failed to load, using local fallback:', error);
        image = null;
      }
    }

    // Fall back to local images
    if (!image) {
      image = await getLocalImage(mode, enabledCategories);
    }
  }

  // Cache daily image
  if (mode === 'daily' && image) {
    const today = new Date().toISOString().split('T')[0];
    await set('cached-daily-image', { date: today, image });
  }

  return image;
}

/**
 * Preload an image for faster display
 * @param {string} src - Image source URL
 * @returns {Promise<void>}
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
}
