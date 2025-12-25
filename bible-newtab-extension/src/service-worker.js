// Service worker for Bible Verse New Tab extension
// Handles background tasks and caching

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Bible Verse New Tab extension installed');
  }
});
