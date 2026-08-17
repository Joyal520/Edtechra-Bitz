import React from 'react';
import { X, Share, PlusSquare, Download, CheckCircle2, Sparkles, Smartphone } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onNativeInstall,
  hasNativePrompt
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200/80 p-6 space-y-5 relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header with Official Logo */}
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="EdTechra-Bitz Official Logo"
            className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-[#026fc3]/20"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-black text-[#0f233a]">
                Install EdTechra-Bitz
              </h3>
              <span className="px-2 py-0.5 bg-brand-50 text-[#026fc3] text-[10px] font-extrabold rounded-md border border-brand-200 flex items-center gap-0.5">
                <Sparkles className="w-3 h-3 text-amber-500" /> Fast App
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Learn. Discover. Grow. • Microlearning on your device
            </p>
          </div>
        </div>

        {/* Benefit points */}
        <div className="p-4 bg-[#fbfbf7] border border-stone-200/80 rounded-2xl space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
            <span>Instant launch from your home screen or desktop</span>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
            <span>Fullscreen, distraction-free educational experience</span>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
            <span>Fast offline lesson caching & instant performance</span>
          </div>
        </div>

        {/* iOS Step-by-Step Instructions */}
        {isIOS && !hasNativePrompt ? (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#026fc3]" />
              iOS Safari Installation Steps:
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs">
                <div className="w-6 h-6 rounded-xl bg-brand-100 text-[#026fc3] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-slate-700 leading-snug">
                  Tap the <strong className="text-slate-900 inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold"><Share className="w-3 h-3 text-[#026fc3]" /> Share</strong> icon in your Safari toolbar (at the bottom or top of the screen).
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs">
                <div className="w-6 h-6 rounded-xl bg-brand-100 text-[#026fc3] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-slate-700 leading-snug">
                  Scroll down and tap <strong className="text-slate-900 inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold"><PlusSquare className="w-3 h-3 text-[#026fc3]" /> Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs">
                <div className="w-6 h-6 rounded-xl bg-brand-100 text-[#026fc3] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-slate-700 leading-snug">
                  Tap <strong className="text-slate-900 font-bold">"Add"</strong> in the top right corner. The EdTechra-Bitz app icon will appear on your home screen!
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-extrabold rounded-2xl shadow-xs transition-all"
            >
              Got it!
            </button>
          </div>
        ) : (
          /* Android / Desktop Install Action */
          <div className="space-y-3 pt-1">
            <button
              onClick={() => {
                if (onNativeInstall) onNativeInstall();
                onClose();
              }}
              className="w-full py-3 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Install EdTechra-Bitz App</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Maybe Later
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
