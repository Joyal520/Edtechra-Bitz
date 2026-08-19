import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_CONFIG_KEYS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL'
];

/**
 * Normalizes and extracts Cloudflare R2 credentials from environment variables,
 * supporting standard aliases and backwards-compatible naming conventions.
 */
export function getR2Config() {
  const accountId = (
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    '9f1dd8959fb558afd8fe2569e710935c'
  ).trim();

  const accessKeyId = (
    process.env.R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env['Access Key ID'] ||
    'bb33e1b311f083bfcf182121b13f88f5'
  ).trim();

  const secretAccessKey = (
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env['Secret Access Key'] ||
    '317c89d4a6e2ce6280bc9231e6c1810be4ff072b1e97c204b4138939e2260f97'
  ).trim();

  const rawEndpoint = (
    process.env.R2_ENDPOINT ||
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    process.env.Endpoint ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')
  ).trim();
  const endpoint = rawEndpoint.replace(/\/+$/, '');

  const bucket = (
    process.env.R2_BUCKET ||
    process.env.CLOUDFLARE_R2_BUCKET ||
    process.env.R2_BUCKET_NAME ||
    'edtechra-media'
  ).trim();

  const rawPublicUrl = (
    process.env.R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.R2_CUSTOM_DOMAIN ||
    'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev'
  ).trim();
  const publicBaseUrl = rawPublicUrl.replace(/\/+$/, '');

  const missing = [];
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!endpoint) missing.push('R2_ENDPOINT');
  if (!bucket) missing.push('R2_BUCKET');
  if (!publicBaseUrl) missing.push('R2_PUBLIC_URL');

  return {
    isConfigured: missing.length === 0,
    missing,
    accountId,
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucket,
    publicBaseUrl
  };
}
