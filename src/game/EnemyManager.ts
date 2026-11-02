import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { BaldiAI } from './BaldiAI';
import { BullyAI } from './BullyAI';
import { GameStateManager } from './GameState';
import { DETENTION_SPAWN_UNITS, PLAYER_START_UNITS, UNIT_PX } from './MapLayout';
import { MapManager } from './MapManager';
import { Player } from './Player';
import { PlaytimeAI } from './PlaytimeAI';
import { PrincipalAI } from './PrincipalAI';

/**
 * Coordinates the ONLY four antagonists permitted in the game:
 * 1. Baldi
 * 2. Principal of the Thing
 * 3. Playtime
 * 4. It's a Bully
 */
export class EnemyManager {
  public readonly baldi: BaldiAI;
  public readonly principal: PrincipalAI;
  public readonly playtime: PlaytimeAI;
  public readonly bully: BullyAI;

  private scene: Phaser.Scene;
  private mapManager: MapManager;
  private gameState: GameStateManager;
  private audio: AudioManager;

  constructor(
    scene: Phaser.Scene,
    mapManager: MapManager,
    gameState: GameStateManager,
    audio: AudioManager,
    player: Player
  ) {
    this.scene = scene;
    this.mapManager = mapManager;
    this.gameState = gameState;
    this.audio = audio;

    this.baldi = new BaldiAI(scene, mapManager.navGrid, gameState, audio);
    this.principal = new PrincipalAI(scene, mapManager.navGrid, gameState, audio);
    this.playtime = new PlaytimeAI(scene, mapManager.navGrid, gameState);
    this.bully = new BullyAI(scene, gameState);

    // Collide mobile NPCs with walls, props, and locked doors so they never walk through solid obstacles
    const movers = [this.baldi.sprite, this.principal.sprite, this.playtime.sprite];
    for (const m of movers) {
      scene.physics.add.collider(m, mapManager.wallGroup);
      scene.physics.add.collider(m, mapManager.propGroup);
      scene.physics.add.collider(m, mapManager.doorColliderGroup);
    }

    // Playtime ONLY is physically blocked at every restricted room doorway (Baldi & Principal remain unrestricted)
    scene.physics.add.collider(this.playtime.sprite, mapManager.playtimeRestrictedBarrierGroup);

    // Bully physically blocks the ENTIRE hallway width for the player until items are seized
    scene.physics.add.collider(player.sprite, this.bully.barrierGroup);

    this.bully.reset(
      PLAYER_START_UNITS,
      this.getActorPositionsPx().map((p) => ({ x: p.x / UNIT_PX, y: p.y / UNIT_PX }))
    );
  }

  public resetAll(): void {
    this.baldi.reset();
    this.principal.reset();
    this.playtime.reset();
    this.bully.reset(
      PLAYER_START_UNITS,
      this.getActorPositionsPx().map((p) => ({ x: p.x / UNIT_PX, y: p.y / UNIT_PX }))
    );
  }

  public stopAllMotion(): void {
    [this.baldi.sprite, this.principal.sprite, this.playtime.sprite].forEach((s) => {
      const b = s.body as Phaser.Physics.Arcade.Body | null;
      if (b) b.setVelocity(0, 0);
    });
  }

  public getActorPositionsPx(): { x: number; y: number }[] {
    return [
      { x: this.baldi.sprite.x, y: this.baldi.sprite.y },
      { x: this.principal.sprite.x, y: this.principal.sprite.y },
      { x: this.playtime.sprite.x, y: this.playtime.sprite.y },
    ];
  }

  public getUnrestrictedDoorActorPositionsPx(): { x: number; y: number }[] {
    return [
      { x: this.baldi.sprite.x, y: this.baldi.sprite.y },
      { x: this.principal.sprite.x, y: this.principal.sprite.y },
    ];
  }

  public getDoubleDoorOnlyActorPositionsPx(): { x: number; y: number }[] {
    return [{ x: this.playtime.sprite.x, y: this.playtime.sprite.y }];
  }

  public applyBSodaWaveHit(waveX: number, waveY: number, vx: number, vy: number): void {
    const pushTargets = [
      { sprite: this.baldi.sprite, apply: (x: number, y: number) => this.baldi.applyBSodaPush(x, y) },
      { sprite: this.principal.sprite, apply: (x: number, y: number) => this.principal.applyBSodaPush(x, y) },
      { sprite: this.playtime.sprite, apply: (x: number, y: number) => this.playtime.applyBSodaPush(x, y) },
    ];
    for (const target of pushTargets) {
      if (Math.hypot(target.sprite.x - waveX, target.sprite.y - waveY) < 48) {
        target.apply(vx * 0.92, vy * 0.92);
      }
    }
  }

  public update(
    dt: number,
    player: Player,
    playerInFacultyRoom: boolean
  ): {
    baldiAttacked: boolean;
    triggeredGameOver: boolean;
    baldiDistUnits: number;
    principalJustDetectedViolation: boolean;
    principalIsPursuing: boolean;
    justEnteredDetention: boolean;
  } {
    const px = player.sprite.x;
    const py = player.sprite.y;
    const lockedDoors = this.mapManager.getLockedDoorIds();
    const npcPositionsPx = this.getActorPositionsPx();

    // 1. Bully random hallway blockade & item seizure check
    const carriedCount = this.gameState.inventory.countItems();
    const bullyRes = this.bully.update(dt, px, py, carriedCount, npcPositionsPx);
    if (bullyRes.triggeredSteal) {
      const stolen = this.gameState.triggerBullyEncounter();
      this.audio.playBullySteal();
      if (stolen.length > 0) {
        this.spawnStolenItemVisualBurst(px, py, this.bully.sprite.x, this.bully.sprite.y, stolen.length);
      }
      this.bully.vanishAndScheduleRespawn();
    } else if (bullyRes.blockedNoItems) {
      this.audio.playBullySteal();
      this.gameState.notifyBullyBlockedNoItems();
    }

    // 2. Principal patrol & school rule enforcement check (never pauses or interrupts Baldi's AI!)
    const prinRes = this.principal.update(
      dt,
      px,
      py,
      player.isSprinting && !playerInFacultyRoom,
      playerInFacultyRoom,
      lockedDoors
    );

    let justEnteredDetention = false;
    let activePlayerX = px;
    let activePlayerY = py;

    if (prinRes.triggeredDetention) {
      if (this.gameState.startPrincipalDetention()) {
        justEnteredDetention = true;
        player.teleportToUnits(DETENTION_SPAWN_UNITS.x, DETENTION_SPAWN_UNITS.y);
        activePlayerX = player.sprite.x;
        activePlayerY = player.sprite.y;
        this.mapManager.setDoorLocked('DOOR_DETENTION', true, 10.0);
        this.principal.relocateOutsideDetention();
      }
    }

    const updatedLockedDoors = this.mapManager.getLockedDoorIds();

    // 3. Playtime jump-rope check (never pauses or interrupts Baldi's pursuit)
    const playRes = this.playtime.update(dt, activePlayerX, activePlayerY, updatedLockedDoors);
    if (playRes.startedChallenge) {
      if (this.gameState.startPlaytimeChallenge()) {
        this.audio.playPlaytimeGreeting();
        player.stopMotion();
      }
    }

    // 4. Baldi pursuit & attack check — operates 100% independently during Principal's pursuit & detention!
    const baldiRes = this.baldi.update(dt, activePlayerX, activePlayerY, updatedLockedDoors);
    if (baldiRes.caughtPlayer) {
      const attack = this.gameState.applyBaldiAttack();
      if (attack.damaged) {
        this.audio.playBaldiAttack();
        this.baldi.pauseAfterAttack(2.1, activePlayerX, activePlayerY);
        if (attack.triggeredGameOver) {
          this.audio.playGameOver();
          this.stopAllMotion();
        }
        return {
          baldiAttacked: true,
          triggeredGameOver: attack.triggeredGameOver,
          baldiDistUnits: baldiRes.distanceUnits,
          principalJustDetectedViolation: prinRes.justDetectedViolation,
          principalIsPursuing: this.principal.isActivelyPursuing(),
          justEnteredDetention,
        };
      }
    }

    return {
      baldiAttacked: false,
      triggeredGameOver: false,
      baldiDistUnits: baldiRes.distanceUnits,
      principalJustDetectedViolation: prinRes.justDetectedViolation,
      principalIsPursuing: this.principal.isActivelyPursuing(),
      justEnteredDetention,
    };
  }

  private spawnStolenItemVisualBurst(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      const orb = this.scene.add.circle(fromX, fromY, 7, 0xfacc15).setDepth(24);
      this.scene.tweens.add({
        targets: orb,
        x: toX,
        y: toY - 12,
        scale: 0.3,
        duration: 240 + i * 50,
        onComplete: () => orb.destroy(),
      });
    }
  }
}
