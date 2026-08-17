import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, isLoading, openAuthModal } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#026fc3]/30 border-t-[#026fc3] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500">Verifying administrative credentials...</p>
      </div>
    );
  }

  // If not authenticated or not an admin, render strictly guarded Access Denied screen
  if (!user || !isAdmin) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
        <div className="bg-white border border-rose-200 rounded-3xl p-8 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-black rounded-full uppercase tracking-wider">
              Access Denied (403)
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Administrator Privileges Required
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              This area is strictly restricted to authorized EdTechra-Bitz administrators. Your account does not have administrative access.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return Home</span>
            </Link>

            {!user ? (
              <button
                onClick={() => openAuthModal('login')}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <span>Go to Student Dashboard</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
