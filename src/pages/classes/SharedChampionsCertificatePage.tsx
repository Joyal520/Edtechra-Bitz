import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Award, Download, Home, Loader2, ShieldAlert } from 'lucide-react';
import {
  AchievementSnapshot,
  decodeSnapshotToken,
  isSnapshotRevoked,
} from '@/utils/classChampionsUtils';
import {
  downloadCertificateBlob,
  PreloadedCertificateAssets,
  preloadCertificateAssets,
  renderCertificateSvgToPngBlob,
} from '@/utils/certificateExportUtils';
import { ClassChampionsCertificateSvg } from '@/components/classes/champions/ClassChampionsCertificateSvg';

export const SharedChampionsCertificatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('s') || '';

  const [snapshot, setSnapshot] = useState<AchievementSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'revoked'>('loading');
  const [assets, setAssets] = useState<PreloadedCertificateAssets>({
    logoUrl: '/images/edtechra-classroom-logo.png',
    avatarDataUrls: {},
  });
  const [isDownloading, setIsDownloading] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (!token) {
        if (active) setStatus('invalid');
        return;
      }

      const decoded = decodeSnapshotToken(token);
      if (!decoded) {
        if (active) setStatus('invalid');
        return;
      }

      if (isSnapshotRevoked(decoded.id)) {
        if (active) {
          setSnapshot(decoded);
          setStatus('revoked');
        }
        return;
      }

      if (active) {
        setSnapshot(decoded);
        setStatus('valid');
      }

      const preloaded = await preloadCertificateAssets(decoded);
      if (active) {
        setAssets(preloaded);
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, [token]);

  const handleDownload = async () => {
    if (!snapshot || !svgRef.current) return;
    setIsDownloading(true);
    try {
      const blob = await renderCertificateSvgToPngBlob(svgRef.current, 1200, 1300);
      downloadCertificateBlob(blob, snapshot.classroomName);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-amber-50/40 flex flex-col">
      {/* Clean Public Header Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <img
              src="/images/edtechra-classroom-logo.png"
              alt="EdTechra"
              className="h-9 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  EdTechra
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  Digital Classroom
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Official Class Champions Achievement Certificate
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {status === 'valid' && snapshot && (
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-60"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download Certificate (PNG)</span>
              </button>
            )}

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">EdTechra Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        {status === 'loading' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-lg flex flex-col items-center gap-3 text-slate-600">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold">Loading Achievement Certificate...</p>
          </div>
        )}

        {(status === 'invalid' || status === 'revoked') && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xl max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-extrabold text-slate-900">
                {status === 'revoked'
                  ? 'Certificate Link Revoked'
                  : 'Certificate Not Found'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {status === 'revoked'
                  ? 'This achievement certificate link has been revoked by the classroom teacher and is no longer publicly available.'
                  : 'This achievement certificate link appears to be invalid or incomplete. Ask your teacher for an updated link.'}
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to EdTechra
            </Link>
          </div>
        )}

        {status === 'valid' && snapshot && (
          <div className="w-full max-w-[660px] space-y-4">
            <div className="bg-white/95 rounded-3xl p-2.5 sm:p-4 border border-indigo-100 shadow-2xl">
              <ClassChampionsCertificateSvg
                snapshot={snapshot}
                logoUrl={assets.logoUrl}
                avatarDataUrls={assets.avatarDataUrls}
                svgRef={svgRef}
                className="w-full h-auto rounded-2xl block"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                <Award className="w-4 h-4 text-amber-500" />
                {snapshot.classroomName} • {snapshot.periodLabel}
              </span>
              <span>Read-only verified achievement snapshot</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedChampionsCertificatePage;
