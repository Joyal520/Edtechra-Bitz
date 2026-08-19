import crypto from 'crypto';
import { getR2Config } from './r2Config.mjs';

const R2_SIGNED_URL_TTL_SECONDS = 900; // 15 minutes
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15 MB

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function formatAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function getDateStamp(amzDate) {
  return amzDate.slice(0, 8);
}

function getSigningKey(secretAccessKey, dateStamp) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildCanonicalPath(bucket, objectKey) {
  return `/${bucket}/${objectKey.split('/').map(encodeRfc3986).join('/')}`;
}

export function sanitizeSegment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function buildObjectKey({ userId, filename = 'post.webp', contentType = 'image/webp' }) {
  const cleanUserId = sanitizeSegment(userId) || 'student';
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  
  let ext = 'webp';
  if (contentType === 'image/png') ext = 'png';
  else if (contentType === 'image/jpeg' || contentType === 'image/jpg') ext = 'jpg';

  // Standard safe clean structure: posts/{userId}/{timestamp}_{uniqueId}.webp
  return `posts/${cleanUserId}/${timestamp}_${randomSuffix}.${ext}`;
}

export function buildPublicUrl(objectKey) {
  const { publicBaseUrl } = getR2Config();
  const cleanKey = objectKey.replace(/^\/+/, '');
  return `${publicBaseUrl}/${cleanKey}`;
}

export function validateImageUpload({ contentType, size }) {
  if (!contentType) {
    throw new Error('Missing file content type.');
  }

  const normalizedType = contentType.toLowerCase().trim();
  if (!ALLOWED_IMAGE_TYPES.has(normalizedType)) {
    throw new Error('Unsupported image format. Please upload JPG, PNG, or WebP.');
  }

  if (size && Number(size) > MAX_UPLOAD_SIZE) {
    throw new Error(`File exceeds the 15 MB limit. Please select a smaller image.`);
  }

  return true;
}

export function buildPresignedUpload({ objectKey, contentType = 'image/webp' }) {
  const config = getR2Config();
  if (!config.isConfigured) {
    throw new Error(`R2 Storage is not configured. Missing: ${config.missing.join(', ')}`);
  }

  const { accessKeyId, secretAccessKey, endpoint, bucket } = config;
  const url = new URL(endpoint);
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = getDateStamp(amzDate);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = buildCanonicalPath(bucket, objectKey);

  const queryEntries = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(R2_SIGNED_URL_TTL_SECONDS)],
    ['X-Amz-SignedHeaders', 'content-type;host']
  ];

  const canonicalQueryString = queryEntries
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join('&');

  const canonicalHeaders = `content-type:${contentType}\nhost:${url.host}\n`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    'content-type;host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp);
  const signature = hmac(signingKey, stringToSign, 'hex');
  const presignedUrl = `${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  return {
    uploadUrl: presignedUrl,
    headers: { 'Content-Type': contentType },
    objectKey,
    publicUrl: buildPublicUrl(objectKey),
    storageProvider: 'r2'
  };
}

function signRequest({ method, objectKey = '', queryString = '', body = '', contentType = '' }) {
  const config = getR2Config();
  const { accessKeyId, secretAccessKey, endpoint, bucket } = config;
  const url = new URL(endpoint);
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = getDateStamp(amzDate);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = objectKey ? buildCanonicalPath(bucket, objectKey) : `/${bucket}`;
  const payloadHash = sha256Hex(body);

  const headers = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate
  };

  if (contentType) {
    headers['content-type'] = contentType;
  }

  const sortedHeaderEntries = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
  const canonicalHeaders = sortedHeaderEntries.map(([key, value]) => `${key}:${value}\n`).join('');
  const signedHeaders = sortedHeaderEntries.map(([key]) => key).join(';');
  const canonicalRequest = [
    method,
    canonicalUri,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp);
  const signature = hmac(signingKey, stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    endpoint,
    bucket,
    headers: {
      ...headers,
      Authorization: authorization
    }
  };
}

export async function deleteObjects(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return { deleted: [] };
  }

  const cleanKeys = keys
    .map((k) => String(k || '').replace(/^\/+/, '').trim())
    .filter(Boolean);

  if (cleanKeys.length === 0) {
    return { deleted: [] };
  }

  const body = [
    '<Delete>',
    ...cleanKeys.map((key) => `<Object><Key>${key}</Key></Object>`),
    '</Delete>'
  ].join('');

  const queryString = 'delete=';
  const signed = signRequest({
    method: 'POST',
    queryString,
    body,
    contentType: 'application/xml'
  });

  const response = await fetch(`${signed.endpoint}/${signed.bucket}?${queryString}`, {
    method: 'POST',
    headers: signed.headers,
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[R2 Delete Error] status=${response.status}:`, errorText);
    throw new Error(`R2 delete failed with status ${response.status}`);
  }

  return { deleted: cleanKeys };
}
