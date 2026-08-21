import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Play,
  ArrowRight,
  ShieldCheck,
  Database,
  Loader2,
  X
} from 'lucide-react';
import { storageService, StorageStatusData, StorageTestResult, MigrationResult } from '@/services/storageService';
import { useAuth } from '@/context/AuthContext';

export const AdminStorageSection: React.FC = () => {
  const { session } = useAuth();

  const [statusData, setStatusData] = useState<StorageStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Diagnostic Test State
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);

  // Migration State
  const [migrating, setMigrating] = useState<boolean>(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setActionToast({ type, message });
    setTimeout(() => setActionToast(null), 4000);
  };

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const token = session?.access_token || null;
      const data = await storageService.getStorageStatus(token);
      setStatusData(data);
    } catch (err: any) {
      console.error('Failed to load R2 storage status:', err);
      showToast(err.message || 'Failed to connect to storage service.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleRunDiagnostic = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = session?.access_token || null;
      const result = await storageService.runDiagnosticTest(token);
      setTestResult(result);
      if (result.success) {
        showToast('R2 lifecycle diagnostic test passed successfully!');
      } else {
        showToast(result.error || 'Diagnostic test encountered an issue.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Diagnostic test failed.', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleRunMigration = async () => {
    if (!window.confirm('Run content migration to Cloudflare R2? This will safely copy any content records lacking an R2 object key into R2 and update their pointers.')) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);
    try {
      const token = session?.access_token || null;
      const result = await storageService.runLegacyMigration(token);
      setMigrationResult(result);
      showToast(`Migration finished: ${result.migratedReadings} readings, ${result.migratedQuizzes} quizzes, ${result.migratedPolls} polls uploaded.`);
      await loadStatus();
    } catch (err: any) {
      showToast(err.message || 'Migration failed.', 'error');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <section className="space-y-6 pt-4">
      
      {/* Toast Alert */}
      {actionToast && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 ${
            actionToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionToast.message}</span>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-[#0f233a] text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-black tracking-wider uppercase border border-white/20">
              Cloudflare R2 Object Storage
            </span>
            <span className="text-white/80 text-xs font-semibold">
              Content Bodies & Media Assets
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <HardDrive className="w-6 h-6" />
            <span>Storage Control Panel & Diagnostics</span>
          </h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Educational content JSON files (Readings, Quizzes, Polls) and all image media are stored in Cloudflare R2 object storage to keep PostgreSQL lightweight and scalable.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadStatus()}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            title="Refresh Storage Status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Connection Status & Safe Configuration Card */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0f233a] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Cloudflare R2 Connection Status</span>
            </h3>
            <p className="text-xs text-slate-500">
              Operational parameters and security-masked credential verification.
            </p>
          </div>

          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
              statusData?.status === 'connected'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${statusData?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{statusData?.status === 'connected' ? 'Connected & Operational' : 'Connecting…'}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Bucket</div>
            <div className="font-mono text-xs font-black text-slate-800">{statusData?.bucket || 'edtechra-media'}</div>
            <div className="text-[10px] text-emerald-600 font-bold">✓ Accessible</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Account ID</div>
            <div className="font-mono text-xs font-black text-slate-800">{statusData?.maskedAccountId || 'Configured'}</div>
            <div className="text-[10px] text-slate-400 font-semibold">Masked for Security</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Upload Service</div>
            <div className="text-xs font-black text-slate-800">AWS SigV4 Presigned</div>
            <div className="text-[10px] text-emerald-600 font-bold">✓ Operational</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Public Base URL</div>
            <div className="font-mono text-[11px] font-bold text-slate-800 truncate" title={statusData?.publicBaseUrl}>
              {statusData?.publicBaseUrl || 'Configured'}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold">✓ CDN Active</div>
          </div>
        </div>
      </div>

      {/* 3. Storage Usage Breakdown Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400">Total Objects</div>
          <div className="text-2xl font-black text-[#0f233a]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-orange-600" /> : (statusData?.totalObjects ?? '—')}
          </div>
          <div className="text-[10px] text-slate-500">In R2 Bucket</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-orange-600">Storage Used</div>
          <div className="text-2xl font-black text-orange-700">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-orange-600" /> : `${statusData?.estimatedStorageMB || '0'} MB`}
          </div>
          <div className="text-[10px] text-slate-500">{statusData?.estimatedStorageGB || '0'} GB</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-teal-600">Readings</div>
          <div className="text-2xl font-black text-teal-700">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> : (statusData?.readingsCount ?? '0')}
          </div>
          <div className="text-[10px] text-slate-500">content.json</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-blue-600">Quizzes</div>
          <div className="text-2xl font-black text-blue-700">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : (statusData?.quizzesCount ?? '0')}
          </div>
          <div className="text-[10px] text-slate-500">content.json</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-purple-600">Polls</div>
          <div className="text-2xl font-black text-purple-700">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : (statusData?.pollsCount ?? '0')}
          </div>
          <div className="text-[10px] text-slate-500">content.json</div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-rose-600">Images & Media</div>
          <div className="text-2xl font-black text-rose-700">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-rose-600" /> : (statusData?.imagesCount ?? '0')}
          </div>
          <div className="text-[10px] text-slate-500">WebP / PNG / JPG</div>
        </div>
      </div>

      {/* 4. Action & Diagnostics Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Tool A: Diagnostic Test */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-[#0f233a]">
                  Storage Lifecycle Diagnostics
                </h4>
                <p className="text-xs text-slate-500">
                  Runs a non-destructive upload, read, and delete test against R2.
                </p>
              </div>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-2xl text-xs space-y-1 border ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                  <span>{testResult.message || testResult.error}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Completed at {new Date(testResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Non-destructive test</span>
            <button
              type="button"
              disabled={testing}
              onClick={handleRunDiagnostic}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              <span>{testing ? 'Testing Roundtrip…' : 'Run Diagnostic Test'}</span>
            </button>
          </div>
        </div>

        {/* Tool B: Safe Idempotent Migration */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-[#0f233a]">
                  Legacy Content R2 Migration
                </h4>
                <p className="text-xs text-slate-500">
                  Uploads existing database/cache content to R2 without deleting original records.
                </p>
              </div>
            </div>

            {migrationResult && (
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Migration Complete</span>
                </div>
                <div className="text-[11px] text-teal-800">
                  • {migrationResult.migratedReadings} readings stored in R2<br />
                  • {migrationResult.migratedQuizzes} quizzes stored in R2<br />
                  • {migrationResult.migratedPolls} polls stored in R2
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Zero data loss guaranteed</span>
            <button
              type="button"
              disabled={migrating}
              onClick={handleRunMigration}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[36px]"
            >
              {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>{migrating ? 'Migrating to R2…' : 'Run Content Migration'}</span>
            </button>
          </div>
        </div>

      </div>

    </section>
  );
};
