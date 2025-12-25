# Bible New Tab Backend

Vercel serverless backend for the Bible Verse New Tab Chrome Extension.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

3. Add your API keys to `.env`:
   - Get ESV API key from https://api.esv.org/
   - Get Unsplash API key from https://unsplash.com/developers

4. For local development:
   ```bash
   npm run dev
   ```

5. For production deployment:
   ```bash
   vercel link
   vercel --prod
   ```

6. Add environment variables in Vercel dashboard:
   - `ESV_API_KEY` - Your ESV API key
   - `UNSPLASH_ACCESS_KEY` - Your Unsplash API key

7. (Optional) Set up Vercel KV storage for caching in your Vercel dashboard.

## API Endpoints

### GET /api/daily-verse

Returns today's daily verse in ESV translation.

**Response:**
```json
{
  "reference": "John 3:16",
  "text": "For God so loved the world...",
  "translation": "ESV",
  "date": "2024-01-15"
}
```

### GET /api/background-image

Returns a background image from Unsplash.

**Query Parameters:**
- `category` - Image category: `nature`, `galaxy`, `oceans`, `mountains`, `underwater` (default: `nature`)
- `mode` - Selection mode: `daily` (same image all day) or `random` (default: `daily`)

**Response:**
```json
{
  "id": "abc123",
  "url": "https://images.unsplash.com/...",
  "fullUrl": "https://images.unsplash.com/...",
  "thumbUrl": "https://images.unsplash.com/...",
  "alt": "Mountain landscape at sunset",
  "photographer": "John Doe",
  "photographerUrl": "https://unsplash.com/@johndoe",
  "category": "mountains"
}
```

## Environment Variables

### Required
- `ESV_API_KEY` - API key for ESV Bible API

### Optional
- `UNSPLASH_ACCESS_KEY` - API key for Unsplash (for stock photos)

### Auto-configured by Vercel KV
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

## Local Development

The backend works locally without Vercel KV - caching will be disabled but everything else works.

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Test the endpoints
curl http://localhost:3000/api/daily-verse
curl "http://localhost:3000/api/background-image?category=nature&mode=daily"
```
