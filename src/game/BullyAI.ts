import Phaser from 'phaser';
import { GameState, GameStateManager } from './GameState';
import {
  BULLY_HALLWAY_SPOTS,
  BULLY_MIN_NPC_DIST_UNITS,
  BULLY_MIN_PLAYER_DIST_UNITS,
  BullyHallwaySpot,
  pickRandomBullySpot,
  UNIT_PX,
} from './MapLayout';

export {
  BULLY_HALLWAY_SPOTS,
  BULLY_MIN_NPC_DIST_UNITS,
  BULLY_MIN_PLAYER_DIST_UNITS,
  pickRandomBullySpot,
};
export type { BullyHallwaySpot };

export class BullyAI {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly barrierGroup: Phaser.Physics.Arcade.StaticGroup;
  private blockerCollider: Phaser.Physics.Arcade.Image;
  private barrierGraphics: Phaser.GameObjects.Graphics;
  private gameState: GameStateManager;

  private currentSpot: BullyHallwaySpot = BULLY_HALLWAY_SPOTS[4];
  private lastSpotId: string | null = null;
  private activeInHall = false;
  private respawnTimer = 3.5;
  private boredomRelocateTimer = 34;
  private confrontTimer = 0;
  private noItemBarkCooldown = 0;

  constructor(scene: Phaser.Scene, gameState: GameStateManager) {
    this.gameState = gameState;

    this.barrierGraphics = scene.add.graphics().setDepth(14);
    this.barrierGroup = scene.physics.add.staticGroup();

    const spot = this.currentSpot;
    this.blockerCollider = this.barrierGroup.create(
      spot.x * UNIT_PX,
      spot.y * UNIT_PX,
      'pixel_invisible'
    ) as Phaser.Physics.Arcade.Image;
    this.blockerCollider.setOrigin(0.5, 0.5);
    this.blockerCollider.setVisible(false);

    this.sprite = scene.physics.add.sprite(spot.x * UNIT_PX, spot.y * UNIT_PX, 'enemy_bully');
    this.sprite.setDepth(15);
    this.sprite.setImmovable(true);
    const sBody = this.sprite.body as Phaser.Physics.Arcade.Body;
    sBody.enable = false;

    this.setBarrierActive(false);
  }

  public reset(
    playerUnits: { x: number; y: number } = { x: 74, y: 136 },
    npcUnitsList: readonly { x: number; y: number }[] = []
  ): void {
    this.lastSpotId = null;
    this.confrontTimer = 0;
    this.noItemBarkCooldown = 0;
    // Spawn unpredictably in a random valid hallway right away on a new run
    const chosen = pickRandomBullySpot(
      BULLY_HALLWAY_SPOTS,
      playerUnits,
      npcUnitsList,
      null
    );
    this.spawnAtSpot(chosen);
  }

  private setBarrierActive(active: boolean): void {
    this.activeInHall = active;
    const body = this.blockerCollider.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.enable = active;
    }
    this.sprite.setVisible(active);
    if (!active) {
      this.barrierGraphics.clear();
    }
  }

  private spawnAtSpot(spot: BullyHallwaySpot): void {
    this.currentSpot = spot;
    this.lastSpotId = spot.id;

    const cx = spot.x * UNIT_PX;
    const cy = spot.y * UNIT_PX;
    const spanPx = spot.spanUnits * UNIT_PX - 4; // Spans the entire 12-unit hallway wall-to-wall
    const thickPx = 36;
    const wPx = spot.corridorAxis === 'VERTICAL' ? spanPx : thickPx;
    const hPx = spot.corridorAxis === 'VERTICAL' ? thickPx : spanPx;

    this.blockerCollider.setPosition(cx, cy);
    this.blockerCollider.setDisplaySize(wPx, hPx);
    this.blockerCollider.refreshBody();
    const bBody = this.blockerCollider.body as Phaser.Physics.Arcade.StaticBody;
    bBody.enable = true;

    this.sprite.setPosition(cx, cy);
    this.sprite.setVisible(true);
    this.sprite.setAlpha(1);
    this.sprite.setScale(1.06, 1.06);

    // Draw clear hallway blockade stance lines across the entire corridor width
    this.barrierGraphics.clear();
    this.barrierGraphics.fillStyle(0xea580c, 0.22);
    this.barrierGraphics.fillRect(cx - wPx * 0.5, cy - hPx * 0.5, wPx, hPx);
    this.barrierGraphics.lineStyle(3, 0xf97316, 0.78);
    if (spot.corridorAxis === 'VERTICAL') {
      this.barrierGraphics.lineBetween(cx - wPx * 0.5 + 2, cy, cx + wPx * 0.5 - 2, cy);
    } else {
      this.barrierGraphics.lineBetween(cx, cy - hPx * 0.5 + 2, cx, cy + hPx * 0.5 - 2);
    }

    this.activeInHall = true;
    this.respawnTimer = 0;
    this.boredomRelocateTimer = 28 + Math.random() * 12;
    this.confrontTimer = 0;
  }

  public vanishAndScheduleRespawn(respawnSeconds?: number): void {
    this.activeInHall = false;
    // Unpredictable cooldown between 18s and 30s unless explicitly overridden
    this.respawnTimer = respawnSeconds ?? 18 + Math.random() * 12;
    this.confrontTimer = 0;

    const bBody = this.blockerCollider.body as Phaser.Physics.Arcade.StaticBody | null;
    if (bBody) bBody.enable = false;
    this.barrierGraphics.clear();

    // Quick retro shrink-poof animation
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0.1,
      scaleY: 1.5,
      alpha: 0,
      duration: 240,
      onComplete: () => {
        if (!this.activeInHall) {
          this.sprite.setVisible(false);
        }
      },
    });
  }

  private distanceToBlockadePx(xPx: number, yPx: number): number {
    const cx = this.currentSpot.x * UNIT_PX;
    const cy = this.currentSpot.y * UNIT_PX;
    const halfSpan = (this.currentSpot.spanUnits * UNIT_PX) * 0.5;
    if (this.currentSpot.corridorAxis === 'VERTICAL') {
      const clampedX = Math.max(cx - halfSpan, Math.min(cx + halfSpan, xPx));
      return Math.hypot(xPx - clampedX, yPx - cy);
    } else {
      const clampedY = Math.max(cy - halfSpan, Math.min(cy + halfSpan, yPx));
      return Math.hypot(xPx - cx, yPx - clampedY);
    }
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    carriedItemCount: number,
    npcPositionsPx: readonly { x: number; y: number }[]
  ): { triggeredSteal: boolean; blockedNoItems: boolean } {
    if (!this.gameState.isBaldiPursuitActive()) {
      return { triggeredSteal: false, blockedNoItems: false };
    }

    if (this.noItemBarkCooldown > 0) {
      this.noItemBarkCooldown = Math.max(0, this.noItemBarkCooldown - dt);
    }

    if (!this.activeInHall) {
      this.respawnTimer = Math.max(0, this.respawnTimer - dt);
      if (this.respawnTimer <= 0) {
        const playerUnits = { x: playerX / UNIT_PX, y: playerY / UNIT_PX };
        const npcUnits = npcPositionsPx.map((p) => ({ x: p.x / UNIT_PX, y: p.y / UNIT_PX }));
        const nextSpot = pickRandomBullySpot(
          BULLY_HALLWAY_SPOTS,
          playerUnits,
          npcUnits,
          this.lastSpotId
        );
        this.spawnAtSpot(nextSpot);
      }
      return { triggeredSteal: false, blockedNoItems: false };
    }

    const distToBlockade = this.distanceToBlockadePx(playerX, playerY);

    // Player approaches Bully's full-hallway blockade
    if (distToBlockade < 44) {
      if (carriedItemCount > 0) {
        // Brief physical block beat so player feels stopped, then Bully seizes all carried items & vanishes
        this.confrontTimer += dt;
        if (this.confrontTimer >= 0.16) {
          this.confrontTimer = 0;
          return { triggeredSteal: true, blockedNoItems: false };
        }
      } else if (this.noItemBarkCooldown <= 0) {
        this.noItemBarkCooldown = 4.2;
        return { triggeredSteal: false, blockedNoItems: true };
      }
    } else {
      this.confrontTimer = 0;
      // If unvisited for a while, relocate unpredictably to a different hallway
      this.boredomRelocateTimer -= dt;
      if (this.boredomRelocateTimer <= 0) {
        this.vanishAndScheduleRespawn(7 + Math.random() * 6);
      }
    }

    return { triggeredSteal: false, blockedNoItems: false };
  }
}
