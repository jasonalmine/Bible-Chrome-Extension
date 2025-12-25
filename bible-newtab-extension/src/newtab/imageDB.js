// IndexedDB wrapper for storing custom background images
// Stores up to 10 images as Blobs for efficient storage

const DB_NAME = 'BibleNewTabImages';
const DB_VERSION = 1;
const STORE_NAME = 'customImages';
const MAX_IMAGES = 10;

let db = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('order', 'order', { unique: false });
        store.createIndex('addedAt', 'addedAt', { unique: false });
      }
    };
  });
}

/**
 * Add a custom image to the database
 * @param {File} file - The image file to add
 * @returns {Promise<object>} The saved image metadata
 */
export async function addImage(file) {
  const database = await initDB();

  // Check current count
  const currentImages = await getAllImages();
  if (currentImages.length >= MAX_IMAGES) {
    throw new Error(`Maximum of ${MAX_IMAGES} images allowed. Please remove an image first.`);
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB per image)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image must be smaller than 5MB');
  }

  // Create a unique ID
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Read file as blob
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });

  // Get next order number
  const maxOrder = currentImages.reduce((max, img) => Math.max(max, img.order || 0), 0);

  const imageData = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    blob,
    order: maxOrder + 1,
    addedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(imageData);

    request.onsuccess = () => {
      resolve({
        id: imageData.id,
        name: imageData.name,
        order: imageData.order,
        addedAt: imageData.addedAt
      });
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get all custom images metadata (without blob data)
 * @returns {Promise<Array>} Array of image metadata
 */
export async function getAllImages() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const images = request.result.map(img => ({
        id: img.id,
        name: img.name,
        type: img.type,
        size: img.size,
        order: img.order,
        addedAt: img.addedAt
      }));
      // Sort by order
      images.sort((a, b) => (a.order || 0) - (b.order || 0));
      resolve(images);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get a specific image with its blob data
 * @param {string} id - The image ID
 * @returns {Promise<object|null>} The image data with blob, or null if not found
 */
export async function getImage(id) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get an image as an object URL for display
 * @param {string} id - The image ID
 * @returns {Promise<string|null>} The object URL, or null if not found
 */
export async function getImageUrl(id) {
  const image = await getImage(id);
  if (!image || !image.blob) return null;

  return URL.createObjectURL(image.blob);
}

/**
 * Delete a custom image
 * @param {string} id - The image ID to delete
 * @returns {Promise<void>}
 */
export async function deleteImage(id) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get a random custom image
 * @param {string[]} excludeIds - IDs to exclude from selection
 * @returns {Promise<object|null>} Random image data with blob, or null if none available
 */
export async function getRandomImage(excludeIds = []) {
  const allImages = await getAllImages();
  const available = allImages.filter(img => !excludeIds.includes(img.id));

  if (available.length === 0) {
    // If all excluded, pick from all
    if (allImages.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * allImages.length);
    return getImage(allImages[randomIndex].id);
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  return getImage(available[randomIndex].id);
}

/**
 * Get the count of custom images
 * @returns {Promise<number>}
 */
export async function getImageCount() {
  const images = await getAllImages();
  return images.length;
}

/**
 * Clear all custom images
 * @returns {Promise<void>}
 */
export async function clearAllImages() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Create a thumbnail URL for an image (for settings preview)
 * @param {string} id - The image ID
 * @param {number} maxSize - Maximum dimension size
 * @returns {Promise<string|null>} The thumbnail data URL
 */
export async function getThumbnailUrl(id, maxSize = 80) {
  const image = await getImage(id);
  if (!image || !image.blob) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(image.blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down maintaining aspect ratio
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}
