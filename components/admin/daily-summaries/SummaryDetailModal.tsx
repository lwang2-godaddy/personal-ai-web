'use client';

import DetailModalShell from '../shared/DetailModalShell';
import InfoGrid from '../shared/InfoGrid';
import { formatDateFull } from '../shared/utils';

interface SummaryMetrics {
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  sleepHours?: number;
  sleepQuality?: string;
  heartRate?: number;
  workoutsCount?: number;
  workoutTypes?: string[];
  workoutMinutes?: number;
  distance?: number;
  placesVisited?: number;
  activitiesLogged?: number;
  topActivities?: Array<{ name: string; count: number }>;
  eventsTotal?: number;
  eventsCompleted?: number;
  voiceNotesCount?: number;
  activeMinutes?: number;
}

interface SummaryHighlight {
  icon: string;
  title: string;
  description: string;
  type: string;
}

interface SummaryComparison {
  stepsChange: number;
  workoutsChange: number;
  sleepChange: number;
  trend: 'improving' | 'stable' | 'declining';
  // Monthly may have multi-period comparisons
  vsLastMonth?: { stepsChange: number; workoutsChange: number; sleepChange: number };
  vs3Months?: { stepsChange: number; workoutsChange: number; sleepChange: number };
  vs6Months?: { stepsChange: number; workoutsChange: number; sleepChange: number };
  vs12Months?: { stepsChange: number; workoutsChange: number; sleepChange: number };
}

interface DailySummary {
  id: string;
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  startDate?: string;
  endDate?: string;
  textSummary: string;
  generationMethod: 'ai' | 'template';
  notificationSent: boolean;
  metrics: SummaryMetrics;
  highlights: SummaryHighlight[];
  comparison: SummaryComparison | null;
  generatedAt?: string;
  viewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const TREND_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  improving: { label: 'Improving', color: 'text-green-700', bg: 'bg-green-50' },
  stable: { label: 'Stable', color: 'text-gray-700', bg: 'bg-gray-50' },
  declining: { label: 'Declining', color: 'text-red-700', bg: 'bg-red-50' },
};

const HIGHLIGHT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  achievement: { bg: 'bg-green-50', text: 'text-green-700' },
  streak: { bg: 'bg-blue-50', text: 'text-blue-700' },
  milestone: { bg: 'bg-purple-50', text: 'text-purple-700' },
  comparison: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

function formatChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function ChangeColor({ value }: { value: number }) {
  const color = value > 5 ? 'text-green-700' : value < -5 ? 'text-red-700' : 'text-gray-700';
  const bg = value > 5 ? 'bg-green-50' : value < -5 ? 'bg-red-50' : 'bg-gray-50';
  return (
    <span className={`font-bold ${color} ${bg} px-1.5 py-0.5 rounded`}>
      {formatChange(value)}
    </span>
  );
}

interface SummaryDetailModalProps {
  summary: DailySummary;
  onClose: () => void;
}

export default function SummaryDetailModal({ summary, onClose }: SummaryDetailModalProps) {
  const m = summary.metrics;
  const trendInfo = summary.comparison ? TREND_DISPLAY[summary.comparison.trend] : null;

  return (
    <DetailModalShell
      title={`${PERIOD_LABELS[summary.period] || 'Daily'} Summary`}
      subtitle={summary.date}
      icon="📊"
      onClose={onClose}
    >
      {/* 1. Full Summary Text */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Summary
        </h3>
        <p className="text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-4">
          {summary.textSummary || 'No summary text available.'}
        </p>
      </div>

      {/* 2. Details Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Details
        </h3>
        <InfoGrid
          items={[
            { label: 'Document ID', value: summary.id, mono: true },
            { label: 'User ID', value: summary.userId, mono: true },
            { label: 'Period', value: PERIOD_LABELS[summary.period] || summary.period },
            { label: 'Date', value: summary.date },
            { label: 'Start Date', value: summary.startDate || '\u2014' },
            { label: 'End Date', value: summary.endDate || '\u2014' },
            { label: 'Generation', value: summary.generationMethod === 'ai' ? 'AI (GPT)' : 'Template' },
            { label: 'Notified', value: summary.notificationSent ? 'Yes' : 'No' },
          ]}
        />
      </div>

      {/* 3. Metrics Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            label="Steps"
            value={m.steps?.toLocaleString() ?? '\u2014'}
            sub={m.stepsGoal ? `Goal: ${m.stepsGoal.toLocaleString()}` : undefined}
            bg="bg-blue-50"
            color="text-blue-700"
            subColor="text-blue-500"
          />
          <MetricTile
            label="Calories"
            value={m.calories?.toLocaleString() ?? '\u2014'}
            bg="bg-red-50"
            color="text-red-700"
            subColor="text-red-500"
          />
          <MetricTile
            label="Workouts"
            value={m.workoutsCount?.toString() ?? '\u2014'}
            sub={m.workoutTypes?.length ? m.workoutTypes.join(', ') : undefined}
            bg="bg-green-50"
            color="text-green-700"
            subColor="text-green-500"
          />
          <MetricTile
            label="Sleep"
            value={m.sleepHours ? `${m.sleepHours.toFixed(1)}h` : '\u2014'}
            sub={m.sleepQuality ? `Quality: ${m.sleepQuality}` : undefined}
            bg="bg-indigo-50"
            color="text-indigo-700"
            subColor="text-indigo-500"
          />
          <MetricTile
            label="Heart Rate"
            value={m.heartRate ? `${m.heartRate} bpm` : '\u2014'}
            bg="bg-pink-50"
            color="text-pink-700"
            subColor="text-pink-500"
          />
          <MetricTile
            label="Places"
            value={m.placesVisited?.toString() ?? '\u2014'}
            bg="bg-purple-50"
            color="text-purple-700"
            subColor="text-purple-500"
          />
          <MetricTile
            label="Activities"
            value={m.activitiesLogged?.toString() ?? '\u2014'}
            sub={m.topActivities?.length ? m.topActivities.map(a => a.name).join(', ') : undefined}
            bg="bg-amber-50"
            color="text-amber-700"
            subColor="text-amber-500"
          />
          <MetricTile
            label="Events"
            value={m.eventsTotal?.toString() ?? '\u2014'}
            sub={m.eventsCompleted ? `${m.eventsCompleted} completed` : undefined}
            bg="bg-cyan-50"
            color="text-cyan-700"
            subColor="text-cyan-500"
          />
          {(m.voiceNotesCount ?? 0) > 0 && (
            <MetricTile
              label="Voice Notes"
              value={m.voiceNotesCount!.toString()}
              bg="bg-orange-50"
              color="text-orange-700"
              subColor="text-orange-500"
            />
          )}
          {(m.activeMinutes ?? 0) > 0 && (
            <MetricTile
              label="Active Minutes"
              value={m.activeMinutes!.toString()}
              bg="bg-teal-50"
              color="text-teal-700"
              subColor="text-teal-500"
            />
          )}
        </div>
      </div>

      {/* 4. Highlights */}
      {summary.highlights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Highlights
          </h3>
          <div className="space-y-2">
            {summary.highlights.map((h, i) => {
              const typeStyle = HIGHLIGHT_TYPE_COLORS[h.type] || HIGHLIGHT_TYPE_COLORS.achievement;
              return (
                <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <span className="text-xl shrink-0">{h.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{h.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${typeStyle.bg} ${typeStyle.text}`}>
                        {h.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{h.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Comparison Data */}
      {summary.comparison && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Comparison
          </h3>
          <div className="space-y-3">
            {/* Primary comparison */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Steps</div>
                <ChangeColor value={summary.comparison.stepsChange} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Workouts</div>
                <ChangeColor value={summary.comparison.workoutsChange} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Sleep</div>
                <ChangeColor value={summary.comparison.sleepChange} />
              </div>
              <div className={`rounded-lg p-3 text-center ${trendInfo?.bg || 'bg-gray-50'}`}>
                <div className="text-xs text-gray-500 mb-1">Trend</div>
                <span className={`font-bold ${trendInfo?.color || 'text-gray-700'}`}>
                  {trendInfo?.label || summary.comparison.trend}
                </span>
              </div>
            </div>

            {/* Monthly multi-period comparisons */}
            {summary.period === 'monthly' && (summary.comparison.vsLastMonth || summary.comparison.vs3Months || summary.comparison.vs6Months || summary.comparison.vs12Months) && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">Multi-Period Comparison</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 pr-3 text-gray-500 font-semibold">Period</th>
                        <th className="text-center py-1.5 px-2 text-gray-500 font-semibold">Steps</th>
                        <th className="text-center py-1.5 px-2 text-gray-500 font-semibold">Workouts</th>
                        <th className="text-center py-1.5 px-2 text-gray-500 font-semibold">Sleep</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.comparison.vsLastMonth && (
                        <ComparisonRow label="vs 1 month" data={summary.comparison.vsLastMonth} />
                      )}
                      {summary.comparison.vs3Months && (
                        <ComparisonRow label="vs 3 months" data={summary.comparison.vs3Months} />
                      )}
                      {summary.comparison.vs6Months && (
                        <ComparisonRow label="vs 6 months" data={summary.comparison.vs6Months} />
                      )}
                      {summary.comparison.vs12Months && (
                        <ComparisonRow label="vs 12 months" data={summary.comparison.vs12Months} />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Metadata */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Metadata
        </h3>
        <InfoGrid
          items={[
            { label: 'Generated At', value: summary.generatedAt ? formatDateFull(summary.generatedAt) : '\u2014' },
            { label: 'Viewed At', value: summary.viewedAt ? formatDateFull(summary.viewedAt) : '\u2014' },
            { label: 'Created At', value: summary.createdAt ? formatDateFull(summary.createdAt) : '\u2014' },
            { label: 'Updated At', value: summary.updatedAt ? formatDateFull(summary.updatedAt) : '\u2014' },
          ]}
        />
      </div>
    </DetailModalShell>
  );
}

function MetricTile({
  label,
  value,
  sub,
  bg,
  color,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  bg: string;
  color: string;
  subColor: string;
}) {
  return (
    <div className={`${bg} rounded-lg p-3 text-center`}>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className={`text-xs ${subColor}`}>{label}</div>
      {sub && <div className={`text-[10px] ${subColor} mt-0.5 truncate`}>{sub}</div>}
    </div>
  );
}

function ComparisonRow({
  label,
  data,
}: {
  label: string;
  data: { stepsChange: number; workoutsChange: number; sleepChange: number };
}) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-1.5 pr-3 font-medium text-gray-700">{label}</td>
      <td className="py-1.5 px-2 text-center"><ChangeColor value={data.stepsChange} /></td>
      <td className="py-1.5 px-2 text-center"><ChangeColor value={data.workoutsChange} /></td>
      <td className="py-1.5 px-2 text-center"><ChangeColor value={data.sleepChange} /></td>
    </tr>
  );
}
