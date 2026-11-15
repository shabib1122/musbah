import React, { useEffect, useState } from 'react';
import {
  Share,
  PlusSquare,
  MoreVertical,
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface InstallGuideProps {
  onShare?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallGuide: React.FC<InstallGuideProps> = ({ onShare }) => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) {
      setPlatform('android');
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () =>
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <section
      id="install-guide"
      aria-label="خطوات إضافة التطبيق إلى الشاشة الرئيسية"
      className="mt-6 lg:mt-8 rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-sm dark:border-emerald-950/80 dark:bg-[#111c18]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-4 dark:border-emerald-950/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-800 dark:text-emerald-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100">
              إضافة التطبيق إلى الشاشة الرئيسية
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            أضف «مسبحة الذكر» على شاشة جوالك ليفتح كتطبيق مستقل بسرعة وسهولة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-xs sm:text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors dark:border-emerald-900 dark:bg-[#16241f] dark:text-stone-200 dark:hover:bg-[#1c2e28] cursor-pointer whitespace-nowrap"
            >
              <Share2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>مشاركة الرابط</span>
            </button>
          )}
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleNativeInstall}
              className="min-h-[40px] inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 text-xs sm:text-sm font-medium text-white hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>تثبيت مباشر</span>
            </button>
          )}

          <div
            role="tablist"
            aria-label="اختيار نوع الجهاز"
            className="inline-flex items-center gap-1 rounded-xl bg-stone-100 p-1 dark:bg-[#0d1613]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={platform === 'ios'}
              onClick={() => setPlatform('ios')}
              className={`min-h-[38px] px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                platform === 'ios'
                  ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              آيفون (Safari)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={platform === 'android'}
              onClick={() => setPlatform('android')}
              className={`min-h-[38px] px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                platform === 'android'
                  ? 'bg-white text-emerald-900 shadow-sm dark:bg-[#192923] dark:text-emerald-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              }`}
            >
              أندرويد (Chrome)
            </button>
          </div>
        </div>
      </div>

      {isStandalone && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs sm:text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>أنت تستخدم التطبيق الآن من الشاشة الرئيسية. يمكنك مشاركة هذه الخطوات مع من تحب.</span>
        </div>
      )}

      {platform === 'ios' ? (
        <ol className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
              01. فتح المتصفح
            </span>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              افتح رابط التطبيق في متصفح <strong>سفاري (Safari)</strong> على جهاز الآيفون أو الآيباد.
            </p>
          </li>

          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                02. زر المشاركة
              </span>
              <Share className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              اضغط على أيقونة <strong>المشاركة</strong> (مربع يخرج منه سهم للأعلى) في شريط المتصفح بالأسفل.
            </p>
          </li>

          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                03. اختيار الإضافة
              </span>
              <PlusSquare className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              مرّر القائمة للأسفل واختر <strong>إضافة إلى الصفحة الرئيسية</strong> (Add to Home Screen).
            </p>
          </li>

          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
              04. تأكيد التثبيت
            </span>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              اضغط على <strong>إضافة (Add)</strong> في أعلى الزاوية، وسيظهر التطبيق مباشرة على شاشتك.
            </p>
          </li>
        </ol>
      ) : (
        <ol className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
              01. فتح المتصفح
            </span>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              افتح رابط التطبيق في متصفح <strong>قوقل كروم (Chrome)</strong> على جهاز الأندرويد.
            </p>
          </li>

          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                02. قائمة المتصفح
              </span>
              <MoreVertical className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              اضغط على زر <strong>القائمة (⋮)</strong> في أعلى المتصفح بجانب شريط العنوان.
            </p>
          </li>

          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                03. إضافة للشاشة
              </span>
              <PlusSquare className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              اختر <strong>الإضافة إلى الشاشة الرئيسية</strong> أو <strong>تثبيت التطبيق</strong>.
            </p>
          </li>

          <li className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 dark:bg-[#0d1613] dark:border-emerald-950/70 space-y-2">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
              04. تأكيد الإضافة
            </span>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              اضغط على <strong>إضافة / تثبيت</strong> ليظهر اختصار «مسبحة الذكر» على شاشتك الرئيسية.
            </p>
          </li>
        </ol>
      )}
    </section>
  );
};
