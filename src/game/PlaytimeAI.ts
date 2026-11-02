import Phaser from 'phaser';
import { GameState, GameStateManager } from './GameState';
import {
  isPlaytimeAllowedAtUnits,
  PLAYTIME_ALLOWED_ZONE_KINDS,
  PLAYTIME_PATROL_POINTS,
  SchoolNavGrid,
  UNIT_PX,
} from './MapLayout';

export class PlaytimeAI {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private navGrid: SchoolNavGrid;
  private gameState: GameStateManager;

  private patrolIdx = 0;
  private path: { x: number; y: number }[] = [];
  private repathTimer = 0;
  private cooldownTimer = 5.0; // Initial short delay at start
  private pushVx = 0;
  private pushVy = 0;
  private skipPhase = 0;
  private wasChasingPlayer = false;
  private lastLockedCount = -1;

  // Stuck detection & allowed-zone safety anchor
  private lastValidSpriteX = 24 * UNIT_PX;
  private lastValidSpriteY = 54 * UNIT_PX;
  private sampleAnchorX = 24 * UNIT_PX;
  private sampleAnchorY = 54 * UNIT_PX;
  private sampleTimer = 0;
  private consecutiveStuckCount = 0;
  private recoverySlideTimer = 0;
  private recoveryVx = 0;
  private recoveryVy = 0;

  constructor(scene: Phaser.Scene, navGrid: SchoolNavGrid, gameState: GameStateManager) {
    this.navGrid = navGrid;
    this.gameState = gameState;

    const startPt = PLAYTIME_PATROL_POINTS[0];
    this.sprite = scene.physics.add.sprite(
      startPt.x * UNIT_PX,
      startPt.y * UNIT_PX,
      'enemy_playtime'
    );
    this.sprite.setDepth(15);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 16);
    body.setOffset(17, 18);

    this.lastValidSpriteX = this.sprite.x;
    this.lastValidSpriteY = this.sprite.y;
    this.sampleAnchorX = this.sprite.x;
    this.sampleAnchorY = this.sprite.y;
  }

  public reset(): void {
    const startPt = PLAYTIME_PATROL_POINTS[0];
    this.sprite.setPosition(startPt.x * UNIT_PX, startPt.y * UNIT_PX);
    this.patrolIdx = 0;
    this.path = [];
    this.repathTimer = 0;
    this.cooldownTimer = 5.0;
    this.pushVx = 0;
    this.pushVy = 0;
    this.wasChasingPlayer = false;
    this.lastLockedCount = -1;

    this.lastValidSpriteX = this.sprite.x;
    this.lastValidSpriteY = this.sprite.y;
    this.sampleAnchorX = this.sprite.x;
    this.sampleAnchorY = this.sprite.y;
    this.sampleTimer = 0;
    this.consecutiveStuckCount = 0;
    this.recoverySlideTimer = 0;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);
  }

  public applyBSodaPush(vx: number, vy: number): void {
    this.pushVx = vx;
    this.pushVy = vy;
  }

  public setPostChallengeCooldown(seconds = 24): void {
    this.cooldownTimer = seconds;
    this.patrolIdx = (this.patrolIdx + 2) % PLAYTIME_PATROL_POINTS.length;
    this.path = [];
    this.wasChasingPlayer = false;
  }

  private enforceAllowedPositionGuard(body: Phaser.Physics.Arcade.Body): void {
    const ux = body.center.x / UNIT_PX;
    const uy = body.center.y / UNIT_PX;
    if (isPlaytimeAllowedAtUnits(ux, uy)) {
      this.lastValidSpriteX = this.sprite.x;
      this.lastValidSpriteY = this.sprite.y;
      return;
    }

    // Hard boundary fallback: snap Playtime back into the nearest allowed hallway/canteen point
    const rec = this.navGrid.findRecoveryPoint(
      this.lastValidSpriteX / UNIT_PX,
      this.lastValidSpriteY / UNIT_PX,
      undefined,
      PLAYTIME_ALLOWED_ZONE_KINDS
    );
    this.sprite.setPosition(rec.x * UNIT_PX, rec.y * UNIT_PX);
    body.setVelocity(0, 0);
    this.pushVx = 0;
    this.pushVy = 0;
    this.path = [];
    this.lastValidSpriteX = this.sprite.x;
    this.lastValidSpriteY = this.sprite.y;
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    lockedDoors: ReadonlySet<string>
  ): { startedChallenge: boolean } {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const state = this.gameState.getState();

    this.enforceAllowedPositionGuard(body);

    // During her jump-rope minigame, Playtime stays next to the player and animates her rope bounce
    if (state === GameState.PLAYTIME_CHALLENGE) {
      body.setVelocity(0, 0);
      this.skipPhase += dt * 10;
      this.sprite.setScale(
        1 + Math.sin(this.skipPhase) * 0.05,
        1 - Math.sin(this.skipPhase) * 0.06
      );
      return { startedChallenge: false };
    }

    if (
      state !== GameState.PLAYING &&
      state !== GameState.FINAL_ESCAPE &&
      state !== GameState.PRINCIPAL_DETENTION
    ) {
      body.setVelocity(0, 0);
      this.sprite.setScale(1, 1);
      return { startedChallenge: false };
    }

    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    }

    const bx = body.center.x;
    const by = body.center.y;
    const pUnitsX = bx / UNIT_PX;
    const pUnitsY = by / UNIT_PX;

    if (Math.hypot(this.pushVx, this.pushVy) > 15) {
      body.setVelocity(this.pushVx, this.pushVy);
      this.pushVx *= Math.exp(-3.2 * dt);
      this.pushVy *= Math.exp(-3.2 * dt);
      this.sampleAnchorX = bx;
      this.sampleAnchorY = by;
      this.sampleTimer = 0;
      return { startedChallenge: false };
    }

    const playerUnitsX = playerX / UNIT_PX;
    const playerUnitsY = playerY / UNIT_PX;

    // Playtime is ONLY allowed in hallways ('CORRIDOR') and 'CANTEEN'.
    // If the player enters a classroom or any restricted room, Playtime MUST remain outside and NOT follow them in.
    const playerInAllowedArea = isPlaytimeAllowedAtUnits(playerUnitsX, playerUnitsY);

    const distPx = Math.hypot(playerX - bx, playerY - by);
    const seesPlayer =
      playerInAllowedArea &&
      this.cooldownTimer <= 0 &&
      this.navGrid.hasLineOfSight(
        pUnitsX,
        pUnitsY,
        playerUnitsX,
        playerUnitsY,
        28,
        PLAYTIME_ALLOWED_ZONE_KINDS
      );

    // Immediately drop player pursuit and resume hallway/canteen patrol if player enters a restricted room
    if (this.wasChasingPlayer && !seesPlayer) {
      this.wasChasingPlayer = false;
      this.path = [];
      this.repathTimer = 0;
    }

    const lockedChanged = lockedDoors.size !== this.lastLockedCount;
    const isBodyBlocked = !body.blocked.none;
    this.repathTimer -= dt;

    let activeGoalUnitsX = pUnitsX;
    let activeGoalUnitsY = pUnitsY;

    if (seesPlayer) {
      this.wasChasingPlayer = true;
      activeGoalUnitsX = playerUnitsX;
      activeGoalUnitsY = playerUnitsY;

      if (distPx < 34) {
        body.setVelocity(0, 0);
        return { startedChallenge: true };
      }
      if (this.repathTimer <= 0 || this.path.length === 0 || lockedChanged || isBodyBlocked) {
        this.repathTimer = 0.35;
        this.lastLockedCount = lockedDoors.size;
        this.path = this.navGrid.findPath(
          pUnitsX,
          pUnitsY,
          playerUnitsX,
          playerUnitsY,
          lockedDoors,
          undefined,
          PLAYTIME_ALLOWED_ZONE_KINDS
        );
      }
    } else {
      const wp = PLAYTIME_PATROL_POINTS[this.patrolIdx % PLAYTIME_PATROL_POINTS.length];
      activeGoalUnitsX = wp.x;
      activeGoalUnitsY = wp.y;
      if (Math.hypot(wp.x * UNIT_PX - bx, wp.y * UNIT_PX - by) < 36) {
        this.patrolIdx = (this.patrolIdx + 1) % PLAYTIME_PATROL_POINTS.length;
        this.path = [];
        this.consecutiveStuckCount = 0;
      }
      if (this.repathTimer <= 0 || this.path.length === 0 || lockedChanged) {
        const nextWp = PLAYTIME_PATROL_POINTS[this.patrolIdx % PLAYTIME_PATROL_POINTS.length];
        activeGoalUnitsX = nextWp.x;
        activeGoalUnitsY = nextWp.y;
        this.repathTimer = 0.7;
        this.lastLockedCount = lockedDoors.size;
        this.path = this.navGrid.findPath(
          pUnitsX,
          pUnitsY,
          nextWp.x,
          nextWp.y,
          lockedDoors,
          undefined,
          PLAYTIME_ALLOWED_ZONE_KINDS
        );
        if (this.path.length === 0) {
          this.patrolIdx = (this.patrolIdx + 1) % PLAYTIME_PATROL_POINTS.length;
        }
      }
    }

    // Smooth waypoint advancement strictly through allowed hallway/canteen clearance
    while (this.path.length > 0) {
      const step = this.path[0];
      const distToStepPx = Math.hypot(step.x * UNIT_PX - bx, step.y * UNIT_PX - by);
      if (distToStepPx < 15 && this.path.length > 1) {
        this.path.shift();
        continue;
      }
      if (this.path.length >= 2) {
        const nextStep = this.path[1];
        if (
          this.navGrid.hasWalkableLine(
            pUnitsX,
            pUnitsY,
            nextStep.x,
            nextStep.y,
            0.58,
            lockedDoors,
            PLAYTIME_ALLOWED_ZONE_KINDS
          )
        ) {
          this.path.shift();
          continue;
        }
      }
      break;
    }

    let targetX = bx;
    let targetY = by;
    if (
      seesPlayer &&
      this.navGrid.hasWalkableLine(
        pUnitsX,
        pUnitsY,
        playerUnitsX,
        playerUnitsY,
        0.58,
        lockedDoors,
        PLAYTIME_ALLOWED_ZONE_KINDS
      )
    ) {
      targetX = playerX;
      targetY = playerY;
    } else if (this.path.length > 0) {
      targetX = this.path[0].x * UNIT_PX;
      targetY = this.path[0].y * UNIT_PX;
    } else {
      const rec = this.navGrid.findRecoveryPoint(
        pUnitsX,
        pUnitsY,
        lockedDoors,
        PLAYTIME_ALLOWED_ZONE_KINDS
      );
      targetX = rec.x * UNIT_PX;
      targetY = rec.y * UNIT_PX;
    }

    const speed = seesPlayer ? 168 : 122;

    // Stuck detection & hallway/canteen-only detour recovery
    this.sampleTimer += dt;
    if (this.sampleTimer >= 0.36) {
      const movedPx = Math.hypot(bx - this.sampleAnchorX, by - this.sampleAnchorY);
      this.sampleAnchorX = bx;
      this.sampleAnchorY = by;
      this.sampleTimer = 0;

      if (movedPx < 7.5) {
        this.consecutiveStuckCount += 1;
        const rec = this.navGrid.findRecoveryPoint(
          pUnitsX,
          pUnitsY,
          lockedDoors,
          PLAYTIME_ALLOWED_ZONE_KINDS
        );
        const rxPx = rec.x * UNIT_PX;
        const ryPx = rec.y * UNIT_PX;
        const rdx = rxPx - bx;
        const rdy = ryPx - by;
        const rLen = Math.hypot(rdx, rdy);
        if (rLen > 1) {
          const step = Math.min(5, rLen);
          this.sprite.setPosition(
            this.sprite.x + (rdx / rLen) * step,
            this.sprite.y + (rdy / rLen) * step
          );
          this.recoveryVx = (rdx / rLen) * speed;
          this.recoveryVy = (rdy / rLen) * speed;
          this.recoverySlideTimer = 0.16;
        }

        if (!seesPlayer && this.consecutiveStuckCount >= 2) {
          this.patrolIdx = (this.patrolIdx + 1) % PLAYTIME_PATROL_POINTS.length;
          const nextWp = PLAYTIME_PATROL_POINTS[this.patrolIdx];
          activeGoalUnitsX = nextWp.x;
          activeGoalUnitsY = nextWp.y;
          this.consecutiveStuckCount = 0;
        }

        const blockedAheadX = (bx + (targetX - bx) * 0.35) / UNIT_PX;
        const blockedAheadY = (by + (targetY - by) * 0.35) / UNIT_PX;
        this.path = this.navGrid.findDetourPath(
          rec.x,
          rec.y,
          activeGoalUnitsX,
          activeGoalUnitsY,
          blockedAheadX,
          blockedAheadY,
          lockedDoors,
          PLAYTIME_ALLOWED_ZONE_KINDS
        );
      } else {
        this.consecutiveStuckCount = 0;
      }
    }

    if (this.recoverySlideTimer > 0) {
      this.recoverySlideTimer = Math.max(0, this.recoverySlideTimer - dt);
      body.setVelocity(this.recoveryVx, this.recoveryVy);
      this.skipPhase += dt * 11;
      this.sprite.setScale(1, 1 + Math.abs(Math.sin(this.skipPhase)) * 0.08);
    } else {
      const dx = targetX - bx;
      const dy = targetY - by;
      const len = Math.hypot(dx, dy);
      if (len > 2) {
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.skipPhase += dt * 11;
        this.sprite.setScale(1, 1 + Math.abs(Math.sin(this.skipPhase)) * 0.08);
      } else {
        body.setVelocity(0, 0);
        this.sprite.setScale(1, 1);
      }
    }

    return { startedChallenge: false };
  }
}

