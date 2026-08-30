import React from 'react';
import { X, Upload, Cloud, HardDrive, Sparkles } from 'lucide-react';
import { TeacherStorageUsage } from '@/types/classroom';

interface AddLearningMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUploadDevice: () => void;
  onSelectCloudBucket: () => void;
  storageUsage?: TeacherStorageUsage | null;
}

export const AddLearningMaterialModal: React.FC<AddLearningMaterialModalProps> = ({
  isOpen,
  onClose,
  onSelectUploadDevice,
  onSelectCloudBucket,
  storageUsage
}) => {
  if (!isOpen) return null;

  const quotaPercent = storageUsage?.percentage ?? 0;
  const isFull = quotaPercent >= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                Learning Materials
              </span>
              <h3 className="text-lg font-black tracking-tight text-white mt-1">
                ADD LEARNING MATERIAL
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Choose where to get your material:
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - 2 Equal Clear Options */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OPTION A: Upload from Device */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectUploadDevice();
              }}
              disabled={isFull}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all group relative cursor-pointer ${
                isFull
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  : 'border-slate-200/90 bg-white hover:border-[#026fc3] hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#026fc3] flex items-center justify-center group-hover:scale-105 group-hover:bg-[#026fc3] group-hover:text-white transition-all shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-[#026fc3] transition-colors">
                    Upload from Device
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    Upload a new PDF from your computer.
                  </p>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-extrabold text-[#026fc3]">
                <span>Upload &amp; Assign</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>

            {/* OPTION B: Explore Your Cloud Bucket */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectCloudBucket();
              }}
              className="p-5 rounded-2xl border border-indigo-200/90 bg-gradient-to-b from-indigo-50/50 to-white hover:border-indigo-500 hover:shadow-lg hover:-translate-y-0.5 text-left flex flex-col justify-between transition-all group relative cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      Instant • 0 MB
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Explore Your Cloud Bucket
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    Choose a file that you have already uploaded.
                  </p>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-indigo-100 flex items-center justify-between text-[11px] font-extrabold text-indigo-600">
                <span>Select &amp; Assign</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </button>
          </div>

          {/* Storage Quota Footer Summary */}
          {storageUsage && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-semibold">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span>Cloud Storage Allocation:</span>
              </div>
              <span className="font-extrabold text-slate-900">
                {storageUsage.usedMb} MB / {storageUsage.maxMb} MB used ({storageUsage.percentage}%)
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
