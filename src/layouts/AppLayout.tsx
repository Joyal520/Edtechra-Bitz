import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  LayoutGrid,
  Search,
  Bell,
  Menu,
  X,
  Sparkles,
  Download,
  CheckCircle2
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallAppModal } from '@/components/InstallAppModal';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const {
    canInstall,
    isInstalled,
    isIOS,
    iosModalOpen,
    setIosModalOpen,
    triggerInstall
  } = usePWAInstall();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

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
          <nav className="hidden md:flex items-center gap-8">
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

            {/* Notification Bell */}
            <button
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#026fc3] ring-2 ring-white"></span>
            </button>

            {/* User Avatar */}
            <Link
              to="/dashboard"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-2xs hover:scale-105 transition-transform shrink-0"
              aria-label="User Profile"
            >
              <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center font-bold text-sm text-slate-800">
                👦
              </div>
            </Link>
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
    </div>
  );
};
