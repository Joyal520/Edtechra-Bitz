import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  User as UserIcon,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Save,
  Check,
  Type,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBitzTheme, BitzTextSize } from '@/context/BitzThemeContext';
import { DEFAULT_AVATARS, AvatarPreset, AVATAR_CATEGORY_TABS, AvatarCategory } from '@/utils/avatarConstants';
import { ImageSquareCropper } from '@/components/PostFeed/ImageSquareCropper';
import {
  OptimizationResult,
  validateImageFile
} from '@/utils/imageOptimizer';
import { postService } from '@/services/postService';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, isAdmin, updateUserProfile, session } = useAuth();
  const { isDark, setTheme, readingSettings, setTextSize } = useBitzTheme();

  const [displayName, setDisplayName] = useState<string>('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>('');
  const [avatarCategory, setAvatarCategory] = useState<AvatarCategory>('all');

  // Filtered preset avatars based on selected category tab
  const filteredPresets = useMemo<AvatarPreset[]>(() => {
    if (avatarCategory === 'all') return DEFAULT_AVATARS;
    return DEFAULT_AVATARS.filter((preset) => preset.group === avatarCategory || (avatarCategory === 'photo' && preset.category === 'photo'));
  }, [avatarCategory]);

  // Image Upload & Crop State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  // Form State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form from current profile
  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(profile.full_name || profile.name || user?.user_metadata?.full_name || '');
      setSelectedAvatarUrl(profile.avatar_url || profile.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '');
      setSaveSuccess(false);
      setErrorMessage(null);
      setCropFile(null);
    }
  }, [isOpen, profile, user]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving && !isUploadingPhoto) {
        if (cropFile) {
          setCropFile(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, cropFile, isSaving, isUploadingPhoto, onClose]);

  if (!isOpen) return null;

  const initials = (displayName.trim() || user?.email?.split('@')[0] || 'U').slice(0, 2).toUpperCase();

  const handleSelectPreset = (preset: AvatarPreset) => {
    setSelectedAvatarUrl(preset.url);
    setSaveSuccess(false);
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatarUrl('');
    setSaveSuccess(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      return;
    }

    setErrorMessage(null);
    setCropFile(file);
    // Reset file input value so same file can be re-selected if cancelled
    e.target.value = '';
  };

  const handleCropComplete = async (cropResult: OptimizationResult) => {
    setCropFile(null);
    setIsUploadingPhoto(true);
    setUploadPercent(10);
    setErrorMessage(null);

    try {
      const token = session?.access_token || null;

      // 1. Request presigned URL from backend
      const presignRes = await fetch('/api/profile/presign-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          contentType: cropResult.format === 'png' ? 'image/png' : 'image/webp',
          size: cropResult.blob.size
        })
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initialize avatar upload.');
      }

      const { data: presignedData } = await presignRes.json();
      setUploadPercent(40);

      // 2. Direct upload to R2
      await postService.uploadBlobToR2(
        presignedData.uploadUrl,
        presignedData.signedHeaders || { 'Content-Type': presignedData.contentType },
        cropResult.blob,
        (percent) => {
          setUploadPercent(40 + Math.round(percent * 0.5));
        }
      );

      setUploadPercent(100);
      setSelectedAvatarUrl(presignedData.publicUrl);
    } catch (err: any) {
      console.error('[UserSettingsModal] Avatar upload error:', err);
      setErrorMessage(err.message || 'Failed to upload avatar. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadPercent(0);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isUploadingPhoto) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter your full name or nickname.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await updateUserProfile({
        full_name: trimmedName,
        avatar_url: selectedAvatarUrl || null,
        text_size: readingSettings.textSize
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      }
    } catch (err: any) {
      console.error('[UserSettingsModal] Save profile exception:', err);
      setErrorMessage(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white border border-stone-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header Strip */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-[#026fc3] flex items-center justify-center font-bold">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-black text-[#0f233a]">
                Profile & Settings
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Personalize your EdTechra learning experience
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Crop Overlay if photo is being cropped */}
          {cropFile && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <ImageSquareCropper
                imageFile={cropFile}
                onCropComplete={handleCropComplete}
                onCancel={() => setCropFile(null)}
                isProcessing={isUploadingPhoto}
              />
            </div>
          )}

          {!cropFile && (
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Status & Error Alerts */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Preferences saved successfully!</span>
                </div>
              )}

              {/* 1. PROFILE & AVATAR CUSTOMIZATION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Profile Avatar
                  </label>
                  {selectedAvatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Current Avatar Preview */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2.5px] shadow-sm shrink-0">
                    <div className="w-full h-full rounded-[22px] bg-amber-100 flex items-center justify-center font-black text-2xl overflow-hidden">
                      {selectedAvatarUrl ? (
                        <img
                          src={selectedAvatarUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-slate-800 text-lg font-black">{initials}</span>
                      )}
                    </div>
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center text-white text-[10px] font-bold">
                        <Loader2 className="w-4 h-4 animate-spin mb-1" />
                        <span>{uploadPercent}%</span>
                      </div>
                    )}
                  </div>

                  {/* Photo Upload & Preset Actions */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto || isSaving}
                        className="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-[#026fc3] border border-brand-200 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Upload a square image (JPG, PNG, WebP up to 15MB) or choose a preset below.
                    </p>
                  </div>
                </div>

                {/* Preset Avatars Grid with Category Tabs */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-slate-700">
                      Choose ready-made avatar ({DEFAULT_AVATARS.length} available):
                    </span>
                  </div>

                  {/* Category Filter Pills (Scrollable on small mobile) */}
                  <div className="flex items-center gap-1 overflow-x-auto p-1 bg-stone-100/90 rounded-2xl border border-stone-200/60 no-scrollbar">
                    {AVATAR_CATEGORY_TABS.map((tab) => {
                      const count = tab.id === 'all'
                        ? DEFAULT_AVATARS.length
                        : DEFAULT_AVATARS.filter((a) => a.group === tab.id || (tab.id === 'photo' && a.category === 'photo')).length;
                      const isActive = avatarCategory === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAvatarCategory(tab.id)}
                          className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                            isActive
                              ? 'bg-white text-[#026fc3] shadow-2xs font-black'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-200/60'
                          }`}
                        >
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                          <span className={`text-[10px] ml-0.5 px-1.5 py-0.2 rounded-full ${isActive ? 'bg-brand-50 text-[#026fc3]' : 'bg-slate-200/70 text-slate-500'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Filtered Responsive Avatars Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 sm:gap-2.5 max-h-56 sm:max-h-64 overflow-y-auto p-2 bg-stone-50/70 rounded-2xl border border-stone-200/80">
                    {filteredPresets.map((preset) => {
                      const isSelected = selectedAvatarUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer hover:scale-105 active:scale-95 bg-white ${
                            isSelected
                              ? 'border-[#026fc3] ring-3 ring-[#026fc3]/25 shadow-sm scale-105 z-10'
                              : 'border-stone-200/80 hover:border-[#026fc3]/60'
                          }`}
                          title={`${preset.label} (${preset.group})`}
                          aria-label={`Select ${preset.label} avatar`}
                          aria-pressed={isSelected}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover rounded-xl bg-amber-50/50"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#026fc3]/20 flex items-center justify-center backdrop-blur-[0.5px]">
                              <div className="w-5 h-5 rounded-full bg-[#026fc3] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Name Input */}
                <div className="space-y-1.5 pt-2">
                  <label htmlFor="display-name" className="text-xs font-bold text-slate-700">
                    Display Name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    placeholder="Enter your name or nickname"
                    className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#026fc3] focus:border-transparent transition-all"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>This name appears on the leaderboard and discussions.</span>
                    <span>{displayName.length}/50</span>
                  </div>
                </div>
              </div>

              {/* 2. LEARNING CONTENT TEXT SIZE */}
              <div className="space-y-3.5 pt-4 border-t border-stone-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-[#026fc3]" />
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Learning Content Text Size
                    </label>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Customizes the font size of learning content.
                  </p>
                </div>

                {/* 3 Size Options: Small (A-), Medium (A), Large (A+) */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'small', label: 'Small', sub: 'A−', size: '12px' },
                    { id: 'medium', label: 'Medium', sub: 'A', size: '14px' },
                    { id: 'large', label: 'Large', sub: 'A+', size: '16px' }
                  ].map((option) => {
                    const isSelected = readingSettings.textSize === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setTextSize(option.id as BitzTextSize);
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'border-[#026fc3] bg-blue-50/80 text-[#026fc3] font-black shadow-2xs ring-2 ring-[#026fc3]/25'
                            : 'border-slate-200 bg-stone-50/50 hover:bg-stone-100/70 text-slate-700 font-bold'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="text-xs flex items-center gap-1">
                          <span>{option.label}</span>
                          <span className="text-[11px] font-black opacity-75">({option.sub})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{option.size}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 rounded-2xl bg-stone-100/80 border border-stone-200/80 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Live Preview
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-stone-200/80 shadow-2xs space-y-1">
                    <p className="font-bold text-slate-900 leading-snug learning-content-text text-[length:var(--learning-text-size,14px)]">
                      🎯 &ldquo;Which sentence uses the correct past tense?&rdquo;
                    </p>
                    <p className="text-slate-600 leading-relaxed learning-content-text text-[length:var(--learning-text-size,14px)]">
                      📖 &ldquo;The early morning light illuminated the tranquil mountain path.&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. THEME */}
              <div className="space-y-3.5 pt-4 border-t border-stone-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {isDark ? <Moon className="w-4 h-4 text-[#026fc3]" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Theme
                    </label>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Choose your preferred EdTechra appearance.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isDark
                        ? 'border-[#026fc3] bg-blue-50/80 text-[#026fc3] font-black shadow-2xs ring-2 ring-[#026fc3]/25'
                        : 'border-slate-200 bg-stone-50/50 hover:bg-stone-100/70 text-slate-700 font-bold'
                    }`}
                    aria-pressed={isDark}
                  >
                    <Moon className="w-4 h-4 text-sky-500" />
                    <span className="text-xs">Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      !isDark
                        ? 'border-[#026fc3] bg-blue-50/80 text-[#026fc3] font-black shadow-2xs ring-2 ring-[#026fc3]/25'
                        : 'border-slate-200 bg-stone-50/50 hover:bg-stone-100/70 text-slate-700 font-bold'
                    }`}
                    aria-pressed={!isDark}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs">Light</span>
                  </button>
                </div>
              </div>

              {/* 4. ACCOUNT INFORMATION */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-700">Account Email</div>
                  <div className="font-mono text-slate-500 text-[11px]">{user?.email}</div>
                </div>
                {isAdmin ? (
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-black rounded-lg border border-purple-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </span>
                ) : profile?.role === 'teacher' ? (
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[11px] font-black rounded-lg border border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Teacher
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-[11px] font-extrabold rounded-lg border border-brand-200 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                    Student
                  </span>
                )}
              </div>

              {/* 5. ACTION BUTTONS */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || isUploadingPhoto}
                  className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
