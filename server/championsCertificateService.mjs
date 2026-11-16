import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getJsonContent, putJsonContent } from './r2Service.mjs';

const SHARE_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SHARE_ID_REGEX = /^[A-Za-z0-9_-]{6,24}$/;

export function isValidShareId(shareId) {
  return typeof shareId === 'string' && SHARE_ID_REGEX.test(shareId.trim());
}

export function generateShortShareId(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += SHARE_ID_ALPHABET[bytes[i] % SHARE_ID_ALPHABET.length];
  }
  return out;
}

export function sanitizeChampionName(name) {
  const clean = String(name || 'Student').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Student';
  return clean.slice(0, 60);
}

export function sanitizeChampionsPayload(champions) {
  if (!Array.isArray(champions)) return [];
  const usedRanks = new Set();
  const sanitized = [];

  for (let i = 0; i < champions.length && sanitized.length < 3; i += 1) {
    const item = champions[i] || {};
    const parsedRank = Number(item.rank);
    const rank = [1, 2, 3].includes(parsedRank) && !usedRanks.has(parsedRank)
      ? parsedRank
      : ([1, 2, 3].find((r) => !usedRanks.has(r)) || 1);
    usedRanks.add(rank);

    const rawAvatar = typeof item.avatarUrl === 'string' ? item.avatarUrl.trim() : '';
    const safeAvatar = rawAvatar && (rawAvatar.startsWith('https://') || rawAvatar.startsWith('http://') || rawAvatar.startsWith('/'))
      ? rawAvatar.slice(0, 1024)
      : null;

    sanitized.push({
      rank,
      name: sanitizeChampionName(item.name),
      points: Math.max(0, Math.round(Number(item.points) || 0)),
      avatarUrl: safeAvatar,
    });
  }

  return sanitized.sort((a, b) => a.rank - b.rank);
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = String(error.message || error.details || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  );
}

export async function verifyClassroomTeacherAccess(serverSupabase, classroomId, userId, profileRole) {
  if (!serverSupabase || !classroomId || !userId) return false;
  if (profileRole === 'admin') return true;

  const { data: classroom } = await serverSupabase
    .from('classrooms')
    .select('id, teacher_id')
    .eq('id', classroomId)
    .maybeSingle();

  if (classroom && classroom.teacher_id === userId) {
    return true;
  }

  const { data: membership } = await serverSupabase
    .from('classroom_members')
    .select('role, status')
    .eq('classroom_id', classroomId)
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return Boolean(membership && (membership.role === 'teacher' || membership.role === 'co-teacher'));
}

function toPublicSnapshotDto(row) {
  return {
    id: row.share_id,
    shareId: row.share_id,
    classroomId: row.classroom_id,
    classroomName: row.classroom_name,
    periodLabel: row.period_label,
    createdAt: row.created_at,
    expiresAt: row.expires_at || null,
    revoked: Boolean(row.revoked),
    champions: sanitizeChampionsPayload(row.champions),
  };
}

function toPublicVisitorDto(row) {
  return {
    shareId: row.share_id,
    classroomName: row.classroom_name,
    periodLabel: row.period_label,
    createdAt: row.created_at,
    expiresAt: row.expires_at || null,
    champions: sanitizeChampionsPayload(row.champions),
  };
}

async function saveToR2Fallback(record) {
  await putJsonContent(`certificates/shares/${record.share_id}.json`, record);
  const indexKey = `certificates/classrooms/${record.classroom_id}.json`;
  const existing = (await getJsonContent(indexKey).catch(() => null)) || [];
  const next = [record, ...existing.filter((item) => item.share_id !== record.share_id)].slice(0, 30);
  await putJsonContent(indexKey, next);
}

export async function createSharedCertificate({
  serverSupabase,
  classroomId,
  userId,
  profileRole,
  classroomName,
  periodLabel,
  champions,
  expiresInDays,
}) {
  if (!serverSupabase) {
    throw new Error('Database service is not configured');
  }
  if (!classroomId) {
    throw new Error('classroomId is required');
  }

  const authorized = await verifyClassroomTeacherAccess(serverSupabase, classroomId, userId, profileRole);
  if (!authorized) {
    const err = new Error('Only classroom teachers can create shared achievement certificates');
    err.status = 403;
    throw err;
  }

  const sanitizedChampions = sanitizeChampionsPayload(champions);
  const cleanClassroomName = String(classroomName || 'EdTechra Classroom').trim().slice(0, 120) || 'EdTechra Classroom';
  const cleanPeriodLabel = String(periodLabel || 'Current Term').trim().slice(0, 120) || 'Current Term';

  let expiresAt = null;
  if (expiresInDays !== undefined && expiresInDays !== null && Number(expiresInDays) > 0) {
    const days = Math.min(365, Math.max(1, Number(expiresInDays)));
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareId = generateShortShareId(8);
    const payload = {
      share_id: shareId,
      classroom_id: classroomId,
      created_by: userId,
      classroom_name: cleanClassroomName,
      period_label: cleanPeriodLabel,
      champions: sanitizedChampions,
      revoked: false,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await serverSupabase
      .from('shared_champions_certificates')
      .insert(payload)
      .select('share_id, classroom_id, classroom_name, period_label, champions, revoked, expires_at, created_at')
      .single();

    if (!error && data) {
      return toPublicSnapshotDto(data);
    }

    if (error && error.code === '23505') {
      continue;
    }

    if (isMissingTableError(error)) {
      console.warn('[Certificates] shared_champions_certificates table not found; using R2 fallback.');
      await saveToR2Fallback(payload);
      return toPublicSnapshotDto(payload);
    }

    throw new Error(error?.message || 'Failed to save shared certificate');
  }

  throw new Error('Failed to allocate unique share ID');
}

export async function getSharedCertificateByShareId({ serverSupabase, shareId }) {
  const cleanId = String(shareId || '').trim();
  if (!isValidShareId(cleanId)) {
    return { status: 'invalid', certificate: null };
  }

  let row = null;

  if (serverSupabase) {
    const { data, error } = await serverSupabase
      .from('shared_champions_certificates')
      .select('share_id, classroom_id, classroom_name, period_label, champions, revoked, expires_at, created_at')
      .eq('share_id', cleanId)
      .maybeSingle();

    if (!error) {
      row = data;
    } else if (isMissingTableError(error)) {
      row = await getJsonContent(`certificates/shares/${cleanId}.json`).catch(() => null);
    } else {
      throw new Error(error.message || 'Failed to load shared certificate');
    }
  } else {
    row = await getJsonContent(`certificates/shares/${cleanId}.json`).catch(() => null);
  }

  if (!row) {
    return { status: 'not_found', certificate: null };
  }

  if (row.revoked) {
    return { status: 'revoked', certificate: null };
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return { status: 'expired', certificate: null };
  }

  return {
    status: 'valid',
    certificate: toPublicVisitorDto(row),
  };
}

export async function listClassroomCertificates({ serverSupabase, classroomId, userId, profileRole }) {
  if (!serverSupabase) {
    throw new Error('Database service is not configured');
  }
  const authorized = await verifyClassroomTeacherAccess(serverSupabase, classroomId, userId, profileRole);
  if (!authorized) {
    const err = new Error('Unauthorized to view classroom certificates');
    err.status = 403;
    throw err;
  }

  const { data, error } = await serverSupabase
    .from('shared_champions_certificates')
    .select('share_id, classroom_id, classroom_name, period_label, champions, revoked, expires_at, created_at')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (!error) {
    return (data || []).map(toPublicSnapshotDto);
  }

  if (isMissingTableError(error)) {
    const fallback = (await getJsonContent(`certificates/classrooms/${classroomId}.json`).catch(() => null)) || [];
    return fallback.map(toPublicSnapshotDto);
  }

  throw new Error(error.message || 'Failed to list classroom certificates');
}

export async function revokeSharedCertificate({ serverSupabase, shareId, userId, profileRole }) {
  const cleanId = String(shareId || '').trim();
  if (!isValidShareId(cleanId)) {
    const err = new Error('Invalid share ID');
    err.status = 400;
    throw err;
  }
  if (!serverSupabase) {
    throw new Error('Database service is not configured');
  }

  const { data: existing, error: fetchError } = await serverSupabase
    .from('shared_champions_certificates')
    .select('share_id, classroom_id, revoked')
    .eq('share_id', cleanId)
    .maybeSingle();

  if (fetchError && isMissingTableError(fetchError)) {
    const fallbackRow = await getJsonContent(`certificates/shares/${cleanId}.json`).catch(() => null);
    if (!fallbackRow) {
      const err = new Error('Certificate not found');
      err.status = 404;
      throw err;
    }
    const authorized = await verifyClassroomTeacherAccess(serverSupabase, fallbackRow.classroom_id, userId, profileRole);
    if (!authorized) {
      const err = new Error('Unauthorized to revoke this certificate');
      err.status = 403;
      throw err;
    }
    const updated = { ...fallbackRow, revoked: true, revoked_at: new Date().toISOString() };
    await saveToR2Fallback(updated);
    return toPublicSnapshotDto(updated);
  }

  if (fetchError) {
    throw new Error(fetchError.message || 'Failed to look up certificate');
  }
  if (!existing) {
    const err = new Error('Certificate not found');
    err.status = 404;
    throw err;
  }

  const authorized = await verifyClassroomTeacherAccess(serverSupabase, existing.classroom_id, userId, profileRole);
  if (!authorized) {
    const err = new Error('Unauthorized to revoke this certificate');
    err.status = 403;
    throw err;
  }

  const { data: updated, error: updateError } = await serverSupabase
    .from('shared_champions_certificates')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('share_id', cleanId)
    .select('share_id, classroom_id, classroom_name, period_label, champions, revoked, expires_at, created_at')
    .single();

  if (updateError) {
    throw new Error(updateError.message || 'Failed to revoke certificate');
  }

  return toPublicSnapshotDto(updated);
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(name) {
  const parts = String(name || 'S').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return (parts[0] || 'S').slice(0, 2).toUpperCase();
}

function truncateText(text, max) {
  const clean = String(text || '').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export async function generateCertificateOgImagePng(certificate) {
  const champions = sanitizeChampionsPayload(certificate?.champions);
  const first = champions.find((c) => c.rank === 1) || champions[0] || { rank: 1, name: 'Champion #1', points: 0 };
  const second = champions.find((c) => c.rank === 2) || champions[1] || { rank: 2, name: 'Champion #2', points: 0 };
  const third = champions.find((c) => c.rank === 3) || champions[2] || { rank: 3, name: 'Champion #3', points: 0 };

  const classroomName = escapeXml(truncateText(certificate?.classroomName || 'EdTechra Classroom', 34));
  const periodLabel = escapeXml(truncateText(certificate?.periodLabel || 'Class Champions', 32));

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#eff6ff" />
        <stop offset="50%" stop-color="#fefdf7" />
        <stop offset="100%" stop-color="#f3e8ff" />
      </linearGradient>
      <radialGradient id="goldGlow" cx="50%" cy="54%" r="48%">
        <stop offset="0%" stop-color="#fde047" stop-opacity="0.38" />
        <stop offset="55%" stop-color="#fbbf24" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#fefdf7" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="goldBorder" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#d97706" />
        <stop offset="30%" stop-color="#fde047" />
        <stop offset="65%" stop-color="#b45309" />
        <stop offset="100%" stop-color="#f59e0b" />
      </linearGradient>
      <linearGradient id="goldPillar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#b45309" />
        <stop offset="40%" stop-color="#fbbf24" />
        <stop offset="65%" stop-color="#fef08a" />
        <stop offset="100%" stop-color="#b45309" />
      </linearGradient>
      <linearGradient id="silverPillar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#94a3b8" />
        <stop offset="45%" stop-color="#f1f5f9" />
        <stop offset="100%" stop-color="#64748b" />
      </linearGradient>
      <linearGradient id="bronzePillar" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#9a3412" />
        <stop offset="45%" stop-color="#fdba74" />
        <stop offset="100%" stop-color="#9a3412" />
      </linearGradient>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)" />
    <rect width="1200" height="630" fill="url(#goldGlow)" />

    <!-- Gold Outer Frame -->
    <rect x="20" y="20" width="1160" height="590" rx="28" fill="rgba(255,255,255,0.72)" stroke="url(#goldBorder)" stroke-width="4" />
    <rect x="32" y="32" width="1136" height="566" rx="20" fill="none" stroke="rgba(217, 119, 6, 0.22)" stroke-width="1.5" />

    <!-- Header -->
    <text x="600" y="78" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="800" fill="#1e3a8a" letter-spacing="4">EDTECHRA DIGITAL CLASSROOM</text>

    <!-- Ribbon -->
    <rect x="330" y="96" width="540" height="54" rx="27" fill="url(#goldBorder)" />
    <text x="600" y="131" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="26" font-weight="900" fill="#451a03" letter-spacing="2">CLASS CHAMPIONS</text>

    <!-- Classroom & Period -->
    <text x="600" y="182" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="22" font-weight="700" fill="#1e40af">${classroomName}  •  ${periodLabel}</text>

    <!-- Crown attached to #1 top -->
    <path d="M565 246 L555 218 L582 232 L600 208 L618 232 L645 218 L635 246 Z" fill="#fbbf24" stroke="#b45309" stroke-width="2" />

    <!-- #2 Silver Left -->
    <circle cx="310" cy="306" r="46" fill="#f1f5f9" stroke="#94a3b8" stroke-width="5" />
    <text x="310" y="318" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="800" fill="#0f172a">${escapeXml(getInitials(second.name))}</text>
    <text x="310" y="382" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#0f172a">${escapeXml(truncateText(second.name, 16))}</text>
    <text x="310" y="408" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#475569">${Number(second.points || 0).toLocaleString()} XP</text>
    <rect x="230" y="424" width="160" height="122" rx="14" fill="url(#silverPillar)" />
    <text x="310" y="498" text-anchor="middle" font-family="system-ui, sans-serif" font-size="44" font-weight="900" fill="#0f172a">2</text>

    <!-- #1 Gold Center -->
    <circle cx="600" cy="288" r="56" fill="#fef3c7" stroke="#f59e0b" stroke-width="6" />
    <text x="600" y="302" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#78350f">${escapeXml(getInitials(first.name))}</text>
    <text x="600" y="372" text-anchor="middle" font-family="system-ui, sans-serif" font-size="26" font-weight="900" fill="#451a03">${escapeXml(truncateText(first.name, 18))}</text>
    <text x="600" y="400" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#b45309">${Number(first.points || 0).toLocaleString()} XP</text>
    <rect x="510" y="416" width="180" height="130" rx="16" fill="url(#goldPillar)" />
    <text x="600" y="494" text-anchor="middle" font-family="system-ui, sans-serif" font-size="52" font-weight="900" fill="#451a03">1</text>

    <!-- #3 Bronze Right -->
    <circle cx="890" cy="322" r="44" fill="#ffedd5" stroke="#c2410c" stroke-width="5" />
    <text x="890" y="334" text-anchor="middle" font-family="system-ui, sans-serif" font-size="26" font-weight="800" fill="#7c2d12">${escapeXml(getInitials(third.name))}</text>
    <text x="890" y="394" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#0f172a">${escapeXml(truncateText(third.name, 16))}</text>
    <text x="890" y="420" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#9a3412">${Number(third.points || 0).toLocaleString()} XP</text>
    <rect x="810" y="436" width="160" height="110" rx="14" fill="url(#bronzePillar)" />
    <text x="890" y="504" text-anchor="middle" font-family="system-ui, sans-serif" font-size="42" font-weight="900" fill="#431407">3</text>

    <!-- Footer -->
    <text x="600" y="582" text-anchor="middle" font-family="system-ui, sans-serif" font-size="17" font-weight="600" fill="#334155">Celebrating Classroom Excellence • Learn. Discover. Grow.</text>
  </svg>
  `;

  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export function buildOgMetaTags({ certificate, shareId, origin }) {
  const safeOrigin = origin || 'https://edtechra-bitz.vercel.app';
  const shareUrl = `${safeOrigin}/c/${encodeURIComponent(shareId)}`;
  const ogImageUrl = `${safeOrigin}/api/certificates/${encodeURIComponent(shareId)}/og-image.png`;
  const title = certificate?.classroomName
    ? `EdTechra Class Champions — ${certificate.classroomName}`
    : 'EdTechra Class Champions';
  const description = certificate?.classroomName
    ? `Celebrating the top performers in ${certificate.classroomName} (${certificate.periodLabel || 'Current Term'}).`
    : 'Celebrating the top performers in this classroom.';

  return [
    `<title>${escapeXml(title)}</title>`,
    `<meta name="description" content="${escapeXml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="EdTechra Digital Classroom" />`,
    `<meta property="og:title" content="EdTechra Class Champions" />`,
    `<meta property="og:description" content="${escapeXml(description)}" />`,
    `<meta property="og:url" content="${escapeXml(shareUrl)}" />`,
    `<meta property="og:image" content="${escapeXml(ogImageUrl)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="EdTechra Class Champions" />`,
    `<meta name="twitter:description" content="${escapeXml(description)}" />`,
    `<meta name="twitter:image" content="${escapeXml(ogImageUrl)}" />`,
  ].join('\n    ');
}

export function injectOgIntoDistHtml(shareId, certificate, origin) {
  const distIndexPath = path.resolve(process.cwd(), 'dist', 'index.html');
  const ogTags = buildOgMetaTags({ certificate, shareId, origin });

  if (fs.existsSync(distIndexPath)) {
    let html = fs.readFileSync(distIndexPath, 'utf8');
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
    html = html.replace(/<meta\s+name="description"[^>]*>/i, '');
    html = html.replace('</head>', `    ${ogTags}\n  </head>`);
    return html;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${ogTags}
  </head>
  <body style="background:#071530;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
    <div style="text-align:center;padding:24px;">
      <h1>EdTechra Class Champions</h1>
      <p>Celebrating Classroom Excellence</p>
    </div>
  </body>
</html>`;
}
