import { supabase } from '@/lib/supabase';
import { AchievementSnapshot } from '@/utils/classChampionsUtils';

export interface SharedCertificateResponse {
  status: 'valid' | 'revoked' | 'expired' | 'invalid' | 'not_found';
  certificate: AchievementSnapshot | null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

export function buildShortShareUrl(shareId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://edtechra-bitz.vercel.app';
  return `${origin}/c/${encodeURIComponent(shareId)}`;
}

export async function createShortShareCertificate(
  snapshot: AchievementSnapshot,
  expiresInDays?: number | null
): Promise<AchievementSnapshot> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/certificates', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      classroomId: snapshot.classroomId,
      classroomName: snapshot.classroomName,
      periodLabel: snapshot.periodLabel,
      champions: snapshot.champions,
      expiresInDays: expiresInDays ?? null,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success || !payload?.certificate) {
    throw new Error(payload?.error || 'Failed to generate short share link');
  }

  return {
    ...payload.certificate,
    id: payload.certificate.shareId || payload.certificate.id,
    shareId: payload.certificate.shareId,
  };
}

export async function fetchSharedCertificate(shareId: string): Promise<SharedCertificateResponse> {
  const response = await fetch(`/api/certificates/${encodeURIComponent(shareId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 410) {
    return {
      status: payload?.status === 'expired' ? 'expired' : 'revoked',
      certificate: null,
    };
  }

  if (!response.ok || !payload?.success || !payload?.certificate) {
    return {
      status: payload?.status === 'invalid' ? 'invalid' : 'not_found',
      certificate: null,
    };
  }

  const cert = payload.certificate;
  return {
    status: 'valid',
    certificate: {
      id: cert.shareId || shareId,
      shareId: cert.shareId || shareId,
      classroomId: cert.classroomId || '',
      classroomName: cert.classroomName,
      periodLabel: cert.periodLabel,
      createdAt: cert.createdAt,
      expiresAt: cert.expiresAt || null,
      champions: Array.isArray(cert.champions) ? cert.champions : [],
    },
  };
}

export async function listClassroomSharedCertificates(classroomId: string): Promise<AchievementSnapshot[]> {
  if (!classroomId) return [];
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/certificates/classroom/${encodeURIComponent(classroomId)}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success || !Array.isArray(payload.certificates)) {
    return [];
  }
  return payload.certificates.map((cert: any) => ({
    ...cert,
    id: cert.shareId || cert.id,
    shareId: cert.shareId,
  }));
}

export async function revokeSharedCertificateOnServer(shareId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/certificates/${encodeURIComponent(shareId)}/revoke`, {
    method: 'POST',
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to revoke shared certificate');
  }
}
