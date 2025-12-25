// Background image selection - supports local images, Unsplash API, and custom user images

import { getHistory, addToHistory, get, set } from '../shared/storage.js';
import { getDailyIndex, getRandomIndexWithHistory } from '../utils/random.js';
import { getBackendUrl, DEFAULT_BACKEND_URL } from '../utils/config.js';
import { getAllImages, getImageUrl, getRandomImage, getImageCount } from './imageDB.js';
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
 * Get a random enabled category
 * @param {object} enabledCategories - Object with category: boolean
 * @returns {string} A random enabled category
 */
function getRandomCategory(enabledCategories) {
  const enabled = Object.entries(enabledCategories)
    .filter(([_, isEnabled]) => isEnabled)
    .map(([category]) => category);

  if (enabled.length === 0) {
    return 'nature';
  }

  return enabled[Math.floor(Math.random() * enabled.length)];
}

/**
 * Get daily category based on date
 * @param {object} enabledCategories - Object with category: boolean
 * @returns {string} Today's category
 */
function getDailyCategory(enabledCategories) {
  const enabled = Object.entries(enabledCategories)
    .filter(([_, isEnabled]) => isEnabled)
    .map(([category]) => category);

  if (enabled.length === 0) {
    return 'nature';
  }

  const today = new Date().toISOString().split('T')[0];
  const dayHash = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  return enabled[dayHash % enabled.length];
}

/**
 * Fetch image from Unsplash API via backend
 * @param {string} mode - 'daily' or 'random'
 * @param {object} enabledCategories - Object with category: boolean
 * @returns {Promise<object|null>} Image object or null on failure
 */
async function fetchFromBackend(baseUrl, mode, enabledCategories) {
  const category = mode === 'daily'
    ? getDailyCategory(enabledCategories)
    : getRandomCategory(enabledCategories);

  const apiUrl = new URL('/api/background-image', baseUrl);
  apiUrl.searchParams.set('category', category);
  apiUrl.searchParams.set('mode', mode);

  const response = await fetch(apiUrl.toString());

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    path: data.url,
    alt: data.alt,
    category: data.category,
    photographer: data.photographer,
    photographerUrl: data.photographerUrl,
    isUnsplash: true
  };
}

async function fetchUnsplashImage(mode, enabledCategories) {
  try {
    const backendUrl = await getBackendUrl();
    return await fetchFromBackend(backendUrl, mode, enabledCategories);
  } catch (error) {
    try {
      const backendUrl = await getBackendUrl();
      if (backendUrl !== DEFAULT_BACKEND_URL) {
        return await fetchFromBackend(DEFAULT_BACKEND_URL, mode, enabledCategories);
      }
    } catch (fallbackError) {
      console.warn('Failed to fetch Unsplash image from fallback:', fallbackError);
    }

    console.warn('Failed to fetch Unsplash image:', error);
    return null;
  }
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
export async function getBackgroundImage(mode, enabledCategories, source = 'unsplash') {
  // For daily mode, check cache first
  if (mode === 'daily') {
    const cached = await get('cached-daily-image');
    const today = new Date().toISOString().split('T')[0];

    if (cached && cached.date === today && cached.image) {
      // Verify the cached image source matches current setting
      const isCustom = cached.image.isCustom;
      const sourceMatches =
        (source === 'custom' && isCustom) ||
        (source === 'unsplash' && !isCustom) ||
        source === 'both';

      if (sourceMatches) {
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
      image = await fetchUnsplashImage(mode, enabledCategories);

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
    image = await fetchUnsplashImage(mode, enabledCategories);

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
