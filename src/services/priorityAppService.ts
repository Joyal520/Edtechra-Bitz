// ============================================================================
// EDTECHRA LIBRARY: PRIORITY APP CLIENT SERVICE
// ============================================================================

import { authenticatedFetch } from '@/lib/apiAuth';
import { getNormalizedFileType } from '@/types/library';
import type { PriorityAppPreference, ResolvedPriorityApp } from '@/types/priorityApp';

function normalizePreference(raw: any): PriorityAppPreference {
  const app = raw?.app
    ? {
        ...raw.app,
        file_type: getNormalizedFileType(raw.app)
      }
    : null;

  return {
    priority_app_id: raw?.priority_app_id || null,
    enabled: Boolean(raw?.enabled),
    app,
    valid: Boolean(raw?.valid && app),
    launchType: raw?.launchType || null,
    auto_disabled: Boolean(raw?.auto_disabled),
    notice: raw?.notice || null,
    updated_at: raw?.updated_at || null
  };
}

class PriorityAppService {
  async getPreference(timeoutMs = 3500): Promise<PriorityAppPreference> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await authenticatedFetch('/api/priority-app', {
        method: 'GET',
        signal: controller.signal
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load Priority App preference.');
      }
      return normalizePreference(json.data);
    } finally {
      clearTimeout(timer);
    }
  }

  async setPriorityApp(priorityAppId: string, enabled = true): Promise<PriorityAppPreference> {
    const res = await authenticatedFetch('/api/priority-app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priority_app_id: priorityAppId,
        enabled
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to set Priority App.');
    }
    return normalizePreference(json.data);
  }

  async setAutoLaunchEnabled(enabled: boolean): Promise<PriorityAppPreference> {
    const res = await authenticatedFetch('/api/priority-app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update auto-launch preference.');
    }
    return normalizePreference(json.data);
  }

  async removePriorityApp(): Promise<PriorityAppPreference> {
    const res = await authenticatedFetch('/api/priority-app', {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to remove Priority App.');
    }
    return normalizePreference(json.data);
  }

  async resolveAppForLaunch(appId: string, timeoutMs = 5000): Promise<ResolvedPriorityApp> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await authenticatedFetch(`/api/priority-app/resolve/${encodeURIComponent(appId)}`, {
        method: 'GET',
        signal: controller.signal
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.app) {
        throw new Error(json.error || 'Selected Priority App is no longer available.');
      }
      return {
        app: {
          ...json.data.app,
          file_type: getNormalizedFileType(json.data.app)
        },
        launchType: json.data.launchType || 'viewer'
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const priorityAppService = new PriorityAppService();
