import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSavedAccounts, removeSavedAccount, SavedAccount } from '@/utils/accountSwitcher';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, profile, isAdmin, openAuthModal, signOut } = useAuth();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSavedAccounts(getSavedAccounts());
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const currentEmail = user?.email?.toLowerCase().trim() || '';
  const currentDisplayName =
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    (user?.email ? user.email.split('@')[0] : 'Current User');
  const currentAvatarUrl =
    profile?.avatar_url ||
    profile?.avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;
  const currentInitials = (currentDisplayName || 'U').slice(0, 2).toUpperCase();

  const handleAddAccount = () => {
    onClose();
    // Open auth modal in login mode
    openAuthModal('login');
  };

  const handleSwitchToAccount = async (_targetEmail: string) => {
    onClose();
    // If switching to another account, prompt sign in with target email prefilled or open login
    await signOut();
    openAuthModal('login', { type: 'navigate', path: window.location.pathname });
  };

  const handleRemoveAccount = (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation();
    removeSavedAccount(accountId);
    setSavedAccounts(getSavedAccounts());
  };

  const otherAccounts = savedAccounts.filter(
    (acc) => acc.id !== user?.id && acc.email.toLowerCase() !== currentEmail
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900"
        data-light-surface="true"
        data-theme-mode="light"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center border border-sky-100 shadow-2xs">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Switch Account
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Manage accounts on this device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Active Account Section */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Active Account
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white border-2 border-emerald-500/30 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-2xs shrink-0 overflow-hidden">
                  {currentAvatarUrl ? (
                    <img
                      src={currentAvatarUrl}
                      alt={currentDisplayName}
                      className="w-full h-full rounded-full object-cover bg-amber-100"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center font-black text-xs text-slate-800">
                      {currentInitials}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-slate-900 truncate">
                      {currentDisplayName}
                    </span>
                    {isAdmin ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-md inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    ) : profile?.role === 'teacher' ? (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-black rounded-md border border-purple-200 inline-flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        Teacher
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Student
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate font-mono">
                    {user?.email}
                  </div>
                </div>
              </div>

              {/* Active Badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active</span>
              </div>
            </div>
          </div>

          {/* Other Saved Accounts */}
          {otherAccounts.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Other Accounts on this device
              </div>

              <div className="space-y-2">
                {otherAccounts.map((acc) => {
                  const accInitials = (acc.full_name || 'U').slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSwitchToAccount(acc.email)}
                      className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#026fc3]/50 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-slate-200 p-[1.5px] shadow-2xs shrink-0 overflow-hidden">
                          {acc.avatar_url ? (
                            <img
                              src={acc.avatar_url}
                              alt={acc.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                              {accInitials}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-800 group-hover:text-[#026fc3] transition-colors truncate">
                              {acc.full_name}
                            </span>
                            {acc.role === 'admin' ? (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[9px] font-black rounded">
                                Admin
                              </span>
                            ) : acc.role === 'teacher' ? (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 text-[9px] font-bold rounded border border-purple-200">
                                Teacher
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">
                                Student
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate font-mono">
                            {acc.email}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove from this device"
                          aria-label="Remove account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 group-hover:bg-[#026fc3] group-hover:text-white group-hover:border-[#026fc3] text-xs font-bold transition-all shadow-2xs">
                          <span>Switch</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Another Account Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddAccount}
              className="w-full flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-2xl border border-dashed border-slate-300 hover:border-[#026fc3] bg-slate-50 hover:bg-blue-50/50 text-[#026fc3] font-black text-xs sm:text-sm transition-all shadow-2xs cursor-pointer active:scale-98"
            >
              <UserPlus className="w-4 h-4 stroke-[2.4]" />
              <span>Add or switch to another account</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Only accounts used on this browser appear here.</span>
          <button
            onClick={onClose}
            className="font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
