// ============================================================================
// EDTECHRA LIBRARY: PRIORITY APP SERVER SERVICE
// Handles server-side validation, access permissions, safe URL checks,
// auto-disabling of deleted/restricted apps, and user preference CRUD.
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

export function validatePriorityAppUrl(rawUrl) {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) {
    return { valid: false, error: 'Missing application URL.' };
  }

  // Reject control characters or embedded whitespace
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return { valid: false, error: 'Invalid control characters in URL.' };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    trimmed.startsWith('//')
  ) {
    return { valid: false, error: 'Unsafe URL scheme rejected.' };
  }

  // Safe internal EdTechra route
  if (trimmed.startsWith('/')) {
    return {
      valid: true,
      kind: 'internal',
      normalizedUrl: trimmed
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use http or https protocol.' };
    }
    return {
      valid: true,
      kind: 'external',
      normalizedUrl: parsed.toString()
    };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

export function validatePriorityAppResource(resource, { userId = null, isAdmin = false } = {}) {
  if (!resource) {
    return {
      valid: false,
      reason: 'not_found',
      message: 'Your Priority App is no longer available.'
    };
  }

  const allowed =
    resource.published === true ||
    (Boolean(userId) && resource.uploaded_by === userId) ||
    Boolean(isAdmin);

  if (!allowed) {
    return {
      valid: false,
      reason: 'restricted',
      message: 'Your Priority App is currently unpublished or restricted.'
    };
  }

  const urlCheck = validatePriorityAppUrl(resource.file_url);
  if (!urlCheck.valid) {
    return {
      valid: false,
      reason: 'invalid_url',
      message: 'Your Priority App destination is invalid or unavailable.'
    };
  }

  let launchType = 'viewer';
  const lowerUrl = (urlCheck.normalizedUrl || '').toLowerCase();
  const lowerKey = (resource.file_key || '').toLowerCase();

  if (urlCheck.kind === 'internal') {
    launchType = 'internal';
  } else if (
    resource.file_type === 'pptx' ||
    (resource.file_type === 'training' &&
      (resource.training_format === 'pptx' || lowerUrl.endsWith('.pptx') || lowerKey.endsWith('.pptx')))
  ) {
    launchType = 'presentation';
  }

  return {
    valid: true,
    launchType,
    normalizedUrl: urlCheck.normalizedUrl
  };
}

export function isMissingPriorityTableError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  if (code === '42P01' || code === 'PGRST205') return true;
  return /user_priority_apps/i.test(msg) && /does not exist|schema cache|not found/i.test(msg);
}

function emptyPreference(overrides = {}) {
  return {
    priority_app_id: null,
    enabled: false,
    app: null,
    valid: false,
    launchType: null,
    auto_disabled: false,
    notice: null,
    updated_at: null,
    ...overrides
  };
}

export async function getPriorityAppPreference({ serverSupabase, userId, isAdmin = false }) {
  if (!serverSupabase || !userId) {
    return emptyPreference();
  }

  const { data: row, error } = await serverSupabase
    .from('user_priority_apps')
    .select('user_id, priority_app_id, enabled, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingPriorityTableError(error)) {
      return emptyPreference();
    }
    throw error;
  }

  if (!row) {
    return emptyPreference();
  }

  // Case: Referenced app was deleted (ON DELETE SET NULL left priority_app_id null)
  if (!row.priority_app_id) {
    if (row.enabled === true) {
      await serverSupabase
        .from('user_priority_apps')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      return emptyPreference({
        auto_disabled: true,
        notice: 'Your previous Priority App was removed or is no longer available. You can select another one from the Library.',
        updated_at: row.updated_at
      });
    }
    return emptyPreference({ updated_at: row.updated_at });
  }

  const { data: resource, error: resErr } = await serverSupabase
    .from('library_resources')
    .select(`
      *,
      uploader:profiles!uploaded_by (id, full_name, email)
    `)
    .eq('id', row.priority_app_id)
    .maybeSingle();

  if (resErr) {
    throw resErr;
  }

  const validation = validatePriorityAppResource(resource, { userId, isAdmin });
  if (!validation.valid) {
    if (row.enabled === true) {
      await serverSupabase
        .from('user_priority_apps')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      return emptyPreference({
        priority_app_id: row.priority_app_id,
        enabled: false,
        auto_disabled: true,
        notice: validation.message,
        updated_at: row.updated_at
      });
    }
    return emptyPreference({
      priority_app_id: row.priority_app_id,
      enabled: false,
      auto_disabled: false,
      notice: null,
      updated_at: row.updated_at
    });
  }

  return {
    priority_app_id: row.priority_app_id,
    enabled: Boolean(row.enabled),
    app: resource,
    valid: true,
    launchType: validation.launchType,
    auto_disabled: false,
    notice: null,
    updated_at: row.updated_at
  };
}

export async function savePriorityAppPreference({
  serverSupabase,
  userId,
  isAdmin = false,
  priorityAppId,
  enabled
}) {
  if (!serverSupabase || !userId) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  if (priorityAppId !== undefined) {
    if (priorityAppId === null || priorityAppId === '') {
      await removePriorityAppPreference({ serverSupabase, userId });
      return emptyPreference();
    }

    if (!isValidUuid(priorityAppId)) {
      const err = new Error('Invalid Priority App ID format.');
      err.statusCode = 400;
      throw err;
    }

    const { data: resource, error: resErr } = await serverSupabase
      .from('library_resources')
      .select('*')
      .eq('id', priorityAppId.trim())
      .maybeSingle();

    if (resErr) throw resErr;

    const validation = validatePriorityAppResource(resource, { userId, isAdmin });
    if (!validation.valid) {
      const err = new Error(validation.message || 'Selected application cannot be set as Priority App.');
      err.statusCode =
        validation.reason === 'not_found'
          ? 404
          : validation.reason === 'restricted'
          ? 403
          : 400;
      throw err;
    }

    const { error: upsertErr } = await serverSupabase
      .from('user_priority_apps')
      .upsert(
        {
          user_id: userId,
          priority_app_id: priorityAppId.trim(),
          enabled: enabled !== false,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

    if (upsertErr) throw upsertErr;
  } else if (typeof enabled === 'boolean') {
    const { data: existing, error: fetchErr } = await serverSupabase
      .from('user_priority_apps')
      .select('user_id, priority_app_id, enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existing || !existing.priority_app_id) {
      const err = new Error('No Priority App is currently selected.');
      err.statusCode = 400;
      throw err;
    }

    if (enabled === true) {
      const { data: resource, error: resErr } = await serverSupabase
        .from('library_resources')
        .select('*')
        .eq('id', existing.priority_app_id)
        .maybeSingle();

      if (resErr) throw resErr;

      const validation = validatePriorityAppResource(resource, { userId, isAdmin });
      if (!validation.valid) {
        await serverSupabase
          .from('user_priority_apps')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        const err = new Error(validation.message || 'Selected Priority App is no longer valid.');
        err.statusCode =
          validation.reason === 'not_found'
            ? 404
            : validation.reason === 'restricted'
            ? 403
            : 400;
        throw err;
      }
    }

    const { error: updErr } = await serverSupabase
      .from('user_priority_apps')
      .update({
        enabled,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updErr) throw updErr;
  } else {
    const err = new Error('Nothing to update. Provide priority_app_id or enabled.');
    err.statusCode = 400;
    throw err;
  }

  return getPriorityAppPreference({ serverSupabase, userId, isAdmin });
}

export async function removePriorityAppPreference({ serverSupabase, userId }) {
  if (!serverSupabase || !userId) return { removed: false };

  const { error } = await serverSupabase
    .from('user_priority_apps')
    .delete()
    .eq('user_id', userId);

  if (error && !isMissingPriorityTableError(error)) {
    throw error;
  }
  return { removed: true };
}

export async function resolvePriorityAppById({ serverSupabase, userId, isAdmin = false, appId }) {
  if (!isValidUuid(appId)) {
    return {
      valid: false,
      status: 400,
      message: 'Invalid application identifier.',
      app: null,
      launchType: null
    };
  }

  const cleanId = appId.trim();
  const { data: resource, error } = await serverSupabase
    .from('library_resources')
    .select(`
      *,
      uploader:profiles!uploaded_by (id, full_name, email)
    `)
    .eq('id', cleanId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const validation = validatePriorityAppResource(resource, { userId, isAdmin });
  if (!validation.valid) {
    // Auto-disable if this matches user's active Priority App preference
    if (userId) {
      try {
        const { data: pref } = await serverSupabase
          .from('user_priority_apps')
          .select('priority_app_id, enabled')
          .eq('user_id', userId)
          .maybeSingle();

        if (pref && pref.priority_app_id === cleanId && pref.enabled === true) {
          await serverSupabase
            .from('user_priority_apps')
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        }
      } catch {
        // Non-fatal if preference table is unavailable
      }
    }

    return {
      valid: false,
      status:
        validation.reason === 'not_found'
          ? 404
          : validation.reason === 'restricted'
          ? 403
          : 400,
      message: validation.message,
      app: null,
      launchType: null
    };
  }

  return {
    valid: true,
    status: 200,
    message: null,
    app: resource,
    launchType: validation.launchType
  };
}
