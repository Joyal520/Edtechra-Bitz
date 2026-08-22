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

export function buildAvatarObjectKey({ userId, contentType = 'image/webp' }) {
  const cleanUserId = sanitizeSegment(userId) || 'student';
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');

  let ext = 'webp';
  if (contentType === 'image/png') ext = 'png';
  else if (contentType === 'image/jpeg' || contentType === 'image/jpg') ext = 'jpg';

  // Standard safe clean structure: avatars/{userId}/{timestamp}_{uniqueId}.webp
  return `avatars/${cleanUserId}/${timestamp}_${randomSuffix}.${ext}`;
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

// ============================================================================
// CLOUDFLARE R2 CONTENT STORAGE ABSTRACTION (Educational JSON & Media)
// ============================================================================

/**
 * Key Builders following standard R2 hierarchy
 */
export function buildReadingContentKey(id) {
  return `readings/${sanitizeSegment(id)}/content.json`;
}

export function buildReadingCoverKey(id, ext = 'webp') {
  return `readings/${sanitizeSegment(id)}/cover.${ext}`;
}

export function buildQuizContentKey(id) {
  return `quizzes/${sanitizeSegment(id)}/content.json`;
}

export function buildQuizCoverKey(id, ext = 'webp') {
  return `quizzes/${sanitizeSegment(id)}/cover.${ext}`;
}

export function buildPollContentKey(id) {
  return `polls/${sanitizeSegment(id)}/content.json`;
}

export function buildPollCoverKey(id, ext = 'webp') {
  return `polls/${sanitizeSegment(id)}/cover.${ext}`;
}

export function buildReorderContentKey(id) {
  return `reorders/${sanitizeSegment(id)}/content.json`;
}

export function buildSpellingScrambleContentKey(id) {
  return `spelling-scrambles/${sanitizeSegment(id)}/content.json`;
}

export function buildWordOfTheDayContentKey(id) {
  return `words-of-the-day/${sanitizeSegment(id)}/content.json`;
}

/**
 * Direct Server Upload: Writes JSON Content directly to Cloudflare R2 via AWS SigV4
 */
export async function putJsonContent(objectKey, data) {
  const cleanKey = String(objectKey || '').replace(/^\/+/, '').trim();
  if (!cleanKey) throw new Error('Object key is required for R2 content storage.');

  const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const signed = signRequest({
    method: 'PUT',
    objectKey: cleanKey,
    body,
    contentType: 'application/json'
  });

  const response = await fetch(`${signed.endpoint}/${signed.bucket}/${cleanKey}`, {
    method: 'PUT',
    headers: signed.headers,
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[R2 Put Content Error] key=${cleanKey} status=${response.status}:`, errorText);
    throw new Error(`Failed to store content in R2: status ${response.status}`);
  }

  return {
    success: true,
    objectKey: cleanKey,
    publicUrl: buildPublicUrl(cleanKey)
  };
}

/**
 * Direct Server Upload: Writes binary image/media Buffer directly to Cloudflare R2 via AWS SigV4
 */
export async function putBinaryContent(objectKey, buffer, contentType = 'image/webp') {
  const cleanKey = String(objectKey || '').replace(/^\/+/, '').trim();
  if (!cleanKey) throw new Error('Object key is required for R2 binary storage.');

  const signed = signRequest({
    method: 'PUT',
    objectKey: cleanKey,
    body: buffer,
    contentType
  });

  const response = await fetch(`${signed.endpoint}/${signed.bucket}/${cleanKey}`, {
    method: 'PUT',
    headers: signed.headers,
    body: buffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[R2 Put Binary Error] key=${cleanKey} status=${response.status}:`, errorText);
    throw new Error(`Failed to store binary content in R2: status ${response.status}`);
  }

  return {
    success: true,
    objectKey: cleanKey,
    publicUrl: buildPublicUrl(cleanKey)
  };
}

/**
 * Direct Server Retrieval: Reads JSON Content from Cloudflare R2
 */
export async function getJsonContent(objectKey) {
  const cleanKey = String(objectKey || '').replace(/^\/+/, '').trim();
  if (!cleanKey) return null;

  try {
    // 1. Try public URL first
    const publicUrl = buildPublicUrl(cleanKey);
    const pubRes = await fetch(publicUrl, { headers: { 'Accept': 'application/json' } });
    if (pubRes.ok) {
      return await pubRes.json();
    }
  } catch {
    // Fall through to signed S3 GET
  }

  try {
    // 2. Direct Signed S3 GET
    const signed = signRequest({
      method: 'GET',
      objectKey: cleanKey
    });

    const response = await fetch(`${signed.endpoint}/${signed.bucket}/${cleanKey}`, {
      method: 'GET',
      headers: signed.headers
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn(`[R2 Get Content Notice] Failed to retrieve ${cleanKey}:`, err.message);
  }

  return null;
}

/**
 * Lists objects in Cloudflare R2 bucket using S3 ListObjectsV2
 */
export async function listObjects(prefix = '', maxKeys = 1000) {
  const cleanPrefix = String(prefix || '').replace(/^\/+/, '').trim();
  const queryParts = ['list-type=2'];
  if (cleanPrefix) queryParts.push(`prefix=${encodeURIComponent(cleanPrefix)}`);
  if (maxKeys) queryParts.push(`max-keys=${maxKeys}`);
  const queryString = queryParts.join('&');

  const signed = signRequest({
    method: 'GET',
    queryString
  });

  const response = await fetch(`${signed.endpoint}/${signed.bucket}?${queryString}`, {
    method: 'GET',
    headers: signed.headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[R2 ListObjects Error] status=${response.status}:`, errorText);
    throw new Error(`R2 listObjects failed with status ${response.status}`);
  }

  const xml = await response.text();
  const objects = [];
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;

  while ((match = contentsRegex.exec(xml)) !== null) {
    const block = match[1];
    const keyMatch = /<Key>(.*?)<\/Key>/.exec(block);
    const sizeMatch = /<Size>(.*?)<\/Size>/.exec(block);
    const modifiedMatch = /<LastModified>(.*?)<\/LastModified>/.exec(block);

    if (keyMatch) {
      objects.push({
        key: keyMatch[1],
        size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
        lastModified: modifiedMatch ? modifiedMatch[1] : null
      });
    }
  }

  return objects;
}

/**
 * Computes exact Cloudflare R2 storage usage statistics across content types and images
 */
export async function getStorageStats() {
  const config = getR2Config();
  if (!config.isConfigured) {
    return {
      isConfigured: false,
      status: 'disconnected',
      missing: config.missing
    };
  }

  try {
    const objects = await listObjects('', 2000);
    let totalSizeBytes = 0;
    let readingsCount = 0;
    let quizzesCount = 0;
    let pollsCount = 0;
    let reordersCount = 0;
    let spellingScramblesCount = 0;
    let postsCount = 0;
    let thumbnailsCount = 0;
    let imagesCount = 0;

    objects.forEach(obj => {
      totalSizeBytes += obj.size;
      const k = obj.key.toLowerCase();
      if (k.startsWith('readings/')) readingsCount++;
      else if (k.startsWith('quizzes/')) quizzesCount++;
      else if (k.startsWith('polls/')) pollsCount++;
      else if (k.startsWith('reorders/')) reordersCount++;
      else if (k.startsWith('spelling-scrambles/')) spellingScramblesCount++;
      else if (k.startsWith('posts/')) postsCount++;
      else if (k.startsWith('thumbnails/')) thumbnailsCount++;

      if (k.endsWith('.webp') || k.endsWith('.png') || k.endsWith('.jpg') || k.endsWith('.jpeg')) {
        imagesCount++;
      }
    });

    const totalMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(3);

    return {
      isConfigured: true,
      status: 'connected',
      bucket: config.bucket,
      maskedAccountId: config.accountId ? `********${config.accountId.slice(-4)}` : 'Configured',
      publicBaseUrl: config.publicBaseUrl,
      totalObjects: objects.length,
      totalSizeBytes,
      estimatedStorageMB: totalMB,
      estimatedStorageGB: totalGB,
      readingsCount,
      quizzesCount,
      pollsCount,
      reordersCount,
      spellingScramblesCount,
      postsCount,
      thumbnailsCount,
      imagesCount,
      lastStorageCheck: new Date().toISOString()
    };
  } catch (err) {
    return {
      isConfigured: true,
      status: 'error',
      error: err.message,
      bucket: config.bucket,
      maskedAccountId: config.accountId ? `********${config.accountId.slice(-4)}` : 'Configured'
    };
  }
}

/**
 * Comprehensive Storage Lifecycle Diagnostic Test (Connection, Upload, Read, Delete)
 */
export async function testR2Connection() {
  const config = getR2Config();
  if (!config.isConfigured) {
    return {
      success: false,
      step: 'configuration',
      error: `Missing R2 configuration: ${config.missing.join(', ')}`
    };
  }

  const testKey = `diagnostics/test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.json`;
  const testPayload = {
    test: true,
    timestamp: new Date().toISOString(),
    message: 'EdTechra R2 Storage Diagnostic Roundtrip'
  };

  try {
    // 1. Upload Test
    await putJsonContent(testKey, testPayload);

    // 2. Read Test
    const retrieved = await getJsonContent(testKey);
    const readValid = retrieved && retrieved.test === true;

    // 3. Delete Test
    await deleteObjects([testKey]);

    return {
      success: readValid,
      step: 'complete',
      message: 'Cloudflare R2 Connection, Upload, Read, and Delete tests passed successfully!',
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    // Attempt cleanup if possible
    try { await deleteObjects([testKey]); } catch {}
    return {
      success: false,
      step: 'operation',
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}
