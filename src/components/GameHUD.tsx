import React, { useEffect, useState } from 'react';
import { GameSnapshot, GameState } from '../game/GameState';
import { ControlMode } from '../game/inputPlatform';
import { ITEM_METADATA, ItemType } from '../game/InventoryManager';

interface GameHUDProps {
  snapshot: GameSnapshot;
  controlMode: ControlMode;
  onUseItemSlot: (slotIndex: number) => void;
  onTriggerInteract: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
}

const ItemSvgIcon: React.FC<{ type: ItemType }> = ({ type }) => {
  switch (type) {
    case ItemType.BSODA:
      return (
        <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
          <rect x="6" y="3" width="12" height="18" rx="2" fill="#2563eb" stroke="#0f172a" strokeWidth="1.8" />
          <rect x="6" y="3" width="12" height="3" fill="#93c5fd" />
          <rect x="8" y="9" width="8" height="5" fill="#f8fafc" />
        </svg>
      );
    case ItemType.ZESTY_BAR:
      return (
        <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
          <rect x="2" y="6" width="20" height="12" rx="2" fill="#ea580c" stroke="#0f172a" strokeWidth="1.8" />
          <rect x="6" y="9" width="12" height="6" fill="#fef08a" />
        </svg>
      );
    case ItemType.QUARTER:
      return (
        <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="#eab308" stroke="#713f12" strokeWidth="2" />
          <circle cx="12" cy="12" r="6" fill="none" stroke="#fef08a" strokeWidth="1.4" />
        </svg>
      );
    case ItemType.SCISSORS:
      return (
        <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
          <line x1="6" y1="18" x2="19" y2="5" stroke="#cbd5e1" strokeWidth="2.5" />
          <line x1="18" y1="18" x2="5" y2="5" stroke="#cbd5e1" strokeWidth="2.5" />
          <circle cx="7" cy="18" r="3.2" fill="none" stroke="#dc2626" strokeWidth="2.2" />
          <circle cx="17" cy="18" r="3.2" fill="none" stroke="#dc2626" strokeWidth="2.2" />
        </svg>
      );
    case ItemType.PRINCIPAL_KEYS:
      return (
        <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
          <circle cx="8" cy="12" r="4.5" fill="none" stroke="#facc15" strokeWidth="2.4" />
          <path d="M12.5 12 H21 M18 12 V16 M21 12 V15" stroke="#facc15" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case ItemType.DOOR_LOCK:
      return (
        <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
          <path d="M8 11 V8 A4 4 0 0 1 16 8 V11" fill="none" stroke="#cbd5e1" strokeWidth="2.4" />
          <rect x="5" y="11" width="14" height="10" rx="2" fill="#eab308" stroke="#713f12" strokeWidth="1.8" />
        </svg>
      );
  }
};

export const GameHUD: React.FC<GameHUDProps> = ({
  snapshot,
  controlMode,
  onUseItemSlot,
  onTriggerInteract,
  onToggleMute,
  onTogglePause,
}) => {
  const [ghostStamina, setGhostStamina] = useState(snapshot.stamina);
  const isTouch = controlMode === 'touch';

  useEffect(() => {
    const t = window.setTimeout(() => {
      setGhostStamina(snapshot.stamina);
    }, 220);
    return () => window.clearTimeout(t);
  }, [snapshot.stamina]);

  const staminaPct = Math.max(0, Math.min(100, Math.round(snapshot.stamina)));
  const ghostPct = Math.max(staminaPct, Math.min(100, Math.round(ghostStamina)));

  const selectedItem = snapshot.inventory[snapshot.selectedSlot];
  const selectedMeta = selectedItem ? ITEM_METADATA[selectedItem] : null;

  const formattedPrompt =
    snapshot.interactionPrompt && isTouch
      ? snapshot.interactionPrompt.replace(/^\[E\]\s*/, 'Ketik INTERAKSI · ')
      : snapshot.interactionPrompt;

  const staminaFillHex = snapshot.staminaExhausted
    ? '#ef4444'
    : snapshot.zestyBoostRemaining > 0
    ? '#fbbf24'
    : '#10b981';

  const renderHeartsAndStamina = (compactTouch: boolean) => (
    <div
      className={
        compactTouch
          ? 'hud-plaque rounded-lg px-2.5 py-1.5 flex flex-col gap-1 w-44 sm:w-52'
          : 'flex flex-col gap-1.5 sm:gap-2 w-36 sm:w-60 md:w-68 shrink-0'
      }
    >
      {/* Three Hearts */}
      <div
        className={`flex items-center ${compactTouch ? 'justify-between gap-1' : 'gap-1 sm:gap-2 px-0.5 sm:px-1 flex-wrap'}`}
        aria-label={`Nyawa: ${snapshot.lives} daripada ${snapshot.maxLives}`}
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          {Array.from({ length: snapshot.maxLives }).map((_, idx) => {
            const filled = idx < snapshot.lives;
            const justDamaged =
              !filled && idx === snapshot.lives && snapshot.invulnerabilityRemaining > 0;
            return (
              <svg
                key={idx}
                viewBox="0 0 28 26"
                className={
                  compactTouch
                    ? 'w-5 h-5 drop-shadow-md shrink-0'
                    : 'w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md shrink-0'
                }
                aria-hidden="true"
              >
                <path
                  d="M14 24.2 C14 24.2 2.5 16.5 2.5 8.8 C2.5 4.6 5.8 1.8 9.6 1.8 C11.9 1.8 13.4 3.0 14 4.4 C14.6 3.0 16.1 1.8 18.4 1.8 C22.2 1.8 25.5 4.6 25.5 8.8 C25.5 16.5 14 24.2 14 24.2 Z"
                  fill={filled ? '#ef4444' : justDamaged ? '#7f1d1d' : 'rgba(15, 23, 42, 0.78)'}
                  stroke={filled ? '#fef2f2' : '#64748b'}
                  strokeWidth="2"
                />
                {filled && (
                  <ellipse cx="9.2" cy="7.2" rx="2.4" ry="1.5" fill="rgba(255,255,255,0.45)" />
                )}
              </svg>
            );
          })}
          {snapshot.invulnerabilityRemaining > 0 && (
            <span className="text-[10px] font-mono-tabular text-amber-300 ml-0.5">
              {snapshot.invulnerabilityRemaining.toFixed(1)}s
            </span>
          )}
        </div>

        {compactTouch && (
          <span className="text-[10px] font-mono-tabular font-bold text-neutral-100">
            {snapshot.staminaExhausted ? 'PENAT' : `${staminaPct}%`}
          </span>
        )}
      </div>

      {/* Stamina Bar */}
      <div className={compactTouch ? '' : 'hud-plaque rounded-lg p-1.5 sm:p-2.5'}>
        {!compactTouch && (
          <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold mb-1 gap-1">
            <span className="tracking-wider text-neutral-200 truncate">
              {snapshot.staminaExhausted
                ? 'PULIH TENAGA'
                : snapshot.zestyBoostRemaining > 0
                ? 'LONJAKAN ZESTY'
                : 'STAMINA'}
            </span>
            <span className="font-mono-tabular text-neutral-100 shrink-0">{staminaPct}%</span>
          </div>
        )}
        <div
          className={`relative w-full ${
            compactTouch ? 'h-2' : 'h-2.5 sm:h-3.5'
          } bg-neutral-900 rounded overflow-hidden border border-neutral-700`}
        >
          <svg
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            className="w-full h-full block"
            aria-hidden="true"
          >
            <rect x="0" y="0" width={ghostPct} height="10" fill="rgba(252, 211, 77, 0.45)" />
            <rect x="0" y="0" width={staminaPct} height="10" fill={staminaFillHex} />
          </svg>
        </div>
      </div>
    </div>
  );

  const renderInventoryDock = () => (
    <div
      className={`flex flex-col ${
        isTouch ? 'items-center' : 'items-end'
      } gap-1 sm:gap-1.5 pointer-events-auto shrink-0`}
    >
      {selectedMeta && (
        <div className="hud-plaque px-2.5 py-0.5 sm:px-3 sm:py-1 rounded text-[10px] sm:text-xs text-neutral-200 max-w-[220px] sm:max-w-none truncate">
          <span className="font-bold text-amber-300">{selectedMeta.shortName}</span>
          {!isTouch && (
            <>
              <span aria-hidden="true" className="hidden sm:inline"> · </span>
              <span className="hidden sm:inline">{selectedMeta.description}</span>
            </>
          )}
        </div>
      )}
      <div className="hud-plaque rounded-lg p-1 sm:p-1.5 flex items-center gap-1.5 sm:gap-2">
        {snapshot.inventory.map((item, idx) => {
          const isSelected = idx === snapshot.selectedSlot;
          const meta = item ? ITEM_METADATA[item] : null;
          return (
            <button
              key={idx}
              type="button"
              tabIndex={-1}
              aria-label={meta ? `Slot ${idx + 1}: Guna ${meta.name}` : `Slot ${idx + 1}: Kosong`}
              onClick={(e) => {
                e.currentTarget.blur();
                onUseItemSlot(idx);
              }}
              className={`relative ${
                isTouch ? 'w-11 h-11 md:w-12 md:h-12' : 'w-10 h-10 sm:w-13 sm:h-13'
              } rounded-md border-2 flex flex-col items-center justify-center transition-colors cursor-pointer touch-manipulation ${
                isSelected
                  ? 'border-amber-400 bg-neutral-800/95'
                  : 'border-neutral-700 bg-neutral-900/90 hover:border-neutral-500'
              }`}
            >
              <span className="absolute top-0.5 left-1 font-mono-tabular text-[9px] sm:text-[10px] text-neutral-400">
                {idx + 1}
              </span>
              {item ? (
                <>
                  <div className={isTouch ? 'scale-90' : 'scale-75 sm:scale-100'}>
                    <ItemSvgIcon type={item} />
                  </div>
                  {!isTouch && (
                    <span className="hidden sm:block text-[9px] font-semibold text-neutral-200 leading-none mt-0.5 truncate max-w-[46px]">
                      {meta?.shortName}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-neutral-600 font-mono-tabular">—</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Brief red hurt flash when Baldi lands an attack */}
      {snapshot.hurtFlashCounter > 0 && (
        <div
          key={snapshot.hurtFlashCounter}
          className="fixed inset-0 bg-red-600/45 animate-hurt-flash pointer-events-none"
        />
      )}

      {/* Critical 1-Heart Peripheral Vignette */}
      {snapshot.lives === 1 && (
        <div className="fixed inset-0 pointer-events-none critical-heart-vignette" />
      )}

      {/* TOP ROW: TOP-LEFT Notebook Counter (+ Hearts/Stamina in Touch Mode) & TOP-RIGHT Objective + Utility Buttons */}
      <div className="absolute safe-hud-top flex items-start justify-between gap-2">
        {/* TOP LEFT */}
        <div className="flex flex-col items-start gap-1.5 shrink-0 max-w-[48%] sm:max-w-none">
          <div className="hud-plaque rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-2 [@media(max-height:500px)]:px-2.5 [@media(max-height:500px)]:py-1 flex flex-col gap-0.5 w-full sm:w-auto">
            <div className="font-display font-extrabold text-sm sm:text-lg md:text-2xl [@media(max-height:500px)]:text-base tracking-wide text-amber-300 font-mono-tabular leading-tight whitespace-nowrap">
              BUKU NOTA: {snapshot.notebooksCompletedCount}/{snapshot.totalNotebooks}
            </div>
            <div className="text-[10px] sm:text-xs text-neutral-300 font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-tight">
              <span className="truncate max-w-[125px] sm:max-w-none">{snapshot.currentRoomName}</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="font-mono-tabular text-neutral-400">
                <span className="hidden sm:inline">Kelajuan </span>Baldi {snapshot.baldiSpeedPercent}%
              </span>
            </div>
          </div>

          {/* On Touchscreen devices, anchor Hearts + Stamina cleanly under Top-Left so Bottom-Left Joystick is 100% unobstructed */}
          {isTouch && renderHeartsAndStamina(true)}
        </div>

        {/* TOP RIGHT: Objective + Compact Utility Buttons */}
        <div className="flex items-start gap-1.5 sm:gap-2 min-w-0 justify-end">
          <div
            className={`hud-plaque rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-2 [@media(max-height:500px)]:px-2.5 [@media(max-height:500px)]:py-1 text-right min-w-0 ${
              snapshot.isFinalEscape ? 'border-red-500 bg-red-950/90' : ''
            }`}
          >
            <div
              className={`font-display font-extrabold text-[11px] sm:text-xs md:text-base [@media(max-height:500px)]:text-xs tracking-wide leading-tight ${
                snapshot.isFinalEscape ? 'text-red-200' : 'text-neutral-100'
              }`}
            >
              {snapshot.isFinalEscape ? (
                <>
                  <span className="sm:hidden">LARIKAN DIRI!</span>
                  <span className="hidden sm:inline">OBJEKTIF: LARIKAN DIRI DARI SEKOLAH!</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">CARI 7 BUKU NOTA</span>
                  <span className="hidden sm:inline">OBJEKTIF: CARI KESEMUA 7 BUKU NOTA.</span>
                </>
              )}
            </div>
            {snapshot.isFinalEscape && (
              <div className="text-[10px] sm:text-xs text-emerald-300 font-semibold mt-0.5 leading-tight">
                <span className="sm:hidden">Pintu Keluar Utama (Selatan)!</span>
                <span className="hidden sm:inline">Baldi amat berang! Lari ke Pintu Keluar Utama (Selatan)!</span>
              </div>
            )}
          </div>

          <div className="flex gap-1.5 pointer-events-auto shrink-0">
            <button
              type="button"
              tabIndex={-1}
              aria-label={snapshot.audioSettings.muted ? 'Nyahsenyap audio' : 'Senyapkan audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className={`hud-plaque ${
                isTouch ? 'w-11 h-11' : 'w-9 h-9 sm:w-10 sm:h-10'
              } rounded-lg flex items-center justify-center text-neutral-100 hover:bg-neutral-800 cursor-pointer touch-manipulation`}
            >
              {snapshot.audioSettings.muted ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Jeda permainan"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className={`hud-plaque ${
                isTouch ? 'w-11 h-11' : 'w-9 h-9 sm:w-10 sm:h-10'
              } rounded-lg flex items-center justify-center text-neutral-100 hover:bg-neutral-800 cursor-pointer touch-manipulation`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* CENTER-TOP NOTIFICATION TOAST */}
      {snapshot.notificationBanner && (
        <div
          className={`absolute ${
            isTouch
              ? 'portrait:top-36 landscape:top-14 [@media(max-height:500px)]:max-w-xs'
              : 'top-16 sm:top-20'
          } left-1/2 -translate-x-1/2 max-w-md sm:max-w-lg px-3 sm:px-4 w-full flex justify-center`}
        >
          <div
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border-2 font-display font-bold text-xs sm:text-sm shadow-xl text-center ${
              snapshot.notificationBanner.tone === 'horror'
                ? 'bg-red-950/95 border-red-400 text-red-100 text-xs sm:text-base tracking-wider'
                : snapshot.notificationBanner.tone === 'success'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100'
                : snapshot.notificationBanner.tone === 'danger'
                ? 'bg-rose-950/95 border-rose-400 text-rose-100'
                : 'bg-neutral-900/95 border-amber-500 text-amber-100'
            }`}
          >
            {snapshot.notificationBanner.text}
          </div>
        </div>
      )}

      {/* PRINCIPAL DETENTION COUNTDOWN OVERLAY */}
      {snapshot.state === GameState.PRINCIPAL_DETENTION && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 chalkboard-panel rounded-xl px-6 py-4 sm:px-8 sm:py-5 text-center max-w-[90vw]">
          <div className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-red-400 font-mono-tabular tracking-wider">
            TAHANAN: {Math.ceil(snapshot.detentionRemaining)}
          </div>
          <div className="text-xs md:text-sm text-neutral-200 mt-1.5">
            Pergerakan dikunci sehingga tempoh tahanan tamat.
            {snapshot.inventory.includes(ItemType.PRINCIPAL_KEYS)
              ? isTouch
                ? ' Ketik slot Kunci di bawah untuk keluar awal!'
                : ' Tekan slot Kunci (1–4) untuk keluar awal!'
              : ''}
          </div>
        </div>
      )}

      {/* CONTEXTUAL INTERACTION PROMPT */}
      {formattedPrompt && snapshot.state !== GameState.PRINCIPAL_DETENTION && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${
            isTouch
              ? 'portrait:bottom-58 landscape:bottom-20 pointer-events-auto'
              : 'bottom-24 sm:bottom-28 pointer-events-none'
          } max-w-[86vw] flex justify-center`}
        >
          {isTouch ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerInteract();
              }}
              className="hud-plaque px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-amber-200 truncate cursor-pointer active:scale-95"
            >
              {formattedPrompt}
            </button>
          ) : (
            <div className="hud-plaque px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-amber-200 truncate">
              {formattedPrompt}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM DOCKS: Desktop uses Bottom-Left Hearts/Stamina + Bottom-Right Inventory; Touch centers Inventory cleanly away from corners */}
      {isTouch ? (
        <div className="absolute left-1/2 -translate-x-1/2 safe-touch-inventory">
          {renderInventoryDock()}
        </div>
      ) : (
        <div className="absolute bottom-2.5 inset-x-2.5 sm:bottom-4 sm:inset-x-4 flex items-end justify-between gap-2">
          {renderHeartsAndStamina(false)}
          {renderInventoryDock()}
        </div>
      )}
    </div>
  );
};
