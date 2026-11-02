import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { GameState, GameStateManager } from './GameState';
import { BALDI_START_UNITS, SchoolNavGrid, UNIT_PX } from './MapLayout';

export class BaldiAI {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private rageAura: Phaser.GameObjects.Graphics;
  private navGrid: SchoolNavGrid;
  private gameState: GameStateManager;
  private audio: AudioManager;

  private path: { x: number; y: number }[] = [];
  private repathTimer = 0;
  private minDynamicRepathCooldown = 0;
  private slapTimer = 0.7;
  private postAttackPauseTimer = 0;
  private pushVx = 0;
  private pushVy = 0;

  // Player direction & goal tracking for reactive path updates
  private lastGoalUnitsX = -999;
  private lastGoalUnitsY = -999;
  private prevPlayerX = -999;
  private prevPlayerY = -999;
  private lastPlannedPlayerDirX = 0;
  private lastPlannedPlayerDirY = 0;
  private lastLockedCount = -1;

  // Stuck detection & recovery
  private sampleAnchorX = 0;
  private sampleAnchorY = 0;
  private sampleTimer = 0;
  private recoverySlideTimer = 0;
  private recoveryVx = 0;
  private recoveryVy = 0;

  // Furious 7/7 visual state
  private isFuriousVisual = false;
  private auraPulse = 0;

  constructor(
    scene: Phaser.Scene,
    navGrid: SchoolNavGrid,
    gameState: GameStateManager,
    audio: AudioManager
  ) {
    this.navGrid = navGrid;
    this.gameState = gameState;
    this.audio = audio;

    this.rageAura = scene.add.graphics().setDepth(15);

    this.sprite = scene.physics.add.sprite(
      BALDI_START_UNITS.x * UNIT_PX,
      BALDI_START_UNITS.y * UNIT_PX,
      'enemy_baldi'
    );
    this.sprite.setDepth(16);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    // Compact centered 16x16 body prevents snagging on doorway jambs and corners
    body.setSize(16, 16);
    body.setOffset(16, 19);

    this.sampleAnchorX = this.sprite.x;
    this.sampleAnchorY = this.sprite.y;
  }

  public reset(): void {
    this.sprite.setPosition(BALDI_START_UNITS.x * UNIT_PX, BALDI_START_UNITS.y * UNIT_PX);
    this.sprite.setTexture('enemy_baldi');
    this.sprite.setScale(1, 1);
    this.isFuriousVisual = false;
    this.rageAura.clear();

    this.path = [];
    this.repathTimer = 0;
    this.minDynamicRepathCooldown = 0;
    this.slapTimer = 0.75;
    this.postAttackPauseTimer = 0;
    this.pushVx = 0;
    this.pushVy = 0;

    this.lastGoalUnitsX = -999;
    this.lastGoalUnitsY = -999;
    this.prevPlayerX = -999;
    this.prevPlayerY = -999;
    this.lastLockedCount = -1;

    this.sampleAnchorX = this.sprite.x;
    this.sampleAnchorY = this.sprite.y;
    this.sampleTimer = 0;
    this.recoverySlideTimer = 0;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);
  }

  public applyBSodaPush(vx: number, vy: number): void {
    this.pushVx = vx;
    this.pushVy = vy;
  }

  public pauseAfterAttack(seconds = 2.1, awayFromX?: number, awayFromY?: number): void {
    const isFurious = this.gameState.isFinalEscapeActive();
    this.postAttackPauseTimer = isFurious ? Math.min(seconds, 1.35) : seconds;
    if (awayFromX !== undefined && awayFromY !== undefined) {
      const dx = this.sprite.x - awayFromX;
      const dy = this.sprite.y - awayFromY;
      const len = Math.hypot(dx, dy) || 1;
      this.pushVx = (dx / len) * 250;
      this.pushVy = (dy / len) * 250;
    }
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    lockedDoors: ReadonlySet<string>
  ): { caughtPlayer: boolean; distanceUnits: number } {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const bx = body.center.x;
    const by = body.center.y;
    const distPx = Math.hypot(playerX - bx, playerY - by);
    const distUnits = distPx / UNIT_PX;

    const isFurious = this.gameState.isFinalEscapeActive();

    // Update Baldi's Final Aggressive Form visual texture & crimson rage aura
    if (isFurious && !this.isFuriousVisual) {
      this.isFuriousVisual = true;
      this.sprite.setTexture('enemy_baldi_furious');
      this.repathTimer = 0;
    } else if (!isFurious && this.isFuriousVisual) {
      this.isFuriousVisual = false;
      this.sprite.setTexture('enemy_baldi');
    }

    this.rageAura.clear();
    if (isFurious) {
      this.auraPulse += dt * 7.5;
      const radius = 24 + Math.sin(this.auraPulse) * 4;
      this.rageAura.lineStyle(3, 0xef4444, 0.85);
      this.rageAura.strokeCircle(this.sprite.x, this.sprite.y + 4, radius);
      this.rageAura.fillStyle(0xdc2626, 0.22);
      this.rageAura.fillCircle(this.sprite.x, this.sprite.y + 4, radius * 0.85);
    }

    // Baldi continues chasing during PLAYING, FINAL_ESCAPE, AND PLAYTIME_CHALLENGE!
    // Only true global pauses/menus or Detention freeze Baldi.
    if (!this.gameState.isBaldiPursuitActive()) {
      body.setVelocity(0, 0);
      return { caughtPlayer: false, distanceUnits: distUnits };
    }

    // Handle BSoda pushback wave
    if (Math.hypot(this.pushVx, this.pushVy) > 15) {
      body.setVelocity(this.pushVx, this.pushVy);
      this.pushVx *= Math.exp(-3.2 * dt);
      this.pushVy *= Math.exp(-3.2 * dt);
      this.sampleAnchorX = bx;
      this.sampleAnchorY = by;
      this.sampleTimer = 0;
      return { caughtPlayer: false, distanceUnits: distUnits };
    }

    if (this.postAttackPauseTimer > 0) {
      this.postAttackPauseTimer = Math.max(0, this.postAttackPauseTimer - dt);
      body.setVelocity(0, 0);
      this.sampleAnchorX = bx;
      this.sampleAnchorY = by;
      return { caughtPlayer: false, distanceUnits: distUnits };
    }

    // Detect player movement direction changes for reactive path updates
    let playerChangedDir = false;
    if (this.prevPlayerX > -900) {
      const pvx = playerX - this.prevPlayerX;
      const pvy = playerY - this.prevPlayerY;
      const plen = Math.hypot(pvx, pvy);
      if (plen > 1.2) {
        const ndx = pvx / plen;
        const ndy = pvy / plen;
        const dot = ndx * this.lastPlannedPlayerDirX + ndy * this.lastPlannedPlayerDirY;
        if (dot < 0.35) {
          playerChangedDir = true;
        }
      }
    }
    const curPdx = this.prevPlayerX > -900 ? playerX - this.prevPlayerX : 0;
    const curPdy = this.prevPlayerY > -900 ? playerY - this.prevPlayerY : 0;
    this.prevPlayerX = playerX;
    this.prevPlayerY = playerY;

    const playerUnitsX = playerX / UNIT_PX;
    const playerUnitsY = playerY / UNIT_PX;
    const goalShiftUnits = Math.hypot(
      playerUnitsX - this.lastGoalUnitsX,
      playerUnitsY - this.lastGoalUnitsY
    );
    const isBodyBlocked = !body.blocked.none;
    const lockedChanged = lockedDoors.size !== this.lastLockedCount;

    this.repathTimer -= dt;
    this.minDynamicRepathCooldown = Math.max(0, this.minDynamicRepathCooldown - dt);

    const shouldRepath =
      this.repathTimer <= 0 ||
      this.path.length === 0 ||
      lockedChanged ||
      (this.minDynamicRepathCooldown <= 0 &&
        (isBodyBlocked || playerChangedDir || goalShiftUnits > (isFurious ? 1.3 : 2.2)));

    if (shouldRepath) {
      this.repathTimer = isFurious ? 0.11 : 0.32;
      this.minDynamicRepathCooldown = isFurious ? 0.05 : 0.09;
      this.lastGoalUnitsX = playerUnitsX;
      this.lastGoalUnitsY = playerUnitsY;
      this.lastLockedCount = lockedDoors.size;
      const plen = Math.hypot(curPdx, curPdy);
      if (plen > 0.5) {
        this.lastPlannedPlayerDirX = curPdx / plen;
        this.lastPlannedPlayerDirY = curPdy / plen;
      }
      this.path = this.navGrid.findPathOrClosestApproach(
        bx / UNIT_PX,
        by / UNIT_PX,
        playerUnitsX,
        playerUnitsY,
        lockedDoors
      );
    }

    // Safe waypoint advancement with line-of-clearance smoothing
    const bUnitsX = bx / UNIT_PX;
    const bUnitsY = by / UNIT_PX;
    while (this.path.length > 0) {
      const wp = this.path[0];
      const distToWpPx = Math.hypot(wp.x * UNIT_PX - bx, wp.y * UNIT_PX - by);
      if (distToWpPx < 14 && this.path.length > 1) {
        this.path.shift();
        continue;
      }
      if (this.path.length >= 2) {
        const nextWp = this.path[1];
        if (this.navGrid.hasWalkableLine(bUnitsX, bUnitsY, nextWp.x, nextWp.y, 0.58, lockedDoors)) {
          this.path.shift();
          continue;
        }
      }
      break;
    }

    // Determine target point (if direct walkable line to player exists, steer smoothly directly at player)
    let targetX = bx;
    let targetY = by;
    if (this.navGrid.hasWalkableLine(bUnitsX, bUnitsY, playerUnitsX, playerUnitsY, 0.58, lockedDoors)) {
      targetX = playerX;
      targetY = playerY;
    } else if (this.path.length > 0) {
      targetX = this.path[0].x * UNIT_PX;
      targetY = this.path[0].y * UNIT_PX;
    } else {
      const rec = this.navGrid.findRecoveryPoint(bUnitsX, bUnitsY, lockedDoors);
      targetX = rec.x * UNIT_PX;
      targetY = rec.y * UNIT_PX;
    }

    // Baldi speed scales with wrong answers + dramatic Final Aggressive Form boost on 7/7
    const speedMultiplier = this.gameState.getBaldiSpeedMultiplier();
    const baseSpeedPx = 138;

    // Iconic ruler-slap cadence (rapid & relentless in Final Aggressive Form)
    const slapInterval = isFurious
      ? Math.max(0.19, 0.46 / speedMultiplier)
      : Math.max(0.34, 0.84 / speedMultiplier);
    this.slapTimer -= dt;
    if (this.slapTimer <= 0) {
      this.slapTimer = slapInterval;
      this.audio.playBaldiRulerSnap(distUnits, speedMultiplier >= 1.2 || isFurious);
      this.sprite.setScale(isFurious ? 1.2 : 1.14, isFurious ? 0.86 : 0.9);
    } else {
      this.sprite.scaleX += (1 - this.sprite.scaleX) * Math.min(1, dt * 11);
      this.sprite.scaleY += (1 - this.sprite.scaleY) * Math.min(1, dt * 11);
    }

    const slapPhase = this.slapTimer / slapInterval;
    const cadenceFactor = isFurious ? 0.95 + slapPhase * 0.22 : 0.8 + slapPhase * 0.42;
    const moveSpeed = baseSpeedPx * speedMultiplier * cadenceFactor;

    // Stuck detection & automatic recovery
    this.sampleTimer += dt;
    if (this.sampleTimer >= 0.32) {
      const movedPx = Math.hypot(bx - this.sampleAnchorX, by - this.sampleAnchorY);
      this.sampleAnchorX = bx;
      this.sampleAnchorY = by;
      this.sampleTimer = 0;

      const distToImmediateTargetPx = Math.hypot(targetX - bx, targetY - by);
      if (movedPx < 8.5 && distPx > 28 && distToImmediateTargetPx > 14) {
        const rec = this.navGrid.findRecoveryPoint(bUnitsX, bUnitsY, lockedDoors);
        const rxPx = rec.x * UNIT_PX;
        const ryPx = rec.y * UNIT_PX;
        const rdx = rxPx - bx;
        const rdy = ryPx - by;
        const rLen = Math.hypot(rdx, rdy);
        if (rLen > 1) {
          // Gentle safe step away from corner snag + slide velocity
          const step = Math.min(6, rLen);
          this.sprite.setPosition(
            this.sprite.x + (rdx / rLen) * step,
            this.sprite.y + (rdy / rLen) * step
          );
          this.recoveryVx = (rdx / rLen) * moveSpeed;
          this.recoveryVy = (rdy / rLen) * moveSpeed;
          this.recoverySlideTimer = 0.18;
        }
        const blockedAheadX = (bx + (targetX - bx) * 0.35) / UNIT_PX;
        const blockedAheadY = (by + (targetY - by) * 0.35) / UNIT_PX;
        const detour = this.navGrid.findDetourPath(
          rec.x,
          rec.y,
          playerUnitsX,
          playerUnitsY,
          blockedAheadX,
          blockedAheadY,
          lockedDoors
        );
        this.path =
          detour.length > 0
            ? detour
            : this.navGrid.findPathOrClosestApproach(
                rec.x,
                rec.y,
                playerUnitsX,
                playerUnitsY,
                lockedDoors
              );
      }
    }

    if (this.recoverySlideTimer > 0) {
      this.recoverySlideTimer = Math.max(0, this.recoverySlideTimer - dt);
      body.setVelocity(this.recoveryVx, this.recoveryVy);
    } else {
      const dx = targetX - bx;
      const dy = targetY - by;
      const dLen = Math.hypot(dx, dy);
      if (dLen > 2) {
        body.setVelocity((dx / dLen) * moveSpeed, (dy / dLen) * moveSpeed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    const caughtPlayer = distPx < 30;
    return { caughtPlayer, distanceUnits: distUnits };
  }
}
