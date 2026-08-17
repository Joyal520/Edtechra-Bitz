import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const mode = (searchParams.get('mode') as 'login' | 'signup' | 'forgot_password') || 'login';

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      openAuthModal(mode);
    }
  }, [user, mode, openAuthModal, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#026fc3]/30 border-t-[#026fc3] rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-bold text-slate-500">Redirecting to EdTechra-Bitz Authentication...</p>
      </div>
    </div>
  );
};
