import React from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onOpenSettings,
  onRestart,
  onMainMenu,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-label="Permainan Dijeda"
    >
      <div className="chalkboard-panel w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-xl p-5 sm:p-7 [@media(max-height:500px)]:p-4 text-center">
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-amber-200 mb-4 sm:mb-6 [@media(max-height:500px)]:mb-3 tracking-wide">
          PERMAINAN DIJEDA
        </h2>

        <div className="flex flex-col gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onResume}
            className="min-h-[44px] w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-base sm:text-lg rounded-lg border border-emerald-300 cursor-pointer touch-manipulation"
          >
            Sambung Permainan
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[44px] w-full py-2.5 sm:py-3 bg-amber-800 hover:bg-amber-700 text-amber-50 font-display font-bold text-base sm:text-lg rounded-lg border border-amber-500 cursor-pointer touch-manipulation"
          >
            Tetapan
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="min-h-[44px] w-full py-2.5 sm:py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-display font-bold text-base sm:text-lg rounded-lg border border-neutral-600 cursor-pointer touch-manipulation"
          >
            Mula Semula
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="min-h-[44px] w-full py-2.5 sm:py-3 bg-red-900/90 hover:bg-red-800 text-red-100 font-display font-bold text-base sm:text-lg rounded-lg border border-red-500 cursor-pointer touch-manipulation"
          >
            Keluar ke Menu Utama
          </button>
        </div>
      </div>
    </div>
  );
};
