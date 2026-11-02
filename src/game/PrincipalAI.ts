import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { GameState, GameStateManager } from './GameState';
import { PRINCIPAL_POST_DETENTION_UNITS, SchoolNavGrid, UNIT_PX } from './MapLayout';

// Corridor & room-entry patrol loop centered safely away from walls
const PATROL_WAYPOINTS = [
  { x: 104, y: 86 },
  { x: 52, y: 86 },
  { x: 24, y: 86 },
  { x: 24, y: 54 },
  { x: 24, y: 24 },
  { x: 64, y: 54 },
  { x: 104, y: 36 },
  { x: 136, y: 42 },
  { x: 136, y: 94 },
  { x: 136, y: 134 },
  { x: 74, y: 134 },
  { x: 24, y: 134 },
];

export class PrincipalAI {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private navGrid: SchoolNavGrid;
  private gameState: GameStateManager;
  private audio: AudioManager;

  private waypointIdx = 0;
  private path: { x: number; y: number }[] = [];
  private repathTimer = 0;
  private minDynamicRepathCooldown = 0;
  private humTimer = 2.0;
  private pursuingInfractionTimer = 0;
  private postDetentionGraceTimer = 0;
  private pendingInitialDetection = false;
  private pushVx = 0;
  private pushVy = 0;

  // Player direction & goal tracking while pursuing an infraction
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
  private consecutiveStuckCount = 0;
  private recoverySlideTimer = 0;
  private recoveryVx = 0;
  private recoveryVy = 0;

  constructor(
    scene: Phaser.Scene,
    navGrid: SchoolNavGrid,
    gameState: GameStateManager,
    audio: AudioManager
  ) {
    this.navGrid = navGrid;
    this.gameState = gameState;
    this.audio = audio;

    this.sprite = scene.physics.add.sprite(104 * UNIT_PX, 86 * UNIT_PX, 'enemy_principal');
    this.sprite.setDepth(15);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    // Compact centered 16x16 body prevents snagging on doorway jambs and corners
    body.setSize(16, 16);
    body.setOffset(16, 19);

    this.sampleAnchorX = this.sprite.x;
    this.sampleAnchorY = this.sprite.y;
  }

  public reset(): void {
    this.sprite.setPosition(104 * UNIT_PX, 86 * UNIT_PX);
    this.waypointIdx = 0;
    this.path = [];
    this.repathTimer = 0;
    this.minDynamicRepathCooldown = 0;
    this.humTimer = 2.2;
    this.pursuingInfractionTimer = 0;
    this.postDetentionGraceTimer = 0;
    this.pendingInitialDetection = false;
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
    this.consecutiveStuckCount = 0;
    this.recoverySlideTimer = 0;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);
  }

  public applyBSodaPush(vx: number, vy: number): void {
    this.pushVx = vx;
    this.pushVy = vy;
  }

  public isActivelyPursuing(): boolean {
    return this.pursuingInfractionTimer > 0;
  }

  public flagPlayerInfractionIfSeen(playerX: number, playerY: number, reason: string): void {
    const state = this.gameState.getState();
    if (this.postDetentionGraceTimer > 0 || state === GameState.PRINCIPAL_DETENTION) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const sees = this.navGrid.hasLineOfSight(
      body.center.x / UNIT_PX,
      body.center.y / UNIT_PX,
      playerX / UNIT_PX,
      playerY / UNIT_PX,
      46
    );
    if (sees) {
      if (this.pursuingInfractionTimer <= 0) {
        this.pendingInitialDetection = true;
        this.repathTimer = 0;
        this.gameState.showNotification(`Pengetua ternampak kamu: ${reason}`, 'danger', 2.4);
      }
      this.pursuingInfractionTimer = 8.5;
    }
  }

  public relocateOutsideDetention(): void {
    this.sprite.setPosition(
      PRINCIPAL_POST_DETENTION_UNITS.x * UNIT_PX,
      PRINCIPAL_POST_DETENTION_UNITS.y * UNIT_PX
    );
    this.pursuingInfractionTimer = 0;
    this.pendingInitialDetection = false;
    // Brief 0.8s grace timer that ticks down ONLY once detention ends so repeated violations trigger cleanly
    this.postDetentionGraceTimer = 0.8;
    this.path = [];
    this.sampleAnchorX = this.sprite.x;
    this.sampleAnchorY = this.sprite.y;
    this.sampleTimer = 0;
    this.consecutiveStuckCount = 0;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerIsSprinting: boolean,
    playerInFacultyRoom: boolean,
    lockedDoors: ReadonlySet<string>
  ): { triggeredDetention: boolean; justDetectedViolation: boolean; isPursuing: boolean } {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const state = this.gameState.getState();

    if (!this.gameState.isBaldiPursuitActive()) {
      body.setVelocity(0, 0);
      return {
        triggeredDetention: false,
        justDetectedViolation: false,
        isPursuing: this.pursuingInfractionTimer > 0,
      };
    }

    if (this.postDetentionGraceTimer > 0 && state !== GameState.PRINCIPAL_DETENTION) {
      this.postDetentionGraceTimer = Math.max(0, this.postDetentionGraceTimer - dt);
    }

    const bx = body.center.x;
    const by = body.center.y;

    if (Math.hypot(this.pushVx, this.pushVy) > 15) {
      body.setVelocity(this.pushVx, this.pushVy);
      this.pushVx *= Math.exp(-3.2 * dt);
      this.pushVy *= Math.exp(-3.2 * dt);
      this.sampleAnchorX = bx;
      this.sampleAnchorY = by;
      this.sampleTimer = 0;
      const justDetected = this.pendingInitialDetection;
      this.pendingInitialDetection = false;
      return {
        triggeredDetention: false,
        justDetectedViolation: justDetected,
        isPursuing: this.pursuingInfractionTimer > 0,
      };
    }

    const distPx = Math.hypot(playerX - bx, playerY - by);
    const distUnits = distPx / UNIT_PX;
    const pUnitsX = bx / UNIT_PX;
    const pUnitsY = by / UNIT_PX;
    const playerUnitsX = playerX / UNIT_PX;
    const playerUnitsY = playerY / UNIT_PX;

    // Quiet patrol humming when passing near player
    this.humTimer -= dt;
    if (this.humTimer <= 0) {
      this.humTimer = 2.5 + Math.random() * 1.2;
      if (this.pursuingInfractionTimer <= 0) {
        this.audio.playPrincipalHum(distUnits);
      }
    }

    // Detect school rule infractions in line-of-sight (only while player is free to move outside Detention)
    if (
      this.postDetentionGraceTimer <= 0 &&
      state !== GameState.PLAYTIME_CHALLENGE &&
      state !== GameState.PRINCIPAL_DETENTION
    ) {
      const canSeePlayer = this.navGrid.hasLineOfSight(
        pUnitsX,
        pUnitsY,
        playerUnitsX,
        playerUnitsY,
        46
      );
      if (canSeePlayer && (playerIsSprinting || playerInFacultyRoom)) {
        if (this.pursuingInfractionTimer <= 0) {
          this.pendingInitialDetection = true;
          this.repathTimer = 0;
          this.gameState.showNotification(
            playerInFacultyRoom
              ? 'Pengetua: "Dilarang masuk ke bilik guru!"'
              : 'Pengetua: "Jangan berlari di koridor!"',
            'danger',
            2.4
          );
        }
        this.pursuingInfractionTimer = 8.0;
      }
    }

    if (this.pursuingInfractionTimer > 0) {
      this.pursuingInfractionTimer = Math.max(0, this.pursuingInfractionTimer - dt);
    }

    // Track player direction changes for smooth reactive pursuit
    let playerChangedDir = false;
    if (this.prevPlayerX > -900) {
      const pvx = playerX - this.prevPlayerX;
      const pvy = playerY - this.prevPlayerY;
      const plen = Math.hypot(pvx, pvy);
      if (plen > 1.2) {
        const ndx = pvx / plen;
        const ndy = pvy / plen;
        const dot = ndx * this.lastPlannedPlayerDirX + ndy * this.lastPlannedPlayerDirY;
        if (dot < 0.35) playerChangedDir = true;
      }
    }
    const curPdx = this.prevPlayerX > -900 ? playerX - this.prevPlayerX : 0;
    const curPdy = this.prevPlayerY > -900 ? playerY - this.prevPlayerY : 0;
    this.prevPlayerX = playerX;
    this.prevPlayerY = playerY;

    const isChasing = this.pursuingInfractionTimer > 0;
    const isBodyBlocked = !body.blocked.none;
    const lockedChanged = lockedDoors.size !== this.lastLockedCount;

    this.repathTimer -= dt;
    this.minDynamicRepathCooldown = Math.max(0, this.minDynamicRepathCooldown - dt);

    let activeGoalUnitsX = playerUnitsX;
    let activeGoalUnitsY = playerUnitsY;

    if (isChasing && state !== GameState.PLAYTIME_CHALLENGE && state !== GameState.PRINCIPAL_DETENTION) {
      if (distPx < 32) {
        body.setVelocity(0, 0);
        const justDetected = this.pendingInitialDetection;
        this.pendingInitialDetection = false;
        return {
          triggeredDetention: true,
          justDetectedViolation: justDetected,
          isPursuing: false,
        };
      }
      const goalShift = Math.hypot(
        playerUnitsX - this.lastGoalUnitsX,
        playerUnitsY - this.lastGoalUnitsY
      );
      if (
        this.repathTimer <= 0 ||
        this.path.length === 0 ||
        lockedChanged ||
        (this.minDynamicRepathCooldown <= 0 &&
          (isBodyBlocked || playerChangedDir || goalShift > 2.0))
      ) {
        this.repathTimer = 0.25;
        this.minDynamicRepathCooldown = 0.08;
        this.lastGoalUnitsX = playerUnitsX;
        this.lastGoalUnitsY = playerUnitsY;
        this.lastLockedCount = lockedDoors.size;
        const plen = Math.hypot(curPdx, curPdy);
        if (plen > 0.5) {
          this.lastPlannedPlayerDirX = curPdx / plen;
          this.lastPlannedPlayerDirY = curPdy / plen;
        }
        this.path = this.navGrid.findPath(
          pUnitsX,
          pUnitsY,
          playerUnitsX,
          playerUnitsY,
          lockedDoors
        );
      }
    } else {
      const wp = PATROL_WAYPOINTS[this.waypointIdx % PATROL_WAYPOINTS.length];
      activeGoalUnitsX = wp.x;
      activeGoalUnitsY = wp.y;
      if (Math.hypot(wp.x * UNIT_PX - bx, wp.y * UNIT_PX - by) < 34) {
        this.waypointIdx = (this.waypointIdx + 1) % PATROL_WAYPOINTS.length;
        this.path = [];
        this.consecutiveStuckCount = 0;
      }
      if (
        this.repathTimer <= 0 ||
        this.path.length === 0 ||
        lockedChanged ||
        (this.minDynamicRepathCooldown <= 0 && isBodyBlocked)
      ) {
        const nextWp = PATROL_WAYPOINTS[this.waypointIdx % PATROL_WAYPOINTS.length];
        activeGoalUnitsX = nextWp.x;
        activeGoalUnitsY = nextWp.y;
        this.repathTimer = 0.65;
        this.minDynamicRepathCooldown = 0.12;
        this.lastLockedCount = lockedDoors.size;
        this.path = this.navGrid.findPath(pUnitsX, pUnitsY, nextWp.x, nextWp.y, lockedDoors);
      }
    }

    // Safe waypoint advancement with line-of-clearance smoothing
    while (this.path.length > 0) {
      const step = this.path[0];
      const distToStepPx = Math.hypot(step.x * UNIT_PX - bx, step.y * UNIT_PX - by);
      if (distToStepPx < 14 && this.path.length > 1) {
        this.path.shift();
        continue;
      }
      if (this.path.length >= 2) {
        const nextStep = this.path[1];
        if (this.navGrid.hasWalkableLine(pUnitsX, pUnitsY, nextStep.x, nextStep.y, 0.58, lockedDoors)) {
          this.path.shift();
          continue;
        }
      }
      break;
    }

    let targetX = bx;
    let targetY = by;
    if (
      isChasing &&
      this.navGrid.hasWalkableLine(pUnitsX, pUnitsY, playerUnitsX, playerUnitsY, 0.58, lockedDoors)
    ) {
      targetX = playerX;
      targetY = playerY;
    } else if (this.path.length > 0) {
      targetX = this.path[0].x * UNIT_PX;
      targetY = this.path[0].y * UNIT_PX;
    } else {
      const rec = this.navGrid.findRecoveryPoint(pUnitsX, pUnitsY, lockedDoors);
      targetX = rec.x * UNIT_PX;
      targetY = rec.y * UNIT_PX;
    }

    const speed = isChasing ? 236 : 126;

    // Stuck detection & automatic detour/waypoint recovery
    this.sampleTimer += dt;
    if (this.sampleTimer >= 0.34) {
      const movedPx = Math.hypot(bx - this.sampleAnchorX, by - this.sampleAnchorY);
      this.sampleAnchorX = bx;
      this.sampleAnchorY = by;
      this.sampleTimer = 0;

      if (movedPx < 8) {
        this.consecutiveStuckCount += 1;
        const rec = this.navGrid.findRecoveryPoint(pUnitsX, pUnitsY, lockedDoors);
        const rxPx = rec.x * UNIT_PX;
        const ryPx = rec.y * UNIT_PX;
        const rdx = rxPx - bx;
        const rdy = ryPx - by;
        const rLen = Math.hypot(rdx, rdy);
        if (rLen > 1) {
          const step = Math.min(6, rLen);
          this.sprite.setPosition(
            this.sprite.x + (rdx / rLen) * step,
            this.sprite.y + (rdy / rLen) * step
          );
          this.recoveryVx = (rdx / rLen) * speed;
          this.recoveryVy = (rdy / rLen) * speed;
          this.recoverySlideTimer = 0.18;
        }

        if (!isChasing && this.consecutiveStuckCount >= 2) {
          // Skip obstructed patrol waypoint and pick the next corridor leg
          this.waypointIdx = (this.waypointIdx + 1) % PATROL_WAYPOINTS.length;
          const nextWp = PATROL_WAYPOINTS[this.waypointIdx];
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
          lockedDoors
        );
      } else {
        this.consecutiveStuckCount = 0;
      }
    }

    if (this.recoverySlideTimer > 0) {
      this.recoverySlideTimer = Math.max(0, this.recoverySlideTimer - dt);
      body.setVelocity(this.recoveryVx, this.recoveryVy);
    } else {
      const dx = targetX - bx;
      const dy = targetY - by;
      const len = Math.hypot(dx, dy);
      if (len > 2) {
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    const justDetected = this.pendingInitialDetection;
    this.pendingInitialDetection = false;

    return {
      triggeredDetention: false,
      justDetectedViolation: justDetected,
      isPursuing: this.pursuingInfractionTimer > 0,
    };
  }
}
