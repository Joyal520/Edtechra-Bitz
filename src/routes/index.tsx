import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BitzLessonPage } from '@/pages/BitzLessonPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="bitz/:id" element={<BitzLessonPage />} />
      </Route>
    </Routes>
  );
};
