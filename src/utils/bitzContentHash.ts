// ============================================================================
// EDTECHRA-BITZ: Content Hash Utility for Import Deduplication
// Uses browser-native SubtleCrypto for SHA-256 hashing
// ============================================================================

/**
 * Compute a SHA-256 content hash from title + short_fact for deduplication.
 * Returns a hex string. Uses browser-native SubtleCrypto API.
 */
export async function computeBitzContentHash(title: string, shortFact: string): Promise<string> {
  const input = `${title.trim().toLowerCase()}|${shortFact.trim().toLowerCase()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute content hashes for an array of records.
 * Returns a Map of hash -> index for quick duplicate detection.
 */
export async function computeBatchHashes(
  records: Array<{ title: string; short_fact: string }>
): Promise<Map<string, number>> {
  const hashMap = new Map<string, number>();
  for (let i = 0; i < records.length; i++) {
    const hash = await computeBitzContentHash(records[i].title, records[i].short_fact);
    if (!hashMap.has(hash)) {
      hashMap.set(hash, i);
    }
  }
  return hashMap;
}
