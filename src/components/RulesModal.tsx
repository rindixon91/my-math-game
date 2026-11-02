import React, { useEffect } from 'react';
import { ControlMode } from '../game/inputPlatform';

interface RulesModalProps {
  controlMode: ControlMode;
  onBack: () => void;
}

const HOW_TO_PLAY_RULES = [
  'Terokai kawasan sekolah dan cari kesemua 7 Buku Nota.',
  'Selesaikan soalan Matematik Kadaran dengan jawapan betul untuk mengumpulkan setiap Buku Nota.',
  'Elakkan diri daripada ditangkap oleh Baldi dan Pengetua.',
  'Berhati-hati dengan Si Pembuli di koridor yang boleh merampas item simpanan kamu.',
  'Kumpulkan item berguna di sekitar sekolah untuk membantu kamu menyelamatkan diri.',
  'Cari Kunci Pengetua untuk membuka pintu kawasan larangan dan Bilik Tahanan.',
  'Sebaik sahaja kesemua 7 Buku Nota dikumpulkan, Baldi akan menjadi amat berang dan pantas.',
  'Lari ke Pintu Keluar Utama untuk melarikan diri dari sekolah!',
] as const;

const DESKTOP_CONTROLS = [
  { keys: 'WASD / Anak Panah', action: 'Pergerakan pemain.' },
  { keys: 'Spacebar', action: 'Lompat & tali lompat Playtime.' },
  { keys: 'Shift', action: 'Lari pecut (guna stamina).' },
  { keys: 'E', action: 'Interaksi (buku nota, pintu & item).' },
  { keys: '1 – 4', action: 'Guna item inventori.' },
  { keys: 'P / Esc', action: 'Jeda permainan.' },
] as const;

const TOUCH_CONTROLS = [
  { keys: 'Kayu Bedik Kiri Bawah', action: 'Pergerakan pemain.' },
  { keys: 'Butang INTERAKSI', action: 'Buka buku nota, pintu & ambil item.' },
  { keys: 'Tahan Butang LARI', action: 'Lari pecut (guna stamina).' },
  { keys: 'Butang LOMPAT', action: 'Lompat & tali lompat Playtime.' },
  { keys: 'Slot Inventori 1–4', action: 'Ketik slot untuk guna item.' },
  { keys: 'Butang Jeda Atas Kanan', action: 'Jeda permainan & tetapan audio.' },
] as const;

export const RulesModal: React.FC<RulesModalProps> = ({ controlMode, onBack }) => {
  const isTouch = controlMode === 'touch';
  const activeControls = isTouch ? TOUCH_CONTROLS : DESKTOP_CONTROLS;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/78"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-panel-title"
    >
      <div className="chalkboard-panel w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-xl overflow-hidden text-neutral-100">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 sm:px-7 sm:py-4 border-b border-emerald-800/80 bg-[#102b1b]/55">
          <div>
            <p className="text-xs font-mono-tabular text-emerald-300/90 mb-0.5">
              Baldi&apos;s Basics · Kadaran Survival
            </p>
            <h2
              id="rules-panel-title"
              className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl tracking-wide text-amber-200 leading-tight"
            >
              CARA BERMAIN
            </h2>
          </div>
        </div>

        {/* Scrollable Rules + Platform Controls Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5">
          {/* Numbered 1-8 Rules List */}
          <ol className="divide-y divide-emerald-800/45 mb-5 text-sm sm:text-[15px] text-neutral-100">
            {HOW_TO_PLAY_RULES.map((rule, idx) => (
              <li key={idx} className="flex items-baseline gap-3 py-2">
                <span className="font-mono-tabular font-bold text-amber-300 shrink-0 w-5">
                  {idx + 1}.
                </span>
                <span className="leading-snug">{rule}</span>
              </li>
            ))}
          </ol>

          {/* Platform-Matched Basic Controls */}
          <div className="border-t border-emerald-800/80 pt-4">
            <h3 className="font-display font-bold text-base sm:text-lg text-amber-200 mb-2.5">
              {isTouch ? 'Kawalan Skrin Sentuh' : 'Kawalan Papan Kekunci'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs sm:text-sm">
              {activeControls.map((ctrl) => (
                <div
                  key={ctrl.keys}
                  className="flex items-center justify-between gap-3 py-1.5 border-b border-emerald-800/40"
                >
                  <span className="font-mono-tabular font-bold text-amber-200 whitespace-nowrap">
                    {ctrl.keys}
                  </span>
                  <span className="text-neutral-200 text-right">{ctrl.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pinned Footer with Always-Visible KEMBALI Action */}
        <div className="shrink-0 px-5 py-3.5 sm:px-7 sm:py-4 border-t border-emerald-800/80 bg-[#102b1b]/55 flex justify-end">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-white font-display font-extrabold text-base tracking-wider rounded-lg border-2 border-emerald-300 shadow-md transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-yellow-300 touch-manipulation"
          >
            KEMBALI
          </button>
        </div>
      </div>
    </div>
  );
};
