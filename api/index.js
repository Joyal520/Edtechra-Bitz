import app from '../server.mjs';

export default async function handler(req, res) {
  try {
    // Ensure req.url has /api prefix for Express routing if Vercel strips it or rewrites it
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return await app(req, res);
  } catch (error) {
    console.error('[Vercel API Gateway Error]:', error);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error'
      });
    }
  }
}
