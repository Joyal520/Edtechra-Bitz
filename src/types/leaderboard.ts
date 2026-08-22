// ============================================================================
// EDTECHRA-BITZ: Leaderboard Types
// ============================================================================

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  isInTop10?: boolean;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  top10: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  lastUpdated: string;
}
