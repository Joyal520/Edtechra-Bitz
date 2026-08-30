import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  HardDrive,
  Cloud
} from 'lucide-react';
import { TeacherCloudMaterial, TeacherStorageUsage } from '@/types/classroom';
import { classroomResourceService } from '@/services/classroomResourceService';

interface UploadFromDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId?: string;
  bucketId?: string;
  storageUsage?: TeacherStorageUsage | null;
  onSuccess: (material: TeacherCloudMaterial) => void;
  onSwitchToCloudBucket: () => void;
}

export const UploadFromDeviceModal: React.FC<UploadFromDeviceModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  bucketId,
  storageUsage,
  onSuccess,
  onSwitchToCloudBucket
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Duplicate detection
  const [matchingMaterial, setMatchingMaterial] = useState<TeacherCloudMaterial | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Upload Progress & State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);

    // Auto-fill friendly material name if not provided
    if (!materialName.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setMaterialName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Check storage quota immediately
    const remainingBytes = storageUsage?.remainingBytes ?? (500 * 1024 * 1024);
    if (file.size > remainingBytes) {
      const remainingMb = (remainingBytes / (1024 * 1024)).toFixed(1);
      const fileMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Not enough cloud storage. You have ${remainingMb} MB remaining, but this file is ${fileMb} MB.`);
    }

    // Check for duplicate in background
    setIsCheckingDuplicate(true);
    try {
      const match = await classroomResourceService.findMatchingCloudMaterial(file.name, file.size);
      setMatchingMaterial(match);
    } catch {
      setMatchingMaterial(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handleUseExisting = async () => {
    if (!matchingMaterial) return;
    if (classroomId) {
      setIsUploading(true);
      try {
        await classroomResourceService.assignCloudMaterialsToClassroom({
          classroomId,
          resourceIds: [matchingMaterial.id],
          bucketId
        });
        onSuccess(matchingMaterial);
        onClose();
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to assign existing material.');
      } finally {
        setIsUploading(false);
      }
    } else {
      onSuccess(matchingMaterial);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a PDF or document file to upload.');
      return;
    }
    if (!materialName.trim()) {
      setErrorMessage('Please enter a name for the material.');
      return;
    }

    // Enforce storage quota
    const remainingBytes = storageUsage?.remainingBytes ?? (500 * 1024 * 1024);
    if (selectedFile.size > remainingBytes) {
      const remainingMb = (remainingBytes / (1024 * 1024)).toFixed(1);
      const fileMb = (selectedFile.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Not enough cloud storage. You have ${remainingMb} MB remaining, but this file is ${fileMb} MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const res = await classroomResourceService.uploadTeacherMaterial({
        file: selectedFile,
        title: materialName.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        classroomId,
        bucketId,
        onProgress: (percent) => setUploadProgress(percent)
      });

      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Failed to upload material to cloud storage.');
        setIsUploading(false);
        return;
      }

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading file.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/20">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                Cloud Upload
              </span>
              <h3 className="text-lg font-black tracking-tight text-white mt-1">
                Upload from Device
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Save directly to your 500 MB cloud storage and make available across classes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Select PDF / Document <span className="text-rose-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
              id="device-material-file-picker"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                selectedFile
                  ? 'border-indigo-400 bg-indigo-50/40'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/60'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-extrabold text-slate-700">
                    Click to browse or drag and drop your PDF
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    PDF, DOC, DOCX, PPT (up to 50 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Duplicate Checking Indicator */}
          {isCheckingDuplicate && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Checking cloud library for existing files...</span>
            </div>
          )}

          {/* Duplicate Material Alert */}
          {matchingMaterial && (
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-amber-900">
                    This material is already in your cloud storage.
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                    Found matching file: <strong>{matchingMaterial.title}</strong> ({matchingMaterial.formattedSize}).
                    You can use the existing file without uploading again.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUseExisting}
                  disabled={isUploading}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Use Existing File (0 MB Added)</span>
                </button>
              </div>
            </div>
          )}

          {/* Material Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Material Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              disabled={isUploading}
              placeholder="e.g., Present Simple Grammar Guide"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#026fc3] focus:outline-hidden"
            />
          </div>

          {/* Category / Topic */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Category / Topic (Optional)
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isUploading}
              placeholder="e.g., Grammar, Reading, Unit 1, Vocabulary"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              placeholder="Add short notes or instructions for students..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Uploading to Cloudflare Storage...</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-indigo-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Quota Notice */}
          {storageUsage && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-slate-400" />
                <span>Remaining allocation:</span>
              </span>
              <strong className="text-slate-700">{storageUsage.remainingMb} MB of 500 MB</strong>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchToCloudBucket();
            }}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Explore Your Cloud Bucket</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isUploading || !selectedFile || !materialName.trim()}
              className="px-5 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload &amp; Assign</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
