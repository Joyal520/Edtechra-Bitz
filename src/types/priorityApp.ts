// ============================================================================
// EDTECHRA LIBRARY: PRIORITY APP TYPE DEFINITIONS
// ============================================================================

import type { LibraryResource } from '@/types/library';

export type PriorityAppLaunchType = 'viewer' | 'presentation' | 'internal';

export interface PriorityAppPreference {
  priority_app_id: string | null;
  enabled: boolean;
  app: LibraryResource | null;
  valid: boolean;
  launchType: PriorityAppLaunchType | null;
  auto_disabled?: boolean;
  notice?: string | null;
  updated_at?: string | null;
}

export interface ResolvedPriorityApp {
  app: LibraryResource;
  launchType: PriorityAppLaunchType;
}
