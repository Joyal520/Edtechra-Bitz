import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Users,
  CalendarDays,
  FileText,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import {
  teachingIntelligenceService,
  TeachingIntelligenceResponse
} from '@/services/teachingIntelligenceService';
import { AIDebugBadge } from './ai/AIDebugBadge';
import { AIUsageAdminModal } from './ai/AIUsageAdminModal';
import { InsightTab } from './intelligence/InsightTab';
import { StudentsTab } from './intelligence/StudentsTab';
import { TeachingTab } from './intelligence/TeachingTab';
import { EvidenceReportsTab } from './intelligence/EvidenceReportsTab';
import { AskAITeacherModal } from './intelligence/AskAITeacherModal';

export type ModalTab =
  | 'insight'
  | 'students'
  | 'teaching'
  | 'evidence-reports'
  // Legacy aliases for backward compatibility with existing callers
  | 'intelligence'
  | 'planner'
  | 'actions'
  | 'recent-exams'
  | '30day-report'
  | 'chat';

interface AITeachingIntelligenceModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  onClose: () => void;
  initialTab?: ModalTab;
}

export const AITeachingIntelligenceModal: React.FC<AITeachingIntelligenceModalProps> = ({
  isOpen,
  classroom,
  onClose,
  initialTab
}) => {
  const mapInitialTab = (tab?: ModalTab): 'insight' | 'students' | 'teaching' | 'evidence-reports' => {
    if (!tab) return 'insight';
    if (tab === 'intelligence') return 'insight';
    if (tab === 'planner' || tab === 'actions') return 'teaching';
    if (tab === 'students') return 'students';
    if (tab === 'recent-exams' || tab === '30day-report') return 'evidence-reports';
    if (tab === 'insight' || tab === 'teaching' || tab === 'evidence-reports') return tab;
    return 'insight';
  };

  const [activeTab, setActiveTab] = useState<'insight' | 'students' | 'teaching' | 'evidence-reports'>(
    mapInitialTab(initialTab)
  );
  const [data, setData] = useState<TeachingIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAIUsageModal, setShowAIUsageModal] = useState(false);

  // Ask AI Teacher Copilot
  const [isChatOpen, setIsChatOpen] = useState(initialTab === 'chat');
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(mapInitialTab(initialTab));
      if (initialTab === 'chat') {
        setIsChatOpen(true);
      }
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && classroom?.id) {
      loadIntelligence();
    }
  }, [isOpen, classroom?.id]);

  const sanitizeErrorMessage = (msg: any, fallback: string): string => {
    if (!msg || typeof msg !== 'string') return fallback;
    if (
      msg.includes('Unexpected token') ||
      msg.includes('is not valid JSON') ||
      msg.includes('JSON.parse') ||
      msg.includes('FUNCTION_INVOCATION_TIMEOUT')
    ) {
      return 'The analytics engine is processing a heavy load. Click "Refresh AI" in a few moments.';
    }
    return msg;
  };

  const loadIntelligence = async () => {
    if (!classroom?.id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await teachingIntelligenceService.getTeachingIntelligence(classroom.id);
      setData(res);
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] load error:', err);
      setErrorMsg(sanitizeErrorMessage(err.message, 'Failed to load teaching intelligence.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!classroom?.id || refreshing) return;
    setRefreshing(true);
    setErrorMsg('');
    try {
      const res = await teachingIntelligenceService.refreshTeachingIntelligence(classroom.id);
      setData(res);
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] refresh error:', err);
      setErrorMsg(sanitizeErrorMessage(err.message, 'Failed to re-run AI intelligence analysis.'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenChatWithPrompt = (prompt: string) => {
    setChatInitialPrompt(prompt);
    setIsChatOpen(true);
  };

  if (!isOpen || !classroom) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#F8FCFB] rounded-3xl w-full max-w-6xl h-[94vh] max-h-[950px] flex flex-col shadow-2xl border border-[#C9E5E2] overflow-hidden">
        
        {/* TOP HEADER BAR (Sticky, always visible) */}
        <header className="px-5 sm:px-7 py-4 bg-[#071a1c] border-b border-[#0e3b40] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#159A9C] to-[#087477] flex items-center justify-center shadow-lg shadow-[#159A9C]/25 text-white">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Teaching Intelligence
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide bg-[#159A9C]/30 text-teal-200 border border-[#159A9C]/40">
                  {classroom.title}
                </span>
                <AIDebugBadge onClick={() => setShowAIUsageModal(true)} />
              </div>
              <p className="text-xs text-teal-100/75 font-medium">
                {classroom.subject || 'All Subjects'} • Evidence-driven diagnostic intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Persistent [Ask AI Teacher] Button */}
            <button
              type="button"
              onClick={() => {
                setChatInitialPrompt(undefined);
                setIsChatOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[#159A9C] to-[#087477] hover:from-[#1bb0b2] hover:to-[#0a878b] text-white border border-teal-300/40 shadow-sm hover:shadow flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Ask AI Teacher</span>
            </button>

            {/* Refresh AI Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold text-teal-200 hover:text-white bg-white/5 hover:bg-white/10 border border-teal-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Re-run AI Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#159A9C]' : ''}`} />
              <span className="hidden md:inline">Refresh AI</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-teal-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 4 PRIMARY NAVIGATION TABS */}
        <nav className="px-5 sm:px-7 bg-white border-b border-[#C9E5E2] flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('insight')}
            className={`py-3.5 px-4 font-black text-xs sm:text-sm tracking-wide border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'insight'
                ? 'border-[#087477] text-[#087477]'
                : 'border-transparent text-[#36565A] hover:text-[#173B3F]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Insight</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-3.5 px-4 font-black text-xs sm:text-sm tracking-wide border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'students'
                ? 'border-[#087477] text-[#087477]'
                : 'border-transparent text-[#36565A] hover:text-[#173B3F]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teaching')}
            className={`py-3.5 px-4 font-black text-xs sm:text-sm tracking-wide border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teaching'
                ? 'border-[#087477] text-[#087477]'
                : 'border-transparent text-[#36565A] hover:text-[#173B3F]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Teaching</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence-reports')}
            className={`py-3.5 px-4 font-black text-xs sm:text-sm tracking-wide border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'evidence-reports'
                ? 'border-[#087477] text-[#087477]'
                : 'border-transparent text-[#36565A] hover:text-[#173B3F]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Evidence & Reports</span>
          </button>
        </nav>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* TAB CONTENTS (Scrollable area) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {loading && !data ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F7F5] flex items-center justify-center mx-auto text-[#087477]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#159A9C]" />
              </div>
              <p className="text-sm font-bold text-[#173B3F]">
                Synthesizing classroom intelligence...
              </p>
              <p className="text-xs text-[#36565A]">
                Evaluating tasks, quizzes, assessments, and learning progression.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'insight' && (
                <InsightTab
                  classroom={classroom}
                  data={data}
                  onNavigateToTeaching={() => setActiveTab('teaching')}
                  onNavigateToStudents={() => setActiveTab('students')}
                  onNavigateToEvidence={() => setActiveTab('evidence-reports')}
                />
              )}

              {activeTab === 'students' && (
                <StudentsTab classroom={classroom} />
              )}

              {activeTab === 'teaching' && (
                <TeachingTab
                  classroom={classroom}
                  data={data}
                  onOpenChatWithPrompt={handleOpenChatWithPrompt}
                />
              )}

              {activeTab === 'evidence-reports' && (
                <EvidenceReportsTab classroom={classroom} data={data} />
              )}
            </>
          )}
        </div>

        {/* Persistent [Ask AI Teacher] Modal */}
        <AskAITeacherModal
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setChatInitialPrompt(undefined);
          }}
          classroom={classroom}
          initialPrompt={chatInitialPrompt}
        />

        {/* AI Usage Admin Modal */}
        <AIUsageAdminModal
          isOpen={showAIUsageModal}
          onClose={() => setShowAIUsageModal(false)}
        />
      </div>
    </div>
  );
};
