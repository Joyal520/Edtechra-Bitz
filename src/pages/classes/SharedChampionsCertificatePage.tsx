import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Check,
  Copy,
  Download,
  Home,
  Loader2,
  MessageCircle,
  Share2,
  ShieldAlert,
} from 'lucide-react';
import {
  AchievementSnapshot,
  decodeSnapshotToken,
  isSnapshotRevoked,
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
  fetchSharedCertificate,
} from '@/services/certificateShareService';
import { ClassChampionsCertificateSvg } from '@/components/classes/champions/ClassChampionsCertificateSvg';
import { CeremonyPodiumStage } from '@/components/classes/champions/CeremonyPodiumStage';
import { GoldenDustCanvas } from '@/components/classes/champions/GoldenDustCanvas';
import '@/components/classes/champions/classChampionsCeremony.css';

type PageStatus = 'loading' | 'intro' | 'valid' | 'invalid' | 'revoked' | 'expired';

export const SharedChampionsCertificatePage: React.FC = () => {
  const { shareId } = useParams<{ shareId?: string }>();
  const [searchParams] = useSearchParams();
  const legacyToken = searchParams.get('s') || '';

  const [snapshot, setSnapshot] = useState<AchievementSnapshot | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [assets, setAssets] = useState<PreloadedCertificateAssets>({
    logoUrl: '/images/edtechra-classroom-logo.png',
    avatarDataUrls: {},
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let active = true;
    let introTimer: number | undefined;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const enterCeremony = (resolved: AchievementSnapshot) => {
      if (!active) return;
      setSnapshot(resolved);

      if (prefersReducedMotion) {
        setStatus('valid');
      } else {
        setStatus('intro');
        introTimer = window.setTimeout(() => {
          if (active) setStatus('valid');
        }, 1250);
      }

      void preloadCertificateAssets(resolved).then((preloaded) => {
        if (active) setAssets(preloaded);
      });
    };

    const init = async () => {
      if (shareId) {
        const result = await fetchSharedCertificate(shareId);
        if (!active) return;

        if (result.status === 'valid' && result.certificate) {
          enterCeremony(result.certificate);
          return;
        }
        if (result.status === 'revoked') {
          setStatus('revoked');
          return;
        }
        if (result.status === 'expired') {
          setStatus('expired');
          return;
        }
        setStatus('invalid');
        return;
      }

      if (legacyToken) {
        const decoded = decodeSnapshotToken(legacyToken);
        if (!decoded) {
          if (active) setStatus('invalid');
          return;
        }
        if (isSnapshotRevoked(decoded.id)) {
          if (active) setStatus('revoked');
          return;
        }
        enterCeremony(decoded);
        return;
      }

      if (active) setStatus('invalid');
    };

    void init();

    return () => {
      active = false;
      if (introTimer !== undefined) {
        window.clearTimeout(introTimer);
      }
    };
  }, [shareId, legacyToken]);

  const currentShareUrl = shareId
    ? buildShortShareUrl(shareId)
    : typeof window !== 'undefined'
      ? window.location.href
      : '';

  const handleDownload = async () => {
    if (!snapshot || !svgRef.current) return;
    setIsDownloading(true);
    try {
      const blob = await renderCertificateSvgToPngBlob(svgRef.current, 1200, 1500);
      downloadCertificateBlob(blob, snapshot.classroomName);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareAchievement = async () => {
    if (!snapshot) return;
    const message = buildWhatsAppShareMessage(snapshot.classroomName, currentShareUrl);

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'EdTechra Class Champions',
          text: message,
          url: currentShareUrl,
        });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return;
        }
      }
    }
    setShareMenuOpen((prev) => !prev);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleWhatsAppShare = () => {
    if (!snapshot) return;
    const message = buildWhatsAppShareMessage(snapshot.classroomName, currentShareUrl);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setShareMenuOpen(false);
  };

  return (
    <div className="ceremony-backdrop min-h-screen w-full overflow-x-hidden flex flex-col justify-between relative text-white selection:bg-amber-400 selection:text-amber-950">
      {/* Golden Dust Overlay when ceremony is active */}
      {status === 'valid' && <GoldenDustCanvas active />}

      {/* Initial Loading & Intro Animation */}
      {(status === 'loading' || status === 'intro') && (
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center relative z-30">
          <div className="relative flex flex-col items-center">
            <div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400/20 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
            <img
              src="/images/edtechra-classroom-logo.png"
              alt="EdTechra"
              className="ceremony-intro-logo h-20 sm:h-24 w-auto object-contain drop-shadow-[0_10px_30px_rgba(251,191,36,0.35)]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-emblem.png';
              }}
            />
            <p className="ceremony-intro-text mt-5 text-base sm:text-xl font-extrabold tracking-wide text-amber-200">
              Celebrating Classroom Excellence
            </p>
            {status === 'loading' && (
              <Loader2 className="w-5 h-5 animate-spin text-sky-300/80 mt-4" />
            )}
          </div>
        </main>
      )}

      {/* Invalid / Revoked / Expired States */}
      {(status === 'invalid' || status === 'revoked' || status === 'expired') && (
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-30">
          <div className="ceremony-gold-frame rounded-3xl p-8 sm:p-10 max-w-md w-full text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-300/40 flex items-center justify-center text-rose-200 mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {status === 'revoked'
                  ? 'Certificate Link Revoked'
                  : status === 'expired'
                    ? 'Certificate Link Expired'
                    : 'Certificate Not Found'}
              </h1>
              <p className="text-sm text-sky-100/80 leading-relaxed">
                {status === 'revoked'
                  ? 'This achievement certificate link has been revoked by the classroom teacher and is no longer publicly available.'
                  : status === 'expired'
                    ? 'This shared achievement certificate link has expired. Ask your teacher for an updated link.'
                    : 'This achievement certificate link appears to be invalid or incomplete. Ask your teacher for an updated link.'}
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950 text-sm font-black shadow-lg transition-all min-h-[44px]"
            >
              <Home className="w-4 h-4" />
              Return to EdTechra
            </Link>
          </div>
        </main>
      )}

      {/* Main Full-Screen Achievement Ceremony */}
      {status === 'valid' && snapshot && (
        <>
          <main className="flex-1 flex flex-col items-center justify-center px-3 py-5 sm:px-6 sm:py-8 relative z-30">
            <CeremonyPodiumStage snapshot={snapshot} logoUrl={assets.logoUrl} />

            {/* Unobtrusive Interactive Controls */}
            <div className="ceremony-stage-footer relative mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full max-w-2xl">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950 text-xs sm:text-sm font-black shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition-all disabled:opacity-60 min-h-[44px]"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download Certificate</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => void handleShareAchievement()}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white/12 hover:bg-white/20 border border-white/25 backdrop-blur-md text-white text-xs sm:text-sm font-bold shadow-lg transition-all min-h-[44px]"
                >
                  <Share2 className="w-4 h-4 text-amber-300" />
                  <span>Share Achievement</span>
                </button>

                {shareMenuOpen && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 rounded-2xl bg-slate-900/95 border border-amber-300/30 shadow-2xl p-2 space-y-1 backdrop-blur-md z-40">
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-500/20 text-left text-xs sm:text-sm font-bold text-emerald-300 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      Share on WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 text-left text-xs sm:text-sm font-bold text-white transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-amber-300 shrink-0" />
                          <span>Copy Short Link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-slate-950/50 hover:bg-slate-900/70 border border-white/15 text-sky-100 text-xs sm:text-sm font-bold transition-all min-h-[44px]"
              >
                <Home className="w-4 h-4" />
                <span>Return to EdTechra</span>
              </Link>
            </div>
          </main>

          {/* Offscreen 1200x1500 SVG Certificate Renderer for High-Res PNG Export */}
          <div
            aria-hidden="true"
            className="fixed -left-[9999px] -top-[9999px] w-[1200px] h-[1500px] pointer-events-none opacity-0 overflow-hidden"
          >
            <ClassChampionsCertificateSvg
              snapshot={snapshot}
              logoUrl={assets.logoUrl}
              avatarDataUrls={assets.avatarDataUrls}
              svgRef={svgRef}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SharedChampionsCertificatePage;
