import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { DhikrPreset } from '../types/dhikr';
import { formatArabicNumber } from '../utils/arabicSpeech';

interface AdhkarPanelProps {
  adhkar: DhikrPreset[];
  activeId: string;
  todayByDhikr: Record<string, number>;
  targetsByDhikr: Record<string, number>;
  onSelect: (id: string) => void;
  onAddCustom: (text: string, target: number) => void;
  onDeleteCustom: (id: string) => void;
}

export const AdhkarPanel: React.FC<AdhkarPanelProps> = ({
  adhkar,
  activeId,
  todayByDhikr,
  targetsByDhikr,
  onSelect,
  onAddCustom,
  onDeleteCustom,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTarget, setNewTarget] = useState('100');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newText.trim();
    if (!cleaned) return;
    const parsedTarget = Math.max(0, parseInt(newTarget, 10) || 100);
    onAddCustom(cleaned, parsedTarget);
    setNewText('');
    setNewTarget('100');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col rounded-3xl border border-stone-200/90 bg-white shadow-sm dark:border-emerald-950/80 dark:bg-[#111c18] overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-stone-200/80 px-5 py-4 dark:border-emerald-950/80">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100">
            قائمة الأذكار والاستغفار
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            اختر الذكر لتعيينه في العداد الرئيسي
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-xs sm:text-sm font-medium text-stone-800 hover:bg-stone-100 dark:border-emerald-900 dark:bg-[#16241f] dark:text-stone-100 dark:hover:bg-[#1c2e28] cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة ذكر</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="border-b border-stone-200/80 bg-stone-50/70 p-4 space-y-3 dark:border-emerald-950/80 dark:bg-[#0d1613]"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              نص الذكر
            </label>
            <input
              type="text"
              required
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="مثال: يا حي يا قيوم برحمتك أستغيث"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-emerald-900 dark:bg-[#16241f] dark:text-stone-100"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                الهدف الافتراضي
              </label>
              <input
                type="number"
                min={0}
                max={100000}
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-emerald-900 dark:bg-[#16241f] dark:text-stone-100"
              />
            </div>

            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              حفظ الذكر
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-stone-100 dark:divide-emerald-950/70 max-h-[540px] overflow-y-auto">
        {adhkar.map((item) => {
          const isActive = item.id === activeId;
          const todayCount = todayByDhikr[item.id] ?? 0;
          const itemTarget = targetsByDhikr[item.id] ?? item.defaultTarget;

          return (
            <li key={item.id}>
              <div
                className={`flex items-center justify-between gap-3 px-5 py-3.5 transition-colors ${
                  isActive
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/50'
                    : 'hover:bg-stone-50 dark:hover:bg-[#15221d]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="flex-1 text-right min-h-[44px] flex flex-col justify-center gap-1 cursor-pointer focus-visible:outline-none"
                >
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    )}
                    <span
                      className={`font-display-arabic text-lg leading-snug ${
                        isActive
                          ? 'font-bold text-emerald-950 dark:text-emerald-200'
                          : 'font-normal text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span>{item.categoryLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      الهدف:{' '}
                      {itemTarget === 0
                        ? 'مفتوح'
                        : formatArabicNumber(itemTarget)}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-left">
                    <span className="block text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                      {formatArabicNumber(todayCount)}
                    </span>
                    <span className="block text-[11px] text-stone-400 dark:text-stone-500">
                      اليوم
                    </span>
                  </div>

                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustom(item.id)}
                      aria-label={`حذف ${item.text}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
