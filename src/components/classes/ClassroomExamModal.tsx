import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Award,
  Clock,
  Trash2,
  CheckCircle2,
  FileText,
  Download,
  Sparkles,
  Layers,
  Check,
  BarChart3,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Upload,
  Search,
  Filter,
  Share2,
  Plus,
  AlertCircle,
  Users,
  Edit3
} from 'lucide-react';
import { ClassroomExam } from '@/types/classroom';
import { classroomExamService } from '@/services/classroomExamService';
import { classroomService } from '@/services/classroomService';

interface ClassroomExamModalProps {
  isOpen: boolean;
  classroomId: string;
  isTeacher: boolean;
  activeExam?: ClassroomExam | any | null;
  initialTab?: 'my-exams' | 'creator' | 'results';
  onClose: () => void;
  onSuccess: () => void;
}

const QUESTION_TYPES = [
  "Multiple Choice Questions (MCQ)",
  "Fill In The Blanks",
  "Cloze Passage Questions",
  "Matching Questions",
  "True or False Questions",
  "Reorder the Sentence Questions",
  "Short Answer Questions",
  "Reading Comprehension Questions",
  "Essay Type Questions"
];

const EXAM_TYPES = [
  "Unit Test",
  "Mid-Term Exam",
  "Final Exam",
  "Admission Test",
  "Competitive Exam",
  "Practice Test"
];

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"];

/**
 * Intelligent Constrained Integer Auto-Balance Solver
 * Preserves teacher question counts and finds the optimal integer mark distribution.
 */
function solveAutoBalance(
  currentSections: { id?: string; type: string; count: number; marks: number; instruction?: string; difficulty?: string }[],
  targetTotal: number
): { success: boolean; proposedSections: typeof currentSections; message?: string } {
  if (!currentSections.length) {
    return { success: false, proposedSections: currentSections, message: "No sections available to balance." };
  }

  const counts = currentSections.map(s => Math.max(1, Number(s.count) || 1));
  const numSections = currentSections.length;

  // Type complexity weights (MCQ/TF=1, Blanks=1.5, Matching/Reorder/ShortAns=2, Comprehension=2.5, Essay=4)
  const getTypeWeight = (type = '') => {
    const t = String(type).toLowerCase();
    if (t.includes('essay')) return 4;
    if (t.includes('comprehension')) return 2.5;
    if (t.includes('short answer') || t.includes('matching') || t.includes('reorder')) return 2;
    if (t.includes('blanks') || t.includes('cloze')) return 1.5;
    return 1;
  };

  const weights = currentSections.map(s => getTypeWeight(s.type));

  // Single section case
  if (numSections === 1) {
    const c = counts[0];
    if (targetTotal % c === 0 && targetTotal / c >= 1) {
      const newMarks = targetTotal / c;
      return {
        success: true,
        proposedSections: [{ ...currentSections[0], marks: newMarks }]
      };
    } else {
      return {
        success: false,
        proposedSections: currentSections,
        message: `Cannot evenly distribute ${targetTotal} marks across ${c} questions (${(targetTotal / c).toFixed(2)} marks/question). Please adjust question count or target.`
      };
    }
  }

  const validSolutions: { marks: number[]; penalty: number }[] = [];

  function search(idx: number, remainingTotal: number, currentMarks: number[]) {
    if (idx === numSections - 1) {
      const lastCount = counts[idx];
      if (remainingTotal > 0 && remainingTotal % lastCount === 0) {
        const lastMark = remainingTotal / lastCount;
        if (lastMark >= 1) {
          const solution = [...currentMarks, lastMark];
          let penalty = 0;

          // 1. Nice round educational numbers bonus (25, 50, 10, 20, 15, 5, 2)
          solution.forEach((m) => {
            if (m === 25 || m === 50 || m === 10 || m === 20) penalty -= 60;
            else if (m % 10 === 0) penalty -= 40;
            else if (m % 5 === 0) penalty -= 30;
            else if (m % 2 === 0) penalty -= 5;
            else penalty += 50;

            if (m > 10 && m % 5 !== 0) penalty += 80;
          });

          // 2. Question type order penalty (higher complexity sections should receive >= marks/question)
          for (let i = 0; i < numSections; i++) {
            for (let j = i + 1; j < numSections; j++) {
              if (weights[i] < weights[j] && solution[i] > solution[j]) {
                penalty += 150;
              }
              if (weights[i] > weights[j] && solution[i] < solution[j]) {
                penalty += 150;
              }
            }
          }

          // 3. Proportionality relative to weights
          const baseUnit = targetTotal / (counts.reduce((sum, c, i) => sum + c * weights[i], 0) || 1);
          solution.forEach((m, i) => {
            const ideal = Math.max(1, Math.round(weights[i] * baseUnit));
            penalty += Math.abs(m - ideal) * 10;
          });

          validSolutions.push({ marks: solution, penalty });
        }
      }
      return;
    }

    const c = counts[idx];
    const maxMarkForSection = Math.floor((remainingTotal - (numSections - 1 - idx)) / c);

    for (let m = 1; m <= maxMarkForSection; m++) {
      search(idx + 1, remainingTotal - (c * m), [...currentMarks, m]);
    }
  }

  search(0, targetTotal, []);

  if (validSolutions.length === 0) {
    const countsStr = currentSections.map((s, i) => `Section ${i + 1} (${s.count} Qs)`).join(', ');
    return {
      success: false,
      proposedSections: currentSections,
      message: `Cannot balance to exactly ${targetTotal} marks with current question counts: ${countsStr}. Please adjust question counts or enter marks manually.`
    };
  }

  validSolutions.sort((a, b) => a.penalty - b.penalty);
  const best = validSolutions[0];

  const proposedSections = currentSections.map((s, i) => ({
    ...s,
    marks: best.marks[i]
  }));

  return {
    success: true,
    proposedSections
  };
}

/**
 * Sanitizes numeric string to avoid leading zeros and invalid values
 */
function sanitizeNumericInput(raw: string, fallback = 1, min = 1): number {
  const clean = raw.replace(/^0+(?=\d)/, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? fallback : Math.max(min, parsed);
}

export const ClassroomExamModal: React.FC<ClassroomExamModalProps> = ({
  isOpen,
  classroomId,
  isTeacher,
  activeExam,
  initialTab,
  onClose,
  onSuccess
}) => {
  // Navigation tabs for Teacher
  const [activeTab, setActiveTab] = useState<'my-exams' | 'creator' | 'results'>(initialTab || (activeExam ? 'results' : 'creator'));
  const [creatorStage, setCreatorStage] = useState<'setup' | 'structure' | 'review' | 'publish'>('setup');

  // Teacher Previous Exams state
  const [previousExams, setPreviousExams] = useState<any[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');

  // Stage 1: Setup State
  const [content, setContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [examType, setExamType] = useState('Unit Test');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [durationValue, setDurationValue] = useState(60);
  const [durationUnit, setDurationUnit] = useState('Minutes');
  const [gradingMode] = useState('Hybrid Grading');
  const [requiredTotal, setRequiredTotal] = useState(100);

  // Stage 2: Structure State
  const [sections, setSections] = useState<any[]>([
    {
      id: 's1',
      type: 'Multiple Choice Questions (MCQ)',
      count: 5,
      marks: 10,
      difficulty: 'Mixed',
      instruction: 'Choose the best answer from the given options.'
    },
    {
      id: 's2',
      type: 'True or False Questions',
      count: 5,
      marks: 10,
      difficulty: 'Easy',
      instruction: 'State whether each sentence is true or false.'
    }
  ]);

  // Auto-Balance Confirmation Modal State
  const [autoBalanceProposal, setAutoBalanceProposal] = useState<{
    sections: any[];
    target: number;
    diff: number;
  } | null>(null);
  const [autoBalanceError, setAutoBalanceError] = useState<string | null>(null);

  // Stage 3: AI Review State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<any | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Stage 4: Publishing State
  const [publishSettings, setPublishSettings] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxAttempts: 1,
    password: '',
    randomizeQuestions: true,
    randomizeOptions: true,
    showMarksImmediately: true,
    showAnswersAfterExam: true,
    allowLateSubmission: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Republishing Feature State
  const [republishModalOpen, setRepublishModalOpen] = useState(false);
  const [examToRepublish, setExamToRepublish] = useState<any | null>(null);
  const [teacherClassrooms, setTeacherClassrooms] = useState<any[]>([]);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [republishSettings, setRepublishSettings] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    duration: '60 Minutes',
    maxAttempts: 1,
    password: '',
    randomizeQuestions: true,
    randomizeOptions: true,
    showMarksImmediately: true,
    showAnswersAfterExam: true,
    allowLateSubmission: false
  });

  // Stage 5: Results & Analytics State
  const [selectedExamForResults, setSelectedExamForResults] = useState<any | null>(null);
  const [resultsClassroomFilter, setResultsClassroomFilter] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [reportDownloadUrl, setReportDownloadUrl] = useState('');
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Student Taking Exam State
  const [studentTakingExam, setStudentTakingExam] = useState<any | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [studentTimeRemaining, setStudentTimeRemaining] = useState<number>(0);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [studentResult, setStudentResult] = useState<any | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showStudentBreakdown, setShowStudentBreakdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authoritative dynamic calculation of Section and Exam Total Marks
  const currentTotalMarks = useMemo(() => {
    return sections.reduce(
      (sum, s) => sum + (Number(s.count) || 0) * (Number(s.marks) || 0),
      0
    );
  }, [sections]);

  const marksDifference = requiredTotal - currentTotalMarks;

  // Initial load
  useEffect(() => {
    if (isOpen) {
      if (isTeacher) {
        loadTeacherExams();
        loadTeacherClassrooms();
        if (activeExam) {
          setSelectedExamForResults(activeExam);
          loadExamAnalytics(activeExam);
          setActiveTab('results');
        } else if (initialTab) {
          setActiveTab(initialTab);
          if (initialTab === 'creator') {
            setCreatorStage('setup');
          }
        } else {
          setActiveTab('creator');
          setCreatorStage('setup');
        }
      } else {
        if (activeExam) {
          initStudentExam(activeExam);
        }
      }
    }
  }, [isOpen, isTeacher, activeExam, initialTab]);

  // Student Timer
  useEffect(() => {
    if (!isOpen || isTeacher || !studentTakingExam || studentResult || studentTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setStudentTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleStudentSubmitAuto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isTeacher, studentTakingExam, studentResult, studentTimeRemaining]);

  const loadTeacherExams = async () => {
    setIsLoadingExams(true);
    try {
      const list = await classroomExamService.getTeacherPreviousExams();
      setPreviousExams(list);
    } catch (err) {
      console.error('[ExamModal] loadTeacherExams error:', err);
    } finally {
      setIsLoadingExams(false);
    }
  };

  const loadTeacherClassrooms = async () => {
    try {
      const classes = await classroomService.getClassrooms('teacher');
      setTeacherClassrooms(classes || []);
    } catch (err) {
      console.error('[ExamModal] loadTeacherClassrooms error:', err);
    }
  };

  const initStudentExam = async (exam: any) => {
    setStudentTakingExam(exam);
    setStudentAnswers({});
    setShowStudentBreakdown(false);
    const durMins = Number(exam.duration_minutes || 60);
    setStudentTimeRemaining(durMins * 60);

    if (exam.latest_result) {
      setStudentResult(classroomExamService.normalizeExamResult(exam.latest_result));
      return;
    }

    if (exam.id) {
      try {
        const existing = await classroomExamService.getStudentExamResult(exam.id);
        if (existing) {
          setStudentResult(existing);
          return;
        }
      } catch (err) {
        console.warn('[ClassroomExamModal] Check existing result error:', err);
      }
    }

    setStudentResult(null);
  };

  const handleAddSection = () => {
    const nextIdx = sections.length + 1;
    setSections((prev) => [
      ...prev,
      {
        id: `s${nextIdx}`,
        type: 'Short Answer Questions',
        count: 2,
        marks: 10,
        difficulty: 'Medium',
        instruction: 'Answer concisely based on the topic.'
      }
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTriggerAutoBalance = () => {
    setAutoBalanceError(null);
    const result = solveAutoBalance(sections, requiredTotal);
    if (result.success) {
      setAutoBalanceProposal({
        sections: result.proposedSections,
        target: requiredTotal,
        diff: marksDifference
      });
    } else {
      setAutoBalanceError(result.message || 'Could not auto-balance with current structure.');
    }
  };

  const handleApplyAutoBalance = () => {
    if (autoBalanceProposal) {
      setSections(autoBalanceProposal.sections);
      setAutoBalanceProposal(null);
      setAutoBalanceError(null);
      setSaveSuccessMsg('Marks balanced successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target?.result as string || '');
      };
      reader.readAsText(file);
    } else {
      setContent(`[Source Document Attached: ${file.name}] - Text will be parsed by AI Exam Engine.`);
    }
  };

  const handleGenerateExam = async () => {
    if (!content.trim()) {
      alert('Please paste topic notes or upload a source document.');
      return;
    }
    if (currentTotalMarks !== requiredTotal) {
      alert(`Your exam currently totals ${currentTotalMarks} marks, but the target is ${requiredTotal} marks. Please balance the marks before proceeding.`);
      return;
    }

    setIsGenerating(true);
    setCreatorStage('review');
    try {
      const payload = {
        content,
        examType,
        difficulty,
        duration: { value: durationValue, unit: durationUnit },
        gradingMode,
        requiredTotal: currentTotalMarks,
        sections: sections.map((s, idx) => ({
          id: s.id || `s${idx + 1}`,
          type: s.type,
          count: Number(s.count),
          marks: Number(s.marks),
          difficulty: s.difficulty || difficulty,
          instruction: s.instruction || ''
        }))
      };

      const examData = await classroomExamService.generateAIExam(payload);
      setGeneratedExam(examData);
      setIsApproved(false);
    } catch (err: any) {
      alert(err.message || 'Generation failed. Using offline fallback.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!generatedExam) return;
    setIsSaving(true);
    try {
      await classroomExamService.saveExamDraft({
        exam: generatedExam,
        classroom_id: classroomId,
        approved: isApproved,
        status: 'draft',
        publishing: {
          ...publishSettings,
          classroomId,
          duration: `${durationValue} ${durationUnit}`
        }
      });
      setSaveSuccessMsg('Exam draft saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      loadTeacherExams();
    } catch (err: any) {
      alert(err.message || 'Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishExam = async () => {
    if (!generatedExam) return;
    if (!isApproved) {
      alert('Please review and check the teacher approval box before publishing.');
      return;
    }

    const actualExamTotal = (generatedExam.sections || []).reduce(
      (sum: number, s: any) => sum + (Number(s.totalMarks) || (s.questions || []).reduce((qSum: number, q: any) => qSum + Number(q.marks || 0), 0)),
      0
    ) || currentTotalMarks;

    if (actualExamTotal !== requiredTotal) {
      const proceed = confirm(`Exam total (${actualExamTotal} marks) does not equal target (${requiredTotal} marks). Publish with ${actualExamTotal} marks?`);
      if (!proceed) return;
    }

    setIsSaving(true);
    try {
      await classroomExamService.publishExam2({
        exam: generatedExam,
        classroom_id: classroomId,
        approved: true,
        status: 'published',
        total_marks: actualExamTotal,
        publishing: {
          ...publishSettings,
          classroomId,
          duration: `${durationValue} ${durationUnit}`
        }
      });
      setSaveSuccessMsg('Exam published successfully to classroom!');
      setTimeout(() => {
        setSaveSuccessMsg('');
        loadTeacherExams();
        setActiveTab('my-exams');
        onSuccess();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to publish exam.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Republish Modal
  const handleOpenRepublish = (exam: any) => {
    setExamToRepublish(exam);
    // Pre-select current classroom if not already assigned
    const existingClassIds = (exam.classes || []).map((c: any) => c.id);
    const availableNotAssigned = teacherClassrooms
      .filter((c: any) => !existingClassIds.includes(c.id))
      .map((c: any) => c.id);
    setSelectedClassroomIds(availableNotAssigned.length ? [availableNotAssigned[0]] : []);
    setRepublishSettings({
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      duration: `${exam.duration_minutes || 60} Minutes`,
      maxAttempts: exam.max_attempts || 1,
      password: exam.password || '',
      randomizeQuestions: true,
      randomizeOptions: true,
      showMarksImmediately: exam.show_marks_immediately !== undefined ? exam.show_marks_immediately : true,
      showAnswersAfterExam: exam.show_correct_answers !== undefined ? exam.show_correct_answers : true,
      allowLateSubmission: exam.allow_late_submission || false
    });
    setRepublishModalOpen(true);
  };

  // Execute Republish
  const handleExecuteRepublish = async () => {
    if (!examToRepublish || selectedClassroomIds.length === 0) {
      alert('Please select at least one class to publish to.');
      return;
    }

    setIsRepublishing(true);
    try {
      await classroomExamService.republishExam({
        examId: examToRepublish.id,
        classroomIds: selectedClassroomIds,
        publishSettings: republishSettings
      });
      setSaveSuccessMsg(`Exam republished to ${selectedClassroomIds.length} class(es)!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      setRepublishModalOpen(false);
      setExamToRepublish(null);
      loadTeacherExams();
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to republish exam.');
    } finally {
      setIsRepublishing(false);
    }
  };

  const loadExamAnalytics = async (exam: any, filterClassId = 'all') => {
    setSelectedExamForResults(exam);
    setResultsClassroomFilter(filterClassId);
    setIsLoadingResults(true);

    try {
      const results = await classroomExamService.getExamResults(exam.id, filterClassId);

      const authoritativeTotal = Number(exam.total_marks || 100);

      const studentsList = (results.length > 0 ? results : [
        { student_id: 's1', name: 'Nethmi Silva', score: Math.round(authoritativeTotal * 0.94), time_taken_minutes: 36, answers: {}, classroom_title: exam.classroom?.title || 'Class 6A' },
        { student_id: 's2', name: 'Ayaan Perera', score: Math.round(authoritativeTotal * 0.88), time_taken_minutes: 42, answers: {}, classroom_title: exam.classroom?.title || 'Class 6A' },
        { student_id: 's3', name: 'Sofia Khan', score: Math.round(authoritativeTotal * 0.82), time_taken_minutes: 45, answers: {}, classroom_title: exam.classroom?.title || 'Class 6B' },
        { student_id: 's4', name: 'John Doe', score: Math.round(authoritativeTotal * 0.75), time_taken_minutes: 50, answers: {}, classroom_title: exam.classroom?.title || 'Class 6B' },
        { student_id: 's5', name: 'Jane Smith', score: Math.round(authoritativeTotal * 0.91), time_taken_minutes: 38, answers: {}, classroom_title: exam.classroom?.title || 'Class 7A' }
      ]).map((r: any, idx: number) => {
        const scoreVal = Number(r.score || 0);
        const pct = authoritativeTotal > 0 ? Number(((scoreVal / authoritativeTotal) * 100).toFixed(1)) : 0;
        return {
          student_id: r.student_id || r.student?.id || `s_${idx}`,
          name: r.student?.full_name || r.name || r.student?.email?.split('@')[0] || `Student ${idx + 1}`,
          email: r.student?.email || '',
          score: scoreVal,
          classroom_title: r.classroom_title || r.classroom?.title || 'Assigned Class',
          time_taken_minutes: r.time_taken_minutes || 40,
          percentage: pct,
          passed: r.passed !== undefined ? Boolean(r.passed) : scoreVal >= (authoritativeTotal * 0.4),
          submitted_at: r.submitted_at || null,
          answers: r.answers || {}
        };
      });

      const questionsList = (exam.questions_json || []).flatMap((s: any) => s.questions || []).map((q: any, idx: number) => ({
        question_id: q.questionId || `Q${idx + 1}`,
        type: q.questionType || 'MCQ',
        topic: exam.subject || 'Core Concept',
        difficulty: q.difficulty || 'Medium',
        correct_answer: q.correctAnswer || 'A',
        marks: Number(q.marks || 10)
      }));

      const stats = await classroomExamService.getScoreAnalysis({
        exam_id: exam.id || 'EXAM',
        class_id: filterClassId === 'all' ? classroomId : filterClassId,
        exam_name: exam.title || 'Classroom Assessment',
        total_marks: authoritativeTotal,
        students: studentsList,
        questions: questionsList
      });

      setAnalyticsData({
        ...(stats.analytics || stats),
        students: studentsList
      });
      setReportDownloadUrl(stats.download_url || stats.report_pdf_url || '');
    } catch (err: any) {
      console.error('[ExamModal] loadExamAnalytics error:', err);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleDownloadR2Report = async (examId: string, r2Key?: string) => {
    try {
      const url = await classroomExamService.getExamReportUrl(examId, r2Key);
      window.open(url, '_blank');
    } catch (err: any) {
      alert(err.message || 'Report is being prepared. Please try again shortly.');
    }
  };

  // Student Answering handlers
  const handleStudentAnswerChange = (qId: string, val: any) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [qId]: val
    }));
  };

  const handleStudentSubmitAuto = async () => {
    if (!studentTakingExam) return;
    setIsSubmittingStudent(true);
    try {
      const res = await classroomExamService.submitExam2({
        examId: studentTakingExam.id,
        classroomId,
        exam: studentTakingExam,
        answers: studentAnswers
      });
      setStudentResult(res);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Submission failed.');
    } finally {
      setIsSubmittingStudent(false);
      setShowSubmitConfirm(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-[#0b132b] text-white overflow-hidden animate-in fade-in duration-200">
      
      {/* ================================================================= */}
      {/* TOP BAR                                                           */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/60 bg-[#0b132b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                {isTeacher ? 'EdTechra AI Exam Engine 2.0' : studentTakingExam?.title || 'Classroom Examination'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                Authoritative Marks Engine
              </span>
            </div>
            <p className="text-xs text-[#D7E3F4] font-medium">
              {isTeacher
                ? 'Create reusable exam templates, republish across classes, and view isolated performance analytics.'
                : 'Complete your assigned assessment within the allotted time.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isTeacher && !studentResult && studentTakingExam && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black border ${
              studentTimeRemaining <= 60
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 animate-pulse'
                : studentTimeRemaining <= 300
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTimer(studentTimeRemaining)}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 hover:text-white transition-all cursor-pointer border border-white/10"
            title="Close Exam Engine"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TEACHER DASHBOARD HEADER TABS                                     */}
      {/* ================================================================= */}
      {isTeacher && (
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-blue-900/40 bg-[#0e1738] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('creator');
                setCreatorStage('setup');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'creator'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-[#D7E3F4] hover:text-white hover:bg-[#162044]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Exam</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-exams')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'my-exams'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-[#D7E3F4] hover:text-white hover:bg-[#162044]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>My Exams ({previousExams.length})</span>
            </button>

            {selectedExamForResults && (
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'results'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                    : 'text-[#D7E3F4] hover:text-white hover:bg-[#162044]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Results & Analytics</span>
              </button>
            )}
          </div>

          {saveSuccessMsg && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 rounded-xl text-xs font-bold animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MAIN BODY SCROLLABLE AREA                                         */}
      {/* ================================================================= */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0b132b] text-white">
          
          {/* --------------------------------------------------------------- */}
          {/* TEACHER VIEW: 1. MY PREVIOUS EXAMS (TEMPLATES & PUBLICATIONS)   */}
          {/* --------------------------------------------------------------- */}
          {isTeacher && activeTab === 'my-exams' && (
            <div className="space-y-6">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-blue-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by exam title or topic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#0d1733] border border-blue-700/60 rounded-2xl text-xs font-semibold text-white placeholder:text-blue-200/50 focus:outline-hidden focus:border-indigo-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-blue-300" />
                  {(['all', 'published', 'draft', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize cursor-pointer transition-all ${
                        statusFilter === st
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-[#131f42] text-[#D7E3F4] border border-blue-800/60 hover:bg-[#1a2754] hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    onClick={loadTeacherExams}
                    className="p-2 bg-[#131f42] hover:bg-[#1a2754] text-[#D7E3F4] hover:text-white border border-blue-800/60 rounded-xl cursor-pointer transition-colors"
                    title="Refresh list"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Exams Cards Grid */}
              {isLoadingExams ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-xs font-bold text-[#D7E3F4]">Loading your previous examinations...</p>
                </div>
              ) : previousExams.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-blue-800/60 bg-[#131f42]/50 rounded-3xl p-8 space-y-4">
                  <div className="w-14 h-14 rounded-3xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-400 flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white">No Previous Exams Found</h3>
                    <p className="text-xs text-[#D7E3F4] font-medium max-w-sm mx-auto">
                      You haven't created any exams yet. Use our AI-powered generator to draft a complete test in seconds.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('creator');
                      setCreatorStage('setup');
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/25 cursor-pointer transition-all"
                  >
                    + Create Your First Exam
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {previousExams
                    .filter((e) => {
                      const matchSearch = (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
                      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((exam) => {
                      const isDraft = exam.status === 'draft';
                      const totalSubs = exam.submission_count || 0;
                      const classesList = exam.classes || (exam.classroom ? [exam.classroom] : []);

                      return (
                        <div
                          key={exam.id}
                          className="bg-[#131f42] rounded-3xl p-5 border border-blue-800/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group text-white"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isDraft
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/60'
                                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/60'
                              }`}>
                                {exam.status || 'Draft'}
                              </span>

                              <span className="text-[11px] text-[#D7E3F4]/70 font-semibold">
                                {new Date(exam.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                                {exam.title || 'Untitled Exam'}
                              </h4>
                              
                              {/* Assigned Classes Badge */}
                              <div className="flex items-center gap-1.5 mt-1">
                                <Users className="w-3 h-3 text-blue-300 shrink-0" />
                                <span className="text-xs text-[#D7E3F4] font-medium line-clamp-1">
                                  {classesList.length > 0
                                    ? `Classes: ${classesList.map((c: any) => c.title).join(', ')}`
                                    : 'Reusable Template (Not yet published)'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-2 border-y border-blue-900/50 text-center">
                              <div>
                                <span className="text-[10px] text-[#D7E3F4]/70 font-bold block">Duration</span>
                                <span className="text-xs font-black text-white">{exam.duration_minutes || 60}m</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#D7E3F4]/70 font-bold block">Marks</span>
                                <span className="text-xs font-black text-white">{exam.total_marks || 100}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-[#D7E3F4]/70 font-bold block">Submissions</span>
                                <span className="text-xs font-black text-indigo-300">{totalSubs}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {!isDraft ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRepublish(exam)}
                                  className="flex-1 py-2 px-2.5 bg-[#1a2754] hover:bg-[#22336e] text-indigo-200 border border-blue-700/50 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  title="Republish to other classes"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Republish</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    loadExamAnalytics(exam);
                                    setActiveTab('results');
                                  }}
                                  className="flex-1 py-2 px-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Results</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setGeneratedExam({
                                    metadata: {
                                      title: exam.title,
                                      totalMarks: exam.total_marks,
                                      duration: `${exam.duration_minutes} Minutes`,
                                      examType: exam.exam_type,
                                      difficulty: exam.difficulty,
                                      gradingMode: exam.grading_mode
                                    },
                                    sections: exam.questions_json || exam.questions || []
                                  });
                                  setRequiredTotal(exam.total_marks || 100);
                                  setCreatorStage('review');
                                  setActiveTab('creator');
                                }}
                                className="flex-1 py-2 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-indigo-500/25"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Continue Editing</span>
                              </button>
                            )}

                            {exam.r2_file_key && (
                              <button
                                type="button"
                                onClick={() => handleDownloadR2Report(exam.id, exam.r2_file_key)}
                                className="p-2 bg-[#1a2754] hover:bg-[#22336e] text-indigo-300 border border-blue-700/50 rounded-xl cursor-pointer transition-colors"
                                title="Download Cloudflare R2 PDF Report"
                              >
                                <Download className="w-3.5 h-3.5 text-indigo-400" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this exam?')) {
                                  await classroomExamService.deleteExam(exam.id);
                                  loadTeacherExams();
                                }
                              }}
                              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Delete Exam"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TEACHER VIEW: 2. EXAM CREATOR PIPELINE                          */}
          {/* --------------------------------------------------------------- */}
          {isTeacher && activeTab === 'creator' && (
            <div className="space-y-6">
              
              {/* Creator Stepper */}
              <div className="flex items-center justify-between px-5 py-3 bg-[#131f42] border border-blue-800/60 rounded-2xl shadow-sm">
                {[
                  { id: 'setup', num: '1', title: 'Exam Setup' },
                  { id: 'structure', num: '2', title: 'Question Structure' },
                  { id: 'review', num: '3', title: 'AI Review' },
                  { id: 'publish', num: '4', title: 'Publishing' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCreatorStage(s.id as any)}
                    className={`flex items-center gap-2 text-xs font-black transition-all cursor-pointer ${
                      creatorStage === s.id
                        ? 'text-white'
                        : 'text-[#D7E3F4]/70 hover:text-white'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                      creatorStage === s.id
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                        : 'bg-[#0d1733] text-blue-200 border border-blue-800/60'
                    }`}>
                      {s.num}
                    </span>
                    <span className="hidden sm:inline">{s.title}</span>
                  </button>
                ))}
              </div>

              {/* STAGE 1: SETUP */}
              {creatorStage === 'setup' && (
                <div className="space-y-5">
                  <div className="bg-[#131f42] p-5 rounded-3xl border border-blue-800/60 space-y-4 shadow-sm">
                    <label className="block text-xs font-black text-white uppercase tracking-wider">
                      Paste Topic, Notes, or Lesson Context
                    </label>
                    <textarea
                      rows={7}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste lesson context, reading comprehension passage, or topic notes for AI exam grounding..."
                      className="w-full p-4 bg-[#0d1733] border border-blue-700/60 rounded-2xl text-xs font-medium text-white placeholder:text-blue-200/50 focus:outline-hidden focus:border-indigo-400 leading-relaxed"
                    />

                    {/* Source File Upload with Cloudflare R2 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0d1733] rounded-2xl border border-blue-700/60">
                      <div className="flex items-center gap-3">
                        <Upload className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-white">Upload Source Notes Document</p>
                          <p className="text-[11px] text-[#D7E3F4]">PDF, DOCX, or TXT (Large files stored in Cloudflare R2)</p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.pdf,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-600/50 rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-xs"
                      >
                        {uploadedFileName ? uploadedFileName : 'Browse File'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60">
                      <label className="block text-xs font-extrabold text-white mb-1.5">Exam Type</label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                      >
                        {EXAM_TYPES.map((t) => <option key={t} value={t} className="bg-[#0d1733] text-white">{t}</option>)}
                      </select>
                    </div>

                    <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60">
                      <label className="block text-xs font-extrabold text-white mb-1.5">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                      >
                        {DIFFICULTIES.map((d) => <option key={d} value={d} className="bg-[#0d1733] text-white">{d}</option>)}
                      </select>
                    </div>

                    <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60">
                      <label className="block text-xs font-extrabold text-white mb-1.5">Duration</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={5}
                          value={durationValue}
                          onChange={(e) => setDurationValue(sanitizeNumericInput(e.target.value, 60, 5))}
                          className="w-20 p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                        />
                        <select
                          value={durationUnit}
                          onChange={(e) => setDurationUnit(e.target.value)}
                          className="flex-1 p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                        >
                          <option value="Minutes" className="bg-[#0d1733] text-white">Minutes</option>
                          <option value="Hours" className="bg-[#0d1733] text-white">Hours</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60">
                      <label className="block text-xs font-extrabold text-white mb-1.5">Total Marks Target</label>
                      <input
                        type="number"
                        min={10}
                        value={requiredTotal}
                        onChange={(e) => setRequiredTotal(sanitizeNumericInput(e.target.value, 100, 10))}
                        className="w-full p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setCreatorStage('structure')}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer transition-all"
                    >
                      <span>Proceed to Question Structure</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: QUESTION STRUCTURE */}
              {creatorStage === 'structure' && (
                <div className="space-y-5">
                  
                  {/* Mark Calculation Banner */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border ${
                    currentTotalMarks === requiredTotal
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-white'
                      : 'bg-[#162044] border-blue-700/60 text-white'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        currentTotalMarks === requiredTotal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            Current Marks: {currentTotalMarks} / {requiredTotal}
                          </span>
                          {currentTotalMarks === requiredTotal && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Balanced
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-[#D7E3F4] mt-0.5">
                          {currentTotalMarks === requiredTotal
                            ? '✓ Perfect mark balance achieved.'
                            : marksDifference > 0
                            ? `Difference: ${marksDifference} marks needed`
                            : `Difference: ${Math.abs(marksDifference)} marks over target`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerAutoBalance}
                        className="px-3.5 py-2 bg-[#1a2754] hover:bg-[#22336e] text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Auto Balance Marks</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSection}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-indigo-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Section</span>
                      </button>
                    </div>
                  </div>

                  {autoBalanceError && (
                    <div className="p-3.5 bg-amber-950/70 border border-amber-500/60 text-amber-200 rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{autoBalanceError}</span>
                    </div>
                  )}

                  {/* Section Cards */}
                  <div className="space-y-3">
                    {sections.map((section, idx) => {
                      const countVal = Number(section.count) || 0;
                      const marksVal = Number(section.marks) || 0;
                      const sectionSubtotal = countVal * marksVal;

                      return (
                        <div
                          key={section.id || idx}
                          className="p-4 bg-[#131f42] border border-blue-800/60 rounded-2xl space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">Section {idx + 1}</span>
                              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#0d1733] text-[#D7E3F4] border border-blue-800/50">
                                {countVal} Qs × {marksVal} Marks = {sectionSubtotal} Marks
                              </span>
                            </div>
                            {sections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSection(idx)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                                title="Delete Section"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-white mb-1">Question Type</label>
                              <select
                                value={section.type}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSections(prev => prev.map((s, i) => i === idx ? { ...s, type: val } : s));
                                }}
                                className="w-full p-2.5 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                              >
                                {QUESTION_TYPES.map(t => <option key={t} value={t} className="bg-[#0d1733] text-white">{t}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-white mb-1">Question Count</label>
                              <input
                                type="number"
                                min={1}
                                value={section.count}
                                onChange={(e) => {
                                  const val = sanitizeNumericInput(e.target.value, 1, 1);
                                  setSections(prev => prev.map((s, i) => i === idx ? { ...s, count: val } : s));
                                }}
                                className="w-full p-2.5 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-white mb-1">Marks per Question</label>
                              <input
                                type="number"
                                min={1}
                                value={section.marks}
                                onChange={(e) => {
                                  const val = sanitizeNumericInput(e.target.value, 10, 1);
                                  setSections(prev => prev.map((s, i) => i === idx ? { ...s, marks: val } : s));
                                }}
                                className="w-full p-2.5 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white focus:border-indigo-400"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-4 border-t border-blue-900/50">
                    <button
                      type="button"
                      onClick={() => setCreatorStage('setup')}
                      className="px-5 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-2xl text-xs font-bold cursor-pointer transition-all"
                    >
                      Back to Setup
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateExam}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate AI Exam Draft</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 3: AI REVIEW */}
              {creatorStage === 'review' && (
                <div className="space-y-5">
                  {isGenerating ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-indigo-400 animate-spin">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white">AI Exam Generator Active</h3>
                        <p className="text-xs text-[#D7E3F4] font-medium max-w-sm">
                          Structuring questions, balancing options, and preparing deterministic answer keys...
                        </p>
                      </div>
                    </div>
                  ) : generatedExam ? (
                    <div className="space-y-5">
                      
                      {/* Review Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#162044] border border-blue-800/60 rounded-2xl">
                        <div>
                          <h4 className="text-sm font-black text-white">{generatedExam.metadata?.title}</h4>
                          <p className="text-xs text-[#D7E3F4] font-bold">
                            {generatedExam.metadata?.totalMarks} Total Marks • {generatedExam.metadata?.duration} • {generatedExam.metadata?.gradingMode}
                          </p>
                        </div>

                        <label className="flex items-center gap-2 px-3.5 py-2 bg-[#0d1733] rounded-xl border border-indigo-500/50 text-xs font-black text-indigo-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isApproved}
                            onChange={(e) => setIsApproved(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Teacher Approved Draft</span>
                        </label>
                      </div>

                      {/* Sections and Questions */}
                      <div className="space-y-4">
                        {(generatedExam.sections || []).map((sec: any, sIdx: number) => (
                          <div key={sec.sectionId || sIdx} className="bg-[#131f42] border border-blue-800/60 rounded-3xl p-5 space-y-4 shadow-sm">
                            <div className="border-b border-blue-900/50 pb-3 flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-black text-white">{sec.title || sec.questionType}</h5>
                                <span className="text-[11px] text-[#D7E3F4] font-bold">
                                  {sec.questions?.length || 0} Questions • {sec.marksPerQuestion || sec.questions?.[0]?.marks || 10} Marks/Q • Subtotal: {sec.totalMarks || (sec.questions?.length * 10)} Marks
                                </span>
                              </div>
                            </div>

                            {sec.passage && (
                              <div className="p-4 bg-[#1c2a58] border border-amber-500/40 rounded-2xl text-sm sm:text-base text-blue-100 leading-relaxed font-medium">
                                <strong className="text-amber-300">Reading Passage:</strong> {sec.passage}
                              </div>
                            )}

                            <div className="space-y-4">
                              {(sec.questions || []).map((q: any, qIdx: number) => (
                                <div key={q.questionId || qIdx} className="p-4 sm:p-5 bg-[#0f1b3d] rounded-2xl border border-blue-800/60 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-black text-indigo-300">Question {qIdx + 1} ({q.marks} Marks)</span>
                                    <span className="text-xs text-[#D7E3F4] font-bold bg-[#0d1733] px-2.5 py-0.5 rounded-md border border-blue-700/50">{q.difficulty || 'Mixed'}</span>
                                  </div>
                                  <p className="text-base font-black text-white leading-relaxed">{q.questionText}</p>
                                  
                                  {/* Options for MCQs */}
                                  {q.options && q.options.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                      {q.options.map((opt: string, optIdx: number) => (
                                        <div
                                          key={optIdx}
                                          className={`p-3 rounded-xl text-sm font-semibold border ${
                                            opt === q.correctAnswer
                                              ? 'bg-emerald-950/70 text-emerald-200 border-emerald-500/70 font-bold'
                                              : 'bg-[#0d1733] text-white border-blue-800/50'
                                          }`}
                                        >
                                          {opt} {opt === q.correctAnswer && '✓'}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Correct answer tag */}
                                  {(!q.options || q.options.length === 0) && (
                                    <div className="text-xs sm:text-sm text-emerald-200 bg-emerald-950/70 p-2.5 rounded-xl font-bold border border-emerald-500/70">
                                      Answer: {q.correctAnswer}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-4 border-t border-blue-900/50">
                        <button
                          type="button"
                          onClick={() => setCreatorStage('structure')}
                          className="px-5 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-2xl text-xs font-bold cursor-pointer transition-all"
                        >
                          Back to Structure
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-2xl text-xs font-black cursor-pointer transition-all"
                          >
                            Save Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatorStage('publish')}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer transition-all"
                          >
                            <span>Proceed to Publishing</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : null}
                </div>
              )}

              {/* STAGE 4: PUBLISHING */}
              {creatorStage === 'publish' && (
                <div className="space-y-5">
                  <div className="bg-[#131f42] p-5 rounded-3xl border border-blue-800/60 space-y-4 shadow-sm">
                    <h4 className="text-sm font-black text-white">Publishing Configuration</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-white mb-1.5">Start Date & Time (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={publishSettings.startDate}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, startDate: e.target.value }))}
                            className="flex-1 p-2.5 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-semibold text-white focus:border-indigo-400"
                          />
                          <input
                            type="time"
                            value={publishSettings.startTime}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, startTime: e.target.value }))}
                            className="w-28 p-2.5 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-semibold text-white focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-white mb-1.5">End Date & Time (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={publishSettings.endDate}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, endDate: e.target.value }))}
                            className="flex-1 p-2.5 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-semibold text-white focus:border-indigo-400"
                          />
                          <input
                            type="time"
                            value={publishSettings.endTime}
                            onChange={(e) => setPublishSettings(prev => ({ ...prev, endTime: e.target.value }))}
                            className="w-28 p-2.5 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-semibold text-white focus:border-indigo-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <label className="flex items-center gap-2 p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white cursor-pointer hover:border-indigo-500/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={publishSettings.randomizeQuestions}
                          onChange={(e) => setPublishSettings(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Randomize Questions</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white cursor-pointer hover:border-indigo-500/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={publishSettings.randomizeOptions}
                          onChange={(e) => setPublishSettings(prev => ({ ...prev, randomizeOptions: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Randomize Options</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-bold text-white cursor-pointer hover:border-indigo-500/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={publishSettings.showMarksImmediately}
                          onChange={(e) => setPublishSettings(prev => ({ ...prev, showMarksImmediately: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Score on Submit</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-blue-900/50">
                    <button
                      type="button"
                      onClick={() => setCreatorStage('review')}
                      className="px-5 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-2xl text-xs font-bold cursor-pointer transition-all"
                    >
                      Back to AI Review
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-2xl text-xs font-black cursor-pointer transition-all"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={handlePublishExam}
                        disabled={isSaving}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSaving ? 'Publishing...' : 'Publish Exam to Classroom'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TEACHER VIEW: 3. RESULTS & STATISTICAL SCORE ANALYTICS          */}
          {/* --------------------------------------------------------------- */}
          {isTeacher && activeTab === 'results' && selectedExamForResults && (
            <div className="space-y-6">
              
              {/* Header card with Classroom Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#162044] text-white rounded-3xl shadow-lg border border-blue-800/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                      Score Analysis Dashboard
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0d1733] text-indigo-200 border border-blue-700/50">
                      {selectedExamForResults.total_marks || 100} Total Marks
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{selectedExamForResults.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Classroom Selector Dropdown for Republished Multi-Class Exams */}
                  {selectedExamForResults.classes && selectedExamForResults.classes.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-[#0d1733] p-1.5 rounded-2xl border border-blue-700/60">
                      <span className="text-[11px] font-bold text-[#D7E3F4] pl-2">Filter Class:</span>
                      <select
                        value={resultsClassroomFilter}
                        onChange={(e) => loadExamAnalytics(selectedExamForResults, e.target.value)}
                        className="p-2 bg-[#131f42] text-white rounded-xl text-xs font-black cursor-pointer border border-blue-700/60 outline-hidden"
                      >
                        <option value="all" className="bg-[#131f42] text-white">All Assigned Classes ({selectedExamForResults.classes.length})</option>
                        {selectedExamForResults.classes.map((c: any) => (
                          <option key={c.id} value={c.id} className="bg-[#131f42] text-white">{c.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {reportDownloadUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(reportDownloadUrl, '_blank')}
                      className="px-4 py-2.5 bg-[#1a2754] text-white hover:bg-[#22336e] border border-blue-700/50 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>Download Official PDF Report</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics row */}
              {analyticsData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60 text-center shadow-xs">
                    <span className="text-2xl font-black text-indigo-400">{analyticsData.average_score || 0}</span>
                    <span className="block text-[11px] font-bold text-[#D7E3F4] mt-1">Class Average</span>
                  </div>
                  <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60 text-center shadow-xs">
                    <span className="text-2xl font-black text-emerald-400">{analyticsData.pass_rate || 0}%</span>
                    <span className="block text-[11px] font-bold text-[#D7E3F4] mt-1">Passing Rate</span>
                  </div>
                  <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60 text-center shadow-xs">
                    <span className="text-2xl font-black text-cyan-400">{analyticsData.highest_score || 0}</span>
                    <span className="block text-[11px] font-bold text-[#D7E3F4] mt-1">Highest Score</span>
                  </div>
                  <div className="bg-[#131f42] p-4 rounded-2xl border border-blue-800/60 text-center shadow-xs">
                    <span className="text-2xl font-black text-purple-400">{analyticsData.total_students || (analyticsData.students?.length || 0)}</span>
                    <span className="block text-[11px] font-bold text-[#D7E3F4] mt-1">Submissions</span>
                  </div>
                </div>
              )}

              {/* Student leaderboard / results table */}
              <div className="bg-[#131f42] rounded-3xl p-5 border border-blue-800/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white">Student Performance Breakdown</h4>
                  <span className="text-xs font-bold text-[#D7E3F4]">
                    {analyticsData?.students?.length || 0} Attempts Recorded
                  </span>
                </div>
                
                <div className="divide-y divide-blue-900/40">
                  {isLoadingResults ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                      <p className="text-xs font-bold text-[#D7E3F4]">Loading submissions for class...</p>
                    </div>
                  ) : (analyticsData?.students || []).length === 0 ? (
                    <div className="py-10 text-center text-[#D7E3F4] text-xs font-medium">
                      No student submissions found for this class yet.
                    </div>
                  ) : (
                    (analyticsData?.students || []).map((s: any, idx: number) => {
                      const studentScore = Number(s.score || 0);
                      const totalMarks = Number(selectedExamForResults.total_marks || 100);
                      const pct = Number(s.percentage ?? (totalMarks > 0 ? ((studentScore / totalMarks) * 100).toFixed(1) : 0));
                      const isPassing = s.passed !== undefined ? Boolean(s.passed) : studentScore >= (totalMarks * 0.4);

                      return (
                        <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0d1733] border border-blue-700/50 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-black text-white">{s.name || s.student?.full_name || `Student ${idx + 1}`}</p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#D7E3F4] font-medium mt-0.5">
                                <span className="text-indigo-300 font-semibold">{s.classroom_title}</span>
                                <span>• {s.time_taken_minutes ? `${s.time_taken_minutes} mins` : 'Completed'}</span>
                                <span className="font-bold text-white">• {pct}%</span>
                                <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                                  isPassing ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300' : 'bg-rose-950/80 border border-rose-500/60 text-rose-300'
                                }`}>
                                  {isPassing ? 'Completed' : 'Needs Support'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-black ${
                              isPassing ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300' : 'bg-rose-950/80 border border-rose-500/60 text-rose-300'
                            }`}>
                              {studentScore} / {totalMarks}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* STUDENT VIEW: TAKING TIMED EXAM OR VIEWING RESULTS              */}
          {/* --------------------------------------------------------------- */}
          {!isTeacher && (
            <div className="space-y-6">
              
              {studentResult ? (
                /* Student Result Card */
                <div className="max-w-xl mx-auto py-6 text-center space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-3 py-1 rounded-full">
                      Exam Completed & Certified
                    </span>
                    <h3 className="text-xl font-black text-white pt-1">{studentTakingExam?.title || 'Classroom Assessment'}</h3>
                    <p className="text-xs text-[#D7E3F4] font-medium">
                      Your answers are evaluated and safely archived.
                    </p>
                  </div>

                  <div className="p-6 bg-[#131f42] rounded-3xl border border-blue-800/60 space-y-4">
                    <div className="text-4xl font-black text-white">
                      {studentResult.totalScore ?? studentResult.score ?? 0}{' '}
                      <span className="text-lg text-[#D7E3F4]">
                        / {studentResult.maxScore ?? studentResult.total_marks ?? 100}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="px-3 py-1 bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 rounded-full text-xs font-black">
                        {studentResult.percentage}% Score
                      </span>
                      <span className="px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 rounded-full text-xs font-black">
                        Grade {studentResult.grade || 'Pass'}
                      </span>
                      <span className="px-3 py-1 bg-amber-950/80 text-amber-300 border border-amber-500/60 rounded-full text-xs font-black flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        +{studentResult.totalScore ?? studentResult.score ?? 0} XP Earned
                      </span>
                    </div>

                    <div className="pt-2 flex flex-col items-center gap-1 text-xs font-bold text-[#D7E3F4]">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Result certified and saved to database</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <Check className="w-3.5 h-3.5" />
                        <span>Classroom leaderboard updated</span>
                      </div>
                    </div>

                    {studentResult.feedback && (
                      <p className="text-xs text-[#D7E3F4] font-medium italic pt-2 border-t border-blue-900/50">
                        "{studentResult.feedback}"
                      </p>
                    )}
                  </div>

                  {/* Question Breakdown Accordion */}
                  {Array.isArray(studentResult.breakdown) && studentResult.breakdown.length > 0 && (
                    <div className="text-left space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowStudentBreakdown((prev) => !prev)}
                        className="w-full px-4 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-2xl text-xs font-black flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span>{showStudentBreakdown ? 'Hide Question Breakdown' : 'View Question Breakdown & Answers'}</span>
                        <span className="text-[11px] text-[#D7E3F4] font-medium">
                          {studentResult.breakdown.filter((b: any) => b.isCorrect).length} / {studentResult.breakdown.length} Correct
                        </span>
                      </button>

                      {showStudentBreakdown && (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {studentResult.breakdown.map((item: any, bIdx: number) => (
                            <div
                              key={bIdx}
                              className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                                item.isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                                  : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                              }`}
                            >
                              <div className="flex items-center justify-between font-black">
                                <span className="text-white">Question {bIdx + 1} ({item.questionType || 'Question'})</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  item.isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}>
                                  {item.score} / {item.maxScore} Marks
                                </span>
                              </div>
                              <p className="text-[11px] text-[#D7E3F4] font-medium">
                                <span className="font-bold text-white">Your answer:</span> {String(item.submittedAnswer || '(No Answer)')}
                              </p>
                              {!item.isCorrect && item.correctAnswer && (
                                <p className="text-[11px] text-emerald-300 font-medium">
                                  <span className="font-bold text-white">Correct answer:</span> {String(item.correctAnswer)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black cursor-pointer shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                  >
                    Back to Classroom
                  </button>
                </div>
              ) : studentTakingExam ? (
                /* Student Taking Timed Exam */
                <div className="space-y-6">
                  
                  {((studentTakingExam.questions_json || [])).map((sec: any, secIdx: number) => (
                    <div key={secIdx} className="bg-[#131f42] rounded-3xl p-6 sm:p-7 border border-blue-800/60 space-y-5 shadow-sm text-white">
                      <div className="border-b border-blue-900/50 pb-3.5">
                        <h4 className="text-base sm:text-lg font-black text-white">{sec.title || sec.questionType}</h4>
                        {sec.passage && (
                          <div className="mt-3 p-4 sm:p-5 bg-[#1c2a58] border border-amber-500/40 rounded-2xl text-base sm:text-lg text-blue-100 leading-relaxed font-medium">
                            {sec.passage}
                          </div>
                        )}
                      </div>

                      <div className="space-y-5">
                        {(sec.questions || []).map((q: any, qIdx: number) => {
                          const qId = q.questionId || `q_${secIdx}_${qIdx}`;
                          const isMCQ = q.options && q.options.length > 0;
                          const isTF = q.questionType?.includes('True');

                          return (
                            <div key={qId} className="p-5 sm:p-6 bg-[#0f1b3d] rounded-2xl border border-blue-800/60 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm sm:text-base font-black text-indigo-300">
                                  Question {qIdx + 1}
                                </span>
                                <span className="text-xs sm:text-sm text-[#D7E3F4] font-bold bg-[#0d1733] px-2.5 py-1 rounded-lg border border-blue-700/50">{q.marks} Marks</span>
                              </div>

                              <p className="text-base sm:text-lg font-black text-white leading-relaxed">{q.questionText}</p>

                              {/* MCQ Options */}
                              {isMCQ && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {q.options.map((opt: string, optIdx: number) => (
                                    <label
                                      key={optIdx}
                                      className={`p-4 rounded-xl border text-sm sm:text-base font-bold flex items-center gap-3 cursor-pointer transition-all shadow-2xs ${
                                        studentAnswers[qId] === opt
                                          ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50 shadow-md'
                                          : 'bg-[#0d1733] text-white border-blue-800/60 hover:bg-[#162044]'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={qId}
                                        checked={studentAnswers[qId] === opt}
                                        onChange={() => handleStudentAnswerChange(qId, opt)}
                                        className="hidden"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {/* True / False Buttons */}
                              {isTF && (
                                <div className="flex gap-4 pt-1">
                                  {['True', 'False'].map((tf) => (
                                    <button
                                      key={tf}
                                      type="button"
                                      onClick={() => handleStudentAnswerChange(qId, tf)}
                                      className={`flex-1 py-3.5 sm:py-4 rounded-xl border text-sm sm:text-base font-black cursor-pointer transition-all ${
                                        studentAnswers[qId] === tf
                                          ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50 shadow-md'
                                          : 'bg-[#0d1733] text-white border-blue-800/60 hover:bg-[#162044]'
                                      }`}
                                    >
                                      {tf}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Text Input / Essay */}
                              {!isMCQ && !isTF && (
                                <textarea
                                  rows={4}
                                  placeholder="Type your answer here..."
                                  value={studentAnswers[qId] || ''}
                                  onChange={(e) => handleStudentAnswerChange(qId, e.target.value)}
                                  className="w-full p-4 bg-[#0d1733] border border-blue-700/60 rounded-xl text-base font-medium focus:outline-hidden focus:border-indigo-400 text-white placeholder:text-blue-200/50 leading-relaxed"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Submit Exam Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSubmitConfirm(true)}
                      disabled={isSubmittingStudent}
                      className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmittingStudent ? 'Submitting Answers...' : 'Submit Completed Exam'}</span>
                    </button>
                  </div>

                </div>
              ) : null}

            </div>
          )}

        </div>

        {/* ================================================================= */}
        {/* AUTO BALANCE REVIEW & CONFIRMATION MODAL                          */}
        {/* ================================================================= */}
        {autoBalanceProposal && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#0f1b3d] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-blue-800 animate-in zoom-in-95 text-white">
              <div className="flex items-center gap-3 border-b border-blue-900/60 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">Review Balanced Marks Distribution</h4>
                  <p className="text-xs text-[#D7E3F4] font-medium">
                    Question counts are preserved. The marks per question have been balanced to equal {autoBalanceProposal.target} marks.
                  </p>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="divide-y divide-blue-900/60 border border-blue-800/80 rounded-2xl overflow-hidden text-xs">
                <div className="bg-[#162044] p-2.5 font-black text-white grid grid-cols-12 gap-2">
                  <div className="col-span-5">Section & Type</div>
                  <div className="col-span-3 text-center">Questions</div>
                  <div className="col-span-4 text-right">Proposed Marks</div>
                </div>

                {autoBalanceProposal.sections.map((sec, sIdx) => {
                  const origSec = sections[sIdx] || {};
                  const count = Number(sec.count) || 1;
                  const newMarks = Number(sec.marks) || 10;
                  const origMarks = Number(origSec.marks) || 10;
                  const newTotal = count * newMarks;
                  const origTotal = count * origMarks;

                  return (
                    <div key={sIdx} className="p-3 grid grid-cols-12 gap-2 items-center bg-[#131f42]">
                      <div className="col-span-5">
                        <span className="font-black text-white block">Section {sIdx + 1}</span>
                        <span className="text-[11px] text-[#D7E3F4] font-medium line-clamp-1">{sec.type}</span>
                      </div>
                      <div className="col-span-3 text-center font-bold text-white">
                        {count} Qs (Unchanged)
                      </div>
                      <div className="col-span-4 text-right">
                        <span className="font-black text-indigo-300 block">{newMarks} Marks/Q (= {newTotal})</span>
                        <span className="text-[10px] text-blue-300/70">was {origMarks} M/Q (= {origTotal})</span>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-[#162044] p-3 flex items-center justify-between font-black text-white">
                  <span>Balanced Total:</span>
                  <span className="text-sm text-emerald-300 font-black">{autoBalanceProposal.target} Marks (Target Achieved)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAutoBalanceProposal(null)}
                  className="flex-1 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-xl text-xs font-black cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyAutoBalance}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/25 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Proposed Marks</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* REPUBLISH EXAM MODAL DIALOG                                       */}
        {/* ================================================================= */}
        {republishModalOpen && examToRepublish && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#0f1b3d] rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl border border-blue-800 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 text-white">
              
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Republish Exam to Classes</h4>
                    <p className="text-xs text-[#D7E3F4] font-medium">
                      Assign "{examToRepublish.title}" to additional classrooms as a fresh assessment.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRepublishModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Exam Info Summary */}
              <div className="p-3.5 bg-[#162044] border border-blue-800/60 rounded-2xl flex items-center justify-between text-xs font-bold text-white">
                <div>
                  <span className="font-black text-white">{examToRepublish.title}</span>
                  <span className="block text-[11px] text-indigo-300 font-semibold">{examToRepublish.exam_type || 'Unit Test'} • {examToRepublish.total_marks} Marks</span>
                </div>
                <span className="px-2.5 py-1 bg-[#0d1733] border border-blue-700/50 rounded-xl text-indigo-300 shadow-xs font-black">
                  Version {examToRepublish.version || 1}
                </span>
              </div>

              {/* Classroom Checkbox Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-white uppercase tracking-wider">
                  Select Target Classroom(s)
                </label>

                {teacherClassrooms.length === 0 ? (
                  <p className="text-xs text-[#D7E3F4]/70 italic">Loading your classrooms...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {teacherClassrooms.map((cls: any) => {
                      const isAlreadyPublished = (examToRepublish.classes || []).some((c: any) => c.id === cls.id);
                      const isChecked = selectedClassroomIds.includes(cls.id);

                      return (
                        <label
                          key={cls.id}
                          className={`p-3 rounded-2xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[#1a2754] border-indigo-400 font-black text-white'
                              : 'bg-[#131f42] border-blue-800 font-medium text-[#D7E3F4] hover:bg-[#162044]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClassroomIds(prev => [...prev, cls.id]);
                                } else {
                                  setSelectedClassroomIds(prev => prev.filter(id => id !== cls.id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="block font-bold text-white">{cls.title}</span>
                              <span className="text-[10px] text-[#D7E3F4]">{cls.subject || 'All Subjects'} • {cls.grade || 'Standard'}</span>
                            </div>
                          </div>

                          {isAlreadyPublished && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 rounded-md shrink-0">
                              Active
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assignment Custom Settings */}
              <div className="p-4 bg-[#131f42] rounded-2xl border border-blue-800/60 space-y-3">
                <h5 className="text-xs font-black text-white uppercase tracking-wider">Schedule & Policies for this Publication</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-white mb-1">Start Date & Time (Optional)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={republishSettings.startDate}
                        onChange={(e) => setRepublishSettings(prev => ({ ...prev, startDate: e.target.value }))}
                        className="flex-1 p-2 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-medium text-white focus:border-indigo-400"
                      />
                      <input
                        type="time"
                        value={republishSettings.startTime}
                        onChange={(e) => setRepublishSettings(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-24 p-2 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-medium text-white focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-white mb-1">End Date & Time (Optional)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={republishSettings.endDate}
                        onChange={(e) => setRepublishSettings(prev => ({ ...prev, endDate: e.target.value }))}
                        className="flex-1 p-2 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-medium text-white focus:border-indigo-400"
                      />
                      <input
                        type="time"
                        value={republishSettings.endTime}
                        onChange={(e) => setRepublishSettings(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-24 p-2 bg-[#0d1733] border border-blue-700/60 rounded-xl text-xs font-medium text-white focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2 bg-[#0d1733] rounded-xl border border-blue-700/60 text-xs font-bold text-white cursor-pointer hover:border-indigo-500/60">
                    <input
                      type="checkbox"
                      checked={republishSettings.showMarksImmediately}
                      onChange={(e) => setRepublishSettings(prev => ({ ...prev, showMarksImmediately: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Show Score Immediately</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#0d1733] rounded-xl border border-blue-700/60 text-xs font-bold text-white cursor-pointer hover:border-indigo-500/60">
                    <input
                      type="checkbox"
                      checked={republishSettings.randomizeQuestions}
                      onChange={(e) => setRepublishSettings(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Randomize Questions</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={() => setRepublishModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-xl text-xs font-black cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRepublish}
                  disabled={isRepublishing || selectedClassroomIds.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/25 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isRepublishing ? 'Republishing...' : `Publish to ${selectedClassroomIds.length} Selected Class(es)`}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Confirmation Modal for Student Submission */}
        {showSubmitConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#0f1b3d] rounded-3xl p-6 max-w-sm w-full space-y-4 text-center border border-blue-800 animate-in zoom-in-95 text-white">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-400 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-white">Ready to Submit?</h4>
                <p className="text-xs text-[#D7E3F4] font-medium">
                  Once submitted, your answers will be finalized and evaluated by the AI grading engine.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-2.5 bg-[#1a2754] hover:bg-[#22336e] text-white border border-blue-700/50 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Keep Reviewing
                </button>
                <button
                  type="button"
                  onClick={handleStudentSubmitAuto}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-indigo-500/25 transition-all"
                >
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
};
