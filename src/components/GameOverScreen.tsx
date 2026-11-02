import React, { useState } from 'react';
import { RunSummarySnapshot } from '../game/GameState';

interface GameOverScreenProps {
  summary: RunSummarySnapshot | null;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  summary,
  onPlayAgain,
  onMainMenu,
}) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-red-950/95"
      role="dialog"
      aria-modal="true"
      aria-label="Permainan Tamat"
    >
      <div className="chalkboard-panel border-red-600 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-xl p-5 sm:p-7 md:p-9 [@media(max-height:500px)]:p-4 text-center">
        <div className="w-16 h-20 sm:w-20 sm:h-24 [@media(max-height:500px)]:w-12 [@media(max-height:500px)]:h-14 mx-auto mb-3 sm:mb-4 rounded-lg overflow-hidden bg-white border-2 border-red-400 flex items-center justify-center">
          {!imgErr ? (
            <img
              src="/assets/aistudio/image_bf0c3ba1.png"
              alt="Baldi"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="font-display font-extrabold text-3xl text-emerald-700">B</span>
          )}
        </div>

        <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl [@media(max-height:500px)]:text-2xl text-red-400 tracking-wider mb-1.5 sm:mb-2">
          PERMAINAN TAMAT
        </h2>
        <p className="text-neutral-200 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 [@media(max-height:500px)]:mb-3">
          Baldi telah menangkap kamu! Semua kemajuan telah ditetapkan semula untuk percubaan baharu.
        </p>

        {summary && (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5 sm:mb-7 [@media(max-height:500px)]:mb-3.5 text-center">
            <div className="bg-black/40 rounded-lg p-2 sm:p-3 border border-neutral-700">
              <div className="text-[10px] sm:text-xs text-neutral-400 font-semibold">BUKU NOTA</div>
              <div className="font-display font-extrabold text-lg sm:text-2xl text-amber-300 font-mono-tabular mt-0.5">
                {summary.notebooksCollected}/{summary.totalNotebooks}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-2 sm:p-3 border border-neutral-700">
              <div className="text-[10px] sm:text-xs text-neutral-400 font-semibold">KELAJUAN BALDI</div>
              <div className="font-display font-extrabold text-lg sm:text-2xl text-red-300 font-mono-tabular mt-0.5">
                {summary.baldiSpeedPercent}%
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-2 sm:p-3 border border-neutral-700">
              <div className="text-[10px] sm:text-xs text-neutral-400 font-semibold">MASA</div>
              <div className="font-display font-extrabold text-lg sm:text-2xl text-neutral-100 font-mono-tabular mt-0.5">
                {summary.elapsedSeconds}s
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="min-h-[44px] px-6 py-2.5 sm:px-7 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-extrabold text-base sm:text-lg rounded-lg border-2 border-emerald-300 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
          >
            MAIN SEMULA
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="min-h-[44px] px-6 py-2.5 sm:px-7 sm:py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-display font-bold text-base sm:text-lg rounded-lg border-2 border-neutral-600 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
          >
            MENU UTAMA
          </button>
        </div>
      </div>
    </div>
  );
};
