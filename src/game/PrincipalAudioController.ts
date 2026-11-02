import { GameState } from './GameState';

export type GameplayAudioMode =
  | 'NONE'
  | 'SCHOOL'
  | 'HORROR'
  | 'PRINCIPAL_PURSUIT'
  | 'DETENTION_COUNTDOWN';

export interface PrincipalAudioPorts {
  playPrincipalWarning: () => void;
  playPrincipalDetentionCatch: () => void;
  startSchoolMusic: () => void;
  startHorrorEscapeMusic: () => void;
  startPrincipalPursuitMusic: () => void;
  stopMusic: () => void;
  startDetentionCountdown: (initialWholeSeconds: number) => void;
  syncDetentionCountdownTick: (remainingWholeSeconds: number) => void;
  stopDetentionCountdown: () => void;
  setSimulationPaused: (paused: boolean) => void;
}

export interface PrincipalAudioSyncInput {
  state: GameState;
  isFinalEscape: boolean;
  principalJustDetectedViolation: boolean;
  principalIsPursuing: boolean;
  justEnteredDetention: boolean;
  detentionRemainingSeconds: number;
}

/**
 * Pure, deterministic state machine coordinating Principal rule-violation warnings,
 * continuous fast-paced pursuit music, synchronised detention countdown audio,
 * background music restoration, and repeated-detection resets with zero overlap.
 */
export class PrincipalAudioController {
  private ports: PrincipalAudioPorts;
  private mode: GameplayAudioMode = 'NONE';
  private wasPursuing = false;
  private lastSyncedDetentionSec = -1;
  private isPaused = false;

  constructor(ports: PrincipalAudioPorts) {
    this.ports = ports;
  }

  public getMode(): GameplayAudioMode {
    return this.mode;
  }

  public getLastSyncedDetentionSecond(): number {
    return this.lastSyncedDetentionSec;
  }

  public resetForNewSession(): void {
    if (this.mode === 'DETENTION_COUNTDOWN') {
      this.ports.stopDetentionCountdown();
    }
    this.ports.stopMusic();
    this.ports.setSimulationPaused(false);
    this.mode = 'SCHOOL';
    this.wasPursuing = false;
    this.lastSyncedDetentionSec = -1;
    this.isPaused = false;
    this.ports.startSchoolMusic();
  }

  public stopAll(): void {
    if (this.mode === 'DETENTION_COUNTDOWN') {
      this.ports.stopDetentionCountdown();
    }
    this.ports.stopMusic();
    this.ports.setSimulationPaused(false);
    this.mode = 'NONE';
    this.wasPursuing = false;
    this.lastSyncedDetentionSec = -1;
    this.isPaused = false;
  }

  public sync(input: PrincipalAudioSyncInput): GameplayAudioMode {
    const {
      state,
      isFinalEscape,
      principalJustDetectedViolation,
      principalIsPursuing,
      justEnteredDetention,
      detentionRemainingSeconds,
    } = input;

    // 1. Terminal or Title states: ensure countdown & pursuit state are cleanly cleared
    if (
      state === GameState.MAIN_MENU ||
      state === GameState.GAME_OVER ||
      state === GameState.VICTORY
    ) {
      if (this.mode === 'DETENTION_COUNTDOWN') {
        this.ports.stopDetentionCountdown();
      }
      if (this.isPaused) {
        this.isPaused = false;
        this.ports.setSimulationPaused(false);
      }
      this.mode = 'NONE';
      this.wasPursuing = false;
      this.lastSyncedDetentionSec = -1;
      return this.mode;
    }

    // 2. Global Pause / Settings overlay: suspend active loop/tick playback without losing state
    const shouldPause = state === GameState.PAUSED || state === GameState.SETTINGS;
    if (shouldPause !== this.isPaused) {
      this.isPaused = shouldPause;
      this.ports.setSimulationPaused(shouldPause);
    }
    if (shouldPause) {
      return this.mode;
    }

    // 3. Detention sequence: stop pursuit music, play synchronised countdown (10..1), stop at 0
    if (justEnteredDetention || (state === GameState.PRINCIPAL_DETENTION && this.mode !== 'DETENTION_COUNTDOWN')) {
      this.ports.stopMusic();
      this.ports.playPrincipalDetentionCatch();
      const initialSec = Math.max(1, Math.ceil(detentionRemainingSeconds));
      this.lastSyncedDetentionSec = initialSec;
      this.wasPursuing = false;
      this.mode = 'DETENTION_COUNTDOWN';
      this.ports.startDetentionCountdown(initialSec);
      return this.mode;
    }

    if (state === GameState.PRINCIPAL_DETENTION && this.mode === 'DETENTION_COUNTDOWN') {
      const wholeSec = Math.ceil(detentionRemainingSeconds);
      if (wholeSec > 0 && wholeSec !== this.lastSyncedDetentionSec) {
        this.lastSyncedDetentionSec = wholeSec;
        this.ports.syncDetentionCountdownTick(wholeSec);
      }
      return this.mode;
    }

    // Countdown reached 0 (or unlocked early with Principal's Keys) -> stop countdown immediately
    if (this.mode === 'DETENTION_COUNTDOWN' && state !== GameState.PRINCIPAL_DETENTION) {
      this.ports.stopDetentionCountdown();
      this.lastSyncedDetentionSec = -1;
      this.wasPursuing = false;
      this.mode = 'NONE';
    }

    // 4. Principal rule violation detection & active chase
    const activePursuit =
      principalIsPursuing &&
      (state === GameState.PLAYING ||
        state === GameState.FINAL_ESCAPE ||
        state === GameState.NOTEBOOK_QUESTION ||
        state === GameState.PLAYTIME_CHALLENGE);

    if (activePursuit) {
      const isNewPursuit = !this.wasPursuing || principalJustDetectedViolation;
      if (isNewPursuit && !this.wasPursuing) {
        // Initial detection: play distinctive warning sound ONCE & immediately start pursuit music
        this.ports.playPrincipalWarning();
        this.ports.startPrincipalPursuitMusic();
        this.mode = 'PRINCIPAL_PURSUIT';
        this.wasPursuing = true;
      } else if (this.mode !== 'PRINCIPAL_PURSUIT') {
        this.ports.startPrincipalPursuitMusic();
        this.mode = 'PRINCIPAL_PURSUIT';
        this.wasPursuing = true;
      } else {
        // Same chase still active: keep pursuit music playing continuously without restarting
        this.wasPursuing = true;
      }
      return this.mode;
    }

    // 5. Not in detention and not being chased by Principal: reset pursuit state for future violations
    //    and maintain normal School or 7/7 Horror background music without restarting if already playing
    this.wasPursuing = false;
    const targetAmbient: GameplayAudioMode = isFinalEscape ? 'HORROR' : 'SCHOOL';
    if (this.mode !== targetAmbient) {
      if (isFinalEscape) {
        this.ports.startHorrorEscapeMusic();
      } else {
        this.ports.startSchoolMusic();
      }
      this.mode = targetAmbient;
    }

    return this.mode;
  }
}
