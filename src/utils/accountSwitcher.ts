// ============================================================================
// EDTECHRA-BITZ: Saved Accounts & Multi-Session Switcher Utility
// Securely remembers authenticated accounts on the current device to support
// seamless account switching without exposing other users' accounts.
// ============================================================================

export interface SavedAccount {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: 'student' | 'teacher' | 'admin';
  last_active: number;
}

const STORAGE_KEY = 'edtechra_saved_accounts';

/**
 * Retrieves all legitimate accounts saved on this device.
 */
export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (acc): acc is SavedAccount =>
        Boolean(acc && typeof acc === 'object' && acc.id && acc.email)
    );
  } catch {
    return [];
  }
}

/**
 * Saves or updates an authenticated account in the saved accounts list.
 */
export function saveCurrentAccount(account: {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
}): void {
  if (typeof window === 'undefined' || !account.id || !account.email) return;

  try {
    const existing = getSavedAccounts();
    const roleNormalized: 'student' | 'teacher' | 'admin' =
      account.role === 'admin' || account.role === 'teacher' ? account.role : 'student';

    const updatedAccount: SavedAccount = {
      id: account.id,
      email: account.email.trim(),
      full_name: (account.full_name || account.email.split('@')[0] || 'User').trim(),
      avatar_url: account.avatar_url || null,
      role: roleNormalized,
      last_active: Date.now()
    };

    // Filter out existing copy of same user ID or email
    const filtered = existing.filter(
      (a) => a.id !== account.id && a.email.toLowerCase() !== account.email.toLowerCase()
    );

    // Add updated account at the top
    const newList = [updatedAccount, ...filtered].slice(0, 5); // Keep up to 5 accounts
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  } catch (e) {
    console.warn('[AccountSwitcher] Failed to save account:', e);
  }
}

/**
 * Removes an account from this device's saved accounts list.
 */
export function removeSavedAccount(accountId: string): void {
  if (typeof window === 'undefined' || !accountId) return;
  try {
    const existing = getSavedAccounts();
    const updated = existing.filter((a) => a.id !== accountId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[AccountSwitcher] Failed to remove saved account:', e);
  }
}
