import React from 'react';
import { X, FileText, ExternalLink, Download } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string;
  originalFilename?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  fileUrl,
  originalFilename
}) => {
  if (!isOpen || !fileUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center shrink-0 border border-red-400/20">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {title}
              </h3>
              {originalFilename && (
                <p className="text-xs text-slate-300 font-medium truncate">
                  {originalFilename}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Tab</span>
            </a>
            <a
              href={fileUrl}
              download={originalFilename || `${title}.pdf`}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden">
          <iframe
            src={`${fileUrl}#toolbar=1`}
            title={title}
            className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};
