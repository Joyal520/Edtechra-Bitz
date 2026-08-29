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
import { ClassesPage } from '@/pages/classes/ClassesPage';
import { ClassroomDetailPage } from '@/pages/classes/ClassroomDetailPage';
import { JoinClassroomPage } from '@/pages/classes/JoinClassroomPage';
import { CreateClassroomPage } from '@/pages/classes/CreateClassroomPage';
import { TeacherResourcesPage } from '@/pages/classes/TeacherResourcesPage';
import { LiveQuizLobbyPage } from '@/pages/classes/live-quiz/LiveQuizLobbyPage';
import { LiveQuizHostPage } from '@/pages/classes/live-quiz/LiveQuizHostPage';
import { LiveQuizPlayPage } from '@/pages/classes/live-quiz/LiveQuizPlayPage';
import { LiveQuizJoinPage } from '@/pages/classes/live-quiz/LiveQuizJoinPage';
import { CourseStudioDashboardPage } from '@/pages/course-studio/CourseStudioDashboardPage';
import { CourseEditorPage } from '@/pages/course-studio/CourseEditorPage';
import { CoursePreviewPage } from '@/pages/course-studio/CoursePreviewPage';
import { CourseAnalyticsPage } from '@/pages/course-studio/CourseAnalyticsPage';
import { StudentCoursePlayerPage } from '@/pages/classes/courses/StudentCoursePlayerPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/create" element={<CreateClassroomPage />} />
        <Route path="classes/join" element={<JoinClassroomPage />} />
        <Route path="classes/join/:code" element={<JoinClassroomPage />} />
        <Route path="classes/:id" element={<ClassroomDetailPage />} />
        <Route path="classes/:id/resources" element={<TeacherResourcesPage />} />
        
        {/* Live Quiz Routes */}
        <Route path="classes/live-quiz/join" element={<LiveQuizJoinPage />} />
        <Route path="classes/live-quiz/join/:pin" element={<LiveQuizJoinPage />} />
        <Route path="classes/:classroomId/live-quiz/lobby/:pin" element={<LiveQuizLobbyPage />} />
        <Route path="classes/:classroomId/live-quiz/host/:sessionId" element={<LiveQuizHostPage />} />
        <Route path="classes/:classroomId/live-quiz/play/:sessionId" element={<LiveQuizPlayPage />} />

        {/* Course Studio (Teacher-Level Studio) Routes */}
        <Route path="course-studio" element={<CourseStudioDashboardPage />} />
        <Route path="course-studio/:courseId" element={<CourseEditorPage />} />
        <Route path="course-studio/:courseId/preview" element={<CoursePreviewPage />} />
        <Route path="course-studio/:courseId/analytics" element={<CourseAnalyticsPage />} />

        {/* Student Classroom Course Player */}
        <Route path="classes/:classroomId/courses/:courseId" element={<StudentCoursePlayerPage />} />
        <Route path="classes/:classroomId/courses/:courseId/learn" element={<StudentCoursePlayerPage />} />

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
