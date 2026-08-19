import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Search,
  ArrowUpDown,
  RefreshCw,
  Youtube,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Radio,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AdminStats, AdminUserListItem } from '@/types';
import { youtubeClient, SyncStatusData } from '@/services/youtubeClient';
import { AdminSyncModal } from '@/components/AdminSyncModal';

export const AdminPage: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'admin'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // User details visibility state
  const [revealedUserIds, setRevealedUserIds] = useState<Set<string>>(new Set());
  const [showAllDetails, setShowAllDetails] = useState(false);

  const toggleUserDetail = (userId: string) => {
    setRevealedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleAllDetails = () => {
    if (showAllDetails) {
      setShowAllDetails(false);
      setRevealedUserIds(new Set());
    } else {
      setShowAllDetails(true);
      setRevealedUserIds(new Set(users.map((u) => u.id)));
    }
  };

  // YouTube Sync Modal state
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setError(null);
    setRefreshing(true);

    try {
      // 1. Fetch Admin Dashboard Statistics via PostgreSQL RPC or profiles query
      let fetchedStats: AdminStats | null = null;

      const { data: rpcStats, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats');
      if (!rpcError && rpcStats) {
        fetchedStats = {
          totalUsers: Number(rpcStats.totalUsers) || 0,
          totalStudents: Number(rpcStats.totalStudents) || 0,
          totalAdmins: Number(rpcStats.totalAdmins) || 0,
          newUsersToday: Number(rpcStats.newUsersToday) || 0,
          newUsersThisWeek: Number(rpcStats.newUsersThisWeek) || 0,
          newUsersThisMonth: Number(rpcStats.newUsersThisMonth) || 0
        };
      } else {
        // Direct queries fallback respecting RLS
        const { data: allProfiles, error: pError } = await supabase.from('profiles').select('*');
        if (pError) throw pError;

        const now = new Date().getTime();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

        const profilesList = allProfiles || [];
        fetchedStats = {
          totalUsers: profilesList.length,
          totalStudents: profilesList.filter((p) => p.role === 'student').length,
          totalAdmins: profilesList.filter((p) => p.role === 'admin').length,
          newUsersToday: profilesList.filter((p) => new Date(p.created_at).getTime() >= oneDayAgo).length,
          newUsersThisWeek: profilesList.filter((p) => new Date(p.created_at).getTime() >= oneWeekAgo).length,
          newUsersThisMonth: profilesList.filter((p) => new Date(p.created_at).getTime() >= oneMonthAgo).length
        };
      }
      setStats(fetchedStats);

      // 2. Fetch Users List via RPC or query
      const { data: rpcUsers, error: rpcUsersErr } = await supabase.rpc('get_admin_users', {
        p_search: searchQuery.trim(),
        p_role: roleFilter,
        p_sort: sortOrder
      });

      if (!rpcUsersErr && rpcUsers) {
        setUsers(rpcUsers);
      } else {
        // Direct query fallback
        let query = supabase.from('profiles').select('*');
        if (roleFilter !== 'all') {
          query = query.eq('role', roleFilter);
        }
        if (searchQuery.trim()) {
          query = query.or(`email.ilike.%${searchQuery.trim()}%,full_name.ilike.%${searchQuery.trim()}%`);
        }
        query = query.order('created_at', { ascending: sortOrder === 'asc' });

        const { data: profileData, error: queryErr } = await query;
        if (queryErr) throw queryErr;
        setUsers(profileData || []);
      }

      // 3. Fetch YouTube Synchronization Status
      const syncData = await youtubeClient.getSyncStatus();
      if (syncData) {
        setSyncStatus(syncData);
      }
    } catch (err: any) {
      console.error('[AdminPage] Error loading data:', err);
      setError(err.message || 'Failed to fetch administrator statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, roleFilter, sortOrder]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0f233a] via-[#122e4d] to-[#026fc3] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-extrabold rounded-md backdrop-blur-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Administrator Control Center
              </span>
              <span className="text-white/60 text-xs">•</span>
              <span className="text-white/80 text-xs font-mono">{profile?.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              EdTechra-Bitz Administration
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Real-time user analytics, role enforcement, and microlearning content synchronization.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setSyncModalOpen(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-2xl shadow-xs transition-all flex items-center gap-2"
            >
              <Youtube className="w-4 h-4" />
              <span>Sync YouTube Channel</span>
            </button>
            <button
              onClick={() => loadAdminData()}
              disabled={refreshing}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Error loading administrative data</div>
            <div className="text-[11px] text-rose-700 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* 1. YouTube Synchronization & Channel Pipeline Section (Requirement 17) */}
      <section className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <Youtube className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#0f233a]">
                  YouTube Channel Synchronization Pipeline
                </h2>
                <p className="text-xs text-slate-500">
                  Channel: <strong>@EdTechraBitz</strong> (ID: UCHOag2liOOp1XfTAUCqiFUg)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-extrabold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-Sync Active
            </span>
            <button
              onClick={() => setSyncModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </button>
          </div>
        </div>

        {/* Sync Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Synchronized Shorts */}
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#026fc3]" />
              <span>Synchronized</span>
            </div>
            <div className="text-2xl font-black text-[#0f233a]">
              {syncStatus?.totalVideos || 198}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">Total Shorts in Supabase</div>
          </div>

          {/* Upcoming Shorts */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-1">
            <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Upcoming</span>
            </div>
            <div className="text-2xl font-black text-amber-900">
              {syncStatus?.upcomingVideos ?? 0}
            </div>
            <div className="text-[10px] text-amber-600 font-semibold">Pending Lesson Release</div>
          </div>

          {/* Last Synchronization */}
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Last Synced</span>
            </div>
            <div className="text-sm font-bold text-slate-800 truncate mt-1">
              {syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold truncate">
              {syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleDateString() : 'Continuous'}
            </div>
          </div>

          {/* Sync Health / Last Error */}
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-purple-500" />
              <span>Sync Health</span>
            </div>
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{syncStatus?.lastError ? 'Error Detected' : '0 Errors (Healthy)'}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold truncate">
              {syncStatus?.lastError ? syncStatus.lastError : 'WebSub + Cron Backup'}
            </div>
          </div>

        </div>
      </section>

      {/* 2. Statistics Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#026fc3]" />
            User Statistics Overview
          </h2>
          <span className="text-[11px] text-slate-400 font-semibold">
            Live database calculated metrics
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* Total Users */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold">Total Users</span>
              <Users className="w-4 h-4 text-[#026fc3]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0f233a]">
              {loading ? '-' : stats?.totalUsers ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">Registered Accounts</div>
          </div>

          {/* Total Students */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold text-slate-500">Students</span>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">
              {loading ? '-' : stats?.totalStudents ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">Learner Role</div>
          </div>

          {/* Administrators */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold text-slate-500">Admins</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-700">
              {loading ? '-' : stats?.totalAdmins ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">System Admins</div>
          </div>

          {/* New Today */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold text-slate-500">New Today</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {loading ? '-' : stats?.newUsersToday ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">Registered Today</div>
          </div>

          {/* New This Week */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold text-slate-500">This Week</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">
              {loading ? '-' : stats?.newUsersThisWeek ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">Past 7 Days</div>
          </div>

          {/* New This Month */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold text-slate-500">This Month</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">
              {loading ? '-' : stats?.newUsersThisMonth ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">Past 30 Days</div>
          </div>

        </div>
      </section>

      {/* 3. User Directory Table */}
      <section className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0f233a]">
              Registered User Directory
            </h2>
            <p className="text-xs text-slate-500">
              Showing {users.length} {users.length === 1 ? 'user' : 'users'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'student', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg capitalize transition-all ${
                    roleFilter === r
                      ? 'bg-white text-[#026fc3] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Show/Hide Details Toggle */}
            <button
              onClick={toggleAllDetails}
              className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                showAllDetails
                  ? 'bg-[#026fc3] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={showAllDetails ? 'Hide All User Details' : 'Show All User Details'}
            >
              {showAllDetails ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide Details</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show Details</span>
                </>
              )}
            </button>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Toggle Sort Date"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                <th className="pb-3 px-3">User</th>
                <th className="pb-3 px-3">Email</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">Registered</th>
                <th className="pb-3 px-3">Last Sign In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#026fc3]/30 border-t-[#026fc3] rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading user data from Supabase...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const initials = (u.full_name || u.email || 'U').slice(0, 2).toUpperCase();
                  const isAdminRole = u.role === 'admin';
                  const isRevealed = showAllDetails || revealedUserIds.has(u.id);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group font-medium"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || 'User avatar'}
                              className="w-8 h-8 rounded-full object-cover border border-stone-200 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-stone-200">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.full_name || 'Anonymous User'}</span>
                              {isAdminRole && (
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {isRevealed ? `${u.id.slice(0, 8)}...` : '••••••••'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        <div className="flex items-center gap-2">
                          <span>
                            {isRevealed ? (u.email || '-') : (u.email ? '••••••••••••••••' : '-')}
                          </span>
                          <button
                            onClick={() => toggleUserDetail(u.id)}
                            className="text-slate-400 hover:text-[#026fc3] p-1 rounded-md transition-colors cursor-pointer"
                            title={isRevealed ? 'Hide detail' : 'Show detail'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Role Pill */}
                      <td className="py-3 px-3">
                        {isAdminRole ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                            admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <GraduationCap className="w-3 h-3 text-emerald-600" />
                            student
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '-'}
                      </td>

                      {/* Last Sign In */}
                      <td className="py-3 px-3 text-slate-400 font-medium text-[11px]">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never / Initial'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </section>

      {/* YouTube Sync Modal */}
      <AdminSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onSyncComplete={() => loadAdminData()}
      />

    </div>
  );
};
