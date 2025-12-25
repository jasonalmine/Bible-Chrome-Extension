// Simple local development server
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Load verse references
const verseReferences = JSON.parse(
  readFileSync(join(__dirname, 'data/verse-references.json'), 'utf-8')
);

// Helper: Get day of year
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Helper: Clean verse text
function cleanVerseText(text) {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Simple hash
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Helper: Track Unsplash download for API compliance
function trackUnsplashDownload(downloadUrl, unsplashKey) {
  if (!downloadUrl) return;

  fetch(downloadUrl, {
    headers: {
      'Authorization': `Client-ID ${unsplashKey}`,
    },
  }).catch((error) => {
    console.warn('Unsplash download tracking failed:', error);
  });
}

// GET /api/daily-verse
app.get('/api/daily-verse', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    const esvApiKey = process.env.ESV_API_KEY;
    if (!esvApiKey) {
      throw new Error('ESV_API_KEY not configured');
    }

    const dayOfYear = getDayOfYear(new Date());
    const reference = verseReferences[dayOfYear % verseReferences.length];

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
      throw new Error(`ESV API error: ${esvResponse.status}`);
    }

    const esvData = await esvResponse.json();
    const verseText = esvData.passages?.[0] || '';

    res.json({
      reference: esvData.canonical || reference,
      text: cleanVerseText(verseText),
      translation: 'ESV',
      date: today,
    });

  } catch (error) {
    console.error('Error fetching verse:', error);
    res.status(500).json({ error: 'Failed to fetch verse', message: error.message });
  }
});

// GET /api/background-image
app.get('/api/background-image', async (req, res) => {
  const category = req.query.category || 'nature';
  const mode = req.query.mode || 'daily';

  const CATEGORY_QUERIES = {
    nature: 'nature forest sunlight peaceful',
    galaxy: 'galaxy stars milky way night sky',
    oceans: 'ocean sea beach sunset waves',
    mountains: 'mountains peaks landscape scenic',
    underwater: 'underwater ocean coral reef',
  };

  try {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashKey) {
      throw new Error('UNSPLASH_ACCESS_KEY not configured');
    }

    const query = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.nature;

    const unsplashUrl = new URL('https://api.unsplash.com/search/photos');
    unsplashUrl.searchParams.set('query', query);
    unsplashUrl.searchParams.set('per_page', '30');
    unsplashUrl.searchParams.set('orientation', 'landscape');
    unsplashUrl.searchParams.set('content_filter', 'high');

    const response = await fetch(unsplashUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${unsplashKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No images found');
    }

    let selectedImage;
    if (mode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      const index = simpleHash(`${category}-${today}`) % data.results.length;
      selectedImage = data.results[index];
    } else {
      const index = Math.floor(Math.random() * data.results.length);
      selectedImage = data.results[index];
    }

    trackUnsplashDownload(selectedImage.links?.download_location, unsplashKey);

    res.json({
      id: selectedImage.id,
      url: selectedImage.urls.regular,
      fullUrl: selectedImage.urls.full,
      thumbUrl: selectedImage.urls.thumb,
      alt: selectedImage.alt_description || selectedImage.description || `${category} background`,
      photographer: selectedImage.user.name,
      photographerUrl: selectedImage.user.links.html,
      category: category,
    });

  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image', message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('Test endpoints:');
  console.log(`  curl http://localhost:${PORT}/api/daily-verse`);
  console.log(`  curl "http://localhost:${PORT}/api/background-image?category=nature"`);
});
