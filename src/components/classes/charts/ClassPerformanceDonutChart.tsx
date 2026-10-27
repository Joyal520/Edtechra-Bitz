import React, { useState } from 'react';
import { Info, Users } from 'lucide-react';
import { PerformanceDistributionSummary } from '@/services/teachingIntelligenceService';

interface ClassPerformanceDonutChartProps {
  performanceDistribution?: PerformanceDistributionSummary | null;
  students?: Array<{
    studentId?: string;
    fullName?: string;
    performanceCategory?: string;
    averagePercentage?: number | null;
    totalEvents?: number;
    attempts?: number;
  }>;
  totalStudents?: number;
  onSelectStudent?: (studentId: string) => void;
}

export const ClassPerformanceDonutChart: React.FC<ClassPerformanceDonutChartProps> = ({
  performanceDistribution,
  students = [],
  totalStudents = 0,
  onSelectStudent
}) => {
  const [selectedBandKey, setSelectedBandKey] = useState<string | null>(null);
  const [showRulesTooltip, setShowRulesTooltip] = useState(false);

  // Use authoritative backend performanceDistribution when provided, otherwise compute with identical thresholds
  const computed = React.useMemo(() => {
    const pd: any = performanceDistribution;
    if (pd && (typeof pd.eligibleCount === 'number' || typeof pd.eligibleAssessedStudents === 'number')) {
      const bandsArr = Array.isArray(pd.bands) ? pd.bands : [];
      const findBand = (key: string) => bandsArr.find((b: any) => b.key === key);
      const getBandObj = (key: string, label: string, min: number, max: number) => {
        const raw = pd[key];
        const fromBands = findBand(key);
        if (raw && typeof raw === 'object') return raw;
        const count = typeof raw === 'number' ? raw : (fromBands?.count ?? 0);
        const percentage = pd.percentages?.[key] != null ? Math.round(pd.percentages[key]) : Math.round(fromBands?.percentage ?? 0);
        return {
          label,
          min,
          max,
          count,
          percentage,
          students: fromBands?.students || []
        };
      };
      const eligibleCount = Number(pd.eligibleCount ?? pd.eligibleAssessedStudents ?? 0);
      const effectiveTotal = Number(pd.totalStudents ?? pd.totalEnrolledStudents ?? totalStudents ?? 0);
      const unclassifiedCount =
        typeof pd.unclassifiedCount === 'number'
          ? pd.unclassifiedCount
          : typeof pd.unclassified === 'number'
          ? pd.unclassified
          : (pd.unclassified?.count ?? 0);

      return {
        excellent: getBandObj('excellent', 'Excellent', 85, 100),
        good: getBandObj('good', 'Good', 70, 84.99),
        pretty: getBandObj('pretty', 'Pretty', 50, 69.99),
        bad: getBandObj('bad', 'Bad', 0, 49.99),
        unclassified: {
          label: 'Unclassified',
          min: null,
          max: null,
          count: unclassifiedCount,
          percentage: effectiveTotal > 0 ? Math.round((unclassifiedCount / effectiveTotal) * 100) : 0,
          students: pd.unclassified?.students || []
        },
        totalStudents: effectiveTotal,
        eligibleCount,
        unclassifiedCount,
        thresholds: {
          EXCELLENT_MIN: 85,
          GOOD_MIN: 70,
          PRETTY_MIN: 50
        }
      };
    }

    const excellentStudents: any[] = [];
    const goodStudents: any[] = [];
    const prettyStudents: any[] = [];
    const badStudents: any[] = [];
    const unclassifiedStudents: any[] = [];

    for (const s of students) {
      const avg = s.averagePercentage != null ? Number(s.averagePercentage) : null;
      const completedCount = Number(s.totalEvents ?? s.attempts ?? (avg != null ? 1 : 0));
      if (avg === null || isNaN(avg) || completedCount <= 0) {
        unclassifiedStudents.push(s);
      } else if (avg >= 85) {
        excellentStudents.push(s);
      } else if (avg >= 70) {
        goodStudents.push(s);
      } else if (avg >= 50) {
        prettyStudents.push(s);
      } else {
        badStudents.push(s);
      }
    }

    const eligibleCount =
      excellentStudents.length + goodStudents.length + prettyStudents.length + badStudents.length;
    const effectiveTotal = Math.max(totalStudents || 0, students.length);
    const unclassifiedCount = Math.max(unclassifiedStudents.length, Math.max(0, effectiveTotal - eligibleCount));
    const pct = (count: number) => (eligibleCount > 0 ? Math.round((count / eligibleCount) * 100) : 0);

    return {
      excellent: {
        label: 'Excellent',
        min: 85,
        max: 100,
        count: excellentStudents.length,
        percentage: pct(excellentStudents.length),
        students: excellentStudents
      },
      good: {
        label: 'Good',
        min: 70,
        max: 84.99,
        count: goodStudents.length,
        percentage: pct(goodStudents.length),
        students: goodStudents
      },
      pretty: {
        label: 'Pretty',
        min: 50,
        max: 69.99,
        count: prettyStudents.length,
        percentage: pct(prettyStudents.length),
        students: prettyStudents
      },
      bad: {
        label: 'Bad',
        min: 0,
        max: 49.99,
        count: badStudents.length,
        percentage: pct(badStudents.length),
        students: badStudents
      },
      unclassified: {
        label: 'Unclassified',
        min: null,
        max: null,
        count: unclassifiedCount,
        percentage: effectiveTotal > 0 ? Math.round((unclassifiedCount / effectiveTotal) * 100) : 0,
        students: unclassifiedStudents
      },
      totalStudents: effectiveTotal,
      eligibleCount,
      unclassifiedCount,
      thresholds: {
        EXCELLENT_MIN: 85,
        GOOD_MIN: 70,
        PRETTY_MIN: 50
      }
    };
  }, [performanceDistribution, students, totalStudents]);

  const tiers = [
    {
      key: 'excellent',
      label: 'Excellent',
      rangeLabel: '85% – 100%',
      count: computed.excellent.count,
      percentage: computed.excellent.percentage,
      students: computed.excellent.students || [],
      color: '#10b981',
      bgBadge: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      textColor: 'text-emerald-700'
    },
    {
      key: 'good',
      label: 'Good',
      rangeLabel: '70% – 84%',
      count: computed.good.count,
      percentage: computed.good.percentage,
      students: computed.good.students || [],
      color: '#0d9488',
      bgBadge: 'bg-teal-50 border-teal-200 text-teal-800',
      textColor: 'text-teal-700'
    },
    {
      key: 'pretty',
      label: 'Pretty',
      rangeLabel: '50% – 69%',
      count: computed.pretty.count,
      percentage: computed.pretty.percentage,
      students: computed.pretty.students || [],
      color: '#f59e0b',
      bgBadge: 'bg-amber-50 border-amber-200 text-amber-800',
      textColor: 'text-amber-700'
    },
    {
      key: 'bad',
      label: 'Bad',
      rangeLabel: 'Below 50%',
      count: computed.bad.count,
      percentage: computed.bad.percentage,
      students: computed.bad.students || [],
      color: '#ef4444',
      bgBadge: 'bg-rose-50 border-rose-200 text-rose-800',
      textColor: 'text-rose-700'
    }
  ];

  const eligibleTotal = computed.eligibleCount;
  const effectiveTotal = computed.totalStudents;
  const unclassifiedCount = computed.unclassifiedCount;

  // Calculate SVG pie/donut segments
  const size = 148;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const activeTier = tiers.find((t) => t.key === selectedBandKey) || null;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#C9E5E2] shadow-2xs flex flex-col justify-between space-y-4 h-full">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
              Class Performance Distribution
            </h3>
            <p className="text-xs text-[#36565A] mt-0.5">
              Unique students classified by normalized assessment score ({eligibleTotal} assessed of {effectiveTotal} enrolled)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRulesTooltip((prev) => !prev)}
            className="p-1.5 rounded-lg text-[#36565A] hover:text-[#087477] hover:bg-[#E8F7F5] transition-colors cursor-pointer shrink-0"
            title="View performance classification rules"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {showRulesTooltip && (
          <div className="mt-2.5 p-3 rounded-xl bg-[#F8FCFB] border border-[#C9E5E2] text-[11px] text-[#36565A] space-y-1">
            <div className="font-black text-[#173B3F]">Classification Rules (Normalized Score %):</div>
            <div>• <strong className="text-emerald-700">Excellent:</strong> 85% – 100%</div>
            <div>• <strong className="text-teal-700">Good:</strong> 70% – 84.99%</div>
            <div>• <strong className="text-amber-700">Pretty:</strong> 50% – 69.99%</div>
            <div>• <strong className="text-rose-700">Bad:</strong> Below 50%</div>
            <div className="text-[10px] text-slate-500 pt-1">
              Each student is counted once using their mean normalized percentage across completed Tasks, Live Quizzes, Examinations, and Competitions (excluding speed/bonus XP).
            </div>
          </div>
        )}
      </div>

      {eligibleTotal === 0 ? (
        <div className="p-6 bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] text-center space-y-1.5 my-auto">
          <Users className="w-7 h-7 text-[#159A9C] mx-auto opacity-50" />
          <p className="text-xs font-bold text-[#173B3F]">No classified student scores yet.</p>
          <p className="text-[11px] text-[#36565A]">
            {unclassifiedCount > 0
              ? `${unclassifiedCount} enrolled student${unclassifiedCount === 1 ? ' has' : 's have'} not completed a scored assessment yet.`
              : 'Performance distribution will appear once students complete scored classroom activities.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-1">
          {/* SVG Donut / Pie Chart */}
          <div className="relative w-[148px] h-[148px] flex items-center justify-center shrink-0">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {tiers.map((tier) => {
                if (tier.count === 0) return null;
                const percent = tier.count / eligibleTotal;
                const strokeDasharray = `${percent * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;

                return (
                  <circle
                    key={tier.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={tier.color}
                    strokeWidth={selectedBandKey === tier.key ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="butt"
                    onClick={() => setSelectedBandKey((prev) => (prev === tier.key ? null : tier.key))}
                    className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-black text-[#173B3F] leading-none">{eligibleTotal}</span>
              <span className="text-[9px] font-extrabold text-[#36565A] uppercase tracking-wider mt-1">
                Assessed
              </span>
              {unclassifiedCount > 0 && (
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  +{unclassifiedCount} pending
                </span>
              )}
            </div>
          </div>

          {/* Category Breakdown Table / Legend */}
          <div className="space-y-2 flex-1 w-full">
            {tiers.map((tier) => {
              const isSelected = selectedBandKey === tier.key;
              return (
                <div
                  key={tier.key}
                  onClick={() => setSelectedBandKey((prev) => (prev === tier.key ? null : tier.key))}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-[#E8F7F5]/70 border-[#087477] shadow-2xs'
                      : 'bg-[#F8FCFB] border-[#C9E5E2]/70 hover:border-[#159A9C]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tier.color }}
                    />
                    <div className="truncate">
                      <span className="font-black text-[#173B3F]">{tier.label}</span>
                      <span className="text-[10px] text-[#36565A] font-semibold ml-1.5">
                        ({tier.rangeLabel})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-black ${tier.textColor}`}>
                      {tier.count} {tier.count === 1 ? 'student' : 'students'}
                    </span>
                    <span className="text-[10px] font-bold text-[#36565A] bg-white px-1.5 py-0.5 rounded border border-[#C9E5E2]">
                      {tier.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Band Student List Drilldown */}
      {activeTier && activeTier.students && activeTier.students.length > 0 && (
        <div className="p-3 rounded-xl bg-[#F8FCFB] border border-[#C9E5E2] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-black text-[#173B3F]">
            <span>
              {activeTier.label} ({activeTier.rangeLabel}) — {activeTier.count}{' '}
              {activeTier.count === 1 ? 'Student' : 'Students'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedBandKey(null)}
              className="text-[10px] text-[#087477] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeTier.students.map((st: any, idx: number) => (
              <button
                key={st.studentId || idx}
                type="button"
                onClick={() => st.studentId && onSelectStudent && onSelectStudent(st.studentId)}
                className="px-2 py-0.5 rounded-lg bg-white border border-[#C9E5E2] hover:border-[#087477] text-[11px] font-bold text-[#173B3F] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{st.fullName || 'Student'}</span>
                {st.averagePercentage != null && (
                  <span className="text-[10px] font-black text-[#087477]">
                    {Math.round(st.averagePercentage)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unclassified / Excluded Students Footer */}
      <div className="pt-2 border-t border-[#C9E5E2]/60 flex items-center justify-between text-[11px] text-[#36565A] font-medium flex-wrap gap-2">
        <span>
          Thresholds: Excellent (85–100%), Good (70–84%), Pretty (50–69%), Bad (&lt;50%)
        </span>
        {unclassifiedCount > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
            {unclassifiedCount} unclassified (insufficient completed work)
          </span>
        )}
      </div>
    </div>
  );
};

