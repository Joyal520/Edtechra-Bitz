import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  LayoutGrid,
  Search,
  Menu,
  X,
  Sparkles,
  Download,
  CheckCircle2,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallAppModal } from '@/components/InstallAppModal';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/context/AuthContext';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { user, profile, isAdmin, isLoading, signOut, openAuthModal } = useAuth();

  const {
    canInstall,
    isInstalled,
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

  const displayName = profile?.full_name || profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = (displayName || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf7] text-slate-900 selection:bg-[#026fc3] selection:text-white font-sans">
      {/* Top Header Container */}
      <header className="sticky top-0 z-50 pt-2 sm:pt-3 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-full border border-stone-200/80 shadow-xs px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between transition-all">
          
          {/* Mobile Left: Hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
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
              alt="EdTechra-Bitz Official Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-2xs ring-1 ring-[#026fc3]/20 group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-[#0f233a]">
                EdTechra
              </span>
              <span className="bg-[#026fc3] text-white text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg shadow-2xs tracking-wide uppercase">
                Bitz
              </span>
            </div>
          </Link>

          {/* Desktop Center Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-xs sm:text-sm font-extrabold transition-all py-1 relative ${
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
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-xs sm:text-sm font-extrabold transition-all py-1 relative ${
                  isActive
                    ? 'text-[#026fc3] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
                    : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </NavLink>

            {/* Dashboard (Visible to all, prompts login if clicked unauthenticated) */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-xs sm:text-sm font-extrabold transition-all py-1 relative ${
                  isActive
                    ? 'text-[#026fc3] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
                    : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            {/* Admin Navigation Item — Only visible when authenticated as Administrator */}
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
            
            {/* Install App Quick Action (Desktop) */}
            {!isInstalled && (
              <button
                onClick={triggerInstall}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#026fc3] bg-brand-50 hover:bg-brand-100/80 border border-brand-200/80 transition-all shadow-2xs group"
                title="Install EdTechra-Bitz as App"
              >
                <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                <span>Install App</span>
              </button>
            )}

            {isInstalled && (
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Installed</span>
              </span>
            )}

            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Auth Controls */}
            {isLoading ? (
              <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse"></div>
            ) : user ? (
              /* Authenticated User Dropdown Menu */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#026fc3]/40 transition-all"
                  aria-label="User Profile Menu"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-2xs shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover bg-amber-100"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800">
                        {initials}
                      </div>
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 border-b border-stone-100">
                      <div className="font-extrabold text-xs text-[#0f233a] truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-mono">
                        {user.email}
                      </div>
                      <div className="mt-1.5">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-md">
                            <ShieldCheck className="w-3 h-3" />
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">
                            Student
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#026fc3] transition-colors"
                      >
                        <LayoutGrid className="w-4 h-4 text-slate-400" />
                        <span>Student Dashboard</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Admin Control Center</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-stone-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Unauthenticated Visitors: Log In / Sign Up Buttons */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3 sm:px-4 py-1.5 text-xs font-extrabold text-slate-700 hover:text-[#026fc3] hover:bg-slate-100 rounded-full transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3.5 sm:px-4 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-extrabold rounded-full shadow-2xs hover:shadow-xs transition-all active:scale-95"
                >
                  Sign Up
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Expandable Quick Search Bar */}
        {searchOpen && (
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
        <div className="fixed inset-0 z-40 md:hidden bg-slate-900/40 backdrop-blur-xs flex flex-col justify-start p-4 pt-20 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="EdTechra-Bitz"
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

            {/* Mobile User Profile Section */}
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
                onClick={() => setMobileMenuOpen(false)}
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
                onClick={() => setMobileMenuOpen(false)}
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
                  <span>Admin Control Center</span>
                </NavLink>
              )}

              {/* Mobile Auth Actions */}
              {!user ? (
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold rounded-xl"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('signup');
                    }}
                    className="w-full py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-extrabold rounded-xl shadow-xs"
                  >
                    Sign Up
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold mt-2 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}

              {/* Install App in mobile menu */}
              {!isInstalled && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    triggerInstall();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#026fc3] to-[#03589e] text-white text-xs font-extrabold shadow-xs mt-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4" />
                    <span>Install EdTechra-Bitz App</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </button>
              )}
            </nav>

          </div>
        </div>
      )}

      {/* Main Page Body */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200/70 bg-white/70 backdrop-blur-xs py-8 px-4 sm:px-6 mt-auto text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <img
            src="/logo.png"
            alt="EdTechra-Bitz Official Logo"
            className="w-6 h-6 rounded-full object-cover shadow-2xs"
          />
          <span className="font-extrabold text-xs text-[#0f233a]">
            EdTechra-Bitz
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

      {/* iOS / PWA Installation Modal */}
      <InstallAppModal
        isOpen={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
        isIOS={isIOS}
        hasNativePrompt={canInstall && !isIOS}
        onNativeInstall={triggerInstall}
      />

      {/* Global Authentication Modal */}
      <AuthModal />
    </div>
  );
};
