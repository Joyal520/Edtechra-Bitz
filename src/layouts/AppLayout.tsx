import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Home,
  Compass,
  LayoutGrid,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbf7] text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Top Header Container */}
      <header className="sticky top-0 z-50 pt-2 sm:pt-3 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-full border border-slate-100 shadow-sm px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between transition-all">
          
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

          {/* Logo Section */}
          <Link
            to="/"
            className="flex items-center gap-1.5 md:gap-2 group transition-transform active:scale-95"
          >
            <span className="text-base sm:text-lg font-black tracking-tight text-[#0f233a]">
              EdTechra
            </span>
            <span className="bg-[#026fc3] text-white text-[11px] sm:text-xs font-extrabold px-2 py-0.5 rounded-lg shadow-xs tracking-wide">
              Bitz
            </span>
          </Link>

          {/* Desktop Center Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-sm font-bold transition-all py-1 relative ${
                  isActive
                    ? 'text-[#0f233a] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
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
                `flex items-center gap-1.5 text-sm font-bold transition-all py-1 relative ${
                  isActive
                    ? 'text-[#0f233a] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
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
                `flex items-center gap-1.5 text-sm font-bold transition-all py-1 relative ${
                  isActive
                    ? 'text-[#0f233a] after:absolute after:-bottom-2.5 after:left-0 after:right-0 after:h-0.5 after:bg-[#026fc3] after:rounded-full'
                    : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>
          </nav>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Icon / Toggle */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                title="Search"
              >
                <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        window.location.href = `/explore?search=${encodeURIComponent(searchQuery)}`;
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Bitz topics..."
                      autoFocus
                      className="w-full text-xs font-semibold focus:outline-none text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setSearchOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Notification Bell with Red Dot */}
            <div className="relative">
              <button
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              </button>
            </div>

            {/* Avatar with Green Outline Ring */}
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 group cursor-pointer"
              title="Alex - Profile & Dashboard"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-xs group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center text-[#0f233a] font-black text-xs overflow-hidden">
                  <span className="text-[11px] font-extrabold text-emerald-800">👦</span>
                </div>
              </div>
              <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Mobile Slide-down Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 bg-white/95 backdrop-blur-lg rounded-2xl border border-slate-100 shadow-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-3 duration-200">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-[#026fc3]/10 text-[#026fc3]' : 'text-slate-700 hover:bg-slate-50'
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
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-[#026fc3]/10 text-[#026fc3]' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <Compass className="w-4 h-4" />
              <span>Explore All Bitz</span>
            </NavLink>

            <NavLink
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-[#026fc3]/10 text-[#026fc3]' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <LayoutGrid className="w-4 h-4" />
              <span>My Dashboard & XP</span>
            </NavLink>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-3">
              <span className="flex items-center gap-1 font-bold text-amber-600">
                <Sparkles className="w-3.5 h-3.5" /> 120 XP Earned
              </span>
              <span className="font-semibold text-emerald-600">Level 2 Explorer</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};
