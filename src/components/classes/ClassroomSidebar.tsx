import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  Calendar,
  Mail,
  CheckSquare,
  Settings,
  ChevronDown,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SidebarIllustration } from './ClassroomIllustrations';

interface ClassroomSidebarProps {
  onOpenSettings?: () => void;
  onOpenReports?: () => void;
  onSelectMessagesTab?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ClassroomSidebar: React.FC<ClassroomSidebarProps> = ({
  onOpenSettings,
  onOpenReports,
  onSelectMessagesTab,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default to Mr. Joy if not set, or authenticated teacher's name
  const teacherName =
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    'Mr. Joy';

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const initials = teacherName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'MJ';

  // Handle outside click to close user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 sm:p-5 text-slate-300">
      {/* Top Branding & Main Navigation */}
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Colorful Open Book Logo Icon */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-sky-400 p-[1.5px] shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#131b2e] rounded-[10px] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#38bdf8" strokeWidth="2" />
                  <path d="M9 6h7M9 10h5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <span className="text-lg font-black text-white tracking-tight">EdTechra</span>
          </Link>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items List */}
        <nav className="space-y-1.5 pt-2">
          {/* Digital Classroom (Active item) */}
          <Link
            to="/classes"
            onClick={onCloseMobile}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-extrabold text-xs text-white bg-gradient-to-r from-[#6366f1] to-[#7c3aed] shadow-md shadow-indigo-900/40 transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Home className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Digital Classroom</span>
          </Link>

          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all ${
                isActive
                  ? 'bg-white/10 text-white font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4 ml-1" />
            <span>Dashboard</span>
          </NavLink>

          {/* Calendar */}
          <button
            type="button"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              alert('Upcoming class schedules and assignment due dates calendar.');
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <Calendar className="w-4 h-4 ml-1" />
            <span>Calendar</span>
          </button>

          {/* Messages with Red Badge 3 */}
          <button
            type="button"
            onClick={() => {
              if (onSelectMessagesTab) onSelectMessagesTab();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 ml-1" />
              <span>Messages</span>
            </div>
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
              3
            </span>
          </button>

          {/* Reports */}
          <button
            type="button"
            onClick={() => {
              if (onOpenReports) onOpenReports();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 ml-1" />
            <span>Reports</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer"
          >
            <Settings className="w-4 h-4 ml-1" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Middle/Lower Workstation Illustration & Profile Card */}
      <div className="space-y-4 pt-4">
        {/* Workstation Graphic */}
        <div className="hidden lg:flex justify-center opacity-80 hover:opacity-100 transition-opacity">
          <SidebarIllustration className="w-full max-w-[170px]" />
        </div>

        {/* Teacher Profile Card */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-900 font-black text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={teacherName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-black text-xs text-white truncate">{teacherName}</div>
                <div className="text-[10px] text-slate-400 font-semibold">Teacher</div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Profile Dropdown */}
          {userDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1e293b] text-white rounded-2xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-700 text-xs font-bold text-slate-300">
                Teacher Account
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(false);
                  if (onOpenSettings) onOpenSettings();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white text-left cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden md:block w-56 lg:w-60 bg-[#111827] border-r border-slate-800 shrink-0 select-none">
        <div className="sticky top-0 h-screen overflow-y-auto custom-scrollbar">
          {navContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-xs flex animate-in fade-in duration-150">
          <div className="w-64 max-w-[80vw] bg-[#111827] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
