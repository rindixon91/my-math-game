import React, { useState } from 'react';
import { PlaytimeJumpState } from '../game/GameState';
import { ControlMode } from '../game/inputPlatform';

interface PlaytimeOverlayProps {
  playtime: PlaytimeJumpState;
  controlMode: ControlMode;
  hasScissors: boolean;
  onJumpButton: () => void;
  onUseScissors: () => void;
}

export const PlaytimeOverlay: React.FC<PlaytimeOverlayProps> = ({
  playtime,
  controlMode,
  hasScissors,
  onJumpButton,
  onUseScissors,
}) => {
  const [imgErr, setImgErr] = useState(false);
  const isTouch = controlMode === 'touch';

  // Sweet spot in GameState is [0.36, 0.64]
  const phasePct = Math.max(0, Math.min(100, playtime.ropePhase * 100));
  const inZone = playtime.ropePhase >= 0.36 && playtime.ropePhase <= 0.64;

  // Rope visual curve Y for animated jump-rope illustration
  const ropeArcY = 50 + Math.sin(playtime.ropePhase * Math.PI * 2 - Math.PI / 2) * 38;

  return (
    <div
      className={`fixed inset-x-0 z-[35] flex justify-center px-4 pointer-events-none ${
        isTouch
          ? 'top-1/2 -translate-y-1/2'
          : 'bottom-20 md:bottom-24 [@media(max-height:500px)]:top-1/2 [@media(max-height:500px)]:bottom-auto [@media(max-height:500px)]:-translate-y-1/2'
      }`}
      role="dialog"
      aria-modal="false"
      aria-label="Cabaran Tali Lompat Playtime"
    >
      <div
        className={`chalkboard-panel pointer-events-auto w-full max-w-sm sm:max-w-md rounded-xl p-3.5 sm:p-4 md:p-5 [@media(max-height:500px)]:p-3 text-center shadow-2xl transition-colors ${
          playtime.failedFlashTimer > 0 ? 'border-red-500' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-white border border-amber-400 flex items-center justify-center shrink-0">
              {!imgErr ? (
                <img
                  src="/assets/aistudio/image_62bb97dd.png"
                  alt="Playtime"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-display font-bold text-red-600">P</span>
              )}
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-amber-300">Tali Lompat Playtime</div>
              <div className="font-display font-extrabold text-lg sm:text-xl text-white font-mono-tabular">
                LOMPATAN: {playtime.jumpsCompleted}/3
              </div>
            </div>
          </div>

          <span className="text-xs font-bold text-amber-200 max-w-[155px] text-right">
            {playtime.statusText}
          </span>
        </div>

        {/* Continuous Rope Animation Viewport */}
        <div className="relative bg-neutral-950/90 border-2 border-emerald-800 rounded-lg h-16 sm:h-20 [@media(max-height:500px)]:h-14 mb-2.5 overflow-hidden flex items-center justify-center">
          <svg viewBox="0 0 260 100" className="w-full h-full" aria-hidden="true">
            <line x1="20" y1="84" x2="240" y2="84" stroke="#475569" strokeWidth="2" />
            <g transform={`translate(130, ${inZone ? 54 : 64})`}>
              <circle cx="0" cy="-12" r="8" fill="#fed7aa" />
              <rect x="-8" y="-3" width="16" height="16" rx="2" fill="#2563eb" />
            </g>
            <path
              d={`M 24 52 Q 130 ${ropeArcY * 1.35 - 18} 236 52`}
              fill="none"
              stroke={inZone ? '#4ade80' : '#f8fafc'}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Visible Timing Indicator Bar (SVG without inline styles) */}
        <div className="mb-2.5">
          <div className="flex justify-between text-xs text-neutral-300 mb-1 font-semibold">
            <span>Tunggu...</span>
            <span className="text-emerald-300 font-bold">
              {isTouch ? 'ZON LOMPAT (KETIK LOMPAT!)' : 'ZON LOMPAT (TEKAN SPACE!)'}
            </span>
            <span>Terlewat</span>
          </div>
          <div className="relative w-full h-5 bg-neutral-900 rounded-md border-2 border-neutral-600 overflow-hidden">
            <svg
              viewBox="0 0 100 16"
              preserveAspectRatio="none"
              className="w-full h-full block"
              aria-hidden="true"
            >
              {/* Target Sweet Spot [36%, 64%] */}
              <rect x="36" y="0" width="28" height="16" fill="rgba(16, 185, 129, 0.45)" />
              <line x1="36" y1="0" x2="36" y2="16" stroke="#34d399" strokeWidth="0.9" />
              <line x1="64" y1="0" x2="64" y2="16" stroke="#34d399" strokeWidth="0.9" />
              {/* Moving Rope Timing Marker */}
              <rect x={Math.max(0, Math.min(98, phasePct - 1))} y="0" width="2.2" height="16" fill="#fcd34d" />
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onPointerDown={(e) => {
              if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                e.preventDefault();
                onJumpButton();
              }
            }}
            onClick={(e) => {
              e.currentTarget.blur();
              if (!isTouch) {
                onJumpButton();
              }
            }}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-extrabold text-sm md:text-base rounded-lg border-2 border-emerald-300 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
          >
            {isTouch ? 'KETIK UNTUK LOMPAT!' : 'LOMPAT [SPACE]'}
          </button>

          {hasScissors && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onUseScissors();
              }}
              className="min-h-[44px] px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white font-display font-bold text-sm rounded-lg border-2 border-red-400 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
            >
              Guna Gunting
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
