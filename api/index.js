import app from '../server.mjs';

export default function handler(req, res) {
  // Ensure req.url has /api prefix for Express routing if Vercel strips it or rewrites it
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
