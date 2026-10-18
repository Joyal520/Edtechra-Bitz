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
        <h1 className="text-[20px] sm:text-[24px] md:text-[26px] font-extrabold text-[#10245A] tracking-tight leading-[1.35] px-1">
          {question}
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
        {isRevealed && isCorrectOption ? (
          <div className="w-6 h-6 rounded-full bg-[#18B981] text-white flex items-center justify-center shadow-xs">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        ) : isRevealed && isIncorrectSelection ? (
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
// 9. Podium & PodiumPlayer Components
// ----------------------------------------------------------------------------
const CrownIcon: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
  const colors = {
    1: {
      fill: 'url(#goldCrownGrad)',
      stroke: '#E09600',
      size: 'w-9 h-9 sm:w-11 sm:h-11 drop-shadow-[0_4px_10px_rgba(247,185,40,0.45)]'
    },
    2: {
      fill: 'url(#silverCrownGrad)',
      stroke: '#8DA4BF',
      size: 'w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_3px_8px_rgba(148,169,196,0.35)]'
    },
    3: {
      fill: 'url(#bronzeCrownGrad)',
      stroke: '#C06C34',
      size: 'w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_3px_8px_rgba(217,130,75,0.35)]'
    }
  }[rank];

  return (
    <svg viewBox="0 0 32 26" className={colors.size} fill="none">
      <defs>
        <linearGradient id="goldCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE875" />
          <stop offset="100%" stopColor="#F5A600" />
        </linearGradient>
        <linearGradient id="silverCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2ECF7" />
          <stop offset="100%" stopColor="#94ACC6" />
        </linearGradient>
        <linearGradient id="bronzeCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F8C291" />
          <stop offset="100%" stopColor="#D3753B" />
        </linearGradient>
      </defs>
      <path
        d="M3 20L1 6L9.5 12L16 2L22.5 12L31 6L29 20H3Z"
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
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
}

export const PodiumPlayer: React.FC<PodiumPlayerProps> = ({ player, rank }) => {
  const isFirst = rank === 1;
  const isSecond = rank === 2;

  const animClass = isFirst
    ? 'animate-lq-podium-1 z-20'
    : isSecond
    ? 'animate-lq-podium-2 z-10'
    : 'animate-lq-podium-3 z-10';

  const avatarRing = isFirst
    ? 'border-4 border-[#F7B928] ring-4 ring-[#FDE68A]/70 shadow-[0_8px_24px_rgba(247,185,40,0.35)]'
    : isSecond
    ? 'border-4 border-[#E2EEF9] ring-4 ring-[#AFC2D8]/50 shadow-[0_6px_18px_rgba(148,169,196,0.28)]'
    : 'border-4 border-[#F5C6A5] ring-4 ring-[#E99A62]/45 shadow-[0_6px_18px_rgba(233,154,98,0.28)]';

  const badgeStyle = isFirst
    ? 'bg-gradient-to-b from-[#FFE566] to-[#F7B928] border border-[#FFF6B3] text-[#10245A] text-xs sm:text-sm px-3 py-0.5'
    : isSecond
    ? 'bg-gradient-to-b from-[#E6F4FF] to-[#BFE0FF] border border-white text-[#10245A] text-[11px] sm:text-xs px-2.5 py-0.5'
    : 'bg-gradient-to-b from-[#FFD099] to-[#E99A62] border border-[#FFE8CC] text-[#10245A] text-[11px] sm:text-xs px-2.5 py-0.5';

  // 3D tiered pedestal styling matching reference image
  const upperPedestalStyle = isFirst
    ? 'bg-gradient-to-b from-[#FFF3B0] via-[#FFE066] to-[#F7B928] border-t-2 border-x border-[#FFF9DB] shadow-[0_-4px_20px_rgba(247,185,40,0.2)] pt-4 pb-2.5 sm:pt-5 sm:pb-3'
    : isSecond
    ? 'bg-gradient-to-b from-[#F0F7FF] via-[#DCEBFA] to-[#C2D6EC] border-t-2 border-x border-white shadow-[0_-4px_15px_rgba(175,194,216,0.2)] pt-3.5 pb-2 sm:pt-4 sm:pb-2.5'
    : 'bg-gradient-to-b from-[#FDE8D7] via-[#F5C6A5] to-[#E99A62] border-t-2 border-x border-[#FFF3E8] shadow-[0_-4px_15px_rgba(233,154,98,0.2)] pt-3.5 pb-2 sm:pt-4 sm:pb-2.5';

  const lowerPedestalStyle = isFirst
    ? 'h-9 sm:h-11 bg-gradient-to-r from-[#E5980B] via-[#FCD34D] to-[#D97706] border-t border-[#FFF3B0]/80'
    : isSecond
    ? 'h-5 sm:h-6 bg-gradient-to-r from-[#9EB5CE] via-[#D5E4F2] to-[#8DA6C2] border-t border-white/80'
    : 'h-4 sm:h-5 bg-gradient-to-r from-[#C8763E] via-[#F0B892] to-[#B8652E] border-t border-[#FDE8D7]/80';

  const colorIndex = isFirst ? 3 : isSecond ? 1 : 6;

  return (
    <div
      className={`flex-1 flex flex-col items-center ${
        isFirst ? 'max-w-[155px] sm:max-w-[175px] -mx-1' : 'max-w-[130px] sm:max-w-[150px]'
      } ${animClass}`}
    >
      {/* Crown */}
      <div className="mb-1.5 animate-lq-float">
        <CrownIcon rank={rank} />
      </div>

      {/* Circular Avatar + Overlapping #Rank Pill */}
      <div className="relative mb-2 animate-lq-avatar">
        <PlayerAvatar
          name={player.name}
          avatarUrl={player.avatarUrl}
          colorIndex={colorIndex}
          size={isFirst ? 'xl' : 'lg'}
          ringClassName={avatarRing}
        />
        <span
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full font-black shadow-md whitespace-nowrap ${badgeStyle}`}
        >
          #{rank}
        </span>
      </div>

      {/* 3D Pedestal Upper Tier (Name + Score) */}
      <div
        className={`w-full rounded-t-[18px] sm:rounded-t-[22px] text-center px-1.5 flex flex-col items-center justify-center ${upperPedestalStyle}`}
      >
        <div
          className={`font-extrabold text-[#10245A] truncate w-full leading-tight ${
            isFirst ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'
          }`}
          title={player.name}
        >
          {player.name}
        </div>
        <div
          className={`font-black text-[#10245A] tabular-nums mt-0.5 ${
            isFirst ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
          }`}
        >
          {player.score.toLocaleString()} pts
        </div>
      </div>

      {/* 3D Pedestal Stepped Base */}
      <div className={`w-[104%] rounded-t-md shadow-inner ${lowerPedestalStyle}`} />
    </div>
  );
};

export interface PodiumProps {
  players: PodiumPlayerData[];
}

export const Podium: React.FC<PodiumProps> = ({ players }) => {
  const first = players[0];
  const second = players[1];
  const third = players[2];

  if (!first) {
    return (
      <div className="py-10 text-center space-y-2">
        <Users className="w-8 h-8 text-[#087CF5] mx-auto animate-pulse" />
        <h3 className="text-sm font-extrabold text-[#10245A]">No Participant Scores Recorded</h3>
        <p className="text-xs text-[#64748B]">Quiz session completed without active submissions.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full pt-3 sm:pt-4 pb-0 overflow-hidden">
      {/* Decorative Static Confetti Accents in Podium Hero (Matching Reference) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Soft Sunburst Glow Behind #1 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-[#FFF3B0]/50 via-[#BAE6FD]/30 to-transparent blur-2xl" />
        {/* Left Confetti Pieces */}
        <span className="absolute top-6 left-[8%] w-3.5 h-2 bg-[#087CF5] rounded-xs -rotate-25 opacity-85" />
        <span className="absolute top-14 left-[5%] w-4 h-2 bg-[#08AEEF] rounded-xs rotate-15 opacity-90" />
        <span className="absolute top-24 left-[7%] w-3.5 h-2 bg-[#F7B928] rounded-xs -rotate-40 opacity-90" />
        <span className="absolute top-34 left-[4%] w-3.5 h-2 bg-[#8B5CF6] rounded-xs rotate-30 opacity-85" />
        <span className="absolute top-8 left-[22%] w-3 h-1.5 bg-[#18B981] rounded-xs rotate-45 opacity-85" />
        <span className="absolute top-18 left-[32%] w-2.5 h-1.5 bg-[#F7B928] rounded-xs -rotate-15 opacity-90" />
        {/* Right Confetti Pieces */}
        <span className="absolute top-7 right-[10%] w-4 h-2 bg-[#F7B928] rounded-xs rotate-25 opacity-90" />
        <span className="absolute top-15 right-[6%] w-4 h-2 bg-[#F43F7A] rounded-xs -rotate-30 opacity-85" />
        <span className="absolute top-26 right-[7%] w-3.5 h-2 bg-[#18B981] rounded-xs rotate-35 opacity-85" />
        <span className="absolute top-36 right-[5%] w-3.5 h-2 bg-[#087CF5] rounded-xs -rotate-20 opacity-90" />
        <span className="absolute top-10 right-[25%] w-3 h-1.5 bg-[#F43F7A] rounded-xs -rotate-35 opacity-85" />
        <span className="absolute top-20 right-[30%] w-2.5 h-1.5 bg-[#087CF5] rounded-xs rotate-12 opacity-85" />
      </div>

      {/* Podium Columns: #2 (Left), #1 (Center), #3 (Right) */}
      <div className="relative z-10 flex items-end justify-center gap-1.5 sm:gap-2.5 max-w-md mx-auto px-2">
        {second && <PodiumPlayer player={second} rank={2} />}
        <PodiumPlayer player={first} rank={1} />
        {third && <PodiumPlayer player={third} rank={3} />}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 10. Leaderboard & LeaderboardRow Components (STRICTLY PLAYERS #4–#10)
// ----------------------------------------------------------------------------
export interface LeaderboardRowData {
  id: string;
  rank: number;
  name: string;
  avatarUrl?: string | null;
  correctCount: number;
  totalQuestions: number;
  score: number;
}

export interface LeaderboardRowProps {
  item: LeaderboardRowData;
  index: number;
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ item, index }) => {
  return (
    <div
      style={{ animationDelay: `${Math.min(index * 45, 300)}ms` }}
      className="animate-lq-row flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 rounded-[14px] bg-[#F7FBFF] hover:bg-[#EDF6FF] border border-[#E4EFFA] transition-colors"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* 1. Rank */}
        <span className="w-7 text-left font-extrabold text-xs sm:text-sm text-[#3B527E] tabular-nums shrink-0">
          #{item.rank}
        </span>

        {/* 2. Avatar */}
        <PlayerAvatar
          name={item.name}
          avatarUrl={item.avatarUrl}
          colorIndex={index}
          size="sm"
        />

        {/* 3. Player Name & 4. Correct Answers */}
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-extrabold text-[#10245A] truncate leading-tight">
            {item.name}
          </div>
          <div className="text-[11px] font-medium text-[#64748B] leading-tight mt-0.5">
            {item.correctCount} of {item.totalQuestions} correct
          </div>
        </div>
      </div>

      {/* 5. Score */}
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
      aria-label="Leaderboard Players 4 to 10"
      className="w-full bg-white rounded-[24px] p-4 sm:p-5 border border-[#E2EEF9] shadow-[0_10px_30px_rgba(16,36,90,0.05)] space-y-2.5 sm:space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#087CF5]" />
          <h2 className="text-sm sm:text-base font-extrabold text-[#10245A] tracking-tight">
            Leaderboard (Players 4–10)
          </h2>
        </div>
        <span className="text-xs sm:text-sm font-bold text-[#4A608A]">
          {displayCount} {displayCount === 1 ? 'Player' : 'Players'}
        </span>
      </div>

      {/* Rows (#4–#10) */}
      <div className="space-y-1.5 sm:space-y-2">
        {players.map((item, idx) => (
          <LeaderboardRow key={item.id || item.rank} item={item} index={idx} />
        ))}
      </div>
    </section>
  );
};
