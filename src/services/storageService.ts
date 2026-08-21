// ============================================================================
// EDTECHRA-BITZ: Cloudflare R2 Storage Management Service (Client-Side)
// ============================================================================

import { supabase } from '@/lib/supabase';

export interface StorageStatusData {
  isConfigured: boolean;
  status: 'connected' | 'disconnected' | 'error';
  bucket?: string;
  maskedAccountId?: string;
  publicBaseUrl?: string;
  totalObjects?: number;
  totalSizeBytes?: number;
  estimatedStorageMB?: string;
  estimatedStorageGB?: string;
  readingsCount?: number;
  quizzesCount?: number;
  pollsCount?: number;
  postsCount?: number;
  thumbnailsCount?: number;
  imagesCount?: number;
  lastStorageCheck?: string;
  missing?: string[];
  error?: string;
}

export interface StorageTestResult {
  success: boolean;
  step: string;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface MigrationResult {
  migratedReadings: number;
  migratedQuizzes: number;
  migratedPolls: number;
  errors: Array<{ type: string; id: string; error: string }>;
}

class StorageService {
  private async getValidAuthToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken) return explicitToken;
    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.access_token) {
          return session.access_token;
        }
      } catch (err) {
        console.warn('[StorageService] Failed to retrieve session:', err);
      }
    }
    return null;
  }

  private async getAuthHeaders(explicitToken?: string | null): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = await this.getValidAuthToken(explicitToken);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetches real-time Cloudflare R2 storage usage statistics
   */
  async getStorageStatus(token?: string | null): Promise<StorageStatusData> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/admin/storage/status', { headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || 'Failed to fetch storage status.');
    }

    return json.data as StorageStatusData;
  }

  /**
   * Runs non-destructive R2 connection and lifecycle diagnostic test
   */
  async runDiagnosticTest(token?: string | null): Promise<StorageTestResult> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/admin/storage/test-connection', {
      method: 'POST',
      headers
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || 'Failed to execute diagnostic test.');
    }

    return json.data as StorageTestResult;
  }

  /**
   * Runs safe, idempotent legacy content migration to Cloudflare R2
   */
  async runLegacyMigration(token?: string | null): Promise<MigrationResult> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/admin/storage/migrate-legacy', {
      method: 'POST',
      headers
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || 'Failed to execute content migration.');
    }

    return json.data as MigrationResult;
  }
}

export const storageService = new StorageService();
