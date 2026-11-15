import React, { useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
}) => {
  const [copiedType, setCopiedType] = useState<'link' | 'message' | null>(null);

  if (!isOpen) return null;

  const shareText = `تطبيق «مِسْبَحَةُ الذِّكْر» لعدّ الاستغفار والتسبيح بالصوت والضغط على الشاشة\n${shareUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('تطبيق «مِسْبَحَةُ الذِّكْر» لعدّ الاستغفار والتسبيح بالصوت والضغط على الشاشة')}`;

  const copyText = async (text: string, type: 'link' | 'message') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedType(type);
      window.setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Ignore copy failure
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xl dark:border-emerald-950 dark:bg-[#111c18] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-stone-300 dark:bg-emerald-900 rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Share2 className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
            <h2
              id="share-modal-title"
              className="text-lg font-semibold text-stone-900 dark:text-stone-100"
            >
              مشاركة التطبيق مع الآخرين
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المشاركة"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-[#192923] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          شارك رابط «مِسْبَحَةُ الذِّكْر» مع أهلك وأصدقائك ليكون لك ولهم صدقة جارية في الاستغفار والتسبيح.
        </p>

        {/* URL Read-only Field + Copy */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
            رابط التطبيق
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              dir="ltr"
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs text-stone-700 focus:outline-none dark:border-emerald-900 dark:bg-[#0d1613] dark:text-stone-200"
            />
            <button
              type="button"
              onClick={() => copyText(shareUrl, 'link')}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 text-xs sm:text-sm font-medium text-white hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedType === 'link' ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>نسخ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Share Links */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[46px] inline-flex items-center justify-center rounded-xl border border-emerald-700/30 bg-emerald-50 text-sm font-medium text-emerald-900 hover:bg-emerald-100 transition-colors dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950"
          >
            إرسال عبر واتساب
          </a>

          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[46px] inline-flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors dark:border-emerald-900/70 dark:bg-[#16241f] dark:text-stone-200 dark:hover:bg-[#1c2e28]"
          >
            إرسال عبر تيليجرام
          </a>
        </div>

        <button
          type="button"
          onClick={() => copyText(shareText, 'message')}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors dark:border-emerald-900/70 dark:bg-[#0d1613] dark:text-stone-200 dark:hover:bg-[#16241f] cursor-pointer"
        >
          {copiedType === 'message' ? (
            <>
              <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>تم نسخ الرسالة والرابط</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>نسخ رسالة الدعوة مع الرابط</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
