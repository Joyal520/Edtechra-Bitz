import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { AuthPage } from '@/pages/AuthPage';
import { AdminRoute } from '@/routes/AdminRoute';
import { CoursePlayerSkeleton } from '@/components/course-studio/CoursePlayerSkeleton';

// Lazy-loaded feature bundles for fast initial page load & code splitting
const ExplorePage = lazy(() => import('@/pages/ExplorePage').then(m => ({ default: m.ExplorePage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const BitzLessonPage = lazy(() => import('@/pages/BitzLessonPage').then(m => ({ default: m.BitzLessonPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ClassesPage = lazy(() => import('@/pages/classes/ClassesPage').then(m => ({ default: m.ClassesPage })));
const ClassroomDetailPage = lazy(() => import('@/pages/classes/ClassroomDetailPage').then(m => ({ default: m.ClassroomDetailPage })));
const JoinClassroomPage = lazy(() => import('@/pages/classes/JoinClassroomPage').then(m => ({ default: m.JoinClassroomPage })));
const CreateClassroomPage = lazy(() => import('@/pages/classes/CreateClassroomPage').then(m => ({ default: m.CreateClassroomPage })));
const TeacherResourcesPage = lazy(() => import('@/pages/classes/TeacherResourcesPage').then(m => ({ default: m.TeacherResourcesPage })));
const LiveQuizLobbyPage = lazy(() => import('@/pages/classes/live-quiz/LiveQuizLobbyPage').then(m => ({ default: m.LiveQuizLobbyPage })));
const LiveQuizHostPage = lazy(() => import('@/pages/classes/live-quiz/LiveQuizHostPage').then(m => ({ default: m.LiveQuizHostPage })));
const LiveQuizPlayPage = lazy(() => import('@/pages/classes/live-quiz/LiveQuizPlayPage').then(m => ({ default: m.LiveQuizPlayPage })));
const LiveQuizJoinPage = lazy(() => import('@/pages/classes/live-quiz/LiveQuizJoinPage').then(m => ({ default: m.LiveQuizJoinPage })));
const CourseStudioDashboardPage = lazy(() => import('@/pages/course-studio/CourseStudioDashboardPage').then(m => ({ default: m.CourseStudioDashboardPage })));
const CourseEditorPage = lazy(() => import('@/pages/course-studio/CourseEditorPage').then(m => ({ default: m.CourseEditorPage })));
const CoursePreviewPage = lazy(() => import('@/pages/course-studio/CoursePreviewPage').then(m => ({ default: m.CoursePreviewPage })));
const CourseAnalyticsPage = lazy(() => import('@/pages/course-studio/CourseAnalyticsPage').then(m => ({ default: m.CourseAnalyticsPage })));
const StudentCoursePlayerPage = lazy(() => import('@/pages/classes/courses/StudentCoursePlayerPage').then(m => ({ default: m.StudentCoursePlayerPage })));
const AssessmentBuilderPage = lazy(() => import('@/pages/classes/AssessmentBuilderPage').then(m => ({ default: m.AssessmentBuilderPage })));
const StudentExamPage = lazy(() => import('@/pages/classes/StudentExamPage').then(m => ({ default: m.StudentExamPage })));
const LibraryPage = lazy(() => import('@/pages/library/LibraryPage').then(m => ({ default: m.LibraryPage })));
const PresentationViewerPage = lazy(() => import('@/pages/library/PresentationViewerPage').then(m => ({ default: m.PresentationViewerPage })));
const MobileControllerPage = lazy(() => import('@/pages/library/MobileControllerPage').then(m => ({ default: m.MobileControllerPage })));
const AdminLibraryPage = lazy(() => import('@/pages/admin/AdminLibraryPage').then(m => ({ default: m.AdminLibraryPage })));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<CoursePlayerSkeleton />}>
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

          {/* EdTechra Library & Realtime Presentation Routes */}
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/present/:id" element={<PresentationViewerPage />} />
          <Route path="library/controller" element={<MobileControllerPage />} />
          <Route path="library/controller/:code" element={<MobileControllerPage />} />
          
          {/* Assessment & Survey Studio (Teacher Authoring) Routes */}
          <Route path="classes/:classroomId/assessments/builder" element={<AssessmentBuilderPage />} />
          <Route path="classes/:classroomId/assessments/builder/:assessmentId" element={<AssessmentBuilderPage />} />
          
          {/* Student Examination & Assessment Taking Routes */}
          <Route path="classes/:classroomId/exams/:examId" element={<StudentExamPage />} />
          <Route path="classes/:classroomId/assessments/:assessmentId" element={<StudentExamPage />} />
          
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
          <Route
            path="admin/library"
            element={
              <AdminRoute>
                <AdminLibraryPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
