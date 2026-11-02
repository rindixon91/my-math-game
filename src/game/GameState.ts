import { InventoryManager, ItemType } from './InventoryManager';
import { validateNotebookAnswer, AnswerChoiceKey, QUESTION_DATABASE } from './QuestionDatabase';

export enum GameState {
  MAIN_MENU = 'MAIN_MENU',
  SETTINGS = 'SETTINGS',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  NOTEBOOK_QUESTION = 'NOTEBOOK_QUESTION',
  NOTEBOOK_COOLDOWN = 'NOTEBOOK_COOLDOWN',
  PRINCIPAL_DETENTION = 'PRINCIPAL_DETENTION',
  PLAYTIME_CHALLENGE = 'PLAYTIME_CHALLENGE',
  DAMAGE_INVULNERABILITY = 'DAMAGE_INVULNERABILITY',
  FINAL_ESCAPE = 'FINAL_ESCAPE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
}

/**
 * Pure policy helper: Baldi's AI, movement, pathfinding, and attacks NEVER pause
 * during Playtime's jump-rope interaction OR Principal's pursuit/detention sequence —
 * only true global pauses/menus or the Notebook Question modal halt him.
 */
export function isBaldiPursuitState(state: GameState): boolean {
  return (
    state === GameState.PLAYING ||
    state === GameState.FINAL_ESCAPE ||
    state === GameState.PLAYTIME_CHALLENGE ||
    state === GameState.PRINCIPAL_DETENTION
  );
}

export interface NotebookRuntimeStatus {
  notebookId: number;
  completed: boolean;
  cooldownRemaining: number; // seconds, 10.0 on wrong answer
}

export interface DialoguePayload {
  speaker: 'BALDI' | 'PRINCIPAL' | 'PLAYTIME' | 'BULLY' | 'SYSTEM';
  title: string;
  text: string;
  portraitUrl?: string;
  accentColor: string;
  expiresAtMs?: number;
}

export interface PlaytimeJumpState {
  jumpsCompleted: number; // 0..3
  ropePhase: number; // 0..1 continuous cycle
  statusText: string;
  failedFlashTimer: number;
}

export interface AudioSettings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
}

export interface RunSummarySnapshot {
  notebooksCollected: number;
  totalNotebooks: number;
  livesRemaining: number;
  elapsedSeconds: number;
  wrongAnswersCount: number;
  baldiSpeedPercent: number;
}

export interface GameSnapshot {
  state: GameState;
  effectiveState: GameState;
  previousReturnState: GameState;
  lives: number;
  maxLives: number;
  stamina: number;
  maxStamina: number;
  staminaExhausted: boolean;
  zestyBoostRemaining: number;
  invulnerabilityRemaining: number;
  detentionRemaining: number;
  notebooksCompletedCount: number;
  totalNotebooks: number;
  notebooks: NotebookRuntimeStatus[];
  activeNotebookId: number | null;
  wrongAnswersCount: number;
  baldiSpeedMultiplier: number; // 1.0, 1.1, 1.2, ...
  baldiSpeedPercent: number; // 100, 110, 120, ...
  isFinalEscape: boolean;
  activeExitId: string | null;
  currentRoomName: string;
  interactionPrompt: string | null;
  notificationBanner: { text: string; tone: 'info' | 'success' | 'danger' | 'horror' } | null;
  dialogue: DialoguePayload | null;
  playtime: PlaytimeJumpState;
  inventory: (ItemType | null)[];
  selectedSlot: number;
  audioSettings: AudioSettings;
  elapsedSeconds: number;
  hurtFlashCounter: number;
  runSummary: RunSummarySnapshot | null;
}

export const TOTAL_NOTEBOOKS = 7;
export const INITIAL_LIVES = 3;
export const MAX_STAMINA = 100;
export const NOTEBOOK_COOLDOWN_SECONDS = 10;
export const DETENTION_DURATION_SECONDS = 10;
export const INVULNERABILITY_DURATION_SECONDS = 2.8;
export const STAMINA_DRAIN_PER_SEC = 24;
export const STAMINA_RECOVERY_WALK_PER_SEC = 14;
export const STAMINA_RECOVERY_IDLE_PER_SEC = 26;
export const STAMINA_RECOVER_THRESHOLD = 18;

export class GameStateManager {
  private state: GameState = GameState.MAIN_MENU;
  private previousMenuOrPlayState: GameState = GameState.MAIN_MENU;
  private isFinalEscape = false;
  private activeExitId: string | null = null;

  private lives = INITIAL_LIVES;
  private stamina = MAX_STAMINA;
  private staminaExhausted = false;
  private zestyBoostRemaining = 0;
  private invulnerabilityRemaining = 0;
  private detentionRemaining = 0;

  private notebooks: NotebookRuntimeStatus[] = [];
  private activeNotebookId: number | null = null;
  private wrongAnswersCount = 0;

  private currentRoomName = 'Pintu Masuk Utama';
  private interactionPrompt: string | null = null;
  private notificationBanner: { text: string; tone: 'info' | 'success' | 'danger' | 'horror' } | null = null;
  private notificationTimer = 0;

  private dialogue: DialoguePayload | null = null;
  private dialogueTimer = 0;

  private playtime: PlaytimeJumpState = {
    jumpsCompleted: 0,
    ropePhase: 0,
    statusText: 'Mari bermain!',
    failedFlashTimer: 0,
  };

  public readonly inventory = new InventoryManager();

  private audioSettings: AudioSettings = {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.85,
    muted: false,
  };

  private elapsedSeconds = 0;
  private hurtFlashCounter = 0;
  private runSummary: RunSummarySnapshot | null = null;

  private listeners = new Set<(snap: GameSnapshot) => void>();

  constructor() {
    this.resetNotebooks();
    this.syncBodyDataset();
  }

  private resetNotebooks(): void {
    this.notebooks = QUESTION_DATABASE.map((q) => ({
      notebookId: q.notebookId,
      completed: false,
      cooldownRemaining: 0,
    }));
  }

  public subscribe(listener: (snap: GameSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.syncBodyDataset();
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private syncBodyDataset(): void {
    if (typeof document === 'undefined' || !document.body) return;
    let bodyState = 'playing';
    if (this.state === GameState.MAIN_MENU || this.state === GameState.SETTINGS) {
      bodyState = this.previousMenuOrPlayState === GameState.PLAYING || this.previousMenuOrPlayState === GameState.FINAL_ESCAPE
        ? (this.state === GameState.SETTINGS ? 'paused' : 'title')
        : 'title';
      if (this.state === GameState.MAIN_MENU) bodyState = 'title';
    } else if (this.state === GameState.PAUSED) {
      bodyState = 'paused';
    } else if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
      bodyState = 'gameover';
    } else {
      bodyState = 'playing';
    }
    document.body.dataset.state = bodyState;
  }

  public getEffectiveState(): GameState {
    if (
      this.state === GameState.MAIN_MENU ||
      this.state === GameState.SETTINGS ||
      this.state === GameState.PAUSED ||
      this.state === GameState.NOTEBOOK_QUESTION ||
      this.state === GameState.PRINCIPAL_DETENTION ||
      this.state === GameState.PLAYTIME_CHALLENGE ||
      this.state === GameState.GAME_OVER ||
      this.state === GameState.VICTORY
    ) {
      return this.state;
    }
    if (this.invulnerabilityRemaining > 0) {
      return GameState.DAMAGE_INVULNERABILITY;
    }
    if (this.notebooks.some((n) => n.cooldownRemaining > 0) && !this.isFinalEscape) {
      return GameState.NOTEBOOK_COOLDOWN;
    }
    return this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
  }

  public getState(): GameState {
    return this.state;
  }

  public getBaldiSpeedMultiplier(): number {
    // 100%, 110%, 120%, 130%... + dramatic surge when 7/7 triggers Baldi's Final Aggressive Form
    const base = 1 + this.wrongAnswersCount * 0.1;
    const mult = this.isFinalEscape ? Math.max(1.65, base + 0.55) : base;
    return Number(mult.toFixed(2));
  }

  public getBaldiSpeedPercent(): number {
    return Math.round(this.getBaldiSpeedMultiplier() * 100);
  }

  public getCompletedNotebookCount(): number {
    return this.notebooks.filter((n) => n.completed).length;
  }

  public canPlayerMove(): boolean {
    return this.state === GameState.PLAYING || this.state === GameState.FINAL_ESCAPE;
  }

  public isBaldiPursuitActive(): boolean {
    return isBaldiPursuitState(this.state);
  }

  public isFinalEscapeActive(): boolean {
    return this.isFinalEscape;
  }

  public isWorldSimulationActive(): boolean {
    // Pause enemy chase during Notebook Question, Pause, Menu, Game Over, Victory.
    // During Detention and Playtime Challenge, simulation timers tick under controlled rules.
    return (
      this.state === GameState.PLAYING ||
      this.state === GameState.FINAL_ESCAPE ||
      this.state === GameState.PRINCIPAL_DETENTION ||
      this.state === GameState.PLAYTIME_CHALLENGE
    );
  }

  public startNewGame(): void {
    this.state = GameState.PLAYING;
    this.previousMenuOrPlayState = GameState.PLAYING;
    this.isFinalEscape = false;
    this.activeExitId = null;
    this.lives = INITIAL_LIVES;
    this.stamina = MAX_STAMINA;
    this.staminaExhausted = false;
    this.zestyBoostRemaining = 0;
    this.invulnerabilityRemaining = 0;
    this.detentionRemaining = 0;
    this.activeNotebookId = null;
    this.wrongAnswersCount = 0;
    this.elapsedSeconds = 0;
    this.hurtFlashCounter = 0;
    this.runSummary = null;
    this.currentRoomName = 'Pintu Masuk Utama (Selatan)';
    this.interactionPrompt = null;
    this.dialogue = null;
    this.dialogueTimer = 0;
    this.notificationBanner = {
      text: 'Selamat datang ke Here School! Cari kesemua tujuh buku nota Kadaran!',
      tone: 'info',
    };
    this.notificationTimer = 4.0;
    this.playtime = {
      jumpsCompleted: 0,
      ropePhase: 0,
      statusText: 'Mari bermain!',
      failedFlashTimer: 0,
    };
    this.inventory.reset();
    this.resetNotebooks();
    this.emit();
  }

  public returnToMainMenu(): void {
    this.resetAllProgressToDefault();
    this.state = GameState.MAIN_MENU;
    this.previousMenuOrPlayState = GameState.MAIN_MENU;
    this.emit();
  }

  private resetAllProgressToDefault(): void {
    this.isFinalEscape = false;
    this.activeExitId = null;
    this.lives = INITIAL_LIVES;
    this.stamina = MAX_STAMINA;
    this.staminaExhausted = false;
    this.zestyBoostRemaining = 0;
    this.invulnerabilityRemaining = 0;
    this.detentionRemaining = 0;
    this.activeNotebookId = null;
    this.wrongAnswersCount = 0;
    this.dialogue = null;
    this.dialogueTimer = 0;
    this.notificationBanner = null;
    this.notificationTimer = 0;
    this.interactionPrompt = null;
    this.inventory.reset();
    this.resetNotebooks();
  }

  public openSettings(): void {
    if (this.state === GameState.SETTINGS) return;
    this.previousMenuOrPlayState = this.state;
    this.state = GameState.SETTINGS;
    this.emit();
  }

  public closeSettings(): void {
    if (this.state !== GameState.SETTINGS) return;
    this.state = this.previousMenuOrPlayState;
    this.emit();
  }

  public togglePause(): void {
    if (
      this.state === GameState.PLAYING ||
      this.state === GameState.FINAL_ESCAPE ||
      this.state === GameState.PLAYTIME_CHALLENGE ||
      this.state === GameState.PRINCIPAL_DETENTION
    ) {
      this.previousMenuOrPlayState = this.state;
      this.state = GameState.PAUSED;
      this.emit();
    } else if (this.state === GameState.PAUSED) {
      if (this.previousMenuOrPlayState === GameState.PLAYTIME_CHALLENGE) {
        this.state = GameState.PLAYTIME_CHALLENGE;
      } else if (this.previousMenuOrPlayState === GameState.PRINCIPAL_DETENTION) {
        this.state = GameState.PRINCIPAL_DETENTION;
      } else {
        this.state = this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
      }
      this.emit();
    }
  }

  public updateAudioSettings(partial: Partial<AudioSettings>): void {
    this.audioSettings = { ...this.audioSettings, ...partial };
    this.emit();
  }

  public setCurrentRoomName(roomName: string): void {
    if (this.currentRoomName !== roomName) {
      this.currentRoomName = roomName;
      this.emit();
    }
  }

  public setInteractionPrompt(prompt: string | null): void {
    if (this.interactionPrompt !== prompt) {
      this.interactionPrompt = prompt;
      this.emit();
    }
  }

  public showNotification(
    text: string,
    tone: 'info' | 'success' | 'danger' | 'horror' = 'info',
    durationSec = 3.2
  ): void {
    this.notificationBanner = { text, tone };
    this.notificationTimer = durationSec;
    this.emit();
  }

  public showDialogue(payload: DialoguePayload, durationSec = 3.0): void {
    this.dialogue = payload;
    this.dialogueTimer = durationSec;
    this.emit();
  }

  /**
   * Attempt to open a notebook question interface.
   * Blocked if player is in detention, Playtime challenge, or notebook is completed / on cooldown.
   */
  public tryOpenNotebook(notebookId: number): { opened: boolean; reason?: 'completed' | 'cooldown' | 'blocked' } {
    if (this.state !== GameState.PLAYING && this.state !== GameState.FINAL_ESCAPE) {
      return { opened: false, reason: 'blocked' };
    }
    const nb = this.notebooks.find((n) => n.notebookId === notebookId);
    if (!nb) return { opened: false, reason: 'blocked' };
    if (nb.completed) return { opened: false, reason: 'completed' };
    if (nb.cooldownRemaining > 0) {
      this.showNotification(
        `Buku Nota ${notebookId} dikunci sementara (${nb.cooldownRemaining.toFixed(1)}s lagi).`,
        'danger',
        2.0
      );
      return { opened: false, reason: 'cooldown' };
    }
    this.activeNotebookId = notebookId;
    this.state = GameState.NOTEBOOK_QUESTION;
    this.interactionPrompt = null;
    this.emit();
    return { opened: true };
  }

  public submitNotebookAnswer(
    notebookId: number,
    selectedKey: AnswerChoiceKey,
    chosenExitIdOnSeventh = 'EXIT_SOUTH'
  ): { correct: boolean; triggeredFinalEscape: boolean } {
    if (this.state !== GameState.NOTEBOOK_QUESTION || this.activeNotebookId !== notebookId) {
      return { correct: false, triggeredFinalEscape: false };
    }
    const nb = this.notebooks.find((n) => n.notebookId === notebookId);
    if (!nb || nb.completed) {
      this.activeNotebookId = null;
      this.state = this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
      this.emit();
      return { correct: false, triggeredFinalEscape: false };
    }

    const isCorrect = validateNotebookAnswer(notebookId, selectedKey);
    this.activeNotebookId = null;

    if (isCorrect) {
      nb.completed = true;
      nb.cooldownRemaining = 0;
      const completedCount = this.getCompletedNotebookCount();

      if (completedCount >= TOTAL_NOTEBOOKS) {
        this.isFinalEscape = true;
        this.activeExitId = chosenExitIdOnSeventh;
        this.state = GameState.FINAL_ESCAPE;
        this.showDialogue(
          {
            speaker: 'BALDI',
            title: 'Baldi (Berang!)',
            text: '"KAMU SUDAH ADA KESEMUA 7 BUKU NOTA! BALDI AMAT BERANG! LARI KE PINTU KELUAR UTAMA!"',
            portraitUrl: '/assets/aistudio/image_bf0c3ba1.png',
            accentColor: '#dc2626',
          },
          4.8
        );
        this.showNotification('KESEMUA 7 BUKU NOTA DIKUMPULKAN! BALDI AMAT BERANG!', 'horror', 6.5);
        this.emit();
        return { correct: true, triggeredFinalEscape: true };
      }

      this.state = GameState.PLAYING;
      this.showNotification(
        `Syabas! Jawapan kamu betul! Buku Nota ${notebookId} selesai (${completedCount}/${TOTAL_NOTEBOOKS}).`,
        'success',
        2.8
      );
      this.emit();
      return { correct: true, triggeredFinalEscape: false };
    } else {
      // Incorrect answer: 10s cooldown on THIS notebook, retain same question, increase Baldi speed permanently
      nb.cooldownRemaining = NOTEBOOK_COOLDOWN_SECONDS;
      this.wrongAnswersCount += 1;
      this.state = this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
      this.showNotification(
        `Jawapan kamu salah! Buku Nota ${notebookId} dikunci selama 10s · Kelajuan Baldi: ${this.getBaldiSpeedPercent()}%`,
        'danger',
        3.5
      );
      this.emit();
      return { correct: false, triggeredFinalEscape: false };
    }
  }

  /**
   * Update stamina based on movement and Shift sprint intent.
   * Returns true if player is actively sprinting this frame.
   */
  public updateStamina(dt: number, isMoving: boolean, wantsSprint: boolean): boolean {
    if (this.zestyBoostRemaining > 0) {
      this.zestyBoostRemaining = Math.max(0, this.zestyBoostRemaining - dt);
      this.stamina = MAX_STAMINA;
      this.staminaExhausted = false;
      return isMoving && wantsSprint;
    }

    const canSprint = isMoving && wantsSprint && !this.staminaExhausted && this.stamina > 0;
    if (canSprint) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_PER_SEC * dt);
      if (this.stamina <= 0.01) {
        this.stamina = 0;
        this.staminaExhausted = true;
      }
      return true;
    } else {
      const rate = isMoving ? STAMINA_RECOVERY_WALK_PER_SEC : STAMINA_RECOVERY_IDLE_PER_SEC;
      this.stamina = Math.min(MAX_STAMINA, this.stamina + rate * dt);
      if (this.staminaExhausted && this.stamina >= STAMINA_RECOVER_THRESHOLD) {
        this.staminaExhausted = false;
      }
      return false;
    }
  }

  public grantZestyBoost(durationSec = 8.0): void {
    this.stamina = MAX_STAMINA;
    this.staminaExhausted = false;
    this.zestyBoostRemaining = durationSec;
    this.showNotification('Bar Tenaga Zesty! Stamina dipulihkan penuh & larian dipercepat!', 'success', 2.8);
  }

  /**
   * Triggered when Baldi catches the player.
   * Respects invulnerability and blocking modal states.
   */
  public applyBaldiAttack(): { damaged: boolean; triggeredGameOver: boolean; remainingLives: number } {
    if (!this.isBaldiPursuitActive() || this.invulnerabilityRemaining > 0) {
      return { damaged: false, triggeredGameOver: false, remainingLives: this.lives };
    }

    this.hurtFlashCounter += 1;

    if (this.lives <= 1) {
      // Final heart lost -> trigger Game Over sequence and reset progress cleanly
      this.runSummary = {
        notebooksCollected: this.getCompletedNotebookCount(),
        totalNotebooks: TOTAL_NOTEBOOKS,
        livesRemaining: 0,
        elapsedSeconds: Math.round(this.elapsedSeconds),
        wrongAnswersCount: this.wrongAnswersCount,
        baldiSpeedPercent: this.getBaldiSpeedPercent(),
      };
      this.resetAllProgressToDefault();
      this.state = GameState.GAME_OVER;
      this.emit();
      return { damaged: true, triggeredGameOver: true, remainingLives: 0 };
    }

    this.lives -= 1;
    this.invulnerabilityRemaining = INVULNERABILITY_DURATION_SECONDS;
    this.showNotification(
      `Baldi memukul kamu! Tinggal ${this.lives} nyawa lagi!`,
      'danger',
      2.6
    );
    this.emit();
    return { damaged: true, triggeredGameOver: false, remainingLives: this.lives };
  }

  /**
   * Principal detention: strictly blocked if another modal/challenge is active.
   */
  public startPrincipalDetention(): boolean {
    if (this.state !== GameState.PLAYING && this.state !== GameState.FINAL_ESCAPE) {
      return false;
    }
    this.state = GameState.PRINCIPAL_DETENTION;
    this.detentionRemaining = DETENTION_DURATION_SECONDS;
    this.interactionPrompt = null;
    this.showDialogue(
      {
        speaker: 'PRINCIPAL',
        title: 'Pengetua',
        text: '"TAHANAN UNTUK KAMU!"',
        portraitUrl: '/assets/aistudio/image_b45a231b.png',
        accentColor: '#475569',
      },
      3.5
    );
    this.showNotification('TAHANAN UNTUK KAMU! Tunggu 10 saat di dalam Bilik Tahanan.', 'danger', 3.5);
    this.emit();
    return true;
  }

  public unlockDetentionEarlyWithKeys(): boolean {
    if (this.state !== GameState.PRINCIPAL_DETENTION) return false;
    this.detentionRemaining = 0;
    this.state = this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
    this.showNotification('Bilik Tahanan dibuka lebih awal menggunakan Kunci Pengetua!', 'success', 2.6);
    this.emit();
    return true;
  }

  /**
   * Playtime challenge: strictly blocked if notebook question or detention is active.
   */
  public startPlaytimeChallenge(): boolean {
    if (this.state !== GameState.PLAYING && this.state !== GameState.FINAL_ESCAPE) {
      return false;
    }
    this.state = GameState.PLAYTIME_CHALLENGE;
    this.interactionPrompt = null;
    this.playtime = {
      jumpsCompleted: 0,
      ropePhase: 0,
      statusText: '"Mari bermain!"',
      failedFlashTimer: 0,
    };
    this.showDialogue(
      {
        speaker: 'PLAYTIME',
        title: 'Playtime',
        text: '"Mari bermain!"',
        portraitUrl: '/assets/aistudio/image_62bb97dd.png',
        accentColor: '#dc2626',
      },
      2.5
    );
    this.emit();
    return true;
  }

  /**
   * Advance jump-rope phase and check for missed jump window.
   * Sweet spot is [0.40, 0.62] of each rope cycle.
   */
  public advancePlaytimeRope(
    dt: number,
    jumpedThisCycleRef: { jumped: boolean }
  ): { missed: boolean } {
    if (this.state !== GameState.PLAYTIME_CHALLENGE) return { missed: false };

    if (this.playtime.failedFlashTimer > 0) {
      this.playtime.failedFlashTimer = Math.max(0, this.playtime.failedFlashTimer - dt);
    }

    const cycleSpeed = 0.72; // ~1.39 seconds per full swing — fair, clear, and responsive
    const prevPhase = this.playtime.ropePhase;
    const nextPhase = prevPhase + cycleSpeed * dt;

    // Check if rope swept past the sweet spot [0.40, 0.62] without the player jumping
    if (prevPhase <= 0.64 && nextPhase > 0.64 && !jumpedThisCycleRef.jumped) {
      this.playtime.jumpsCompleted = 0;
      this.playtime.statusText = '"Cuba lagi!"';
      this.playtime.failedFlashTimer = 0.45;
      this.playtime.ropePhase = nextPhase % 1;
      jumpedThisCycleRef.jumped = false;
      this.showDialogue(
        {
          speaker: 'PLAYTIME',
          title: 'Playtime',
          text: '"Cuba lagi!"',
          portraitUrl: '/assets/aistudio/image_62bb97dd.png',
          accentColor: '#dc2626',
        },
        1.8
      );
      return { missed: true };
    }

    if (nextPhase >= 1) {
      jumpedThisCycleRef.jumped = false;
      this.playtime.ropePhase = nextPhase % 1;
    } else {
      this.playtime.ropePhase = nextPhase;
    }
    return { missed: false };
  }

  public attemptPlaytimeJump(jumpedThisCycleRef: { jumped: boolean }): {
    outcome: 'hit' | 'completed' | 'miss' | 'ignored';
  } {
    if (this.state !== GameState.PLAYTIME_CHALLENGE) {
      return { outcome: 'ignored' };
    }
    const phase = this.playtime.ropePhase;
    const inSweetSpot = phase >= 0.36 && phase <= 0.64 && !jumpedThisCycleRef.jumped;

    if (inSweetSpot) {
      jumpedThisCycleRef.jumped = true;
      this.playtime.jumpsCompleted += 1;
      if (this.playtime.jumpsCompleted >= 3) {
        this.playtime.statusText = '"Yeay! Lain kali kita bermain lagi!"';
        this.state = this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
        this.showDialogue(
          {
            speaker: 'PLAYTIME',
            title: 'Playtime',
            text: '"Yeay! Lain kali kita bermain lagi!"',
            portraitUrl: '/assets/aistudio/image_62bb97dd.png',
            accentColor: '#16a34a',
          },
          3.0
        );
        this.emit();
        return { outcome: 'completed' };
      }
      this.playtime.statusText = `Lompatan bagus! (${this.playtime.jumpsCompleted}/3)`;
      this.emit();
      return { outcome: 'hit' };
    } else {
      // Pressed SPACE too early or too late -> reset immediately to 0/3
      this.playtime.jumpsCompleted = 0;
      this.playtime.ropePhase = 0.05;
      jumpedThisCycleRef.jumped = false;
      this.playtime.statusText = '"Cuba lagi!"';
      this.playtime.failedFlashTimer = 0.45;
      this.showDialogue(
        {
          speaker: 'PLAYTIME',
          title: 'Playtime',
          text: '"Cuba lagi!"',
          portraitUrl: '/assets/aistudio/image_62bb97dd.png',
          accentColor: '#dc2626',
        },
        1.8
      );
      this.emit();
      return { outcome: 'miss' };
    }
  }

  public cutPlaytimeRopeWithScissors(): boolean {
    if (this.state !== GameState.PLAYTIME_CHALLENGE) return false;
    this.state = this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
    this.showDialogue(
      {
        speaker: 'PLAYTIME',
        title: 'Playtime',
        text: '"Alamak! Tali lompat saya putus!"',
        portraitUrl: '/assets/aistudio/image_62bb97dd.png',
        accentColor: '#ea580c',
      },
      2.6
    );
    this.emit();
    return true;
  }

  /**
   * Bully steals all usable items without affecting completed notebooks or lives.
   */
  public triggerBullyEncounter(): ItemType[] {
    const stolen = this.inventory.clearAllItems();
    this.showDialogue(
      {
        speaker: 'BULLY',
        title: 'Si Pembuli',
        text: '"Bagi sini! Semua barang kamu kini milik aku!"',
        portraitUrl: '/assets/aistudio/image_d16f9222.png',
        accentColor: '#ea580c',
      },
      3.0
    );
    if (stolen.length > 0) {
      this.showNotification(
        `Si Pembuli merampas kesemua ${stolen.length} item kamu lalu menghilangkan diri!`,
        'danger',
        3.0
      );
    } else {
      this.showNotification('Si Pembuli meminta barang, kemudian menghilangkan diri dari koridor!', 'info', 2.5);
    }
    this.emit();
    return stolen;
  }

  public notifyBullyBlockedNoItems(): void {
    this.showDialogue(
      {
        speaker: 'BULLY',
        title: 'Si Pembuli',
        text: '"Apa, tiada barang? Tiada barang, tak boleh lalu!"',
        portraitUrl: '/assets/aistudio/image_d16f9222.png',
        accentColor: '#ea580c',
      },
      2.6
    );
    this.showNotification(
      'Si Pembuli menghalang koridor ini! Bawa satu item atau ikut koridor lain!',
      'danger',
      2.6
    );
  }

  public triggerVictory(): boolean {
    if (!this.isFinalEscape || this.getCompletedNotebookCount() < TOTAL_NOTEBOOKS) {
      return false;
    }
    if (this.state !== GameState.FINAL_ESCAPE && this.state !== GameState.PLAYING) {
      return false;
    }
    this.runSummary = {
      notebooksCollected: TOTAL_NOTEBOOKS,
      totalNotebooks: TOTAL_NOTEBOOKS,
      livesRemaining: this.lives,
      elapsedSeconds: Math.round(this.elapsedSeconds),
      wrongAnswersCount: this.wrongAnswersCount,
      baldiSpeedPercent: this.getBaldiSpeedPercent(),
    };
    this.state = GameState.VICTORY;
    this.interactionPrompt = null;
    this.dialogue = {
      speaker: 'BALDI',
      title: 'Baldi',
      text: '"Tahniah! Kamu berjaya melarikan diri dari sekolah ini!"',
      portraitUrl: '/assets/aistudio/image_bf0c3ba1.png',
      accentColor: '#16a34a',
    };
    this.emit();
    return true;
  }

  /**
   * Tick active gameplay timers (cooldowns, detention, invulnerability, notifications).
   * Pauses gameplay timers when a blocking menu/question interface is open.
   */
  public tick(dt: number): {
    detentionEnded: boolean;
    detentionWholeSecondChangedTo: number | null;
  } {
    let needsEmit = false;
    let detentionEnded = false;
    let detentionWholeSecondChangedTo: number | null = null;

    if (
      this.state === GameState.MAIN_MENU ||
      this.state === GameState.SETTINGS ||
      this.state === GameState.PAUSED ||
      this.state === GameState.NOTEBOOK_QUESTION ||
      this.state === GameState.GAME_OVER ||
      this.state === GameState.VICTORY
    ) {
      return { detentionEnded: false, detentionWholeSecondChangedTo: null };
    }

    this.elapsedSeconds += dt;

    // Notebook cooldowns tick during active play
    for (const nb of this.notebooks) {
      if (nb.cooldownRemaining > 0) {
        const prevCeil = Math.ceil(nb.cooldownRemaining * 10);
        nb.cooldownRemaining = Math.max(0, nb.cooldownRemaining - dt);
        const nextCeil = Math.ceil(nb.cooldownRemaining * 10);
        if (nb.cooldownRemaining === 0 || prevCeil !== nextCeil) {
          needsEmit = true;
        }
      }
    }

    // Invulnerability timer
    if (this.invulnerabilityRemaining > 0) {
      this.invulnerabilityRemaining = Math.max(0, this.invulnerabilityRemaining - dt);
      if (this.invulnerabilityRemaining === 0) {
        needsEmit = true;
      }
    }

    // Detention countdown: strictly 10 -> 0
    if (this.state === GameState.PRINCIPAL_DETENTION) {
      const prevSec = Math.ceil(this.detentionRemaining);
      this.detentionRemaining = Math.max(0, this.detentionRemaining - dt);
      const nextSec = Math.ceil(this.detentionRemaining);
      if (prevSec !== nextSec) {
        needsEmit = true;
        if (nextSec > 0) {
          detentionWholeSecondChangedTo = nextSec;
        }
      }
      if (this.detentionRemaining <= 0) {
        this.detentionRemaining = 0;
        this.state = this.isFinalEscape ? GameState.FINAL_ESCAPE : GameState.PLAYING;
        this.showNotification('Tempoh tahanan tamat. Jangan berlari di koridor apabila Pengetua memerhati!', 'info', 2.8);
        detentionEnded = true;
        needsEmit = true;
      }
    }

    // Notification banner expiry
    if (this.notificationTimer > 0) {
      this.notificationTimer = Math.max(0, this.notificationTimer - dt);
      if (this.notificationTimer === 0 && this.notificationBanner) {
        this.notificationBanner = null;
        needsEmit = true;
      }
    }

    // Dialogue box expiry (except during active Playtime challenge)
    if (this.dialogueTimer > 0 && this.state !== GameState.PLAYTIME_CHALLENGE) {
      this.dialogueTimer = Math.max(0, this.dialogueTimer - dt);
      if (this.dialogueTimer === 0 && this.dialogue) {
        this.dialogue = null;
        needsEmit = true;
      }
    }

    if (needsEmit) {
      this.emit();
    }
    return { detentionEnded, detentionWholeSecondChangedTo };
  }

  public emitHudSync(): void {
    this.emit();
  }

  public getNotebookStatus(notebookId: number): NotebookRuntimeStatus | undefined {
    return this.notebooks.find((n) => n.notebookId === notebookId);
  }

  public getActiveExitId(): string | null {
    return this.activeExitId;
  }

  public getSnapshot(): GameSnapshot {
    return {
      state: this.state,
      effectiveState: this.getEffectiveState(),
      previousReturnState: this.previousMenuOrPlayState,
      lives: this.lives,
      maxLives: INITIAL_LIVES,
      stamina: this.stamina,
      maxStamina: MAX_STAMINA,
      staminaExhausted: this.staminaExhausted,
      zestyBoostRemaining: this.zestyBoostRemaining,
      invulnerabilityRemaining: this.invulnerabilityRemaining,
      detentionRemaining: this.detentionRemaining,
      notebooksCompletedCount: this.getCompletedNotebookCount(),
      totalNotebooks: TOTAL_NOTEBOOKS,
      notebooks: this.notebooks.map((n) => ({ ...n })),
      activeNotebookId: this.activeNotebookId,
      wrongAnswersCount: this.wrongAnswersCount,
      baldiSpeedMultiplier: this.getBaldiSpeedMultiplier(),
      baldiSpeedPercent: this.getBaldiSpeedPercent(),
      isFinalEscape: this.isFinalEscape,
      activeExitId: this.activeExitId,
      currentRoomName: this.currentRoomName,
      interactionPrompt: this.interactionPrompt,
      notificationBanner: this.notificationBanner ? { ...this.notificationBanner } : null,
      dialogue: this.dialogue ? { ...this.dialogue } : null,
      playtime: { ...this.playtime },
      inventory: [...this.inventory.getSlots()],
      selectedSlot: this.inventory.getSelectedSlot(),
      audioSettings: { ...this.audioSettings },
      elapsedSeconds: this.elapsedSeconds,
      hurtFlashCounter: this.hurtFlashCounter,
      runSummary: this.runSummary ? { ...this.runSummary } : null,
    };
  }
}
