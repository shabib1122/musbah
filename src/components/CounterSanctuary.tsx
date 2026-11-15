import React, { useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
  Check,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { TARGET_OPTIONS } from '../data/adhkar';
import { DhikrPreset, VoiceMode, VoiceScope } from '../types/dhikr';
import { formatArabicNumber } from '../utils/arabicSpeech';

interface CounterSanctuaryProps {
  dhikr: DhikrPreset;
  count: number;
  target: number;
  todayTotal: number;
  onIncrement: (delta?: number, source?: 'tap' | 'voice') => void;
  onUndo: () => void;
  onReset: () => void;
  onChangeTarget: (newTarget: number) => void;
  canUndo: boolean;
  // Voice props
  isListening: boolean;
  isSpeechDetected: boolean;
  audioLevel: number;
  lastTranscript: string;
  voiceError: string | null;
  voiceStatusNote: string | null;
  voiceMode: VoiceMode;
  voiceScope: VoiceScope;
  cadenceSensitivity: number;
  isSpeechSupported: boolean;
  onToggleListening: () => void;
  onChangeVoiceMode: (mode: VoiceMode) => void;
  onChangeVoiceScope: (scope: VoiceScope) => void;
  onChangeSensitivity: (val: number) => void;
  // Feedback pulse trigger
  pulseTick: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onShare: () => void;
}

const VISUALIZER_WEIGHTS = [0.42, 0.68, 0.9, 0.56, 1.0, 0.62, 0.88, 0.7, 0.45];

export const CounterSanctuary: React.FC<CounterSanctuaryProps> = ({
  dhikr,
  count,
  target,
  todayTotal,
  onIncrement,
  onUndo,
  onReset,
  onChangeTarget,
  canUndo,
  isListening,
  isSpeechDetected,
  audioLevel,
  lastTranscript,
  voiceError,
  voiceStatusNote,
  voiceMode,
  voiceScope,
  cadenceSensitivity,
  isSpeechSupported,
  onToggleListening,
  onChangeVoiceMode,
  onChangeVoiceScope,
  onChangeSensitivity,
  pulseTick,
  soundEnabled,
  onToggleSound,
  onShare,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [customTargetOpen, setCustomTargetOpen] = useState(false);
  const [customTargetInput, setCustomTargetInput] = useState('');
  const [showRipple, setShowRipple] = useState(false);

  // Trigger subtle visual ripple when pulseTick increments
  useEffect(() => {
    if (pulseTick === 0) return;
    setShowRipple(true);
    const id = window.setTimeout(() => setShowRipple(false), 360);
    return () => window.clearTimeout(id);
  }, [pulseTick]);

  // Reset confirmation timeout if user doesn't confirm within 4s
  useEffect(() => {
    if (!confirmReset) return;
    const id = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirmReset]);

  const effectiveTarget = target > 0 ? target : 0;
  const countInRound =
    effectiveTarget > 0 ? count % effectiveTarget : count;
  const completedRounds =
    effectiveTarget > 0 ? Math.floor(count / effectiveTarget) : 0;
  const progressRatio =
    effectiveTarget > 0
      ? count > 0 && countInRound === 0
        ? 1
        : countInRound / effectiveTarget
      : 0;
  const remainingInRound =
    effectiveTarget > 0
      ? count > 0 && countInRound === 0
        ? 0
        : effectiveTarget - countInRound
      : 0;

  // SVG Ring math
  const size = 272;
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const handleTapArea = () => {
    onIncrement(1, 'tap');
  };

  const handleCustomTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customTargetInput, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100000) {
      onChangeTarget(parsed);
      setCustomTargetOpen(false);
      setCustomTargetInput('');
    }
  };

  const isStandardTarget = TARGET_OPTIONS.some((opt) => opt.value === target);

  return (
    <section
      aria-label="منطقة التسبيح والعد"
      className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-8 shadow-sm dark:border-emerald-950/80 dark:bg-[#111c18]"
    >
      {/* Active Dhikr Calligraphy Header */}
      <div className="w-full text-center space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            <span>{dhikr.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span>
              الهدف:{' '}
              {effectiveTarget === 0
                ? 'مفتوح'
                : formatArabicNumber(effectiveTarget)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              اليوم: {formatArabicNumber(todayTotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={onShare}
            aria-label="مشاركة التطبيق مع الآخرين"
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors dark:border-emerald-900/70 dark:bg-[#16241f] dark:text-stone-200 dark:hover:bg-[#1c2e28] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Share2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>مشاركة</span>
          </button>
        </div>

        <h1 className="font-display-arabic text-2xl sm:text-4xl font-bold leading-relaxed text-stone-900 dark:text-stone-50 max-w-2xl mx-auto px-2">
          {dhikr.text}
        </h1>

        {dhikr.virtue && (
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-xl mx-auto leading-relaxed">
            {dhikr.virtue}
          </p>
        )}
      </div>

      {/* Tactile Tap Ring */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <button
          type="button"
          onPointerDown={(e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            handleTapArea();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTapArea();
            }
          }}
          aria-label={`عدّ ${dhikr.text}، العدد الحالي ${count}`}
          className="group relative flex h-[272px] w-[272px] sm:h-[296px] sm:w-[296px] items-center justify-center rounded-full select-none touch-manipulation transition-transform duration-150 ease-out active:scale-[0.975] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 dark:focus-visible:ring-emerald-400/30 cursor-pointer"
        >
          {/* Subtle expansion ripple on count */}
          {showRipple && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-2 rounded-full border-2 border-emerald-600/40 dark:border-emerald-400/40 animate-ripple-ring"
            />
          )}

          {/* Inner circular touch surface */}
          <span
            aria-hidden="true"
            className="absolute inset-4 rounded-full bg-stone-50/90 border border-stone-200/80 shadow-inner transition-colors duration-150 group-hover:bg-emerald-50/40 dark:bg-[#16241f] dark:border-emerald-900/60 dark:group-hover:bg-emerald-950/50"
          />

          {/* SVG Progress Arc + 33 subtle bead markers */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            {/* Outer subtle bead dots (33 beads) */}
            {Array.from({ length: 33 }).map((_, idx) => {
              const angle = (idx / 33) * Math.PI * 2;
              const dotR = radius + 8;
              const cx = size / 2 + Math.cos(angle) * dotR;
              const cy = size / 2 + Math.sin(angle) * dotR;
              const isLit =
                effectiveTarget > 0
                  ? idx / 33 < progressRatio
                  : idx < count % 33;
              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={isLit ? 2 : 1.3}
                  className={
                    isLit
                      ? 'fill-amber-600 dark:fill-amber-400 transition-colors duration-150'
                      : 'fill-stone-300/80 dark:fill-emerald-900/70'
                  }
                />
              );
            })}

            {/* Track circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="stroke-stone-200/80 dark:stroke-emerald-950"
            />

            {/* Progress circle */}
            {effectiveTarget > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="stroke-emerald-700 dark:stroke-emerald-500 transition-[stroke-dashoffset] duration-200 ease-out"
              />
            )}
          </svg>

          {/* Center Numeric Display */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
            <span className="text-6xl sm:text-7xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
              {formatArabicNumber(count)}
            </span>

            <div className="mt-2.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-500 dark:text-stone-400 tabular-nums">
              {effectiveTarget > 0 ? (
                <>
                  <span>
                    الدورة {formatArabicNumber(completedRounds + 1)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {remainingInRound === 0 && count > 0
                      ? 'أتممت الدورة'
                      : `المتبقي ${formatArabicNumber(remainingInRound)}`}
                  </span>
                </>
              ) : (
                <span>اضغط هنا للعدّ</span>
              )}
            </div>

            <span className="mt-2 text-[11px] text-emerald-800/80 dark:text-emerald-400/80 font-medium">
              اضغط في أي مكان داخل الدائرة
            </span>
          </div>
        </button>
      </div>

      {/* Counter Controls & Target Picker */}
      <div className="w-full space-y-3">
        {/* Target segmented strip */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <div
            role="group"
            aria-label="تحديد الهدف"
            className="inline-flex flex-wrap items-center justify-center gap-1 rounded-xl bg-stone-100 p-1 dark:bg-[#0d1613]"
          >
            {TARGET_OPTIONS.map((opt) => {
              const active = target === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChangeTarget(opt.value);
                    setCustomTargetOpen(false);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomTargetOpen((prev) => !prev)}
              className={`min-h-[38px] px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !isStandardTarget || customTargetOpen
                  ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              {!isStandardTarget ? formatArabicNumber(target) : 'مخصص'}
            </button>
          </div>
        </div>

        {customTargetOpen && (
          <form
            onSubmit={handleCustomTargetSubmit}
            className="flex items-center justify-center gap-2 max-w-xs mx-auto"
          >
            <input
              type="number"
              min={0}
              max={100000}
              value={customTargetInput}
              onChange={(e) => setCustomTargetInput(e.target.value)}
              placeholder="أدخل العدد (مثلاً 500)"
              className="w-full min-h-[42px] rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none dark:border-emerald-900 dark:bg-[#0d1613] dark:text-stone-100"
            />
            <button
              type="submit"
              className="min-h-[42px] px-4 rounded-xl bg-emerald-800 text-white text-sm font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              تطبيق
            </button>
          </form>
        )}

        {/* Undo / Sound / Reset strip */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || count === 0}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none dark:border-emerald-900/70 dark:bg-[#16241f] dark:text-stone-200 dark:hover:bg-[#1c2e28] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Undo2 className="h-4 w-4" />
            <span>تراجع</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'كتم صوت النقرة' : 'تشغيل صوت النقرة'}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-emerald-900/70 dark:bg-[#16241f] dark:text-stone-200 dark:hover:bg-[#1c2e28] cursor-pointer whitespace-nowrap shrink-0"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-stone-400" />
            )}
            <span>{soundEnabled ? 'الصوت مفعل' : 'صامت'}</span>
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => {
                if (count > 0) setConfirmReset(true);
              }}
              disabled={count === 0}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none dark:border-emerald-900/70 dark:bg-[#16241f] dark:text-stone-200 dark:hover:bg-[#1c2e28] cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
              <span>تصفير</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Check className="h-4 w-4" />
              <span>تأكيد التصفير</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice Counting Controls */}
      <div className="w-full border-t border-stone-200/80 pt-5 dark:border-emerald-950/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Primary Voice Toggle CTA */}
          <button
            type="button"
            onClick={onToggleListening}
            className={`min-h-[50px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-3 rounded-2xl px-6 text-base font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
              isListening
                ? 'bg-rose-700 text-white hover:bg-rose-800 shadow-sm'
                : 'bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm dark:bg-emerald-600 dark:hover:bg-emerald-500'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-5 w-5" />
                <span>إيقاف العد بالصوت</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                <span>ابدأ العد بالصوت</span>
              </>
            )}
          </button>

          {/* Voice Engine Mode Segmented Toggle */}
          <div className="inline-flex items-center justify-center gap-1 rounded-xl bg-stone-100 p-1 dark:bg-[#0d1613]">
            <button
              type="button"
              disabled={!isSpeechSupported}
              onClick={() => onChangeVoiceMode('speech')}
              className={`min-h-[40px] flex-1 sm:flex-initial px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                voiceMode === 'speech'
                  ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              تمييز الكلمات
            </button>
            <button
              type="button"
              onClick={() => onChangeVoiceMode('cadence')}
              className={`min-h-[40px] flex-1 sm:flex-initial px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                voiceMode === 'cadence'
                  ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              نبض الصوت
            </button>
          </div>
        </div>

        {/* Sub-options & Live Acoustic Feedback */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-stone-50/90 px-4 py-3 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70">
          {/* Left side: Scope or Sensitivity */}
          <div className="flex items-center gap-3">
            {voiceMode === 'speech' ? (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-stone-500 dark:text-stone-400 whitespace-nowrap">
                  النطاق:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeVoiceScope(
                      voiceScope === 'selected' ? 'any' : 'selected'
                    )
                  }
                  className="min-h-[36px] rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs sm:text-sm font-medium text-stone-800 hover:bg-stone-50 dark:border-emerald-900 dark:bg-[#16241f] dark:text-stone-200 cursor-pointer whitespace-nowrap"
                >
                  {voiceScope === 'selected'
                    ? 'الذكر المختار فقط'
                    : 'أي استغفار أو تسبيح'}
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 text-xs sm:text-sm text-stone-600 dark:text-stone-300 w-full sm:w-auto">
                <span className="whitespace-nowrap">حساسية الميكروفون:</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={cadenceSensitivity}
                  onChange={(e) =>
                    onChangeSensitivity(Number(e.target.value))
                  }
                  className="w-28 accent-emerald-700 dark:accent-emerald-500 cursor-pointer"
                />
                <span className="tabular-nums font-medium w-4 text-center">
                  {formatArabicNumber(cadenceSensitivity)}
                </span>
              </label>
            )}
          </div>

          {/* Right side: Live Microphone Visualizer & Last Heard */}
          <div className="flex items-center justify-between sm:justify-end gap-3 min-h-[28px]">
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 truncate max-w-[230px]">
              {isListening ? (
                lastTranscript ? (
                  <span>آخر ما سُمع: «{lastTranscript}»</span>
                ) : (
                  <span>
                    {voiceMode === 'speech'
                      ? 'بانتظار نطق الذكر...'
                      : 'استمع إلى إيقاع صوتك...'}
                  </span>
                )
              ) : (
                <span className="text-stone-500 dark:text-stone-400">
                  {voiceMode === 'speech'
                    ? 'يعد تلقائياً عند نطق الذكر بالعربية'
                    : 'يعد كل تسبيحة مع وقفة قصيرة بعدها'}
                </span>
              )}
            </p>

            {/* Real-time Audio Bars (strictly bound to live mic level) */}
            <div
              aria-hidden="true"
              className="flex items-center gap-0.5 h-6 shrink-0"
            >
              {VISUALIZER_WEIGHTS.map((weight, i) => {
                const levelScale = isListening
                  ? Math.max(0.18, Math.min(1, (audioLevel / 75) * weight))
                  : 0.16;
                return (
                  <span
                    key={i}
                    style={{ transform: `scaleY(${levelScale})` }}
                    className={`w-1 h-5 rounded-full origin-center transition-transform duration-75 ${
                      isListening && (isSpeechDetected || audioLevel > 14)
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : isListening
                          ? 'bg-stone-400 dark:bg-emerald-800'
                          : 'bg-stone-300 dark:bg-emerald-950'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {(voiceError || voiceStatusNote) && (
          <div
            role="status"
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs sm:text-sm ${
              voiceError
                ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900/50'
                : 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50'
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{voiceError || voiceStatusNote}</span>
          </div>
        )}
      </div>
    </section>
  );
};
