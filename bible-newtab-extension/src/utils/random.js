/**
 * Simple hash function for deterministic randomization
 * @param {string} str - String to hash
 * @returns {number} A hash value
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get a deterministic index for today based on a seed
 * @param {number} arrayLength - Length of the array to index into
 * @param {string} seed - Seed for the hash
 * @returns {number} An index into the array
 */
export function getDailyIndex(arrayLength, seed = '') {
  const today = new Date().toISOString().split('T')[0];
  const hash = simpleHash(`${seed}-${today}`);
  return Math.abs(hash) % arrayLength;
}

/**
 * Get a random index avoiding items in history
 * @param {Array} items - Array to select from
 * @param {string[]} history - IDs to avoid
 * @param {string} idKey - Key to get ID from items
 * @returns {number} A random index
 */
export function getRandomIndexWithHistory(items, history, idKey = 'id') {
  // Filter out items in history
  const availableIndices = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !history.includes(item[idKey]))
    .map(({ index }) => index);

  // If all items are in history, just pick randomly from all
  if (availableIndices.length === 0) {
    return Math.floor(Math.random() * items.length);
  }

  // Pick randomly from available
  const randomPos = Math.floor(Math.random() * availableIndices.length);
  return availableIndices[randomPos];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (new array, doesn't modify original)
 */
export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
