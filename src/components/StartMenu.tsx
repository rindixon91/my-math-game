import React, { useEffect } from 'react';
import { ControlMode } from '../game/inputPlatform';

interface StartMenuProps {
  controlMode: ControlMode;
  onPlay: () => void;
  onOpenNotes: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  controlMode,
  onPlay,
  onOpenNotes,
  onOpenRules,
  onOpenSettings,
}) => {
  const isTouch = controlMode === 'touch';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'BUTTON') return;
        e.preventDefault();
        onPlay();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onPlay]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 md:p-12 [@media(max-height:500px)]:p-3.5 title-stage-scrim overflow-y-auto">
      {/* Main Left-Aligned Negative Space Stage */}
      <div className="my-auto max-w-4xl flex flex-col items-start gap-4 sm:gap-6 md:gap-7 [@media(max-height:500px)]:gap-2.5">
        {/* Bespoke Inline SVG Chalkboard & Wooden Ruler Title Lockup */}
        <div className="w-full">
          <svg
            viewBox="0 0 560 190"
            className="w-full max-w-[440px] sm:max-w-[540px] [@media(max-height:500px)]:max-w-[330px] h-auto drop-shadow-2xl"
            role="img"
            aria-label="Baldi's Basics: Kadaran Survival"
          >
            {/* Outer Wooden Chalkboard Frame */}
            <rect x="6" y="6" width="548" height="156" rx="8" fill="#8b5a2b" stroke="#451a03" strokeWidth="4" />
            <rect x="16" y="16" width="528" height="136" rx="4" fill="#143622" stroke="#0b2214" strokeWidth="3" />

            {/* Subtle Chalk Math Equations in Corner */}
            <text
              x="34"
              y="42"
              fill="rgba(255,255,255,0.24)"
              fontFamily="JetBrains Mono, monospace"
              fontSize="13"
            >
              a : b = c : d
            </text>
            <text
              x="526"
              y="42"
              textAnchor="end"
              fill="rgba(255,255,255,0.24)"
              fontFamily="JetBrains Mono, monospace"
              fontSize="12.5"
            >
              KSSM Ting. 1 · Bab 4.3
            </text>

            {/* Primary Chalk Title */}
            <text
              x="280"
              y="78"
              textAnchor="middle"
              fill="#f8fafc"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="40"
              letterSpacing="1.5"
            >
              BALDI&apos;S BASICS
            </text>

            {/* Subtitle Banner */}
            <text
              x="280"
              y="118"
              textAnchor="middle"
              fill="#fde047"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="27"
              letterSpacing="3"
            >
              KADARAN SURVIVAL
            </text>

            {/* Iconic Wooden Ruler Along Bottom Chalk Tray */}
            <g transform="translate(80, 150)">
              <rect x="0" y="0" width="400" height="24" rx="3" fill="#eab308" stroke="#713f12" strokeWidth="2.5" />
              {Array.from({ length: 25 }).map((_, i) => (
                <line
                  key={i}
                  x1={16 + i * 15.5}
                  y1="0"
                  x2={16 + i * 15.5}
                  y2={i % 5 === 0 ? 12 : 7}
                  stroke="#713f12"
                  strokeWidth={i % 5 === 0 ? '2' : '1.3'}
                />
              ))}
            </g>
          </svg>
          <h1 className="sr-only">BALDI&apos;S BASICS: KADARAN SURVIVAL</h1>
        </div>

        <p className="text-neutral-200 text-sm sm:text-base md:text-lg [@media(max-height:500px)]:text-xs [@media(max-height:500px)]:leading-snug leading-relaxed max-w-lg">
          Terokai kawasan sekolah, selesaikan kesemua tujuh Buku Nota Matematik Kadaran Tingkatan 1 KSSM, dan larikan diri sebelum pembaris Baldi menangkap kamu!
        </p>

        {/* Primary Menu Actions (MULA PERMAINAN, NOTA, CARA BERMAIN & TETAPAN) */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-0.5">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onPlay();
            }}
            className="min-h-[44px] px-6 py-3 sm:px-8 sm:py-4 [@media(max-height:500px)]:px-5 [@media(max-height:500px)]:py-2.5 bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-white font-display font-extrabold text-base sm:text-lg md:text-xl [@media(max-height:500px)]:text-sm tracking-wider rounded-lg border-2 border-emerald-300 shadow-lg transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-yellow-300 touch-manipulation"
          >
            MULA PERMAINAN
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenNotes();
            }}
            className="min-h-[44px] px-5 py-3 sm:px-6 sm:py-4 [@media(max-height:500px)]:px-5 [@media(max-height:500px)]:py-2.5 bg-rose-900 hover:bg-rose-800 active:translate-y-0.5 text-amber-50 font-display font-bold text-base sm:text-lg md:text-xl [@media(max-height:500px)]:text-sm tracking-wider rounded-lg border-2 border-rose-400 shadow-lg transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-yellow-300 touch-manipulation"
          >
            NOTA
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenRules();
            }}
            className="min-h-[44px] px-5 py-3 sm:px-6 sm:py-4 [@media(max-height:500px)]:px-5 [@media(max-height:500px)]:py-2.5 bg-sky-800 hover:bg-sky-700 active:translate-y-0.5 text-sky-50 font-display font-bold text-base sm:text-lg md:text-xl [@media(max-height:500px)]:text-sm tracking-wider rounded-lg border-2 border-sky-400 shadow-lg transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-yellow-300 touch-manipulation"
          >
            CARA BERMAIN
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="min-h-[44px] px-5 py-3 sm:px-6 sm:py-4 [@media(max-height:500px)]:px-5 [@media(max-height:500px)]:py-2.5 bg-amber-800 hover:bg-amber-700 active:translate-y-0.5 text-amber-50 font-display font-bold text-base sm:text-lg md:text-xl [@media(max-height:500px)]:text-sm tracking-wider rounded-lg border-2 border-amber-500 shadow-lg transition-transform cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-yellow-300 touch-manipulation"
          >
            TETAPAN
          </button>
        </div>
      </div>

      {/* Single Flat Borderless Platform-Matched Control-Hint Line */}
      <div className="text-[11px] sm:text-xs md:text-sm [@media(max-height:500px)]:text-[11px] text-neutral-300 font-mono-tabular tracking-wide pt-2">
        {isTouch
          ? 'Kayu Bedik Kiri Bergerak · Tahan LARI Pecut · Ketik INTERAKSI & LOMPAT · Ketik Slot 1–4 Guna Item'
          : 'WASD / Anak Panah Bergerak · Spacebar Lompat · Shift Lari · E Interaksi · 1–4 Guna Item · P Jeda'}
      </div>
    </div>
  );
};
