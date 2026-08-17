import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BitzLessonPage } from '@/pages/BitzLessonPage';
import { AdminPage } from '@/pages/AdminPage';
import { AuthPage } from '@/pages/AuthPage';
import { AdminRoute } from '@/routes/AdminRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="bitz/:id" element={<BitzLessonPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="login" element={<AuthPage />} />
        <Route path="signup" element={<AuthPage />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
