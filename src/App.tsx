import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Moon, Sun, Compass, BookOpen, BarChart3, Share2 } from 'lucide-react';
import { AdhkarPanel } from './components/AdhkarPanel';
import { CounterSanctuary } from './components/CounterSanctuary';
import { InstallGuide } from './components/InstallGuide';
import { ShareModal } from './components/ShareModal';
import { StatsPanel } from './components/StatsPanel';
import { DEFAULT_ADHKAR } from './data/adhkar';
import { useVoiceCounter } from './hooks/useVoiceCounter';
import {
  DailyRecord,
  DhikrPreset,
  MobileTab,
  VoiceMode,
  VoiceScope,
} from './types/dhikr';
import {
  buildKeywordsForText,
  formatArabicNumber,
  getTodayKey,
} from './utils/arabicSpeech';
import {
  playMilestoneChime,
  playTapTick,
  triggerHaptic,
} from './utils/soundEffects';

const STORAGE_KEY = 'tasbih_istighfar_state_v1';

interface PersistedState {
  activeDhikrId: string;
  countsByDhikr: Record<string, number>;
  targetsByDhikr: Record<string, number>;
  customAdhkar: DhikrPreset[];
  history: Record<string, DailyRecord>;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  voiceMode: VoiceMode;
  voiceScope: VoiceScope;
  cadenceSensitivity: number;
}

function loadInitialState(): PersistedState {
  const fallback: PersistedState = {
    activeDhikrId: DEFAULT_ADHKAR[0].id,
    countsByDhikr: {},
    targetsByDhikr: {},
    customAdhkar: [],
    history: {},
    soundEnabled: true,
    theme: 'light',
    voiceMode: 'speech',
    voiceScope: 'selected',
    cadenceSensitivity: 6,
  };

  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      ...fallback,
      ...parsed,
      countsByDhikr: parsed.countsByDhikr ?? {},
      targetsByDhikr: parsed.targetsByDhikr ?? {},
      customAdhkar: Array.isArray(parsed.customAdhkar)
        ? parsed.customAdhkar
        : [],
      history: parsed.history ?? {},
    };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [mobileTab, setMobileTab] = useState<MobileTab>('counter');
  const [desktopSideTab, setDesktopSideTab] = useState<'adhkar' | 'stats'>(
    'adhkar'
  );
  const [pulseTick, setPulseTick] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<
    Array<{ dhikrId: string; delta: number; roundsAdded: number }>
  >([]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  const handleShareApp = useCallback(async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'مِسْبَحَةُ الذِّكْر — عداد الاستغفار والتسبيح',
          text: 'تطبيق «مِسْبَحَةُ الذِّكْر» لعدّ الاستغفار والتسبيح بالصوت والضغط على الشاشة',
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    setShareModalOpen(true);
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const allAdhkar = useMemo(
    () => [...DEFAULT_ADHKAR, ...state.customAdhkar],
    [state.customAdhkar]
  );

  const activeDhikr = useMemo(
    () =>
      allAdhkar.find((d) => d.id === state.activeDhikrId) ?? DEFAULT_ADHKAR[0],
    [allAdhkar, state.activeDhikrId]
  );

  const currentCount = state.countsByDhikr[activeDhikr.id] ?? 0;
  const currentTarget =
    state.targetsByDhikr[activeDhikr.id] ?? activeDhikr.defaultTarget;

  const todayKey = getTodayKey();
  const todayRecord = state.history[todayKey];
  const todayTotal = todayRecord?.totalCount ?? 0;

  // Keep refs for soundEnabled & activeDhikrId so callbacks remain stable
  const soundEnabledRef = useRef(state.soundEnabled);
  soundEnabledRef.current = state.soundEnabled;

  const handleIncrement = useCallback(
    (delta = 1, _source: 'tap' | 'voice' = 'tap') => {
      if (delta <= 0) return;

      let crossedRound = false;

      setState((prev) => {
        const list = [...DEFAULT_ADHKAR, ...prev.customAdhkar];
        const currentPreset =
          list.find((d) => d.id === prev.activeDhikrId) ?? DEFAULT_ADHKAR[0];
        const dhikrId = currentPreset.id;
        const oldCount = prev.countsByDhikr[dhikrId] ?? 0;
        const newCount = oldCount + delta;
        const targetVal =
          prev.targetsByDhikr[dhikrId] ?? currentPreset.defaultTarget;

        let roundsAdded = 0;
        if (targetVal > 0) {
          const oldRounds = Math.floor(oldCount / targetVal);
          const newRounds = Math.floor(newCount / targetVal);
          roundsAdded = Math.max(0, newRounds - oldRounds);
          if (roundsAdded > 0) {
            crossedRound = true;
          }
        }

        const key = getTodayKey();
        const prevDay = prev.history[key] ?? {
          date: key,
          totalCount: 0,
          roundsCompleted: 0,
          byDhikr: {},
        };

        const updatedDay: DailyRecord = {
          date: key,
          totalCount: prevDay.totalCount + delta,
          roundsCompleted: prevDay.roundsCompleted + roundsAdded,
          byDhikr: {
            ...prevDay.byDhikr,
            [dhikrId]: (prevDay.byDhikr[dhikrId] ?? 0) + delta,
          },
        };

        setUndoStack((u) => [
          ...u.slice(-29),
          { dhikrId, delta, roundsAdded },
        ]);

        return {
          ...prev,
          countsByDhikr: {
            ...prev.countsByDhikr,
            [dhikrId]: newCount,
          },
          history: {
            ...prev.history,
            [key]: updatedDay,
          },
        };
      });

      setPulseTick((t) => t + 1);

      if (soundEnabledRef.current) {
        if (crossedRound) {
          playMilestoneChime();
        } else {
          playTapTick();
        }
      }
      triggerHaptic(crossedRound ? 'milestone' : 'tap');
    },
    []
  );

  // Voice keywords depending on selected vs any scope
  const activeVoiceKeywords = useMemo(() => {
    if (state.voiceScope === 'any') {
      return allAdhkar.flatMap((d) => d.keywords);
    }
    return activeDhikr.keywords;
  }, [state.voiceScope, allAdhkar, activeDhikr]);

  const handleVoiceDetect = useCallback(
    (delta: number) => {
      handleIncrement(delta, 'voice');
    },
    [handleIncrement]
  );

  const handleModeFallback = useCallback((newMode: VoiceMode) => {
    setState((prev) => ({ ...prev, voiceMode: newMode }));
  }, []);

  const voice = useVoiceCounter({
    mode: state.voiceMode,
    keywords: activeVoiceKeywords,
    sensitivity: state.cadenceSensitivity,
    onDetect: handleVoiceDetect,
    onModeFallback: handleModeFallback,
  });

  // If browser lacks SpeechRecognition and initial mode was 'speech', switch silently to 'cadence'
  useEffect(() => {
    if (!voice.isSpeechSupported && state.voiceMode === 'speech') {
      setState((prev) => ({ ...prev, voiceMode: 'cadence' }));
    }
  }, [voice.isSpeechSupported, state.voiceMode]);

  const handleUndo = useCallback(() => {
    setUndoStack((prevStack) => {
      const last = prevStack[prevStack.length - 1];
      if (!last || last.dhikrId !== activeDhikr.id) return prevStack;

      setState((prev) => {
        const cur = prev.countsByDhikr[last.dhikrId] ?? 0;
        const nextCount = Math.max(0, cur - last.delta);
        const key = getTodayKey();
        const prevDay = prev.history[key];

        let nextHistory = prev.history;
        if (prevDay) {
          nextHistory = {
            ...prev.history,
            [key]: {
              ...prevDay,
              totalCount: Math.max(0, prevDay.totalCount - last.delta),
              roundsCompleted: Math.max(
                0,
                prevDay.roundsCompleted - last.roundsAdded
              ),
              byDhikr: {
                ...prevDay.byDhikr,
                [last.dhikrId]: Math.max(
                  0,
                  (prevDay.byDhikr[last.dhikrId] ?? 0) - last.delta
                ),
              },
            },
          };
        }

        return {
          ...prev,
          countsByDhikr: {
            ...prev.countsByDhikr,
            [last.dhikrId]: nextCount,
          },
          history: nextHistory,
        };
      });

      return prevStack.slice(0, -1);
    });
  }, [activeDhikr.id]);

  const handleResetCurrent = useCallback(() => {
    setState((prev) => ({
      ...prev,
      countsByDhikr: {
        ...prev.countsByDhikr,
        [activeDhikr.id]: 0,
      },
    }));
    setUndoStack((prev) => prev.filter((item) => item.dhikrId !== activeDhikr.id));
  }, [activeDhikr.id]);

  const handleChangeTarget = useCallback(
    (newTarget: number) => {
      setState((prev) => ({
        ...prev,
        targetsByDhikr: {
          ...prev.targetsByDhikr,
          [activeDhikr.id]: newTarget,
        },
      }));
    },
    [activeDhikr.id]
  );

  const handleSelectDhikr = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeDhikrId: id }));
    setMobileTab('counter');
  }, []);

  const handleAddCustomDhikr = useCallback((text: string, target: number) => {
    const newId = `custom-${Date.now()}`;
    const newItem: DhikrPreset = {
      id: newId,
      text,
      categoryLabel: 'ذكر مخصص',
      category: 'custom',
      defaultTarget: target,
      keywords: buildKeywordsForText(text),
      isCustom: true,
    };

    setState((prev) => ({
      ...prev,
      customAdhkar: [newItem, ...prev.customAdhkar],
      activeDhikrId: newId,
    }));
    setMobileTab('counter');
  }, []);

  const handleDeleteCustomDhikr = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.customAdhkar.filter((d) => d.id !== id);
      const nextActive =
        prev.activeDhikrId === id ? DEFAULT_ADHKAR[0].id : prev.activeDhikrId;
      return {
        ...prev,
        customAdhkar: remaining,
        activeDhikrId: nextActive,
      };
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, history: {} }));
  }, []);

  // Global Spacebar shortcut on desktop when not typing in an input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      handleIncrement(1, 'tap');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleIncrement]);

  const canUndo =
    undoStack.length > 0 &&
    undoStack[undoStack.length - 1].dhikrId === activeDhikr.id;

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f5f0] text-stone-900 dark:bg-[#0b1210] dark:text-stone-100">
      {/* Top Bar: Clean 3-zone header */}
      <header className="sticky top-0 z-30 h-12 lg:h-16 border-b border-stone-200/80 bg-[#f6f5f0]/90 backdrop-blur-md dark:border-emerald-950/80 dark:bg-[#0b1210]/90">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setMobileTab('counter');
            }}
            className="font-display-arabic text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-200 whitespace-nowrap shrink-0"
          >
            مِسْبَحَةُ الذِّكْر
          </a>

          {/* Zone 2: Desktop Single-Line Navigation */}
          <nav
            aria-label="التنقل الرئيسي"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-stone-300"
          >
            <button
              type="button"
              onClick={() => setDesktopSideTab('adhkar')}
              className={`hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                desktopSideTab === 'adhkar'
                  ? 'text-emerald-900 dark:text-emerald-300 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              الأذكار والاستغفار
            </button>
            <button
              type="button"
              onClick={() => setDesktopSideTab('stats')}
              className={`hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                desktopSideTab === 'stats'
                  ? 'text-emerald-900 dark:text-emerald-300 underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              السجل والإحصائيات
            </button>
            <a
              href="#install-guide"
              className="hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              إضافة للشاشة الرئيسية
            </a>
            <button
              type="button"
              onClick={handleShareApp}
              className="inline-flex items-center gap-1.5 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              <Share2 className="h-4 w-4" />
              <span>مشاركة التطبيق</span>
            </button>
          </nav>

          {/* Zone 3: Primary Theme Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  theme: prev.theme === 'dark' ? 'light' : 'dark',
                }))
              }
              aria-label={
                state.theme === 'dark'
                  ? 'التبديل إلى الوضع النهاري'
                  : 'التبديل إلى الوضع الليلي'
              }
              className="min-h-[38px] lg:min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors dark:border-emerald-900 dark:bg-[#111c18] dark:text-stone-200 dark:hover:bg-[#182620] cursor-pointer whitespace-nowrap shrink-0"
            >
              {state.theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">نهاري</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-emerald-800" />
                  <span className="hidden sm:inline">ليلي</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main
        id="top"
        className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pt-4 pb-6 lg:py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Primary Column: Counter Sanctuary */}
          <div
            className={`lg:col-span-7 ${
              mobileTab === 'counter' ? 'block' : 'hidden lg:block'
            }`}
          >
            <CounterSanctuary
              dhikr={activeDhikr}
              count={currentCount}
              target={currentTarget}
              todayTotal={todayTotal}
              onIncrement={handleIncrement}
              onUndo={handleUndo}
              onReset={handleResetCurrent}
              onChangeTarget={handleChangeTarget}
              canUndo={canUndo}
              isListening={voice.isListening}
              isSpeechDetected={voice.isSpeechDetected}
              audioLevel={voice.audioLevel}
              lastTranscript={voice.lastTranscript}
              voiceError={voice.errorMessage}
              voiceStatusNote={voice.statusNote}
              voiceMode={state.voiceMode}
              voiceScope={state.voiceScope}
              cadenceSensitivity={state.cadenceSensitivity}
              isSpeechSupported={voice.isSpeechSupported}
              onToggleListening={voice.toggleListening}
              onChangeVoiceMode={(mode) => {
                voice.clearMessages();
                setState((prev) => ({ ...prev, voiceMode: mode }));
              }}
              onChangeVoiceScope={(scope) =>
                setState((prev) => ({ ...prev, voiceScope: scope }))
              }
              onChangeSensitivity={(val) =>
                setState((prev) => ({ ...prev, cadenceSensitivity: val }))
              }
              pulseTick={pulseTick}
              soundEnabled={state.soundEnabled}
              onToggleSound={() =>
                setState((prev) => ({
                  ...prev,
                  soundEnabled: !prev.soundEnabled,
                }))
              }
              onShare={handleShareApp}
            />

            <p className="hidden lg:block text-center text-xs text-stone-400 dark:text-stone-500 mt-3">
              تلميح: يمكنك الضغط على مفتاح المسافة (Space) من لوحة المفاتيح للعدّ السريع
            </p>
          </div>

          {/* Secondary Column: Adhkar Presets & Daily Stats */}
          <aside className="lg:col-span-5 space-y-4">
            {/* Desktop side switcher */}
            <div className="hidden lg:flex items-center justify-between gap-4">
              <div className="inline-flex w-full items-center gap-1 rounded-2xl bg-stone-200/70 p-1 dark:bg-[#111c18]">
                <button
                  type="button"
                  onClick={() => setDesktopSideTab('adhkar')}
                  className={`flex-1 min-h-[42px] rounded-xl px-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    desktopSideTab === 'adhkar'
                      ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                  }`}
                >
                  الأذكار ({formatArabicNumber(allAdhkar.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopSideTab('stats')}
                  className={`flex-1 min-h-[42px] rounded-xl px-4 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    desktopSideTab === 'stats'
                      ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                      : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                  }`}
                >
                  السجل (اليوم {formatArabicNumber(todayTotal)})
                </button>
              </div>
            </div>

            {/* Adhkar Panel */}
            <div
              className={
                mobileTab === 'adhkar'
                  ? 'block'
                  : desktopSideTab === 'adhkar'
                    ? 'hidden lg:block'
                    : 'hidden'
              }
            >
              <AdhkarPanel
                adhkar={allAdhkar}
                activeId={activeDhikr.id}
                todayByDhikr={todayRecord?.byDhikr ?? {}}
                targetsByDhikr={state.targetsByDhikr}
                onSelect={handleSelectDhikr}
                onAddCustom={handleAddCustomDhikr}
                onDeleteCustom={handleDeleteCustomDhikr}
              />
            </div>

            {/* Stats Panel */}
            <div
              className={
                mobileTab === 'stats'
                  ? 'block'
                  : desktopSideTab === 'stats'
                    ? 'hidden lg:block'
                    : 'hidden'
              }
            >
              <StatsPanel
                adhkar={allAdhkar}
                history={state.history}
                onClearHistory={handleClearHistory}
              />
            </div>
          </aside>
        </div>

        <InstallGuide onShare={handleShareApp} />
      </main>

      {/* Dedication Footer */}
      <footer className="border-t border-stone-200/70 dark:border-emerald-950/70 px-4 pt-5 pb-20 lg:py-6 text-center">
        <div className="mx-auto max-w-7xl space-y-1">
          <p className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300">
            فكرة وتصميم: ش ف ش
          </p>
          <p className="font-display-arabic text-base sm:text-lg text-emerald-900 dark:text-emerald-300">
            اللهم اجعله صدقة عنه وعن والديه
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Thumb Navigation Bar (56px height -> keeps total sticky bars well under 15%) */}
      <nav
        aria-label="التنقل السريع للجوال"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 border-t border-stone-200/90 bg-white/95 backdrop-blur-md dark:border-emerald-950/90 dark:bg-[#0e1714]/95"
      >
        <div className="grid h-full grid-cols-4 items-center">
          <button
            type="button"
            onClick={() => setMobileTab('counter')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
              mobileTab === 'counter'
                ? 'text-emerald-800 dark:text-emerald-400 font-semibold'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="text-[11px] leading-none">العداد</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('adhkar')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
              mobileTab === 'adhkar'
                ? 'text-emerald-800 dark:text-emerald-400 font-semibold'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[11px] leading-none">الأذكار</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('stats')}
            className={`flex h-full flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
              mobileTab === 'stats'
                ? 'text-emerald-800 dark:text-emerald-400 font-semibold'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-[11px] leading-none">السجل</span>
          </button>

          <button
            type="button"
            onClick={handleShareApp}
            className="flex h-full flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors text-stone-500 hover:text-emerald-800 dark:text-stone-400 dark:hover:text-emerald-400"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-[11px] leading-none">مشاركة</span>
          </button>
        </div>
      </nav>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
}
