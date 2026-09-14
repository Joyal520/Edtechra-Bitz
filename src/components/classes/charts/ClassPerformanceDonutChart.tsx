import React from 'react';

interface ClassPerformanceDonutChartProps {
  students?: Array<{
    performanceCategory?: string;
    averagePercentage?: number | null;
  }>;
  totalStudents?: number;
}

export const ClassPerformanceDonutChart: React.FC<ClassPerformanceDonutChartProps> = ({
  students = [],
  totalStudents = 0
}) => {
  const scoredStudents = students.filter((s) => s.averagePercentage != null);

  if (scoredStudents.length === 0) {
    return (
      <div className="p-6 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
        <p className="text-xs font-bold text-slate-700">Not enough evidence yet.</p>
        <p className="text-[11px] text-slate-400">
          Distribution tiers will activate once students complete scored activities.
        </p>
      </div>
    );
  }

  const highPerformers = scoredStudents.filter(
    (s) => (s.averagePercentage ?? 0) >= 80 || s.performanceCategory === 'HIGH_PERFORMER'
  ).length;

  const steadyPerformers = scoredStudents.filter(
    (s) => (s.averagePercentage ?? 0) >= 60 && (s.averagePercentage ?? 0) < 80
  ).length;

  const needsSupport = scoredStudents.filter(
    (s) => (s.averagePercentage ?? 0) >= 50 && (s.averagePercentage ?? 0) < 60
  ).length;

  const atRisk = scoredStudents.filter(
    (s) => (s.averagePercentage ?? 0) < 50 || s.performanceCategory === 'AT_RISK'
  ).length;

  const total = scoredStudents.length;

  const tiers = [
    { label: 'High Performers (80%+)', count: highPerformers, color: '#10b981', textColor: 'text-emerald-700' },
    { label: 'Steady (60-79%)', count: steadyPerformers, color: '#6366f1', textColor: 'text-indigo-700' },
    { label: 'Needs Support (50-59%)', count: needsSupport, color: '#f59e0b', textColor: 'text-amber-700' },
    { label: 'At Risk (<50%)', count: atRisk, color: '#f43f5e', textColor: 'text-rose-700' }
  ];

  // Calculate SVG donut segments
  const size = 120;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Performance Tier Distribution
          </h4>
          <p className="text-[11px] text-slate-400 font-medium">
            Class breakdown across mastery levels ({total} evaluated{totalStudents > 0 ? ` of ${totalStudents}` : ''} learners)
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {tiers.map((tier, idx) => {
              if (tier.count === 0) return null;
              const percent = tier.count / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={tier.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-slate-900 leading-none">{total}</span>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Students</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 flex-1 w-full max-w-xs">
          {tiers.map((tier, idx) => {
            const pct = total > 0 ? Math.round((tier.count / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                  <span className="text-slate-700 font-bold">{tier.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-black ${tier.textColor}`}>{tier.count}</span>
                  <span className="text-[10px] text-slate-400 font-medium">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
