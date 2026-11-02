import React, { useState } from 'react';
import { RunSummarySnapshot } from '../game/GameState';

interface VictoryScreenProps {
  summary: RunSummarySnapshot | null;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  summary,
  onPlayAgain,
  onMainMenu,
}) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-white animate-white-fade text-slate-900"
      role="dialog"
      aria-modal="true"
      aria-label="Skrin Kemenangan"
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border-4 border-emerald-700 bg-amber-50/95 p-5 sm:p-7 md:p-10 [@media(max-height:500px)]:p-4 text-center shadow-2xl">
        {/* Baldi Congratulatory Portrait & Required Dialogue */}
        <div className="flex flex-col items-center mb-3 sm:mb-5 [@media(max-height:500px)]:mb-2">
          <div className="w-16 h-20 sm:w-20 sm:h-24 [@media(max-height:500px)]:w-12 [@media(max-height:500px)]:h-14 rounded-xl overflow-hidden bg-white border-2 border-emerald-600 flex items-center justify-center mb-2 sm:mb-3 shadow">
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
          <p className="font-display font-bold text-xs sm:text-base md:text-lg text-emerald-900 bg-emerald-100 border border-emerald-400 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2">
            &ldquo;Tahniah! Kamu berjaya melarikan diri dari sekolah ini!&rdquo;
          </p>
        </div>

        <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl [@media(max-height:500px)]:text-2xl text-slate-900 tracking-wide">
          BERJAYA MELARIKAN DIRI!
        </h2>
        <p className="font-display font-extrabold text-lg sm:text-xl md:text-2xl [@media(max-height:500px)]:text-base text-emerald-700 mt-1 mb-4 sm:mb-6 [@media(max-height:500px)]:mb-3">
          KESEMUA 7 BUKU NOTA BERJAYA DIKUMPULKAN!
        </p>

        {summary && (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5 sm:mb-7 [@media(max-height:500px)]:mb-3.5 text-center">
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-300">
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold">MASA TAMAT</div>
              <div className="font-display font-extrabold text-lg sm:text-2xl text-slate-900 font-mono-tabular mt-0.5">
                {summary.elapsedSeconds}s
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-300">
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold">BAKI NYAWA</div>
              <div className="font-display font-extrabold text-lg sm:text-2xl text-red-600 font-mono-tabular mt-0.5">
                {summary.livesRemaining}/3
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-300">
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold">JAWAPAN SALAH</div>
              <div className="font-display font-extrabold text-lg sm:text-2xl text-emerald-700 font-mono-tabular mt-0.5">
                {summary.wrongAnswersCount}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="min-h-[44px] px-6 py-2.5 sm:px-8 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-extrabold text-base sm:text-lg rounded-lg border-2 border-emerald-800 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
          >
            MAIN SEMULA
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="min-h-[44px] px-6 py-2.5 sm:px-8 sm:py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-base sm:text-lg rounded-lg border-2 border-slate-950 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
          >
            MENU UTAMA
          </button>
        </div>
      </div>
    </div>
  );
};
