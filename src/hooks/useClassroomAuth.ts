import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export interface ClassroomAuthResult {
  isTeacher: boolean;
  isStudent: boolean;
  role: 'teacher' | 'student' | 'admin';
  isLoading: boolean;
  user: any;
  profile: any;
}

/**
 * Authoritative role and authorization hook for Digital Classroom components.
 * Consolidates profile.role, authContext isTeacher, and classroom-level teacher ownership.
 */
export function useClassroomAuth(classroomId?: string): ClassroomAuthResult {
  const { user, profile, isTeacher: authIsTeacher, isAdmin, isLoading: authLoading } = useAuth();
  const [classroomRole, setClassroomRole] = useState<'teacher' | 'student' | null>(null);
  const [isClassroomLoading, setIsClassroomLoading] = useState(Boolean(classroomId));

  useEffect(() => {
    let isMounted = true;

    async function checkClassroomOwnership() {
      if (!classroomId || !user || !supabase) {
        setIsClassroomLoading(false);
        return;
      }

      try {
        // 1. Check if user is the teacher_id of the classroom
        const { data: classroom } = await supabase
          .from('classrooms')
          .select('teacher_id')
          .eq('id', classroomId)
          .maybeSingle();

        if (!isMounted) return;

        if (classroom && classroom.teacher_id === user.id) {
          setClassroomRole('teacher');
          setIsClassroomLoading(false);
          return;
        }

        // 2. Check if user is a member with teacher/co-teacher role
        const { data: member } = await supabase
          .from('classroom_members')
          .select('role')
          .eq('classroom_id', classroomId)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (member && (member.role === 'teacher' || member.role === 'co-teacher')) {
          setClassroomRole('teacher');
        } else if (member && member.role === 'student') {
          setClassroomRole('student');
        }
      } catch (err) {
        console.warn('[useClassroomAuth] Classroom role check notice:', err);
      } finally {
        if (isMounted) {
          setIsClassroomLoading(false);
        }
      }
    }

    checkClassroomOwnership();

    return () => {
      isMounted = false;
    };
  }, [classroomId, user]);

  // Consolidate authoritative isTeacher state
  const isTeacher = Boolean(
    authIsTeacher ||
    isAdmin ||
    profile?.role === 'teacher' ||
    profile?.role === 'admin' ||
    user?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com' ||
    classroomRole === 'teacher'
  );

  const isStudent = !isTeacher;
  const role: 'teacher' | 'student' | 'admin' = isAdmin ? 'admin' : (isTeacher ? 'teacher' : 'student');
  const isLoading = authLoading || (Boolean(classroomId) && isClassroomLoading && !isTeacher);

  return {
    isTeacher,
    isStudent,
    role,
    isLoading,
    user,
    profile
  };
}
