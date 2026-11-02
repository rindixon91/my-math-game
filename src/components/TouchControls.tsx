import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameSnapshot, GameState } from '../game/GameState';
import { computeJoystickVector } from '../game/inputPlatform';

interface TouchControlsProps {
  snapshot: GameSnapshot;
  onMoveChange: (nx: number, ny: number) => void;
  onSprintChange: (active: boolean) => void;
  onInteract: () => void;
  onJump: () => void;
}

const JOYSTICK_VIEWBOX_RADIUS = 50;

export const TouchControls: React.FC<TouchControlsProps> = ({
  snapshot,
  onMoveChange,
  onSprintChange,
  onInteract,
  onJump,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobGroupRef = useRef<SVGGElement | null>(null);
  const stemLineRef = useRef<SVGLineElement | null>(null);
  const joystickPointerIdRef = useRef<number | null>(null);
  const sprintPointerIdRef = useRef<number | null>(null);

  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const [isSprintHeld, setIsSprintHeld] = useState(false);

  const isPlaytimeChallenge = snapshot.state === GameState.PLAYTIME_CHALLENGE;
  const isDetention = snapshot.state === GameState.PRINCIPAL_DETENTION;
  const canMove = snapshot.state === GameState.PLAYING || snapshot.state === GameState.FINAL_ESCAPE;
  const canInteract = canMove;
  const canJump = canMove || isPlaytimeChallenge;

  const hasNearbyInteractable =
    canInteract &&
    Boolean(
      snapshot.interactionPrompt &&
        (snapshot.interactionPrompt.startsWith('[E]') ||
          snapshot.interactionPrompt.includes('Pintu Keluar') ||
          snapshot.interactionPrompt.includes('Pintu keluar'))
    );

  const updateKnobGraphics = useCallback((svgX: number, svgY: number) => {
    if (knobGroupRef.current) {
      knobGroupRef.current.setAttribute(
        'transform',
        `translate(${svgX.toFixed(1)}, ${svgY.toFixed(1)})`
      );
    }
    if (stemLineRef.current) {
      stemLineRef.current.setAttribute('x2', svgX.toFixed(1));
      stemLineRef.current.setAttribute('y2', svgY.toFixed(1));
    }
  }, []);

  const resetJoystick = useCallback(() => {
    joystickPointerIdRef.current = null;
    setIsJoystickActive(false);
    updateKnobGraphics(0, 0);
    onMoveChange(0, 0);
  }, [onMoveChange, updateKnobGraphics]);

  const resetSprint = useCallback(() => {
    sprintPointerIdRef.current = null;
    setIsSprintHeld(false);
    onSprintChange(false);
  }, [onSprintChange]);

  // Ensure movement and sprint clear cleanly if state locks movement or window loses focus
  useEffect(() => {
    if (!canMove) {
      resetJoystick();
      resetSprint();
    }
  }, [canMove, resetJoystick, resetSprint]);

  useEffect(() => {
    const handleBlur = () => {
      resetJoystick();
      resetSprint();
    };
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      onMoveChange(0, 0);
      onSprintChange(false);
    };
  }, [onMoveChange, onSprintChange, resetJoystick, resetSprint]);

  const processJoystickPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const maxDomRadius = Math.min(rect.width, rect.height) * 0.36;

      const vec = computeJoystickVector(clientX - centerX, clientY - centerY, maxDomRadius);
      const scaleToSvg = JOYSTICK_VIEWBOX_RADIUS / Math.max(1, maxDomRadius);
      updateKnobGraphics(vec.clampedX * scaleToSvg, vec.clampedY * scaleToSvg);
      onMoveChange(vec.nx, vec.ny);
    },
    [onMoveChange, updateKnobGraphics]
  );

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canMove) return;
    if (joystickPointerIdRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    joystickPointerIdRef.current = e.pointerId;
    setIsJoystickActive(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic event without active pointerId
    }
    processJoystickPointer(e.clientX, e.clientY);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joystickPointerIdRef.current) return;
    e.preventDefault();
    processJoystickPointer(e.clientX, e.clientY);
  };

  const handleJoystickPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joystickPointerIdRef.current) return;
    e.preventDefault();
    resetJoystick();
  };

  const handleSprintPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canMove) return;
    if (sprintPointerIdRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    sprintPointerIdRef.current = e.pointerId;
    setIsSprintHeld(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic event without active pointerId
    }
    onSprintChange(true);
  };

  const handleSprintPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== sprintPointerIdRef.current) return;
    e.preventDefault();
    resetSprint();
  };

  const handleInteractPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canInteract) return;
    e.preventDefault();
    e.stopPropagation();
    onInteract();
  };

  const handleJumpPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canJump) return;
    e.preventDefault();
    e.stopPropagation();
    onJump();
  };

  return (
    <div
      data-testid="touch-controls-root"
      className="fixed inset-0 z-[25] pointer-events-none select-none touch-none"
    >
      {/* BOTTOM-LEFT VIRTUAL JOYSTICK FOR PLAYER MOVEMENT */}
      <div
        ref={padRef}
        data-testid="touch-joystick"
        role="application"
        aria-label="Kayu bedik pergerakan maya"
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={handleJoystickPointerEnd}
        onPointerCancel={handleJoystickPointerEnd}
        onLostPointerCapture={handleJoystickPointerEnd}
        className={`absolute safe-touch-bl w-36 h-36 md:w-40 md:h-40 [@media(max-height:500px)]:w-34 [@media(max-height:500px)]:h-34 p-1.5 rounded-full touch-none select-none transition-opacity ${
          canMove
            ? 'pointer-events-auto opacity-95 cursor-grab active:cursor-grabbing'
            : 'pointer-events-none opacity-35'
        }`}
      >
        <svg
          viewBox="-72 -72 144 144"
          className="w-full h-full overflow-visible pointer-events-none drop-shadow-xl"
          aria-hidden="true"
        >
          {/* Outer School Chalkboard & Wood Base Ring */}
          <circle
            cx="0"
            cy="0"
            r="64"
            fill="rgba(12, 35, 21, 0.84)"
            stroke={isJoystickActive ? '#fde047' : '#b87a3d'}
            strokeWidth="4"
          />
          <circle
            cx="0"
            cy="0"
            r="56"
            fill="none"
            stroke="rgba(248, 250, 252, 0.16)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />

          {/* Four Directional Chalk Chevrons */}
          <path d="M -6 -44 L 0 -52 L 6 -44" fill="none" stroke="rgba(253, 224, 71, 0.7)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -6 44 L 0 52 L 6 44" fill="none" stroke="rgba(253, 224, 71, 0.7)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -44 -6 L -52 0 L -44 6" fill="none" stroke="rgba(253, 224, 71, 0.7)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 44 -6 L 52 0 L 44 6" fill="none" stroke="rgba(253, 224, 71, 0.7)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

          {/* Active Direction Stem */}
          <line
            ref={stemLineRef}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke="#4ade80"
            strokeWidth="4"
            strokeLinecap="round"
            opacity={isJoystickActive ? 0.85 : 0}
          />

          {/* Tactile Thumb Knob */}
          <g ref={knobGroupRef} transform="translate(0, 0)">
            <circle
              cx="0"
              cy="0"
              r="25"
              fill={isJoystickActive ? '#16a34a' : '#1e3a29'}
              stroke={isJoystickActive ? '#fef08a' : '#eab308'}
              strokeWidth="3.5"
            />
            <circle cx="-6" cy="-7" r="6" fill="rgba(255, 255, 255, 0.24)" />
          </g>
        </svg>
      </div>

      {/* BOTTOM-RIGHT ERGONOMIC TOUCH ACTION CLUSTER (RUN, JUMP, INTERACT) */}
      <div
        data-testid="touch-action-cluster"
        className={`absolute safe-touch-br w-42 h-40 md:w-46 md:h-44 [@media(max-height:500px)]:w-42 [@media(max-height:500px)]:h-38 pointer-events-none select-none touch-none ${
          isDetention ? 'opacity-35' : ''
        }`}
      >
        {/* RUN / SPRINT BUTTON (Bottom-Left of Right-Thumb Arc — Hold to Run) */}
        <button
          type="button"
          tabIndex={-1}
          data-testid="touch-btn-run"
          aria-label="Tahan untuk berlari"
          aria-pressed={isSprintHeld}
          disabled={!canMove}
          onPointerDown={handleSprintPointerDown}
          onPointerUp={handleSprintPointerEnd}
          onPointerCancel={handleSprintPointerEnd}
          onLostPointerCapture={handleSprintPointerEnd}
          className={`absolute bottom-0.5 left-0 w-16 h-16 md:w-18 md:h-18 [@media(max-height:500px)]:w-15 [@media(max-height:500px)]:h-15 rounded-full border-[3px] flex flex-col items-center justify-center shadow-xl touch-none select-none transition-transform ${
            !canMove
              ? 'pointer-events-none opacity-35 bg-neutral-900/80 border-neutral-600 text-neutral-400'
              : snapshot.staminaExhausted
              ? 'pointer-events-auto bg-red-950/90 border-red-500 text-red-200'
              : isSprintHeld
              ? 'pointer-events-auto scale-95 bg-emerald-600 border-amber-200 text-white'
              : 'pointer-events-auto bg-neutral-900/90 border-amber-500/90 text-amber-100 active:scale-95'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 md:w-6 md:h-6 [@media(max-height:500px)]:w-5 [@media(max-height:500px)]:h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0" fill="currentColor" />
            <path d="M7 20l3-6 2.5 2 3-4.5" />
            <path d="M10 10l3.5-2 3 2.5 2.5 1" />
            <path d="M4 14h4" />
          </svg>
          <span className="font-display font-extrabold text-[9px] md:text-[10.5px] [@media(max-height:500px)]:text-[8.5px] tracking-wide leading-none mt-0.5 whitespace-nowrap">
            LARI
          </span>
        </button>

        {/* JUMP BUTTON (Top-Right of Right-Thumb Arc — Tap to Jump / Playtime Rope) */}
        <button
          type="button"
          tabIndex={-1}
          data-testid="touch-btn-jump"
          aria-label="Lompat"
          disabled={!canJump}
          onPointerDown={handleJumpPointerDown}
          onClick={(e) => {
            if (e.detail === 0 && canJump) {
              onJump();
            }
          }}
          className={`absolute top-0 right-1 w-16 h-16 md:w-18 md:h-18 [@media(max-height:500px)]:w-15 [@media(max-height:500px)]:h-15 rounded-full border-[3px] flex flex-col items-center justify-center shadow-xl touch-none select-none transition-transform active:scale-95 ${
            !canJump
              ? 'pointer-events-none opacity-35 bg-neutral-900/80 border-neutral-600 text-neutral-400'
              : isPlaytimeChallenge
              ? 'pointer-events-auto bg-emerald-600 border-amber-200 text-white scale-105 ring-4 ring-emerald-400/50'
              : 'pointer-events-auto bg-sky-950/90 border-sky-400 text-sky-100'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 md:w-6 md:h-6 [@media(max-height:500px)]:w-5 [@media(max-height:500px)]:h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V6" />
            <path d="M6.5 11.5L12 6l5.5 5.5" />
            <path d="M6 21h12" />
          </svg>
          <span className="font-display font-extrabold text-[9px] md:text-[10.5px] [@media(max-height:500px)]:text-[8.5px] tracking-wide leading-none mt-0.5 whitespace-nowrap">
            LOMPAT
          </span>
        </button>

        {/* INTERACT BUTTON (Primary Corner Anchor — Notebooks, Doors, Items, Exits) */}
        <button
          type="button"
          tabIndex={-1}
          data-testid="touch-btn-interact"
          aria-label="Interaksi"
          disabled={!canInteract}
          onPointerDown={handleInteractPointerDown}
          onClick={(e) => {
            if (e.detail === 0 && canInteract) {
              onInteract();
            }
          }}
          className={`absolute bottom-0 right-0 w-18 h-18 md:w-20 md:h-20 [@media(max-height:500px)]:w-18 [@media(max-height:500px)]:h-18 rounded-full border-[3px] flex flex-col items-center justify-center shadow-2xl touch-none select-none transition-transform active:scale-95 ${
            !canInteract
              ? 'pointer-events-none opacity-35 bg-neutral-900/80 border-neutral-600 text-neutral-400'
              : hasNearbyInteractable
              ? 'pointer-events-auto bg-amber-400 border-white text-slate-950 scale-105 ring-4 ring-amber-300/55'
              : 'pointer-events-auto bg-emerald-900/95 border-emerald-400 text-emerald-50'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 md:w-7 md:h-7 [@media(max-height:500px)]:w-6 [@media(max-height:500px)]:h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11" />
            <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
            <path d="M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6H9.5a5.5 5.5 0 0 1-4.8-2.8L3.3 14.5a1.4 1.4 0 0 1 2.4-1.4L8 15" />
          </svg>
          <span className="font-display font-extrabold text-[8.5px] md:text-[9.5px] [@media(max-height:500px)]:text-[8.5px] tracking-tight leading-none mt-1 whitespace-nowrap">
            INTERAKSI
          </span>
        </button>
      </div>
    </div>
  );
};
