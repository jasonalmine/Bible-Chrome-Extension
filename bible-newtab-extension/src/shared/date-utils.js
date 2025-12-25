// Date utility functions for Bible Verse New Tab extension

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * @returns {string} Today's date string
 */
export function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date in ISO format (YYYY-MM-DD)
 * @returns {string} Yesterday's date string
 */
export function getYesterday() {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0];
}

/**
 * Get the day of year (1-365/366)
 * @returns {number} Day of year
 */
export function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Check if a date string matches today
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {boolean} True if date matches today
 */
export function isToday(dateString) {
  return dateString === getToday();
}

/**
 * Check if a date string matches yesterday
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {boolean} True if date matches yesterday
 */
export function isYesterday(dateString) {
  return dateString === getYesterday();
}
