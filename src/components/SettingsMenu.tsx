import React, { useState, useEffect } from 'react';
import { AudioSettings } from '../game/GameState';
import { ControlMode } from '../game/inputPlatform';

interface SettingsMenuProps {
  settings: AudioSettings;
  controlMode: ControlMode;
  onUpdateSettings: (partial: Partial<AudioSettings>) => void;
  onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  settings,
  controlMode,
  onUpdateSettings,
  onClose,
}) => {
  const isTouch = controlMode === 'touch';
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  );

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-label="Tetapan Permainan"
    >
      <div className="chalkboard-panel w-full max-w-2xl rounded-xl p-5 sm:p-6 md:p-8 text-neutral-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-4 mb-6 gap-3">
          <h2 className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl tracking-wide text-amber-200">
            TETAPAN &amp; KAWALAN PERMAINAN
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-sm rounded-md border border-neutral-600 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
          >
            Tutup
          </button>
        </div>

        {/* Audio Volume Sliders */}
        <div className="space-y-5 mb-7">
          <div>
            <div className="flex justify-between text-sm font-semibold mb-1.5">
              <label htmlFor="slider-master">Kelantangan Utama</label>
              <span className="font-mono-tabular text-amber-300">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              id="slider-master"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.masterVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({ masterVolume: Number(e.target.value) / 100, muted: false })
              }
              className="w-full accent-emerald-400 cursor-pointer h-3 bg-emerald-950 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm font-semibold mb-1.5">
              <label htmlFor="slider-music">Kelantangan Muzik</label>
              <span className="font-mono-tabular text-amber-300">
                {Math.round(settings.musicVolume * 100)}%
              </span>
            </div>
            <input
              id="slider-music"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({ musicVolume: Number(e.target.value) / 100, muted: false })
              }
              className="w-full accent-emerald-400 cursor-pointer h-3 bg-emerald-950 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm font-semibold mb-1.5">
              <label htmlFor="slider-sfx">Kelantangan Kesan Bunyi</label>
              <span className="font-mono-tabular text-amber-300">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              id="slider-sfx"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({ sfxVolume: Number(e.target.value) / 100, muted: false })
              }
              className="w-full accent-emerald-400 cursor-pointer h-3 bg-emerald-950 rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ muted: !settings.muted })}
              className="min-h-[44px] px-4 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-neutral-100 text-sm font-semibold rounded-md border border-emerald-600 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
            >
              {settings.muted ? 'Nyahsenyap Semua Audio' : 'Senyapkan Semua Audio'}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="min-h-[44px] px-4 py-2.5 bg-amber-800 hover:bg-amber-700 text-amber-50 text-sm font-semibold rounded-md border border-amber-500 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
            >
              {isFullscreen ? 'Keluar Skrin Penuh' : 'Mod Skrin Penuh'}
            </button>
          </div>
        </div>

        {/* Platform-Matched Controls Reference */}
        <div className="border-t border-emerald-800/80 pt-5">
          <h3 className="font-display font-bold text-lg text-amber-200 mb-3">
            {isTouch ? 'Kawalan Skrin Sentuh (Aktif)' : 'Kawalan Papan Kekunci (Aktif)'}
          </h3>
          {isTouch ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Gerakkan Pemain</span>
                <span className="font-mono-tabular font-bold text-white text-right">Kayu Bedik Kiri Bawah</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Lari (Guna Stamina)</span>
                <span className="font-mono-tabular font-bold text-white text-right">Tahan Butang LARI</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Interaksi / Buku Nota</span>
                <span className="font-mono-tabular font-bold text-white text-right">Ketik INTERAKSI</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Lompat / Tali Lompat</span>
                <span className="font-mono-tabular font-bold text-white text-right">Ketik LOMPAT</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Guna Item Inventori</span>
                <span className="font-mono-tabular font-bold text-white text-right">Ketik Slot 1 – 4</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Orientasi Skrin</span>
                <span className="font-mono-tabular font-bold text-white text-right">Melintang &amp; Menegak</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Gerakkan Pemain</span>
                <span className="font-mono-tabular font-bold text-white text-right">W A S D / Anak Panah</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Lari (Guna Stamina)</span>
                <span className="font-mono-tabular font-bold text-white text-right">Tahan Shift</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Lompat / Tali Lompat</span>
                <span className="font-mono-tabular font-bold text-white text-right">Spacebar</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Interaksi / Buku Nota</span>
                <span className="font-mono-tabular font-bold text-white text-right">E</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Guna Item Inventori</span>
                <span className="font-mono-tabular font-bold text-white text-right">Kekunci 1 – 4 / Klik</span>
              </div>
              <div className="flex items-center justify-between bg-black/30 px-3 py-2 rounded gap-2">
                <span className="text-neutral-300">Jeda / Senyap Audio</span>
                <span className="font-mono-tabular font-bold text-white text-right">P / Esc · M</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-base rounded-lg border border-emerald-300 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
};
