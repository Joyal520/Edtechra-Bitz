import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ContentBucket } from '@/types/classroom';
import { classroomResourceService } from '@/services/classroomResourceService';
import { ClassroomResources } from '@/components/classes/ClassroomResources';
import { useAuth } from '@/context/AuthContext';

export const TeacherResourcesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isTeacher } = useAuth();
  const [buckets, setBuckets] = useState<ContentBucket[]>([]);

  useEffect(() => {
    if (id) loadBuckets();
  }, [id]);

  const loadBuckets = async () => {
    if (!id) return;
    try {
      const data = await classroomResourceService.getBucketsByClassroom(id);
      setBuckets(data);
    } catch (err) {
      console.error('Failed to load resources', err);
    }
  };

  if (!id) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Link
        to={`/classes/${id}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Classroom Workspace</span>
      </Link>

      <ClassroomResources
        classroomId={id}
        buckets={buckets}
        isTeacher={isTeacher}
        onUpdated={loadBuckets}
      />
    </div>
  );
};
