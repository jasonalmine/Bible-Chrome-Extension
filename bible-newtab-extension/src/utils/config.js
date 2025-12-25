export const DEFAULT_BACKEND_URL = 'https://bible-newtab-api.vercel.app';

/**
 * Resolve the backend base URL, with an optional storage override.
 * Set chrome.storage.local['backend-url'] to point to a dev server.
 * @returns {Promise<string>}
 */
export async function getBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backend-url'], (result) => {
      const stored = typeof result['backend-url'] === 'string' ? result['backend-url'].trim() : '';
      resolve(stored || DEFAULT_BACKEND_URL);
    });
  });
}
