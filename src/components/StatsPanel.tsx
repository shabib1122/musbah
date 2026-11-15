import React, { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import { DailyRecord, DhikrPreset } from '../types/dhikr';
import { formatArabicNumber, getTodayKey } from '../utils/arabicSpeech';

interface StatsPanelProps {
  adhkar: DhikrPreset[];
  history: Record<string, DailyRecord>;
  onClearHistory: () => void;
}

function getLast7Days(): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  const formatter = new Intl.DateTimeFormat('ar-SA', { weekday: 'short' });
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push({
      key: `${y}-${m}-${day}`,
      label: i === 0 ? 'اليوم' : formatter.format(d),
    });
  }
  return days;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  adhkar,
  history,
  onClearHistory,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const todayKey = getTodayKey();
  const todayRecord = history[todayKey];
  const todayTotal = todayRecord?.totalCount ?? 0;

  const allRecords = Object.values(history);
  const allTimeTotal = allRecords.reduce((acc, r) => acc + r.totalCount, 0);
  const totalRounds = allRecords.reduce(
    (acc, r) => acc + (r.roundsCompleted || 0),
    0
  );

  const last7 = getLast7Days();
  const maxDayCount = Math.max(
    1,
    ...last7.map((d) => history[d.key]?.totalCount ?? 0)
  );

  const todayEntries = Object.entries(todayRecord?.byDhikr ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col rounded-3xl border border-stone-200/90 bg-white shadow-sm dark:border-emerald-950/80 dark:bg-[#111c18] overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-stone-200/80 px-5 py-4 dark:border-emerald-950/80">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100">
            سجل الاستغفار والتسبيح
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            ملخص نشاطك خلال اليوم والأيام السبعة الماضية
          </p>
        </div>

        {allTimeTotal > 0 && (
          !confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-medium text-stone-600 hover:text-rose-700 hover:bg-rose-50 dark:border-emerald-900 dark:bg-[#16241f] dark:text-stone-300 dark:hover:text-rose-300 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>مسح السجل</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClearHistory();
                setConfirmClear(false);
              }}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-3 text-xs font-medium text-white hover:bg-rose-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
              <span>تأكيد المسح</span>
            </button>
          )
        )}
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-stone-200/80 border-b border-stone-200/80 dark:divide-emerald-950/80 dark:border-emerald-950/80">
        <div className="p-4 text-center">
          <span className="block text-xs text-stone-500 dark:text-stone-400">
            اليوم
          </span>
          <span className="mt-1 block text-xl sm:text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-400">
            {formatArabicNumber(todayTotal)}
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="block text-xs text-stone-500 dark:text-stone-400">
            الإجمالي
          </span>
          <span className="mt-1 block text-xl sm:text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {formatArabicNumber(allTimeTotal)}
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="block text-xs text-stone-500 dark:text-stone-400">
            الدورات
          </span>
          <span className="mt-1 block text-xl sm:text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
            {formatArabicNumber(totalRounds)}
          </span>
        </div>
      </div>

      {/* 7-Day Activity Bar Chart */}
      <div className="p-5 border-b border-stone-200/80 dark:border-emerald-950/80">
        <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-4">
          النشاط خلال ٧ أيام
        </h3>
        <div className="grid grid-cols-7 items-end gap-2 h-32">
          {last7.map((day) => {
            const val = history[day.key]?.totalCount ?? 0;
            const heightPct = val === 0 ? 4 : Math.max(10, Math.round((val / maxDayCount) * 100));
            const isToday = day.key === todayKey;
            return (
              <div
                key={day.key}
                className="flex flex-col items-center justify-end h-full gap-1.5"
              >
                <span className="text-[10px] tabular-nums text-stone-500 dark:text-stone-400">
                  {val > 0 ? formatArabicNumber(val) : ''}
                </span>
                <div className="w-full flex items-end justify-center flex-1">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[24px] rounded-t-md transition-all duration-200 ${
                      isToday
                        ? 'bg-emerald-700 dark:bg-emerald-500'
                        : val > 0
                          ? 'bg-emerald-700/35 dark:bg-emerald-700/50'
                          : 'bg-stone-200/70 dark:bg-emerald-950/60'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] whitespace-nowrap ${
                    isToday
                      ? 'font-semibold text-emerald-800 dark:text-emerald-300'
                      : 'text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today Breakdown by Dhikr */}
      <div className="p-5">
        <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3">
          تفاصيل أذكار اليوم
        </h3>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center">
            لم تبدأ الذكر اليوم بعد. اضغط على الدائرة أو شغّل العد بالصوت للبدء.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-emerald-950/70">
            {todayEntries.map(([id, cnt]) => {
              const preset = adhkar.find((a) => a.id === id);
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="font-display-arabic text-base text-stone-800 dark:text-stone-200 truncate">
                    {preset?.text ?? 'ذكر مخصص'}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-800 dark:text-emerald-400 shrink-0">
                    {formatArabicNumber(cnt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
