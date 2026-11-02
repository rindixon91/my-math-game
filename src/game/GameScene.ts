import Phaser from 'phaser';
import { registerProceduralTextures } from './AssetFactory';
import { AudioManager } from './AudioManager';
import { EnemyManager } from './EnemyManager';
import { AnswerChoiceKey } from './QuestionDatabase';
import { GameState, GameStateManager } from './GameState';
import { ItemType, ITEM_METADATA } from './InventoryManager';
import { getZoneAtUnits, MAP_HEIGHT_UNITS, MAP_WIDTH_UNITS, UNIT_PX } from './MapLayout';
import { MapManager } from './MapManager';
import { NotebookManager } from './NotebookManager';
import { ControlMode } from './inputPlatform';
import { Player } from './Player';
import { PrincipalAudioController } from './PrincipalAudioController';

interface BSodaProjectile {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
}

export class GameScene extends Phaser.Scene {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private principalAudioController: PrincipalAudioController;

  public mapManager!: MapManager;
  public player!: Player;
  public notebookManager!: NotebookManager;
  public enemyManager!: EnemyManager;

  private bsodaProjectiles: BSodaProjectile[] = [];
  private horrorDarkness!: Phaser.GameObjects.Graphics;
  private exitCompassGraphics!: Phaser.GameObjects.Graphics;
  private horrorFadeAlpha = 0;

  private hitstopTimer = 0;
  private shakeTrauma = 0;
  private hudSyncAccumulator = 0;
  private titleTourTime = 0;
  private jumpedThisCycleRef = { jumped: false };
  private prevRopePhase = 0;
  private pendingControlMode: ControlMode = 'desktop';

  constructor(gameState: GameStateManager, audio: AudioManager) {
    super({ key: 'GameScene' });
    this.gameState = gameState;
    this.audio = audio;
    this.principalAudioController = new PrincipalAudioController({
      playPrincipalWarning: () => this.audio.playPrincipalWarning(),
      playPrincipalDetentionCatch: () => this.audio.playPrincipalDetention(),
      startSchoolMusic: () => this.audio.startSchoolMusic(),
      startHorrorEscapeMusic: () => this.audio.startHorrorEscapeMusic(),
      startPrincipalPursuitMusic: () => this.audio.startPrincipalPursuitMusic(),
      stopMusic: () => this.audio.stopMusic(),
      startDetentionCountdown: (sec) => this.audio.startDetentionCountdown(sec),
      syncDetentionCountdownTick: (sec) => this.audio.syncDetentionCountdownTick(sec),
      stopDetentionCountdown: () => this.audio.stopDetentionCountdown(),
      setSimulationPaused: (paused) => this.audio.setSimulationPaused(paused),
    });
  }

  public create(): void {
    registerProceduralTextures(this);

    this.mapManager = new MapManager(this);
    this.mapManager.buildSchoolWorld();

    this.player = new Player(this, this.gameState);
    this.player.setControlMode(this.pendingControlMode);
    this.physics.add.collider(this.player.sprite, this.mapManager.wallGroup);
    this.physics.add.collider(this.player.sprite, this.mapManager.propGroup);
    this.physics.add.collider(this.player.sprite, this.mapManager.doorColliderGroup);

    this.notebookManager = new NotebookManager(this, this.gameState);
    this.notebookManager.spawnNotebooks();

    this.enemyManager = new EnemyManager(
      this,
      this.mapManager,
      this.gameState,
      this.audio,
      this.player
    );

    // Horror lighting & exit compass overlays
    this.horrorDarkness = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.exitCompassGraphics = this.add.graphics().setDepth(31);

    const worldW = MAP_WIDTH_UNITS * UNIT_PX;
    const worldH = MAP_HEIGHT_UNITS * UNIT_PX;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setRotation(0);
    this.cameras.main.setZoom(1.06);

    if (this.gameState.getState() !== GameState.MAIN_MENU) {
      this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    }
  }

  public resetSessionForNewGame(): void {
    if (!this.mapManager || !this.player || !this.enemyManager) return;
    this.mapManager.resetWorldForNewGame();
    this.player.resetToStart();
    this.enemyManager.resetAll();
    this.clearBSodaProjectiles();
    this.horrorFadeAlpha = 0;
    this.horrorDarkness.clear();
    this.exitCompassGraphics.clear();
    this.hitstopTimer = 0;
    this.shakeTrauma = 0;
    this.jumpedThisCycleRef.jumped = false;

    this.cameras.main.stopFollow();
    this.cameras.main.setRotation(0);
    this.cameras.main.centerOn(this.player.sprite.x, this.player.sprite.y);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.principalAudioController.resetForNewSession();
  }

  public setControlMode(mode: ControlMode): void {
    this.pendingControlMode = mode;
    if (this.player) {
      this.player.setControlMode(mode);
    }
  }

  public setVirtualMove(nx: number, ny: number): void {
    this.player?.setVirtualMove(nx, ny);
  }

  public setVirtualSprint(active: boolean): void {
    this.player?.setVirtualSprint(active);
  }

  public triggerVirtualInteract(): void {
    this.audio.unlock();
    this.player?.triggerVirtualPress('KeyE');
  }

  public triggerVirtualJump(): void {
    this.audio.unlock();
    if (this.gameState.getState() === GameState.PLAYTIME_CHALLENGE) {
      this.triggerPlaytimeJumpFromUI();
      return;
    }
    this.player?.triggerVirtualPress('Space');
  }

  public handleNotebookAnswerFromUI(notebookId: number, choice: AnswerChoiceKey): boolean {
    const mainExitId = 'EXIT_SOUTH';
    const res = this.gameState.submitNotebookAnswer(notebookId, choice, mainExitId);
    this.player.clearTransientPresses();

    if (res.correct) {
      this.audio.playNotebookCorrect();
      if (res.triggeredFinalEscape) {
        this.mapManager.activateFinalEscapeExit(mainExitId);
        this.audio.playBaldiFuriousRoar();
        this.shakeTrauma = 0.9;
      }
    } else {
      this.audio.playNotebookWrong();
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.35);
    }
    const snap = this.gameState.getSnapshot();
    this.principalAudioController.sync({
      state: snap.state,
      isFinalEscape: snap.isFinalEscape,
      principalJustDetectedViolation: false,
      principalIsPursuing: this.enemyManager?.principal.isActivelyPursuing() ?? false,
      justEnteredDetention: false,
      detentionRemainingSeconds: snap.detentionRemaining,
    });
    return res.correct;
  }

  public triggerPlaytimeJumpFromUI(): void {
    if (this.gameState.getState() !== GameState.PLAYTIME_CHALLENGE) return;
    const jumpRes = this.gameState.attemptPlaytimeJump(this.jumpedThisCycleRef);
    if (jumpRes.outcome === 'hit') {
      this.player.triggerJumpHop();
      this.audio.playPlaytimeJumpSuccess(this.gameState.getSnapshot().playtime.jumpsCompleted);
    } else if (jumpRes.outcome === 'completed') {
      this.player.triggerJumpHop();
      this.audio.playPlaytimeComplete();
      this.enemyManager.playtime.setPostChallengeCooldown(24);
    } else if (jumpRes.outcome === 'miss') {
      this.audio.playPlaytimeFail();
    }
  }

  public useInventorySlot(slotIdx: number): void {
    const state = this.gameState.getState();
    const item = this.gameState.inventory.peekSlot(slotIdx);
    if (!item) return;

    this.gameState.inventory.setSelectedSlot(slotIdx);

    if (item === ItemType.PRINCIPAL_KEYS) {
      if (state === GameState.PRINCIPAL_DETENTION) {
        this.gameState.inventory.consumeSlot(slotIdx);
        this.mapManager.setDoorLocked('DOOR_DETENTION', false);
        this.gameState.unlockDetentionEarlyWithKeys();
        const snap = this.gameState.getSnapshot();
        this.principalAudioController.sync({
          state: snap.state,
          isFinalEscape: snap.isFinalEscape,
          principalJustDetectedViolation: false,
          principalIsPursuing: false,
          justEnteredDetention: false,
          detentionRemainingSeconds: 0,
        });
        this.audio.playDoorSound();
        return;
      }
      if (state === GameState.PLAYING || state === GameState.FINAL_ESCAPE) {
        const unlocked = this.mapManager.unlockNearbyRestrictedDoor(
          this.player.sprite.x,
          this.player.sprite.y
        );
        if (unlocked) {
          this.gameState.inventory.consumeSlot(slotIdx);
          this.audio.playDoorSound();
          this.gameState.showNotification(
            'Kawasan larangan berjaya dibuka dengan Kunci Pengetua!',
            'success',
            2.6
          );
          this.gameState.emitHudSync();
          return;
        }
      }
      this.gameState.showNotification(
        'Gunakan Kunci Pengetua pada pintu larangan berkunci atau untuk keluar dari Bilik Tahanan!',
        'info',
        2.4
      );
      return;
    }

    if (item === ItemType.SCISSORS) {
      if (state === GameState.PLAYTIME_CHALLENGE) {
        this.gameState.inventory.consumeSlot(slotIdx);
        this.gameState.cutPlaytimeRopeWithScissors();
        this.enemyManager.playtime.setPostChallengeCooldown(30);
        this.audio.playItemPickup();
      } else {
        this.gameState.showNotification('Gunakan Gunting Keselamatan semasa cabaran tali lompat Playtime!', 'info', 2.2);
      }
      return;
    }

    if (state !== GameState.PLAYING && state !== GameState.FINAL_ESCAPE) {
      return;
    }

    if (item === ItemType.ZESTY_BAR) {
      this.gameState.inventory.consumeSlot(slotIdx);
      this.gameState.grantZestyBoost(8.0);
      this.audio.playItemPickup();
      this.gameState.emitHudSync();
      return;
    }

    if (item === ItemType.BSODA) {
      this.gameState.inventory.consumeSlot(slotIdx);
      this.fireBSodaProjectile();
      this.audio.playBSodaSpray();
      this.enemyManager.principal.flagPlayerInfractionIfSeen(
        this.player.sprite.x,
        this.player.sprite.y,
        'Menggunakan BSoda di koridor!'
      );
      this.gameState.emitHudSync();
      return;
    }

    if (item === ItemType.DOOR_LOCK) {
      const locked = this.mapManager.lockNearestDoubleDoor(
        this.player.sprite.x,
        this.player.sprite.y,
        12
      );
      if (locked) {
        this.gameState.inventory.consumeSlot(slotIdx);
        this.audio.playDoorSound();
        this.gameState.showNotification('Pintu kembar kuning dikunci selama 12 saat!', 'success', 2.5);
        this.gameState.emitHudSync();
      } else {
        this.gameState.showNotification('Dekati Pintu Kembar Kuning untuk menguncinya!', 'info', 2.2);
      }
      return;
    }

    if (item === ItemType.QUARTER) {
      const vm = this.mapManager.getNearbyVendingMachine(this.player.sprite.x, this.player.sprite.y);
      if (vm) {
        this.gameState.inventory.consumeSlot(slotIdx);
        this.gameState.inventory.addItem(vm.dispenses);
        this.audio.playItemPickup();
        this.gameState.showNotification(
          `Membeli ${ITEM_METADATA[vm.dispenses].name} daripada Mesin Layan Diri!`,
          'success',
          2.5
        );
        this.gameState.emitHudSync();
      } else {
        this.gameState.showNotification('Berdiri berhampiran Mesin Layan Diri untuk guna Syiling 25¢!', 'info', 2.2);
      }
    }
  }

  private fireBSodaProjectile(): void {
    const fx = this.player.facingX === 0 && this.player.facingY === 0 ? 0 : this.player.facingX;
    const fy = this.player.facingX === 0 && this.player.facingY === 0 ? -1 : this.player.facingY;
    const speed = 330;
    const sprite = this.add
      .image(this.player.sprite.x + fx * 22, this.player.sprite.y + fy * 22, 'bsoda_wave')
      .setDepth(18);
    this.bsodaProjectiles.push({
      sprite,
      vx: fx * speed,
      vy: fy * speed,
      life: 3.2,
    });
  }

  private clearBSodaProjectiles(): void {
    for (const p of this.bsodaProjectiles) {
      p.sprite.destroy();
    }
    this.bsodaProjectiles = [];
  }

  public override update(timeMs: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const timeSec = timeMs / 1000;
    const state = this.gameState.getState();

    // Global hotkeys (Mute M, Pause P/Escape)
    if (this.player.consumeJustPressed('KeyM')) {
      const cur = this.gameState.getSnapshot().audioSettings;
      const nextMuted = !cur.muted;
      this.gameState.updateAudioSettings({ muted: nextMuted });
      this.audio.applySettings({ ...cur, muted: nextMuted });
    }

    if (this.player.consumeJustPressed('KeyP') || this.player.consumeJustPressed('Escape')) {
      if (
        state === GameState.PLAYING ||
        state === GameState.FINAL_ESCAPE ||
        state === GameState.PLAYTIME_CHALLENGE ||
        state === GameState.PRINCIPAL_DETENTION ||
        state === GameState.PAUSED
      ) {
        this.gameState.togglePause();
        this.player.stopMotion();
        this.enemyManager.stopAllMotion();
      } else if (state === GameState.SETTINGS) {
        this.gameState.closeSettings();
      }
    }

    const currentState = this.gameState.getState();

    // Title Screen live ambient camera tour over the school floor plan
    if (
      currentState === GameState.MAIN_MENU ||
      (currentState === GameState.SETTINGS &&
        this.gameState.getSnapshot().previousReturnState === GameState.MAIN_MENU)
    ) {
      this.principalAudioController.sync({
        state: GameState.MAIN_MENU,
        isFinalEscape: false,
        principalJustDetectedViolation: false,
        principalIsPursuing: false,
        justEnteredDetention: false,
        detentionRemainingSeconds: 0,
      });
      this.syncBodyDataset();
      this.cameras.main.stopFollow();
      this.cameras.main.setRotation(0);
      this.titleTourTime += dt * 0.28;
      const cx = (74 + Math.sin(this.titleTourTime) * 32) * UNIT_PX;
      const cy = (82 + Math.cos(this.titleTourTime * 0.75) * 34) * UNIT_PX;
      this.cameras.main.centerOn(cx, cy);
      this.notebookManager.update(timeSec);
      this.horrorDarkness.clear();
      this.exitCompassGraphics.clear();
      return;
    }

    if (
      currentState === GameState.PAUSED ||
      currentState === GameState.SETTINGS ||
      currentState === GameState.NOTEBOOK_QUESTION ||
      currentState === GameState.GAME_OVER ||
      currentState === GameState.VICTORY
    ) {
      const snapModal = this.gameState.getSnapshot();
      this.principalAudioController.sync({
        state: currentState,
        isFinalEscape: snapModal.isFinalEscape,
        principalJustDetectedViolation: false,
        principalIsPursuing: this.enemyManager.principal.isActivelyPursuing(),
        justEnteredDetention: false,
        detentionRemainingSeconds: snapModal.detentionRemaining,
      });
      this.syncBodyDataset();
      this.player.stopMotion();
      this.enemyManager.stopAllMotion();
      return;
    }

    // Camera trauma decay + smooth movement-direction pan offset (no screen rotation)
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.4);
      const mag = this.shakeTrauma * this.shakeTrauma * 9;
      shakeX = (Math.random() * 2 - 1) * mag;
      shakeY = (Math.random() * 2 - 1) * mag;
    }
    this.cameras.main.setFollowOffset(
      -this.player.lookOffsetX + shakeX,
      -this.player.lookOffsetY + shakeY
    );

    // Hitstop freeze on heavy Baldi strike
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.syncBodyDataset();
      return;
    }

    // Tick central game timers (cooldowns, detention 10..0, invulnerability)
    const tickRes = this.gameState.tick(dt);
    if (tickRes.detentionEnded) {
      this.mapManager.setDoorLocked('DOOR_DETENTION', false);
      this.audio.playDoorSound();
    }

    // Active Playing / Final Escape / Playtime Challenge / Principal Detention simulation:
    // IMPORTANT: Neither Playtime NOR Principal's pursuit/detention ever pauses or freezes Baldi's AI!
    const snap = this.gameState.getSnapshot();
    this.player.update(dt, snap.invulnerabilityRemaining);

    // Inventory hotkeys 1-4 (including Principal's Keys in Detention and Safety Scissors in Playtime)
    for (let slot = 0; slot < 4; slot++) {
      if (this.player.consumeJustPressed(`Digit${slot + 1}`)) {
        this.useInventorySlot(slot);
      }
    }

    const postItemState = this.gameState.getState();
    const isPlaytimeActive = postItemState === GameState.PLAYTIME_CHALLENGE;
    const isDetentionActive = postItemState === GameState.PRINCIPAL_DETENTION;

    if (isPlaytimeActive) {
      const ropeRes = this.gameState.advancePlaytimeRope(dt, this.jumpedThisCycleRef);
      const currPhase = this.gameState.getSnapshot().playtime.ropePhase;
      if (this.prevRopePhase < 0.48 && currPhase >= 0.48) {
        this.audio.playRopeSwing();
      }
      this.prevRopePhase = currPhase;

      if (ropeRes.missed) {
        this.audio.playPlaytimeFail();
      }

      if (this.player.consumeJustPressed('Space')) {
        const jumpRes = this.gameState.attemptPlaytimeJump(this.jumpedThisCycleRef);
        if (jumpRes.outcome === 'hit') {
          this.player.triggerJumpHop();
          this.audio.playPlaytimeJumpSuccess(this.gameState.getSnapshot().playtime.jumpsCompleted);
        } else if (jumpRes.outcome === 'completed') {
          this.player.triggerJumpHop();
          this.audio.playPlaytimeComplete();
          this.enemyManager.playtime.setPostChallengeCooldown(24);
        } else if (jumpRes.outcome === 'miss') {
          this.audio.playPlaytimeFail();
        }
      }
    } else if (!isDetentionActive && this.player.consumeJustPressed('Space')) {
      if (this.player.tryExplorationJump()) {
        this.audio.playPlayerJump();
      }
    } else {
      this.player.consumeJustPressed('Space');
    }

    // Room awareness
    const roomInfo = this.mapManager.getRoomInfoAtPx(this.player.sprite.x, this.player.sprite.y);
    this.gameState.setCurrentRoomName(roomInfo.name);

    // Doors & world props update (Baldi, Principal & Player open all unlocked doors; Playtime opens only hallway/canteen DOUBLE doors)
    const unrestrictedActors = [
      { x: this.player.sprite.x, y: this.player.sprite.y },
      ...this.enemyManager.getUnrestrictedDoorActorPositionsPx(),
    ];
    const doubleDoorActors = this.enemyManager.getDoubleDoorOnlyActorPositionsPx();
    if (
      this.mapManager.updateDoorsAndWorld(
        dt,
        unrestrictedActors,
        timeSec,
        doubleDoorActors
      )
    ) {
      this.audio.playDoorSound();
    }

    // BSoda projectile movement & enemy pushback
    this.updateBSodaProjectiles(dt);

    // Notebooks visual & contextual [E] interactions (only when free to interact)
    this.notebookManager.update(timeSec);
    if (!isPlaytimeActive && !isDetentionActive) {
      this.handleContextualInteractions();
      const postInteractState = this.gameState.getState();
      if (
        postInteractState === GameState.VICTORY ||
        postInteractState === GameState.NOTEBOOK_QUESTION
      ) {
        const postSnap = this.gameState.getSnapshot();
        this.principalAudioController.sync({
          state: postInteractState,
          isFinalEscape: postSnap.isFinalEscape,
          principalJustDetectedViolation: false,
          principalIsPursuing: this.enemyManager.principal.isActivelyPursuing(),
          justEnteredDetention: false,
          detentionRemainingSeconds: postSnap.detentionRemaining,
        });
        this.syncBodyDataset();
        return;
      }
    }

    // Update all four antagonists independently (Baldi continues pursuing during Principal's chase & Detention!)
    const enemyRes = this.enemyManager.update(dt, this.player, roomInfo.isFacultyRestricted);
    if (enemyRes.baldiAttacked && !enemyRes.triggeredGameOver) {
      this.hitstopTimer = 0.065;
      this.shakeTrauma = 0.85;
    }

    // Refresh room label immediately if Principal just transferred player into Detention Room
    if (enemyRes.justEnteredDetention) {
      const detRoomInfo = this.mapManager.getRoomInfoAtPx(this.player.sprite.x, this.player.sprite.y);
      this.gameState.setCurrentRoomName(detRoomInfo.name);
    }

    // Synchronise Principal warning SFX, pursuit music, detention countdown, and background music
    const endSnap = this.gameState.getSnapshot();
    this.principalAudioController.sync({
      state: endSnap.state,
      isFinalEscape: endSnap.isFinalEscape,
      principalJustDetectedViolation: enemyRes.principalJustDetectedViolation,
      principalIsPursuing: enemyRes.principalIsPursuing,
      justEnteredDetention: enemyRes.justEnteredDetention,
      detentionRemainingSeconds: endSnap.detentionRemaining,
    });

    this.syncBodyDataset();

    // Final Escape horror lighting & exit compass
    this.renderFinalEscapeAtmosphere(dt);

    // HUD sync (~30Hz during Playtime rope bar, ~15Hz otherwise)
    this.hudSyncAccumulator += dt;
    const syncInterval = this.gameState.getState() === GameState.PLAYTIME_CHALLENGE ? 0.033 : 0.065;
    if (this.hudSyncAccumulator >= syncInterval) {
      this.hudSyncAccumulator = 0;
      this.gameState.emitHudSync();
    }
  }

  private syncBodyDataset(): void {
    if (typeof document === 'undefined') return;
    const st = this.gameState.getState();
    let mapped = 'playing';
    if (
      st === GameState.MAIN_MENU ||
      (st === GameState.SETTINGS &&
        this.gameState.getSnapshot().previousReturnState === GameState.MAIN_MENU)
    ) {
      mapped = 'title';
    } else if (st === GameState.PAUSED || st === GameState.SETTINGS) {
      mapped = 'paused';
    } else if (st === GameState.GAME_OVER || st === GameState.VICTORY) {
      mapped = 'gameover';
    }
    if (document.body.dataset.state !== mapped) {
      document.body.dataset.state = mapped;
    }
    if (document.body.dataset.substate !== st) {
      document.body.dataset.substate = st;
    }
    document.body.dataset.audioMode = this.principalAudioController.getMode();
    document.body.dataset.detentionTick = String(this.audio.getLastDetentionTickSecond());
    if (this.player) {
      const plx = (this.player.sprite.x / UNIT_PX).toFixed(1);
      const ply = (this.player.sprite.y / UNIT_PX).toFixed(1);
      const camRot = (this.cameras.main as unknown as { rotation?: number }).rotation ?? 0;
      document.body.dataset.playerUnits = `${plx},${ply}`;
      document.body.dataset.cameraYawDeg = ((camRot * 180) / Math.PI).toFixed(1);
    }
    if (this.enemyManager) {
      const bx = (this.enemyManager.baldi.sprite.x / UNIT_PX).toFixed(1);
      const by = (this.enemyManager.baldi.sprite.y / UNIT_PX).toFixed(1);
      document.body.dataset.baldiUnits = `${bx},${by}`;
      const prx = (this.enemyManager.principal.sprite.x / UNIT_PX).toFixed(1);
      const pry = (this.enemyManager.principal.sprite.y / UNIT_PX).toFixed(1);
      document.body.dataset.principalUnits = `${prx},${pry}`;
      const px = this.enemyManager.playtime.sprite.x / UNIT_PX;
      const py = this.enemyManager.playtime.sprite.y / UNIT_PX;
      document.body.dataset.playtimeUnits = `${px.toFixed(1)},${py.toFixed(1)}`;
      document.body.dataset.playtimeZone = getZoneAtUnits(px, py)?.kind ?? 'BOUNDARY';
    }
  }

  private handleContextualInteractions(): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    const pressedE = this.player.consumeJustPressed('KeyE');

    // 1. Check active exit in Final Escape (auto-trigger on reach OR press E)
    const nearbyExit = this.mapManager.getNearbyExit(px, py);
    if (nearbyExit) {
      if (this.gameState.getState() === GameState.FINAL_ESCAPE) {
        const activeId = this.gameState.getActiveExitId();
        if (!activeId || nearbyExit.id === activeId) {
          this.enemyManager.stopAllMotion();
          this.player.stopMotion();
          if (this.gameState.triggerVictory()) {
            this.audio.playVictory();
          }
          return;
        } else {
          const activeSpec = this.mapManager.getActiveExitSpec();
          this.gameState.setInteractionPrompt(
            `Pintu keluar ini dikunci! Pergi ke ${activeSpec?.name ?? 'Pintu Keluar Utama'}!`
          );
          return;
        }
      } else if (pressedE) {
        this.gameState.showNotification(
          `Kumpulkan kesemua tujuh buku nota untuk membuka pintu keluar (${this.gameState.getCompletedNotebookCount()}/7).`,
          'info',
          2.4
        );
      }
    }

    // 2. Check nearby Notebook
    const nearbyNb = this.notebookManager.getNearestInteractableNotebook(px, py);
    if (nearbyNb) {
      const nbStatus = this.gameState.getNotebookStatus(nearbyNb.notebookId);
      if (nbStatus && nbStatus.cooldownRemaining > 0) {
        this.gameState.setInteractionPrompt(
          `Buku Nota #${nearbyNb.notebookId} dikunci sementara (${nbStatus.cooldownRemaining.toFixed(1)}s)`
        );
      } else {
        this.gameState.setInteractionPrompt(`[E] Buka Buku Nota #${nearbyNb.notebookId} (${nearbyNb.roomName})`);
      }
      if (pressedE) {
        this.audio.unlock();
        this.gameState.tryOpenNotebook(nearbyNb.notebookId);
      }
      return;
    }

    // 3. Check nearby Collectible Item
    const nearbyPickup = this.mapManager.getNearbyPickup(px, py);
    if (nearbyPickup) {
      const meta = ITEM_METADATA[nearbyPickup.type];
      this.gameState.setInteractionPrompt(`[E] Ambil ${meta.name}`);
      if (pressedE) {
        if (this.gameState.inventory.addItem(nearbyPickup.type)) {
          nearbyPickup.collected = true;
          nearbyPickup.sprite.setVisible(false);
          this.audio.playItemPickup();
          this.gameState.showNotification(`Mengambil ${meta.name}!`, 'info', 2.0);
          this.gameState.emitHudSync();
        } else {
          this.gameState.showNotification('Slot inventori penuh (4/4)! Guna item dalam slot 1–4 dahulu.', 'danger', 2.2);
        }
      }
      return;
    }

    // 4. Check nearby Vending Machine
    const nearbyVm = this.mapManager.getNearbyVendingMachine(px, py);
    if (nearbyVm) {
      const qSlot = this.gameState.inventory.findFirstSlotOfType(ItemType.QUARTER);
      if (qSlot !== -1) {
        this.gameState.setInteractionPrompt(`[E] Guna Syiling 25¢ untuk ${ITEM_METADATA[nearbyVm.dispenses].name}`);
        if (pressedE) {
          this.useInventorySlot(qSlot);
        }
      } else {
        this.gameState.setInteractionPrompt(`${nearbyVm.label} — Memerlukan Syiling 25¢`);
      }
      return;
    }

    // 5. Check nearby closed or key-locked restricted door
    const nearbyDoor = this.mapManager.getNearbyClosedDoor(px, py);
    if (nearbyDoor) {
      if (nearbyDoor.isLocked) {
        const keySlot = this.gameState.inventory.findFirstSlotOfType(ItemType.PRINCIPAL_KEYS);
        if (keySlot !== -1) {
          this.gameState.setInteractionPrompt('[E] Buka Kawasan Larangan dengan Kunci Pengetua');
          if (pressedE) {
            this.useInventorySlot(keySlot);
          }
        } else {
          this.gameState.setInteractionPrompt('Pintu Larangan Berkunci — Cari Kunci Pengetua');
          if (pressedE) {
            this.gameState.showNotification(
              'Kawasan larangan berkunci! Cari Kunci Pengetua untuk membuka pintu ini.',
              'info',
              2.4
            );
          }
        }
      } else {
        this.gameState.setInteractionPrompt('[E] Buka Pintu');
        if (pressedE) {
          this.mapManager.openDoorTemporarily(nearbyDoor.spec.id, 3.6);
          this.audio.playDoorSound();
        }
      }
      return;
    }

    this.gameState.setInteractionPrompt(null);
  }

  private updateBSodaProjectiles(dt: number): void {
    for (let i = this.bsodaProjectiles.length - 1; i >= 0; i--) {
      const proj = this.bsodaProjectiles[i];
      proj.life -= dt;
      proj.sprite.x += proj.vx * dt;
      proj.sprite.y += proj.vy * dt;
      proj.sprite.rotation += dt * 4;

      this.enemyManager.applyBSodaWaveHit(proj.sprite.x, proj.sprite.y, proj.vx, proj.vy);

      // Stop if projectile hits a solid wall
      const ux = proj.sprite.x / UNIT_PX;
      const uy = proj.sprite.y / UNIT_PX;
      let hitWall = false;
      for (const w of this.mapManager.walls) {
        if (ux >= w.x1 && ux <= w.x2 && uy >= w.y1 && uy <= w.y2) {
          hitWall = true;
          break;
        }
      }

      if (proj.life <= 0 || hitWall) {
        proj.sprite.destroy();
        this.bsodaProjectiles.splice(i, 1);
      }
    }
  }

  private renderFinalEscapeAtmosphere(dt: number): void {
    this.horrorDarkness.clear();
    this.exitCompassGraphics.clear();

    if (!this.gameState.isFinalEscapeActive()) {
      this.horrorFadeAlpha = 0;
      return;
    }

    // Gradually darken the entire school environment in crimson-horror shadow
    this.horrorFadeAlpha = Math.min(0.62, this.horrorFadeAlpha + dt * 0.22);
    const cam = this.cameras.main;
    this.horrorDarkness.fillStyle(0x280508, this.horrorFadeAlpha);
    this.horrorDarkness.fillRect(-cam.width, -cam.height, cam.width * 3, cam.height * 3);

    // Draw directional guide chevron around player pointing toward the active Escape Exit
    const exitSpec = this.mapManager.getActiveExitSpec();
    if (exitSpec) {
      const exPx = exitSpec.triggerX * UNIT_PX;
      const eyPx = exitSpec.triggerY * UNIT_PX;
      const angle = Math.atan2(eyPx - this.player.sprite.y, exPx - this.player.sprite.x);
      const ringDist = 54;
      const tipX = this.player.sprite.x + Math.cos(angle) * (ringDist + 12);
      const tipY = this.player.sprite.y + Math.sin(angle) * (ringDist + 12);
      const leftX = this.player.sprite.x + Math.cos(angle - 0.25) * ringDist;
      const leftY = this.player.sprite.y + Math.sin(angle - 0.25) * ringDist;
      const rightX = this.player.sprite.x + Math.cos(angle + 0.25) * ringDist;
      const rightY = this.player.sprite.y + Math.sin(angle + 0.25) * ringDist;

      this.exitCompassGraphics.fillStyle(0x22c55e, 0.92);
      this.exitCompassGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
    }
  }
}
