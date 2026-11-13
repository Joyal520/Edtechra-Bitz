import React, { useState } from 'react';
import {
  Clock,
  Hourglass,
  Volume2,
  VolumeX,
  Menu,
  Share2,
  X,
  Check,
  XCircle,
  Lock,
  ChevronRight,
  Users
} from 'lucide-react';

// ============================================================================
// EDTECHRA LIVE QUIZ — REUSABLE DESIGN SYSTEM COMPONENTS
// Palette:
//   Primary Cyan:   #08AEEF
//   Primary Blue:   #087CF5
//   Deep Navy Text: #10245A
//   Light Blue:     #EAF7FF
//   Background:     #F5FBFF
//   White:          #FFFFFF
//   Success Green:  #18B981
//   Gold:           #F7B928
//   Silver:         #AFC2D8
//   Bronze:         #E99A62
//   Danger/Pink:    #F43F7A
// ============================================================================

const AVATAR_PALETTE = [
  'bg-[#9353D3]', // Purple (#4)
  'bg-[#0E9F8A]', // Teal (#5)
  'bg-[#EC4899]', // Pink (#6)
  'bg-[#087CF5]', // Blue (#7)
  'bg-[#F59E0B]', // Orange (#8)
  'bg-[#10B981]', // Green (#9)
  'bg-[#F43F5E]', // Coral/Rose (#10)
  'bg-[#06B6D4]'  // Cyan
];

export const getAvatarInitial = (name?: string | null, singleLetter = true): string => {
  if (!name || !name.trim()) return 'S';
  const clean = name.trim();
  if (singleLetter) {
    return clean[0].toUpperCase();
  }
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

// ----------------------------------------------------------------------------
// 1. Timer Component
// ----------------------------------------------------------------------------
export interface TimerProps {
  seconds: number;
  variant?: 'pill' | 'inline';
  urgentThreshold?: number;
}

export const formatTimerMMSS = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
};

export const Timer: React.FC<TimerProps> = ({
  seconds,
  variant = 'pill',
  urgentThreshold = 5
}) => {
  const isUrgent = seconds <= urgentThreshold && seconds > 0;

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-extrabold text-xs sm:text-sm tabular-nums transition-colors ${
          isUrgent ? 'text-[#F43F7A] animate-pulse' : 'text-[#087CF5]'
        }`}
        aria-label={`${seconds} seconds remaining`}
      >
        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
        <span>{seconds}s</span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full border text-xs sm:text-sm font-extrabold tabular-nums transition-colors ${
        isUrgent
          ? 'bg-[#FFF1F5] border-[#FECDD3] text-[#F43F7A] animate-pulse'
          : 'bg-[#EEF5FC] border-[#DCEBFA] text-[#10245A]'
      }`}
      aria-label={`Timer ${formatTimerMMSS(seconds)}`}
    >
      <Hourglass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1E3A8A] shrink-0" />
      <span>{formatTimerMMSS(seconds)}</span>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 2. ShareButton & ExitButton Components
// ----------------------------------------------------------------------------
export interface ShareButtonProps {
  onClick: () => void;
  copied?: boolean;
  label?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  onClick,
  copied = false,
  label = 'Share'
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white hover:bg-[#F0F8FF] active:scale-95 border border-[#CDE4FA] text-[#087CF5] text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(8,124,245,0.06)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#087CF5]/30"
    title="Share Quiz Results"
  >
    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#087CF5]" />
    <span>{copied ? 'Copied!' : label}</span>
  </button>
);

export interface ExitButtonProps {
  onClick: () => void;
  label?: string;
}

export const ExitButton: React.FC<ExitButtonProps> = ({
  onClick,
  label = 'Exit'
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#F43F7A] to-[#E11D62] hover:brightness-105 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-[0_6px_16px_rgba(244,63,122,0.28)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F43F7A]/40"
    title={label}
  >
    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
    <span>{label}</span>
  </button>
);

// ----------------------------------------------------------------------------
// 3. QuizHeader Component
// ----------------------------------------------------------------------------
export interface QuizHeaderProps {
  subtitle?: string;
  uppercaseBrand?: boolean;
  isMuted?: boolean;
  onToggleSound?: () => void;
  timerSeconds?: number | null;
  onMenuClick?: () => void;
  rightSlot?: React.ReactNode;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({
  subtitle,
  uppercaseBrand = true,
  isMuted = false,
  onToggleSound,
  timerSeconds,
  onMenuClick,
  rightSlot
}) => {
  return (
    <header className="flex items-center justify-between gap-2 sm:gap-3 w-full">
      {/* Left: Optional Menu Button + EdTechra Logo + Brand Text */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EEF5FC] hover:bg-[#E1EEF9] active:scale-95 text-[#10245A] flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-[#087CF5]/30"
            aria-label="Quiz menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </button>
        )}

        <img
          src="/logo.png"
          alt="EdTechra"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-xs shrink-0"
        />

        <div className="min-w-0">
          <div
            className={`font-extrabold text-[#10245A] leading-tight tracking-tight truncate ${
              subtitle ? 'text-base sm:text-lg' : 'text-base sm:text-lg tracking-wide'
            }`}
          >
            {uppercaseBrand ? 'EDTECHRA' : 'EdTechra'}
          </div>
          {subtitle && (
            <div className="text-[10px] sm:text-[11px] font-extrabold text-[#087CF5] uppercase tracking-wider leading-none mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right: Sound Button + Timer Pill + Custom Slot */}
      <div className="flex items-center gap-2 shrink-0">
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#087CF5]/30 ${
              isMuted
                ? 'bg-[#FFF1F5] text-[#F43F7A] hover:bg-[#FFE4EC]'
                : 'bg-[#DDF0FF] text-[#087CF5] hover:bg-[#CBE7FF]'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            ) : (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            )}
          </button>
        )}

        {typeof timerSeconds === 'number' && (
          <Timer seconds={timerSeconds} variant="pill" urgentThreshold={10} />
        )}

        {rightSlot}
      </div>
    </header>
  );
};

// ----------------------------------------------------------------------------
// 4. QuizProgress Component
// ----------------------------------------------------------------------------
export interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  category: string;
  points: number;
  questionTimeLeft?: number | null;
  streak?: number;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  currentQuestion,
  totalQuestions,
  category,
  points,
  questionTimeLeft,
  streak = 0
}) => {
  const safeTotal = Math.max(1, totalQuestions);
  const progressPct = Math.min(100, Math.max(6, Math.round((currentQuestion / safeTotal) * 100)));

  return (
    <div className="w-full space-y-2.5 sm:space-y-3">
      {/* Thin Progress Bar with Cyan-to-Blue Gradient */}
      <div className="w-full h-2 sm:h-2.5 bg-[#E6F0FA] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#087CF5] to-[#08AEEF] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Meta Row: Question X of Y • Category | Points Badge + Countdown */}
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
          <span className="font-extrabold text-[#10245A] whitespace-nowrap">
            Question {currentQuestion} of {safeTotal}
          </span>
          <span className="text-[#7BA7D7] font-black">•</span>
          <span className="font-bold text-[#087CF5] truncate">{category}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {streak > 1 && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-extrabold text-[11px]">
              🔥 {streak}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-[#E5F2FF] text-[#10245A] font-extrabold text-xs sm:text-sm tabular-nums">
            {points} pts
          </span>
          {typeof questionTimeLeft === 'number' && questionTimeLeft < 3600 && (
            <Timer seconds={questionTimeLeft} variant="inline" urgentThreshold={5} />
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 5. QuestionCard Component
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// 5. Question Instruction Parser & QuestionCard Component (Part 5)
// Automatically detects instructional text before the first colon (:) and
// highlights it with bold typography and primary theme colour (#087CF5).
// ----------------------------------------------------------------------------
export function parseQuestionInstruction(questionText: string): {
  instruction: string | null;
  body: string;
} {
  if (!questionText || typeof questionText !== 'string') {
    return { instruction: null, body: '' };
  }

  const colonIdx = questionText.indexOf(':');
  if (colonIdx <= 0) {
    return { instruction: null, body: questionText };
  }

  const prefix = questionText.slice(0, colonIdx).trim();
  const remainder = questionText.slice(colonIdx + 1);

  // Validate that prefix is a genuine instructional phrase on the first line
  // (not a URL scheme like http:/https:, not a bare number/timestamp like 12:30,
  // and has remaining question text after the colon).
  if (
    prefix.length < 2 ||
    prefix.length > 100 ||
    prefix.includes('\n') ||
    /^https?$/i.test(prefix) ||
    /^\d+$/.test(prefix) ||
    remainder.trim().length === 0
  ) {
    return { instruction: null, body: questionText };
  }

  return {
    instruction: `${prefix}:`,
    body: remainder.replace(/^[ \t]+/, '')
  };
}

export const FormattedQuestionText: React.FC<{
  text: string;
  className?: string;
  instructionClassName?: string;
  bodyClassName?: string;
}> = ({
  text,
  className = '',
  instructionClassName = 'font-extrabold text-[#087CF5]',
  bodyClassName = 'font-normal text-[#10245A]'
}) => {
  const { instruction, body } = parseQuestionInstruction(text);

  if (!instruction) {
    return (
      <span className={`whitespace-pre-line break-words font-semibold text-[#10245A] ${className}`}>
        {body}
      </span>
    );
  }

  return (
    <span className={`whitespace-pre-line break-words ${className}`}>
      <strong className={`${instructionClassName} mr-1.5`}>{instruction}</strong>
      <span className={bodyClassName}>{body}</span>
    </span>
  );
};

export interface QuestionCardProps {
  question: string;
  imageUrl?: string | null;
  children?: React.ReactNode;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  imageUrl,
  children
}) => {
  return (
    <div className="w-full bg-white rounded-[24px] p-4 sm:p-6 border border-[#E6F1FC] shadow-[0_8px_30px_rgba(16,36,90,0.04)] flex flex-col justify-between space-y-4 sm:space-y-5">
      <div className="pt-1 sm:pt-2 pb-1 text-center">
        {imageUrl && (
          <div className="mb-4 max-h-44 overflow-hidden rounded-2xl mx-auto flex items-center justify-center bg-[#F5FBFF] border border-[#E2EEF9] p-2">
            <img
              src={imageUrl}
              alt="Question visual"
              className="max-h-40 w-auto object-contain rounded-xl"
            />
          </div>
        )}
        <h1 className="text-[20px] sm:text-[24px] md:text-[26px] text-[#10245A] tracking-tight leading-[1.35] px-1">
          <FormattedQuestionText text={question} />
        </h1>
      </div>

      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// 6. AnswerOption Component
// ----------------------------------------------------------------------------
const ANSWER_BADGE_STYLES = [
  { label: 'A', bg: 'bg-[#EDE9FE]', text: 'text-[#6D28D9]' },
  { label: 'B', bg: 'bg-[#D8F0FF]', text: 'text-[#0284C7]' },
  { label: 'C', bg: 'bg-[#FEF0C7]', text: 'text-[#B45309]' },
  { label: 'D', bg: 'bg-[#CBEBFF]', text: 'text-[#087CF5]' }
];

export interface AnswerOptionProps {
  index: number;
  text: string;
  selected: boolean;
  disabled?: boolean;
  isRevealed?: boolean;
  isCorrectOption?: boolean;
  isIncorrectSelection?: boolean;
  feedbackState?: 'correct' | 'incorrect' | null;
  onSelect: () => void;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  index,
  text,
  selected,
  disabled = false,
  isRevealed = false,
  isCorrectOption = false,
  isIncorrectSelection = false,
  feedbackState = null,
  onSelect
}) => {
  const badge = ANSWER_BADGE_STYLES[index] || ANSWER_BADGE_STYLES[0];

  let containerStyle =
    'bg-white hover:bg-[#F8FCFF] border border-[#E2EDF8] hover:border-[#99CEFF] text-[#10245A] shadow-[0_2px_8px_rgba(16,36,90,0.02)]';

  if (isRevealed) {
    if (isCorrectOption) {
      containerStyle =
        'bg-[#ECFDF5] border-2 border-[#18B981] text-[#065F46] shadow-[0_6px_18px_rgba(24,185,129,0.14)] scale-[1.01]';
    } else if (isIncorrectSelection) {
      containerStyle =
        'bg-[#FFF1F5] border-2 border-[#F43F7A] text-[#9F1239] shadow-[0_4px_14px_rgba(244,63,122,0.12)]';
    } else {
      containerStyle =
        'bg-[#F8FAFC] border border-[#E2EDF8] text-[#64748B] opacity-65';
    }
  } else if (feedbackState === 'correct' && selected) {
    containerStyle =
      'bg-[#ECFDF5] border-2 border-[#18B981] text-[#065F46] shadow-[0_6px_20px_rgba(24,185,129,0.20)] scale-[1.015] animate-lq-success-pop';
  } else if (feedbackState === 'incorrect' && selected) {
    containerStyle =
      'bg-[#FFF1F5] border-2 border-[#F43F7A] text-[#9F1239] shadow-[0_4px_14px_rgba(244,63,122,0.14)] animate-lq-gentle-nudge';
  } else if (selected) {
    containerStyle =
      'bg-[#EDF8FF] border-2 border-[#0884F7] text-[#10245A] shadow-[0_6px_20px_rgba(8,132,247,0.14)] scale-[1.01]';
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full min-h-[58px] sm:min-h-[64px] px-3.5 sm:px-4 py-3 rounded-[18px] sm:rounded-[20px] text-left flex items-center justify-between gap-3.5 transition-all duration-150 ${
        disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
      } focus:outline-none focus:ring-2 focus:ring-[#087CF5]/35 ${containerStyle}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Letter Badge */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 transition-transform ${
            selected && !isRevealed
              ? 'bg-[#BCE3FF] text-[#087CF5] scale-105'
              : `${badge.bg} ${badge.text}`
          }`}
        >
          {badge.label}
        </div>

        {/* Answer Text */}
        <span className="text-[15px] sm:text-[17px] font-bold leading-snug break-words">
          {text}
        </span>
      </div>

      {/* Right Radio / Status Indicator */}
      <div className="shrink-0 flex items-center justify-center">
        {(isRevealed && isCorrectOption) || (!isRevealed && feedbackState === 'correct' && selected) ? (
          <div className="w-6 h-6 rounded-full bg-[#18B981] text-white flex items-center justify-center shadow-xs">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        ) : (isRevealed && isIncorrectSelection) || (!isRevealed && feedbackState === 'incorrect' && selected) ? (
          <div className="w-6 h-6 rounded-full bg-[#F43F7A] text-white flex items-center justify-center shadow-xs">
            <XCircle className="w-4 h-4 stroke-[2.5]" />
          </div>
        ) : selected ? (
          <div className="w-6 h-6 rounded-full border-2 border-[#0884F7] bg-white flex items-center justify-center shadow-[0_0_8px_rgba(8,132,247,0.25)]">
            <div className="w-3 h-3 rounded-full bg-[#0884F7]" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-[#CBD8E8] bg-white" />
        )}
      </div>
    </button>
  );
};

// ----------------------------------------------------------------------------
// 7. SubmitButton Component
// ----------------------------------------------------------------------------
export interface SubmitButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isLocked?: boolean;
  isReveal?: boolean;
  label?: string;
  loadingLabel?: string;
  lockedLabel?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  isLocked = false,
  isReveal = false,
  label = 'Submit Answer',
  loadingLabel = 'Submitting...',
  lockedLabel = 'Answer Locked • Waiting for players...'
}) => {
  return (
    <button
      type="button"
      disabled={disabled || isLoading || isLocked || isReveal}
      onClick={onClick}
      className={`w-full py-3.5 sm:py-4 px-6 rounded-full font-extrabold text-[15px] sm:text-[17px] tracking-wide flex items-center justify-center gap-2 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-[#087CF5]/25 ${
        isLocked && !isReveal
          ? 'bg-[#EAF7FF] border-2 border-[#BCE3FF] text-[#087CF5] cursor-default'
          : isReveal
          ? 'bg-[#EEF5FC] border border-[#DCEBFA] text-[#64748B] cursor-default'
          : isLoading
          ? 'bg-gradient-to-r from-[#087CF5] to-[#08AEEF] opacity-80 text-white cursor-wait'
          : disabled
          ? 'bg-gradient-to-r from-[#087CF5]/45 to-[#08AEEF]/45 text-white cursor-not-allowed shadow-none'
          : 'bg-gradient-to-r from-[#087CF5] via-[#0895F3] to-[#08AEEF] hover:brightness-105 text-white shadow-[0_10px_25px_rgba(8,124,245,0.32)] active:scale-[0.98] cursor-pointer'
      }`}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{loadingLabel}</span>
        </span>
      ) : isLocked && !isReveal ? (
        <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold">
          <Lock className="w-4 h-4" />
          <span>{lockedLabel}</span>
        </span>
      ) : isReveal ? (
        <span className="text-xs sm:text-sm font-bold">Next question coming up...</span>
      ) : (
        <span className="inline-flex items-center gap-2">
          <span>{label}</span>
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </span>
      )}
    </button>
  );
};

// ----------------------------------------------------------------------------
// 8. PlayerAvatar & PlayerCard Components
// ----------------------------------------------------------------------------
export interface PlayerAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  colorIndex?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  ringClassName?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  avatarUrl,
  colorIndex = 0,
  size = 'md',
  showOnline = false,
  ringClassName = 'border-2 border-white shadow-xs'
}) => {
  const [imgError, setImgError] = useState(false);
  const bgClass = AVATAR_PALETTE[Math.abs(colorIndex) % AVATAR_PALETTE.length];

  const sizeMap = {
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl',
    xl: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl'
  };

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${sizeMap[size]} rounded-full ${bgClass} text-white font-extrabold flex items-center justify-center overflow-hidden ${ringClassName}`}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={name || 'Player'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{getAvatarInitial(name, true)}</span>
        )}
      </div>
      {showOnline && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#18B981] border-2 border-white"
          title="Online"
        />
      )}
    </div>
  );
};

export interface PlayerCardProps {
  name: string;
  avatarUrl?: string | null;
  index: number;
  statusText?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  avatarUrl,
  index,
  statusText = 'Ready'
}) => {
  return (
    <div
      style={{ animationDelay: `${Math.min(index * 40, 280)}ms` }}
      className="animate-lq-row flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#F8FBFF] hover:bg-[#F0F8FF] border border-[#E2EEF9] transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        <PlayerAvatar
          name={name}
          avatarUrl={avatarUrl}
          colorIndex={index}
          size="sm"
          showOnline={true}
        />
        <span className="text-xs sm:text-sm font-extrabold text-[#10245A] truncate">
          {name}
        </span>
      </div>

      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-[11px] font-extrabold shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#18B981]" />
        <span>{statusText}</span>
      </span>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 9. Podium & PodiumPlayer Components (Tournament Stage Finale)
// ----------------------------------------------------------------------------
const CrownIcon: React.FC<{ rank: 1 | 2 | 3; animated?: boolean }> = ({ rank, animated = false }) => {
  const colors = {
    1: {
      fill: 'url(#goldCrownGrad)',
      stroke: '#D97706',
      size: `w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_6px_16px_rgba(250,204,21,0.65)] ${
        animated ? 'animate-lq-crown' : ''
      }`
    },
    2: {
      fill: 'url(#silverCrownGrad)',
      stroke: '#94A3B8',
      size: 'w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_4px_10px_rgba(148,163,184,0.45)]'
    },
    3: {
      fill: 'url(#bronzeCrownGrad)',
      stroke: '#B45309',
      size: 'w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_4px_10px_rgba(234,88,12,0.45)]'
    }
  }[rank];

  return (
    <svg viewBox="0 0 32 26" className={colors.size} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="goldCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="silverCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="bronzeCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <path
        d="M3 20L1 6L9.5 12L16 2L22.5 12L31 6L29 20H3Z"
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="11.5" r="2" fill="#FFFBEB" opacity="0.9" />
      <rect
        x="3"
        y="21.5"
        width="26"
        height="3.5"
        rx="1.75"
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="1"
      />
    </svg>
  );
};

const ChampionTrophySvg: React.FC<{ className?: string }> = ({ className = 'w-6 h-6 sm:w-7 sm:h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="goldTrophyCup" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="55%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
    </defs>
    <path
      d="M10 6H26V14C26 18.4183 22.4183 22 18 22C13.5817 22 10 18.4183 10 14V6Z"
      fill="url(#goldTrophyCup)"
      stroke="#92400E"
      strokeWidth="1.4"
    />
    <path
      d="M10 9H6.5C5.1 9 4 10.1 4 11.5C4 14 5.8 16 8.5 16.5L10 16.7"
      stroke="#D97706"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M26 9H29.5C30.9 9 32 10.1 32 11.5C32 14 30.2 16 27.5 16.5L26 16.7"
      stroke="#D97706"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <rect x="16" y="22" width="4" height="5.5" fill="#B45309" />
    <rect x="11.5" y="27.5" width="13" height="3.5" rx="1.5" fill="#92400E" stroke="#FDE047" strokeWidth="0.9" />
    <circle cx="18" cy="13" r="2.2" fill="#FFFBEB" opacity="0.85" />
  </svg>
);

const SilverBronzeMedalCrest: React.FC<{ rank: 2 | 3 }> = ({ rank }) => {
  const isSilver = rank === 2;
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full shadow-sm border ${
        isSilver
          ? 'bg-gradient-to-b from-[#F8FAFC] to-[#CBD5E1] border-white text-[#334155]'
          : 'bg-gradient-to-b from-[#FFEDD5] to-[#EA580C] border-[#FED7AA] text-white'
      } text-[10px] font-black mb-1`}
      aria-hidden="true"
    >
      {isSilver ? 'II' : 'III'}
    </span>
  );
};

export interface PodiumPlayerData {
  id: string;
  name: string;
  avatarUrl?: string | null;
  score: number;
  correctCount?: number;
}

export interface PodiumPlayerProps {
  player: PodiumPlayerData;
  rank: 1 | 2 | 3;
  revealStage?: number;
}

export const PodiumPlayer: React.FC<PodiumPlayerProps> = ({
  player,
  rank,
  revealStage = 3
}) => {
  const isFirst = rank === 1;
  const isSecond = rank === 2;

  const isRevealed =
    rank === 3 ? revealStage >= 1 : rank === 2 ? revealStage >= 2 : revealStage >= 3;

  const avatarGlow = isFirst
    ? 'bg-[#FACC15]/45'
    : isSecond
    ? 'bg-[#93C5FD]/30'
    : 'bg-[#FB923C]/30';

  const avatarRing = isFirst
    ? 'border-4 border-[#FDE047] ring-4 ring-[#FACC15]/75 shadow-[0_0_28px_rgba(250,204,21,0.6)]'
    : isSecond
    ? 'border-4 border-[#F1F5F9] ring-4 ring-[#93C5FD]/55 shadow-[0_0_20px_rgba(147,197,253,0.4)]'
    : 'border-4 border-[#FED7AA] ring-4 ring-[#FB923C]/50 shadow-[0_0_20px_rgba(251,146,60,0.4)]';

  const badgeStyle = isFirst
    ? 'bg-gradient-to-b from-[#FEF08A] via-[#FACC15] to-[#EAB308] border border-[#FFFBEB] text-[#10245A] text-xs sm:text-sm px-3 py-0.5'
    : isSecond
    ? 'bg-gradient-to-b from-[#F8FAFC] to-[#CBD5E1] border border-white text-[#10245A] text-[11px] sm:text-xs px-2.5 py-0.5'
    : 'bg-gradient-to-b from-[#FED7AA] to-[#EA580C] border border-[#FFEDD5] text-white text-[11px] sm:text-xs px-2.5 py-0.5';

  const upperPedestalStyle = isFirst
    ? 'bg-gradient-to-b from-[#FEF9C3] via-[#FDE047] to-[#EAB308] border-t-2 border-x border-[#FEFCE8] shadow-[0_-10px_30px_rgba(250,204,21,0.38)] pt-3.5 pb-2.5 sm:pt-4 sm:pb-3'
    : isSecond
    ? 'bg-gradient-to-b from-[#F8FAFC] via-[#E2E8F0] to-[#94A3B8] border-t-2 border-x border-white shadow-[0_-6px_20px_rgba(148,163,184,0.28)] pt-3 pb-2 sm:pt-3.5 sm:pb-2.5'
    : 'bg-gradient-to-b from-[#FFEDD5] via-[#FDBA74] to-[#C2410C] border-t-2 border-x border-[#FFF7ED] shadow-[0_-6px_20px_rgba(234,88,12,0.28)] pt-3 pb-2 sm:pt-3.5 sm:pb-2.5';

  const lowerPedestalStyle = isFirst
    ? 'h-10 sm:h-12 bg-gradient-to-r from-[#CA8A04] via-[#FACC15] to-[#A16207] border-t border-[#FEF08A]/90'
    : isSecond
    ? 'h-5 sm:h-6 bg-gradient-to-r from-[#64748B] via-[#CBD5E1] to-[#475569] border-t border-white/80'
    : 'h-4 sm:h-5 bg-gradient-to-r from-[#9A3412] via-[#FB923C] to-[#7C2D12] border-t border-[#FFEDD5]/80';

  const colorIndex = isFirst ? 3 : isSecond ? 1 : 6;

  return (
    <div
      data-podium-rank={rank}
      data-revealed={isRevealed ? 'true' : 'false'}
      className={`flex-1 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isFirst ? 'max-w-[162px] sm:max-w-[184px] -mx-1 z-20' : 'max-w-[132px] sm:max-w-[152px] z-10'
      } ${
        isRevealed
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-12 scale-90 pointer-events-none'
      }`}
    >
      {/* Crown */}
      <div className={`mb-1.5 ${isRevealed ? 'animate-lq-float' : ''}`}>
        <CrownIcon rank={rank} animated={isFirst && isRevealed} />
      </div>

      {/* Circular Avatar + Spotlight Aura + Orbiting Sparkles (Champion) + Overlapping Rank Pill */}
      <div className="relative mb-2.5">
        <div
          className={`absolute -inset-3 rounded-full blur-lg pointer-events-none transition-opacity duration-500 ${avatarGlow} ${
            isRevealed ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Celebratory Golden Sparkles Orbiting Champion Avatar */}
        {isFirst && isRevealed && (
          <div className="absolute -inset-4 pointer-events-none" aria-hidden="true">
            <span className="absolute top-0 left-1 w-2 h-2 rounded-full bg-[#FEF08A] shadow-[0_0_8px_#FACC15] animate-lq-gold-sparkle" />
            <span
              className="absolute top-2 right-0 w-2.5 h-2.5 rounded-full bg-[#FACC15] shadow-[0_0_10px_#FACC15] animate-lq-gold-sparkle"
              style={{ animationDelay: '0.45s' }}
            />
            <span
              className="absolute bottom-3 -left-1 w-1.5 h-1.5 rounded-full bg-[#FDE047] shadow-[0_0_8px_#FEF08A] animate-lq-gold-sparkle"
              style={{ animationDelay: '0.9s' }}
            />
            <span
              className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[#FEF9C3] shadow-[0_0_8px_#FACC15] animate-lq-gold-sparkle"
              style={{ animationDelay: '1.25s' }}
            />
          </div>
        )}

        <PlayerAvatar
          name={player.name}
          avatarUrl={player.avatarUrl}
          colorIndex={colorIndex}
          size={isFirst ? 'xl' : 'lg'}
          ringClassName={avatarRing}
        />

        <span
          className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full font-black shadow-lg whitespace-nowrap ${badgeStyle}`}
        >
          #{rank} • {rank === 1 ? 'Champion' : rank === 2 ? 'Silver' : 'Bronze'}
        </span>
      </div>

      {/* 3D Metallic Pedestal Upper Tier (Trophy/Medal + Name + Final Score) */}
      <div
        className={`w-full rounded-t-[18px] sm:rounded-t-[22px] text-center px-1.5 flex flex-col items-center justify-center ${upperPedestalStyle}`}
      >
        {isFirst ? (
          <ChampionTrophySvg className="w-6 h-6 sm:w-7 sm:h-7 mb-1 drop-shadow-sm" />
        ) : (
          <SilverBronzeMedalCrest rank={rank as 2 | 3} />
        )}

        <div
          className={`font-black truncate w-full leading-tight ${
            isFirst ? 'text-xs sm:text-sm text-[#10245A]' : 'text-[11px] sm:text-xs text-[#0F172A]'
          }`}
          title={player.name}
        >
          {player.name}
        </div>
        <div
          className={`font-black tabular-nums mt-0.5 ${
            isFirst
              ? 'text-sm sm:text-base text-[#10245A]'
              : rank === 3
              ? 'text-xs sm:text-sm text-[#10245A]'
              : 'text-xs sm:text-sm text-[#0F172A]'
          }`}
        >
          {player.score.toLocaleString()} pts
        </div>
      </div>

      {/* 3D Pedestal Stepped Metallic Base */}
      <div className={`w-[105%] rounded-t-md shadow-inner ${lowerPedestalStyle}`} />
    </div>
  );
};

export interface PodiumProps {
  players: PodiumPlayerData[];
  revealStage?: number;
}

export const Podium: React.FC<PodiumProps> = ({ players, revealStage = 3 }) => {
  const first = players[0];
  const second = players[1];
  const third = players[2];

  if (!first) {
    return (
      <div className="py-10 text-center space-y-2">
        <Users className="w-8 h-8 text-[#38BDF8] mx-auto animate-pulse" />
        <h3 className="text-sm font-extrabold text-white">No Participant Scores Recorded</h3>
        <p className="text-xs text-[#93C5FD]">Quiz session completed without active submissions.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full pt-3 sm:pt-4 pb-0 overflow-hidden">
      {/* Stage Floor Reflection Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-80 h-24 rounded-full bg-gradient-to-t from-[#FACC15]/25 via-[#38BDF8]/10 to-transparent blur-2xl" />
      </div>

      {/* Podium Columns: #2 Silver (Left), #1 Champion (Center), #3 Bronze (Right) */}
      <div className="relative z-10 flex items-end justify-center gap-1.5 sm:gap-3 max-w-md mx-auto px-2">
        {second && <PodiumPlayer player={second} rank={2} revealStage={revealStage} />}
        <PodiumPlayer player={first} rank={1} revealStage={revealStage} />
        {third && <PodiumPlayer player={third} rank={3} revealStage={revealStage} />}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 10. Complete Leaderboard & LeaderboardRow Components (Part 6)
// Displays every participant in descending order with Position, Student Name,
// Avatar, Total Points, Correct Answers, and Average Response Time.
// ----------------------------------------------------------------------------
export interface LeaderboardRowData {
  id: string;
  rank: number;
  name: string;
  avatarUrl?: string | null;
  correctCount: number;
  totalQuestions: number;
  score: number;
  avgResponseTimeMs?: number;
}

export interface LeaderboardRowProps {
  item: LeaderboardRowData;
  index: number;
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ item, index }) => {
  const rankBadge =
    item.rank === 1
      ? 'bg-gradient-to-r from-[#FFCC33] to-[#F59E0B] text-white'
      : item.rank === 2
      ? 'bg-gradient-to-r from-[#64748B] to-[#94A3B8] text-white'
      : item.rank === 3
      ? 'bg-gradient-to-r from-[#D97706] to-[#B45309] text-white'
      : 'bg-[#E8F3FF] text-[#3B527E]';

  const avgSec =
    item.avgResponseTimeMs && item.avgResponseTimeMs > 0
      ? `${(item.avgResponseTimeMs / 1000).toFixed(1)}s avg`
      : null;

  return (
    <div
      style={{ animationDelay: `${Math.min(index * 35, 300)}ms` }}
      className="animate-lq-row flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 rounded-[14px] bg-[#F7FBFF] hover:bg-[#EDF6FF] border border-[#E4EFFA] transition-colors"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* 1. Position / Rank */}
        <span
          className={`min-w-[30px] px-1.5 py-0.5 rounded-lg text-center font-extrabold text-[11px] sm:text-xs tabular-nums shrink-0 ${rankBadge}`}
        >
          #{item.rank}
        </span>

        {/* 2. Avatar */}
        <PlayerAvatar
          name={item.name}
          avatarUrl={item.avatarUrl}
          colorIndex={index}
          size="sm"
        />

        {/* 3. Student Name, 4. Correct Answers & 5. Average Response Time */}
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-extrabold text-[#10245A] truncate leading-tight">
            {item.name}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B] leading-tight mt-0.5 flex-wrap">
            <span>
              {item.correctCount} of {item.totalQuestions} correct
            </span>
            {avgSec && (
              <>
                <span className="text-[#CBD5E1]">•</span>
                <span className="text-[#087CF5] font-semibold">{avgSec}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 6. Total Points */}
      <div className="text-right shrink-0 pl-2">
        <span className="font-extrabold text-xs sm:text-sm text-[#087CF5] tabular-nums">
          {item.score.toLocaleString()} pts
        </span>
      </div>
    </div>
  );
};

export interface LeaderboardProps {
  players: LeaderboardRowData[];
  totalAdditionalCount?: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  totalAdditionalCount
}) => {
  if (!players || players.length === 0) {
    return null;
  }

  const displayCount = totalAdditionalCount ?? players.length;

  return (
    <section
      aria-label="Complete Leaderboard"
      className="w-full bg-white rounded-[24px] p-4 sm:p-5 border border-[#E2EEF9] shadow-[0_10px_30px_rgba(16,36,90,0.05)] space-y-2.5 sm:space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#087CF5]" />
          <h2 className="text-sm sm:text-base font-extrabold text-[#10245A] tracking-tight">
            Complete Leaderboard
          </h2>
        </div>
        <span className="text-xs sm:text-sm font-bold text-[#4A608A]">
          {displayCount} {displayCount === 1 ? 'Participant' : 'Participants'}
        </span>
      </div>

      {/* All Participants in Descending Order */}
      <div className="space-y-1.5 sm:space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
        {players.map((item, idx) => (
          <LeaderboardRow key={item.id || `${item.rank}_${idx}`} item={item} index={idx} />
        ))}
      </div>
    </section>
  );
};
