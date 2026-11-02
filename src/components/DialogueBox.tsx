import React, { useState } from 'react';
import { DialoguePayload } from '../game/GameState';
import { ControlMode } from '../game/inputPlatform';

interface DialogueBoxProps {
  dialogue: DialoguePayload;
  controlMode: ControlMode;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({ dialogue, controlMode }) => {
  const [imgError, setImgError] = useState(false);
  const isTouch = controlMode === 'touch';

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-30 pointer-events-none w-full max-w-md sm:max-w-lg [@media(max-height:500px)]:max-w-sm px-4 ${
        isTouch
          ? 'portrait:top-44 landscape:bottom-32 [@media(max-height:500px)]:top-14 [@media(max-height:500px)]:bottom-auto'
          : 'bottom-34 [@media(max-height:500px)]:top-14 [@media(max-height:500px)]:bottom-auto'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="hud-plaque rounded-xl p-2.5 sm:p-3.5 [@media(max-height:500px)]:p-2 flex items-center gap-3 sm:gap-4 shadow-2xl border-2 border-amber-500/90">
        {/* Character Portrait with Zero-Broken-Image Fallback */}
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-neutral-800 border border-neutral-600">
          {dialogue.portraitUrl && !imgError ? (
            <img
              src={dialogue.portraitUrl}
              alt={dialogue.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-contain bg-white"
            />
          ) : (
            <span className="font-display font-extrabold text-lg text-amber-300">
              {dialogue.title.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] sm:text-xs font-bold tracking-wider text-amber-300">
            {dialogue.title}
          </div>
          <div className="font-display font-bold text-sm sm:text-base md:text-lg text-white leading-snug mt-0.5">
            {dialogue.text}
          </div>
        </div>
      </div>
    </div>
  );
};
