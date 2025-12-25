export const config = {
  runtime: 'edge',
};

// Search queries for each category
const CATEGORY_QUERIES = {
  nature: 'nature forest sunlight peaceful',
  galaxy: 'galaxy stars milky way night sky',
  oceans: 'ocean sea beach sunset waves',
  mountains: 'mountains peaks landscape scenic',
  underwater: 'underwater ocean coral reef',
};

/**
 * Simple hash for deterministic daily selection
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Notify Unsplash of a download for API compliance.
 * @param {string} downloadUrl
 * @param {string} unsplashKey
 */
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

  const url = new URL(request.url);
  const category = url.searchParams.get('category') || 'nature';
  const mode = url.searchParams.get('mode') || 'daily'; // 'daily' or 'random'

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!unsplashKey) {
    return new Response(
      JSON.stringify({
        error: 'Unsplash API key not configured',
        message: 'Add UNSPLASH_ACCESS_KEY to environment variables',
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

  try {
    const query = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.nature;

    // Fetch multiple images from Unsplash
    const unsplashUrl = new URL('https://api.unsplash.com/search/photos');
    unsplashUrl.searchParams.set('query', query);
    unsplashUrl.searchParams.set('per_page', '30');
    unsplashUrl.searchParams.set('orientation', 'landscape');
    unsplashUrl.searchParams.set('content_filter', 'high'); // Safe content only

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

    // Select image based on mode
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

    const imageData = {
      id: selectedImage.id,
      url: selectedImage.urls.regular, // 1080px wide
      fullUrl: selectedImage.urls.full,
      thumbUrl: selectedImage.urls.thumb,
      alt: selectedImage.alt_description || selectedImage.description || `${category} background`,
      photographer: selectedImage.user.name,
      photographerUrl: selectedImage.user.links.html,
      downloadUrl: selectedImage.links.download_location, // For tracking downloads per Unsplash guidelines
      category: category,
    };

    return new Response(JSON.stringify(imageData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': mode === 'daily' ? 's-maxage=3600, stale-while-revalidate' : 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error fetching image:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch image',
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
