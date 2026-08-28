import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Trash2,
  X,
  Flame,
  FileWarning,
  Loader2
} from 'lucide-react';
import { Classroom, ClassroomStats } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';

interface ClassroomDangerZoneProps {
  classroom: Classroom;
  isOwnerOrAdmin: boolean;
  stats?: ClassroomStats;
}

export const ClassroomDangerZone: React.FC<ClassroomDangerZoneProps> = ({
  classroom,
  isOwnerOrAdmin,
  stats
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [typedTitle, setTypedTitle] = useState('');
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOwnerOrAdmin) {
    return null;
  }

  const expectedTitle = classroom.title.trim();
  const isMatch = typedTitle.trim() === expectedTitle;
  const canDelete = isMatch && confirmedRisk && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await classroomService.deleteClassroom(classroom.id);
      if (res.error) {
        setErrorMessage(res.error);
        setIsDeleting(false);
        return;
      }

      setIsOpen(false);
      navigate('/classes', {
        replace: true,
        state: { deletedClassroom: classroom.title }
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete classroom.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Danger Zone Bottom Banner */}
      <div className="mt-8 rounded-[24px] border border-rose-200 bg-[#fff8f8] p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>DANGER ZONE</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Decommission & Delete Classroom
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Permanently delete this classroom, student submission records, points history, live quiz lobbies, and active enrollments. This action is irreversible.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setTypedTitle('');
                setConfirmedRisk(false);
                setErrorMessage(null);
                setIsOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer border border-rose-500/30"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete This Classroom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dramatic Nuclear Warning Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 text-white border-2 border-rose-500/80 shadow-2xl shadow-rose-950/60 overflow-hidden my-8">
            
            {/* Top Danger Warning Header */}
            <div className="relative bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 p-6 sm:p-7 border-b border-rose-700/50">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border-2 border-rose-500 text-rose-300 flex items-center justify-center shadow-lg shadow-rose-900/50 animate-pulse">
                    <Flame className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                        Critical Destruction Alert
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight mt-1">
                      Permanent Classroom Purge
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => !isDeleting && setIsOpen(false)}
                  disabled={isDeleting}
                  className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 bg-slate-900">
              
              {/* Destruction Inventory */}
              <div className="rounded-2xl bg-slate-950/90 border border-rose-900/60 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <FileWarning className="w-4 h-4" />
                  <span>The following data will be wiped permanently:</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 pl-5 list-disc font-medium">
                  <li>
                    Classroom: <span className="font-extrabold text-white">"{classroom.title}"</span> ({classroom.subject}, {classroom.grade})
                  </li>
                  <li>
                    Enrolled Students: <span className="font-bold text-rose-300">{stats?.total_students ?? 0} students</span> will be removed
                  </li>
                  <li>
                    Assignments &amp; Submissions: <span className="font-bold text-rose-300">{stats?.total_assignments ?? 0} tasks</span> and all graded student papers
                  </li>
                  <li>
                    All points ledger, live quiz rooms, stream messages, and study buckets
                  </li>
                </ul>
              </div>

              {/* Exact Name Verification Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  To confirm decommissioning, type <span className="text-rose-400 font-mono font-black select-all px-1.5 py-0.5 bg-rose-950/80 rounded border border-rose-800">{expectedTitle}</span> below:
                </label>
                <input
                  type="text"
                  value={typedTitle}
                  onChange={(e) => setTypedTitle(e.target.value)}
                  disabled={isDeleting}
                  placeholder={`Type "${expectedTitle}"`}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Checkbox Acknowledgment */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedRisk}
                  onChange={(e) => setConfirmedRisk(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-300 font-medium">
                  I understand that this action cannot be undone and no backups will be recoverable.
                </span>
              </label>

              {/* Error notification if any */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel &amp; Keep Classroom
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canDelete}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    canDelete
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/40 active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting Classroom...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
