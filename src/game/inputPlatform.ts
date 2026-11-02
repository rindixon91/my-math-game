export type ControlMode = 'touch' | 'desktop';

export type DynamicInputEventKind = 'touch' | 'mouse' | 'keyboard_game' | null;

export interface InputCapabilitySignals {
  pointerCoarse: boolean;
  pointerFine: boolean;
  anyPointerCoarse: boolean;
  anyPointerFine: boolean;
  hoverNone: boolean;
  anyHover: boolean;
  maxTouchPoints: number;
  hasOntouchstart: boolean;
  userAgent: string;
  platform: string;
  lastDynamicInput: DynamicInputEventKind;
}

export interface JoystickVector {
  clampedX: number;
  clampedY: number;
  nx: number;
  ny: number;
  magnitude: number;
  active: boolean;
}

const GAME_CONTROL_CODES = new Set<string>([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
  'Space',
  'KeyE',
]);

/**
 * Pure capability-based platform control detector.
 * IMPORTANT: Never uses screen width, window height, or viewport dimensions.
 * Distinguishes touchscreen devices (iPads, Android tablets, mobile phones, and
 * active touch-mode convertibles) from laptops and desktop computers strictly via
 * pointer/hover capabilities, touch points, hardware platform hints, and live input events.
 */
export function detectControlMode(signals: InputCapabilitySignals): ControlMode {
  const hasTouchHardware =
    signals.maxTouchPoints > 0 ||
    signals.pointerCoarse ||
    signals.anyPointerCoarse ||
    signals.hasOntouchstart;

  const isIPadDevice =
    /iPad/i.test(signals.userAgent) ||
    (/Macintosh|MacIntel/i.test(`${signals.platform} ${signals.userAgent}`) &&
      signals.maxTouchPoints > 1);

  const isMobileOrTabletUA =
    /Android|iPhone|iPod|Mobile|Tablet|Silk|Kindle|PlayBook|WebOS|BlackBerry|IEMobile|Opera Mini/i.test(
      signals.userAgent
    );

  // 1. Live input-method switching when user actively changes input device
  if (signals.lastDynamicInput === 'touch') {
    return 'touch';
  }

  if (signals.lastDynamicInput === 'keyboard_game') {
    return 'desktop';
  }

  if (signals.lastDynamicInput === 'mouse') {
    if (!isIPadDevice && !isMobileOrTabletUA && !signals.pointerCoarse) {
      return 'desktop';
    }
    if (signals.anyPointerFine && signals.anyHover && !signals.pointerCoarse) {
      return 'desktop';
    }
  }

  // 2. Hardware & W3C Interaction Media Features baseline (window size independent)
  if (!hasTouchHardware) {
    return 'desktop';
  }

  if (isIPadDevice) {
    return 'touch';
  }

  if (isMobileOrTabletUA) {
    return 'touch';
  }

  // Primary input mechanism is a coarse pointer (touchscreen phone, tablet, or 2-in-1 in tablet mode)
  if (signals.pointerCoarse) {
    return 'touch';
  }

  // Device lacks hover and lacks a fine primary pointer while offering touch
  if (signals.hoverNone && !signals.pointerFine) {
    return 'touch';
  }

  // Laptops/desktops (even those with secondary touchscreens where primary pointer is fine + hover)
  return 'desktop';
}

/**
 * Pure analog virtual joystick vector math with radial deadzone and circular clamping.
 */
export function computeJoystickVector(
  deltaX: number,
  deltaY: number,
  maxRadius: number,
  deadzoneRatio = 0.14
): JoystickVector {
  const safeRadius = Math.max(1, maxRadius);
  const dist = Math.hypot(deltaX, deltaY);

  if (dist < 1e-5) {
    return {
      clampedX: 0,
      clampedY: 0,
      nx: 0,
      ny: 0,
      magnitude: 0,
      active: false,
    };
  }

  const clampedDist = Math.min(dist, safeRadius);
  const dirX = deltaX / dist;
  const dirY = deltaY / dist;
  const clampedX = dirX * clampedDist;
  const clampedY = dirY * clampedDist;
  const rawMag = clampedDist / safeRadius;

  if (rawMag <= deadzoneRatio) {
    return {
      clampedX,
      clampedY,
      nx: 0,
      ny: 0,
      magnitude: 0,
      active: false,
    };
  }

  const magnitude = Math.min(1, (rawMag - deadzoneRatio) / Math.max(0.01, 1 - deadzoneRatio));
  // Smooth curve so comfortable mid-deflection already walks briskly and reaches 1.0 cleanly
  const responsiveScale = Math.min(1, 0.36 + magnitude * 0.72);

  return {
    clampedX,
    clampedY,
    nx: dirX * responsiveScale,
    ny: dirY * responsiveScale,
    magnitude,
    active: true,
  };
}

/**
 * Live browser observer that tracks pointer/hover media queries and real-time
 * input method changes (touch vs keyboard/mouse), updating subscribers automatically.
 */
export class InputPlatformDetector {
  private mode: ControlMode;
  private lastDynamicInput: DynamicInputEventKind = null;
  private lastTouchTimestampMs = -10000;
  private listeners = new Set<(mode: ControlMode) => void>();
  private cleanupFns: Array<() => void> = [];

  constructor() {
    this.mode = this.evaluateCurrentMode();
    this.syncBodyAttribute();
    this.attachObservers();
  }

  public getMode(): ControlMode {
    return this.mode;
  }

  public subscribe(listener: (mode: ControlMode) => void): () => void {
    this.listeners.add(listener);
    listener(this.mode);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private readBrowserSignals(): InputCapabilitySignals {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        pointerCoarse: false,
        pointerFine: true,
        anyPointerCoarse: false,
        anyPointerFine: true,
        hoverNone: false,
        anyHover: true,
        maxTouchPoints: 0,
        hasOntouchstart: false,
        userAgent: '',
        platform: '',
        lastDynamicInput: this.lastDynamicInput,
      };
    }

    const mq = (query: string): boolean => {
      try {
        return window.matchMedia ? window.matchMedia(query).matches : false;
      } catch {
        return false;
      }
    };

    const nav = navigator as Navigator & { msMaxTouchPoints?: number };
    const maxTouchPoints = Number(nav.maxTouchPoints ?? nav.msMaxTouchPoints ?? 0);

    return {
      pointerCoarse: mq('(pointer: coarse)'),
      pointerFine: mq('(pointer: fine)'),
      anyPointerCoarse: mq('(any-pointer: coarse)'),
      anyPointerFine: mq('(any-pointer: fine)'),
      hoverNone: mq('(hover: none)'),
      anyHover: mq('(any-hover: hover)'),
      maxTouchPoints,
      hasOntouchstart: 'ontouchstart' in window,
      userAgent: nav.userAgent || '',
      platform: nav.platform || '',
      lastDynamicInput: this.lastDynamicInput,
    };
  }

  private evaluateCurrentMode(): ControlMode {
    return detectControlMode(this.readBrowserSignals());
  }

  private refreshMode(): void {
    const next = this.evaluateCurrentMode();
    this.syncBodyAttribute(next);
    if (next !== this.mode) {
      this.mode = next;
      for (const listener of this.listeners) {
        listener(this.mode);
      }
    }
  }

  private syncBodyAttribute(targetMode: ControlMode = this.mode): void {
    if (typeof document !== 'undefined' && document.body) {
      if (document.body.dataset.controlMode !== targetMode) {
        document.body.dataset.controlMode = targetMode;
      }
    }
  }

  private attachObservers(): void {
    if (typeof window === 'undefined') return;

    const mediaQueries = [
      '(pointer: coarse)',
      '(pointer: fine)',
      '(any-pointer: coarse)',
      '(any-pointer: fine)',
      '(hover: none)',
      '(any-hover: hover)',
    ];

    const onMediaChange = () => {
      // Hardware/emulated input configuration changed (e.g. tablet mode fold, detachable keyboard)
      this.lastDynamicInput = null;
      this.refreshMode();
    };

    for (const q of mediaQueries) {
      try {
        const mql = window.matchMedia(q);
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', onMediaChange);
          this.cleanupFns.push(() => mql.removeEventListener('change', onMediaChange));
        }
      } catch {
        // Ignore unsupported query
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        this.lastTouchTimestampMs = performance.now();
        if (this.lastDynamicInput !== 'touch') {
          this.lastDynamicInput = 'touch';
          this.refreshMode();
        }
      } else if (e.pointerType === 'mouse') {
        // Guard against compatibility mouse events synthesized right after a touch tap
        if (performance.now() - this.lastTouchTimestampMs > 750) {
          if (this.lastDynamicInput !== 'mouse') {
            this.lastDynamicInput = 'mouse';
            this.refreshMode();
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && this.lastDynamicInput !== 'mouse') {
        if (performance.now() - this.lastTouchTimestampMs > 750) {
          this.lastDynamicInput = 'mouse';
          this.refreshMode();
        }
      }
    };

    const onTouchStart = () => {
      this.lastTouchTimestampMs = performance.now();
      if (this.lastDynamicInput !== 'touch') {
        this.lastDynamicInput = 'touch';
        this.refreshMode();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (GAME_CONTROL_CODES.has(e.code)) {
        if (performance.now() - this.lastTouchTimestampMs > 500) {
          if (this.lastDynamicInput !== 'keyboard_game') {
            this.lastDynamicInput = 'keyboard_game';
            this.refreshMode();
          }
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });

    this.cleanupFns.push(() => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('keydown', onKeyDown);
    });
  }

  public destroy(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
    this.listeners.clear();
  }
}
