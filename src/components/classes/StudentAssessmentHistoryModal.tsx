import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Calendar, Sparkles, Loader2, FileCheck } from 'lucide-react';
import { ClassroomMember, OCREvaluation } from '@/types/classroom';
import { ocrService } from '@/services/ocrService';

interface StudentAssessmentHistoryModalProps {
  isOpen: boolean;
  classroomId: string;
  student: ClassroomMember | null;
  onClose: () => void;
}

export const StudentAssessmentHistoryModal: React.FC<StudentAssessmentHistoryModalProps> = ({
  isOpen,
  classroomId,
  student,
  onClose
}) => {
  const [evaluations, setEvaluations] = useState<OCREvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingReportId, setOpeningReportId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classroomId && student) {
      loadHistory();
    }
  }, [isOpen, classroomId, student]);

  const loadHistory = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const data = await ocrService.getClassroomEvaluations(classroomId, student.profile_id);
      setEvaluations(data.filter((e) => e.status === 'completed'));
    } catch (err) {
      console.error('[StudentAssessmentHistory] Failed to load evaluations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = async (evalId: string) => {
    setOpeningReportId(evalId);
    try {
      const url = await ocrService.getReportUrl(evalId);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Report URL is not available.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open report');
    } finally {
      setOpeningReportId(null);
    }
  };

  if (!isOpen || !student) return null;

  const studentName = student.display_name || student.profile?.full_name || student.profile?.email || 'Student';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Student Assessment History</h2>
              <p className="text-xs text-slate-500 font-semibold">{studentName} • AI OCR Evaluations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading evaluation history...</p>
            </div>
          ) : evaluations.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-black text-slate-700">No OCR Evaluations Yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Evaluations created with the AI OCR Worksheet Grader will appear here with official PDF reports.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {evaluations.map((item) => {
                const dateStr = new Date(item.completed_at || item.created_at).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                        {item.is_teacher_adjusted && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                            Adjusted
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900">
                        {item.title ? item.title : `${item.category} Assessment`}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                        "{item.feedback}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:border-l sm:border-slate-200 sm:pl-4 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="text-base font-black text-slate-900">
                          {item.final_score ?? item.score} <span className="text-xs font-bold text-slate-400">/ {item.max_marks}</span>
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600">
                          {item.performance || 'Good'}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={openingReportId === item.id}
                        onClick={() => handleOpenReport(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer"
                      >
                        {openingReportId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        <span>View Report</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
