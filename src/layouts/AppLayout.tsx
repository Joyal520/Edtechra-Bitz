import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  LayoutGrid,
  Search,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Download
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallAppModal } from '@/components/InstallAppModal';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { getFirstName } from '@/utils/greeting';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  const { user, profile, isAdmin, isLoading, signOut, requireAuth } = useAuth();

  const {
    canInstall,
    hasNativePrompt,
    isIOS,
    iosModalOpen,
    setIosModalOpen,
    triggerInstall
  } = usePWAInstall();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle client-side navigation events from authentication callbacks
  useEffect(() => {
    const handleNavEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        navigate(customEvent.detail);
      }
    };
    window.addEventListener('edtechra:navigate', handleNavEvent);
    return () => {
      window.removeEventListener('edtechra:navigate', handleNavEvent);
    };
  }, [navigate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    navigate('/');
  };

  // Intercept navigation for guests contextually using centralized requireAuth
  const handleProtectedNav = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    requireAuth({ type: 'navigate', path });
  };

  const displayName = profile?.full_name?.trim() || profile?.name?.trim() || user?.user_metadata?.full_name?.trim() || user?.user_metadata?.name?.trim() || (user?.email ? user.email.split('@')[0] : 'User');
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = (displayName || 'U').slice(0, 2).toUpperCase();

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-[#026fc3] selection:text-white ${isHomePage ? 'h-[100dvh] overflow-hidden bg-[#020813]' : 'bg-[#fbfbf7] text-slate-900'}`}>
      
      {/* ========================================================================= */}
      {/* FLOATING NAVIGATION HEADER                                                */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 pt-2 sm:pt-3 px-3 sm:px-6 shrink-0">
        <div className={`max-w-5xl mx-auto rounded-2xl sm:rounded-full px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between transition-all ${
          isHomePage
            ? 'bg-[#031528]/85 backdrop-blur-md border border-sky-400/70 shadow-[0_0_25px_rgba(56,189,248,0.35)] text-white'
            : 'bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-xs text-slate-900'
        }`}>
          
          {/* Mobile Left: Hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 -ml-1 rounded-xl transition-colors ${isHomePage ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Official Logo Section */}
          <Link
            to="/"
            className="flex items-center gap-2 md:gap-2.5 group transition-transform active:scale-95"
          >
            <img
              src="/logo.png"
              alt="EdTechra Bitz"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5">
              <span className={`text-base sm:text-lg font-black tracking-tight ${isHomePage ? 'text-white' : 'text-[#0f233a]'}`}>
                EdTechra
              </span>
              {!isHomePage && (
                <span className="bg-[#026fc3] text-white text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg shadow-2xs tracking-wide uppercase">
                  Bitz
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Center Navigation (Home | Explore | Dashboard) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isHomePage
                  ? 'flex items-center gap-1.5 text-xs sm:text-sm font-bold px-4 sm:px-5 py-1.5 rounded-full bg-blue-600/30 border border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.45)] transition-all'
                  : `flex items-center gap-1.5 text-xs sm:text-sm font-extrabold transition-all py-1 relative ${
                      isActive
                        ? 'text-[#026fc3] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
                        : 'text-slate-500 hover:text-slate-900'
                    }`
              }
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </NavLink>

            <NavLink
              to="/explore"
              onClick={(e) => handleProtectedNav('/explore', e)}
              className={({ isActive }) =>
                isHomePage
                  ? 'flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white/90 hover:text-white transition-all py-1'
                  : `flex items-center gap-1.5 text-xs sm:text-sm font-extrabold transition-all py-1 relative ${
                      isActive
                        ? 'text-[#026fc3] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
                        : 'text-slate-500 hover:text-slate-900'
                    }`
              }
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </NavLink>

            <NavLink
              to="/dashboard"
              onClick={(e) => handleProtectedNav('/dashboard', e)}
              className={({ isActive }) =>
                isHomePage
                  ? 'flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white/90 hover:text-white transition-all py-1'
                  : `flex items-center gap-1.5 text-xs sm:text-sm font-extrabold transition-all py-1 relative ${
                      isActive
                        ? 'text-[#026fc3] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
                        : 'text-slate-500 hover:text-slate-900'
                    }`
              }
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            {/* Admin Link — Only visible when authenticated as Admin */}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 text-xs sm:text-sm font-extrabold transition-all py-1 px-2.5 rounded-full relative ${
                    isActive
                      ? 'bg-purple-100 text-purple-800'
                      : 'text-purple-700 bg-purple-50 hover:bg-purple-100/80 border border-purple-200'
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Install App Button (Visible on both Desktop and Mobile Header) */}
            {canInstall && (
              <button
                onClick={triggerInstall}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95 group ${
                  isHomePage
                    ? 'bg-sky-500/25 hover:bg-sky-500/40 text-white border border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                    : 'bg-brand-50 hover:bg-brand-100 text-[#026fc3] border border-brand-200 hover:border-brand-300'
                }`}
                title="Install EdTechra-Bitz application"
                aria-label="Install App"
              >
                <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform stroke-[2.5]" />
                <span>Install</span>
              </button>
            )}

            {/* Search Button (Hidden on Homepage) */}
            {!isHomePage && (
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Authenticated User Menu (If logged in) */}
            {!isLoading && user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-1.5 sm:gap-2 p-1 pr-2.5 rounded-full transition-all border shadow-2xs group cursor-pointer ${
                    isHomePage
                      ? 'border-sky-400/40 bg-white/10 text-white hover:bg-white/20'
                      : 'border-stone-200/80 bg-white text-[#0f233a] hover:bg-slate-100/90'
                  }`}
                  aria-label="User Profile Menu"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] shadow-2xs shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover bg-amber-100"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center font-black text-xs text-slate-800">
                        {initials}
                      </div>
                    )}
                  </div>
                  <span className="font-extrabold text-xs max-w-[85px] sm:max-w-[120px] truncate hidden sm:inline-block">
                    {getFirstName(displayName)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70 transition-transform" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-stone-100">
                      <div className="font-extrabold text-xs text-[#0f233a] truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-mono">
                        {user.email}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#026fc3] transition-colors"
                      >
                        <LayoutGrid className="w-4 h-4 text-slate-400" />
                        <span>Dashboard</span>
                      </Link>

                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#026fc3] transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>Profile</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      {canInstall && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            triggerInstall();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#026fc3] hover:bg-brand-50 transition-colors text-left cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-[#026fc3]" />
                          <span>Install App</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-stone-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Expandable Quick Search Bar (Hidden on Homepage) */}
        {!isHomePage && searchOpen && (
          <div className="max-w-xl mx-auto mt-2 px-2 animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, vocabulary, or Shorts..."
                className="w-full pl-10 pr-20 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#026fc3] text-white rounded-full text-[11px] font-bold"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-slate-900/60 backdrop-blur-xs flex flex-col justify-start p-4 pt-20 animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="EdTechra"
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="font-black text-[#0f233a] text-sm">Navigation</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile User Profile (If logged in) */}
            {user && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-slate-800 font-bold text-xs flex items-center justify-center">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">{displayName}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">{user.email}</div>
                  </div>
                </div>
                {isAdmin ? (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-md">
                    Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                    Student
                  </span>
                )}
              </div>
            )}

            <nav className="flex flex-col gap-2">
              {/* Mobile Install App Button */}
              {canInstall && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    triggerInstall();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-brand-50 to-blue-50/70 border border-brand-200 text-[#026fc3] transition-all active:scale-98 cursor-pointer shadow-2xs mb-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[#026fc3] text-white flex items-center justify-center">
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span>Install EdTechra-Bitz App</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-[#026fc3] text-white px-2 py-0.5 rounded-md">
                    {isIOS ? 'iOS' : 'PWA'}
                  </span>
                </button>
              )}

              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive ? 'bg-brand-50 text-[#026fc3]' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </NavLink>

              <NavLink
                to="/explore"
                onClick={(e) => handleProtectedNav('/explore', e)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive ? 'bg-brand-50 text-[#026fc3]' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <Compass className="w-4 h-4" />
                <span>Explore Shorts</span>
              </NavLink>

              <NavLink
                to="/dashboard"
                onClick={(e) => handleProtectedNav('/dashboard', e)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive ? 'bg-brand-50 text-[#026fc3]' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Dashboard & Stats</span>
              </NavLink>

              {/* Admin Link for Mobile */}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                      isActive ? 'bg-purple-100 text-purple-800' : 'text-purple-700 bg-purple-50/80 hover:bg-purple-100'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Panel</span>
                </NavLink>
              )}

              {/* Sign Out on mobile if logged in */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold mt-2 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </nav>

          </div>
        </div>
      )}

      {/* Main Page Body */}
      <main className={`flex-1 w-full relative ${isHomePage ? 'h-full overflow-hidden flex flex-col' : ''}`}>
        <Outlet />
      </main>

      {/* Footer (Rendered on all non-homepage routes) */}
      {!isHomePage && (
        <footer className="w-full border-t border-stone-200/70 bg-white/70 backdrop-blur-xs py-8 px-4 sm:px-6 mt-auto text-center space-y-3 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/logo.png"
              alt="EdTechra Official Logo"
              className="w-6 h-6 rounded-full object-cover shadow-2xs"
            />
            <span className="font-extrabold text-xs text-[#0f233a]">
              EdTechra
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-semibold text-slate-500">
              Learn. Discover. Grow.
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Transforming short-form educational content into interactive microlearning. Under parent brand <strong className="text-slate-600">EdTechra</strong>.
          </p>
        </footer>
      )}

      {/* iOS / PWA Installation Modal */}
      <InstallAppModal
        isOpen={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
        isIOS={isIOS}
        hasNativePrompt={hasNativePrompt}
        onNativeInstall={triggerInstall}
      />

      {/* Global Authentication Modal */}
      <AuthModal />
    </div>
  );
};
