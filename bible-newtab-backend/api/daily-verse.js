import { kv } from '@vercel/kv';
import verseReferences from '../data/verse-references.json';

export const config = {
  runtime: 'edge',
};

/**
 * Get the day of the year (1-366)
 * @param {Date} date
 * @returns {number}
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Clean up verse text from ESV API
 * @param {string} text
 * @returns {string}
 */
function cleanVerseText(text) {
  return text
    .replace(/\[\d+\]/g, '') // Remove verse numbers in brackets
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `daily-verse-${today}`;

  try {
    // Check cache first
    let cachedVerse = null;
    try {
      cachedVerse = await kv.get(cacheKey);
    } catch (kvError) {
      console.warn('KV cache read failed:', kvError);
    }

    if (cachedVerse) {
      return new Response(JSON.stringify(cachedVerse), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
      });
    }

    // Calculate today's verse (deterministic based on day of year)
    const dayOfYear = getDayOfYear(new Date());
    const reference = verseReferences[dayOfYear % verseReferences.length];

    // Fetch from ESV API
    const esvApiKey = process.env.ESV_API_KEY;

    if (!esvApiKey) {
      throw new Error('ESV_API_KEY not configured');
    }

    const esvUrl = new URL('https://api.esv.org/v3/passage/text/');
    esvUrl.searchParams.set('q', reference);
    esvUrl.searchParams.set('include-footnotes', 'false');
    esvUrl.searchParams.set('include-headings', 'false');
    esvUrl.searchParams.set('include-short-copyright', 'false');
    esvUrl.searchParams.set('include-verse-numbers', 'false');
    esvUrl.searchParams.set('include-passage-references', 'false');

    const esvResponse = await fetch(esvUrl.toString(), {
      headers: {
        'Authorization': `Token ${esvApiKey}`,
      },
    });

    if (!esvResponse.ok) {
      const errorText = await esvResponse.text();
      throw new Error(`ESV API error: ${esvResponse.status} - ${errorText}`);
    }

    const esvData = await esvResponse.json();

    const verseText = esvData.passages?.[0] || '';

    if (!verseText) {
      throw new Error('No verse text returned from ESV API');
    }

    const verse = {
      reference: esvData.canonical || reference,
      text: cleanVerseText(verseText),
      translation: 'ESV',
      date: today,
    };

    // Cache for 24 hours
    try {
      await kv.set(cacheKey, verse, { ex: 86400 });
    } catch (kvError) {
      console.warn('KV cache write failed:', kvError);
    }

    return new Response(JSON.stringify(verse), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });

  } catch (error) {
    console.error('Error fetching verse:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch verse',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
