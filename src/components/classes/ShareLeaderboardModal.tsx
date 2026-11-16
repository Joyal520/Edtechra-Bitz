import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldOff,
  X,
} from 'lucide-react';
import { classroomPointsService } from '@/services/classroomPointsService';
import { ClassroomLeaderboardEntry } from '@/types/classroom';
import {
  AchievementSnapshot,
  buildAchievementSnapshot,
  getGallerySnapshots,
  revokeSnapshotInGallery,
  saveSnapshotToGallery,
} from '@/utils/classChampionsUtils';
import {
  buildWhatsAppShareMessage,
  downloadCertificateBlob,
  PreloadedCertificateAssets,
  preloadCertificateAssets,
  renderCertificateSvgToPngBlob,
} from '@/utils/certificateExportUtils';
import {
  buildShortShareUrl,
  createShortShareCertificate,
  listClassroomSharedCertificates,
  revokeSharedCertificateOnServer,
} from '@/services/certificateShareService';
import { ClassChampionsCertificateSvg } from './champions/ClassChampionsCertificateSvg';

export type ShareQuickAction = 'preview' | 'whatsapp' | 'download' | 'link';

export interface ShareLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId?: string;
  classroomName?: string;
  periodLabel?: string;
  initialAction?: ShareQuickAction;
  initialEntries?: ClassroomLeaderboardEntry[];
  onRefreshParentLeaderboard?: () => Promise<void> | void;
  onShowToast?: (message: string) => void;
}

export const ShareLeaderboardModal: React.FC<ShareLeaderboardModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  classroomName = 'Classroom',
  periodLabel = 'Current Term',
  initialAction = 'preview',
  initialEntries = [],
  onRefreshParentLeaderboard,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'gallery'>('preview');
  const [snapshot, setSnapshot] = useState<AchievementSnapshot | null>(null);
  const [gallerySnapshots, setGallerySnapshots] = useState<AchievementSnapshot[]>([]);
  const [assets, setAssets] = useState<PreloadedCertificateAssets>({
    logoUrl: '/images/edtechra-classroom-logo.png',
    avatarDataUrls: {},
  });

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isExporting, setIsExporting] = useState<'png' | 'whatsapp' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const autoActionHandledRef = useRef(false);
  const initialEntriesRef = useRef(initialEntries);
  const refreshParentRef = useRef(onRefreshParentLeaderboard);

  useEffect(() => {
    initialEntriesRef.current = initialEntries;
  }, [initialEntries]);

  useEffect(() => {
    refreshParentRef.current = onRefreshParentLeaderboard;
  }, [onRefreshParentLeaderboard]);

  const refreshGallery = useCallback(async () => {
    const scopeId = classroomId || 'classroom';
    const localItems = getGallerySnapshots(scopeId);
    setGallerySnapshots(localItems);

    if (classroomId) {
      try {
        const remoteItems = await listClassroomSharedCertificates(classroomId);
        if (remoteItems.length > 0) {
          const seen = new Set(remoteItems.map((i) => i.shareId || i.id));
          const merged = [
            ...remoteItems,
            ...localItems.filter((i) => i.shareId && !seen.has(i.shareId)),
          ];
          setGallerySnapshots(merged);
        }
      } catch {
        // Keep local gallery fallback
      }
    }
  }, [classroomId]);

  const loadSnapshotAndAssets = useCallback(async () => {
    setIsLoadingData(true);
    setErrorMsg(null);

    let resolvedEntries = initialEntriesRef.current;
    try {
      if (classroomId) {
        resolvedEntries = await classroomPointsService.getClassroomLeaderboard(classroomId, {
          throwOnError: true,
        });
        await refreshParentRef.current?.();
      }
    } catch {
      if (!resolvedEntries || resolvedEntries.length === 0) {
        setErrorMsg('Unable to refresh the latest leaderboard. Using available data.');
      }
    } finally {
      setIsLoadingData(false);
    }

    const nextSnapshot = buildAchievementSnapshot({
      classroomId: classroomId || 'classroom',
      classroomName: classroomName || 'Classroom',
      periodLabel: periodLabel || 'Current Term',
      entries: resolvedEntries || [],
    });

    setSnapshot(nextSnapshot);
    setIsLoadingAssets(true);
    try {
      const preloaded = await preloadCertificateAssets(nextSnapshot);
      setAssets(preloaded);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [classroomId, classroomName, periodLabel]);

  useEffect(() => {
    if (!isOpen) {
      autoActionHandledRef.current = false;
      setCopiedLink(false);
      setErrorMsg(null);
      return;
    }

    setActiveTab('preview');
    refreshGallery();
    void loadSnapshotAndAssets();
  }, [isOpen, refreshGallery, loadSnapshotAndAssets]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const ensureShortShareLink = useCallback(
    async (targetSnapshot: AchievementSnapshot): Promise<{ shareUrl: string; updated: AchievementSnapshot }> => {
      if (targetSnapshot.shareId) {
        return {
          shareUrl: buildShortShareUrl(targetSnapshot.shareId),
          updated: targetSnapshot,
        };
      }

      const created = await createShortShareCertificate(targetSnapshot);
      const updatedSnapshot: AchievementSnapshot = {
        ...targetSnapshot,
        id: created.shareId || created.id,
        shareId: created.shareId,
        createdAt: created.createdAt || targetSnapshot.createdAt,
      };
      saveSnapshotToGallery(updatedSnapshot);
      setSnapshot((prev) => (prev && prev.id === targetSnapshot.id ? updatedSnapshot : prev));
      void refreshGallery();
      return {
        shareUrl: buildShortShareUrl(created.shareId || created.id),
        updated: updatedSnapshot,
      };
    },
    [refreshGallery]
  );

  const handleCopyShareLink = useCallback(
    async (targetSnapshot: AchievementSnapshot | null = snapshot) => {
      if (!targetSnapshot) return;
      try {
        setErrorMsg(null);
        const { shareUrl } = await ensureShortShareLink(targetSnapshot);
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        onShowToast?.('Short certificate link copied!');
        window.setTimeout(() => setCopiedLink(false), 2500);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Could not generate or copy the short link. Please try again.');
      }
    },
    [snapshot, ensureShortShareLink, onShowToast]
  );

  const handleDownloadPng = useCallback(async () => {
    if (!snapshot || !svgRef.current) return;
    setIsExporting('png');
    setErrorMsg(null);
    try {
      const blob = await renderCertificateSvgToPngBlob(svgRef.current, 1200, 1500);
      downloadCertificateBlob(blob, snapshot.classroomName);
      onShowToast?.('Achievement certificate downloaded!');
    } catch {
      setErrorMsg('Failed to generate PNG certificate. Please try again.');
    } finally {
      setIsExporting(null);
    }
  }, [snapshot, onShowToast]);

  const handleShareWhatsApp = useCallback(async () => {
    if (!snapshot) return;
    setIsExporting('whatsapp');
    setErrorMsg(null);
    try {
      const { shareUrl } = await ensureShortShareLink(snapshot);
      const message = buildWhatsAppShareMessage(snapshot.classroomName, shareUrl);

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'EdTechra Class Champions',
            text: message,
            url: shareUrl,
          });
          onShowToast?.('Certificate link shared!');
          return;
        } catch (err) {
          if ((err as DOMException)?.name === 'AbortError') {
            return;
          }
        }
      }

      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      onShowToast?.('WhatsApp share opened with short link!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not launch WhatsApp share. Please try again.');
    } finally {
      setIsExporting(null);
    }
  }, [snapshot, ensureShortShareLink, onShowToast]);

  useEffect(() => {
    if (
      !isOpen ||
      autoActionHandledRef.current ||
      initialAction === 'preview' ||
      isLoadingData ||
      isLoadingAssets ||
      !snapshot ||
      !svgRef.current
    ) {
      return;
    }

    autoActionHandledRef.current = true;
    const timer = window.setTimeout(() => {
      if (initialAction === 'link') {
        void handleCopyShareLink(snapshot);
      } else if (initialAction === 'download') {
        void handleDownloadPng();
      } else if (initialAction === 'whatsapp') {
        void handleShareWhatsApp();
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    isOpen,
    initialAction,
    isLoadingData,
    isLoadingAssets,
    snapshot,
    handleCopyShareLink,
    handleDownloadPng,
    handleShareWhatsApp,
  ]);

  const handlePreviewGalleryItem = async (item: AchievementSnapshot) => {
    setSnapshot(item);
    setActiveTab('preview');
    setIsLoadingAssets(true);
    try {
      const preloaded = await preloadCertificateAssets(item);
      setAssets(preloaded);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleRevokeLink = async (item: AchievementSnapshot) => {
    try {
      if (item.shareId) {
        await revokeSharedCertificateOnServer(item.shareId);
      }
      revokeSnapshotInGallery(item.classroomId, item.id);
      void refreshGallery();
      if (snapshot?.id === item.id) {
        setSnapshot({ ...snapshot, revoked: true });
      }
      onShowToast?.('Certificate link revoked.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to revoke certificate link.');
    }
  };

  if (!isOpen) return null;

  const isBusy = isLoadingData || isLoadingAssets;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cc-share-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 via-white to-amber-50/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="cc-share-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
              >
                Share Class Champions Certificate
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {classroomName} • {periodLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Certificate Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'gallery'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Achievement Gallery
              {gallerySnapshots.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold">
                  {gallerySnapshots.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'preview' && (
            <button
              type="button"
              onClick={() => void loadSnapshotAndAssets()}
              disabled={isBusy}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-700 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
              Refresh Latest
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'preview' ? (
            <>
              {/* Certificate Canvas Preview */}
              <div className="relative rounded-2xl bg-gradient-to-b from-slate-100 to-indigo-50/40 p-2 sm:p-4 border border-slate-200/80 flex items-center justify-center">
                {isLoadingData && !snapshot ? (
                  <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-2.5">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold">Preparing certificate...</span>
                  </div>
                ) : snapshot ? (
                  <div className="w-full max-w-[460px] mx-auto relative">
                    <ClassChampionsCertificateSvg
                      snapshot={snapshot}
                      logoUrl={assets.logoUrl}
                      avatarDataUrls={assets.avatarDataUrls}
                      svgRef={svgRef}
                      className="w-full h-auto rounded-2xl shadow-lg block bg-white"
                    />
                    {isLoadingAssets && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 border border-slate-200 text-[11px] font-semibold text-slate-600 shadow-sm inline-flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        Syncing avatars...
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Action Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleShareWhatsApp()}
                  disabled={isBusy || isExporting !== null || !snapshot}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isExporting === 'whatsapp' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  Share on WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => void handleDownloadPng()}
                  disabled={isBusy || isExporting !== null || !snapshot}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isExporting === 'png' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download PNG
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyShareLink(snapshot)}
                  disabled={isBusy || !snapshot || Boolean(snapshot?.revoked)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-indigo-600" />
                      Copy Share Link
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {gallerySnapshots.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                  <Archive className="w-9 h-9 text-slate-300 mx-auto mb-2.5" />
                  <p className="text-sm font-bold text-slate-800">
                    No saved certificates yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Certificates you share on WhatsApp, download as PNG, or copy a link for are saved here so you can reopen or revoke links anytime.
                  </p>
                </div>
              ) : (
                gallerySnapshots.map((item) => {
                  const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-slate-900 truncate">
                            {item.classroomName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                            {item.periodLabel}
                          </span>
                          {item.revoked ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase">
                              Revoked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase">
                              Active Link
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Generated {formattedDate} •{' '}
                          {item.champions
                            .map((c) => `#${c.rank} ${c.name} (${c.points} XP)`)
                            .join(' · ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => void handlePreviewGalleryItem(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Preview
                        </button>

                        {!item.revoked && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleCopyShareLink(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Copy Link
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeLink(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                              Revoke Link
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
