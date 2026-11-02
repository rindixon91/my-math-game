import Phaser from 'phaser';
import { GameState, GameStateManager } from './GameState';
import { ControlMode } from './inputPlatform';
import { PLAYER_START_UNITS, UNIT_PX } from './MapLayout';

export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly jumpShadow: Phaser.GameObjects.Ellipse;
  private gameState: GameStateManager;

  public facingX = 0;
  public facingY = -1;
  public isMoving = false;
  public isSprinting = false;
  public lookOffsetX = 0;
  public lookOffsetY = 0;

  private controlMode: ControlMode = 'desktop';
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualSprint = false;

  private walkDistance = 0;
  private jumpHopTimer = 0;
  private explorationJumpCooldown = 0;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;

  constructor(scene: Phaser.Scene, gameState: GameStateManager) {
    this.gameState = gameState;

    const startX = PLAYER_START_UNITS.x * UNIT_PX;
    const startY = PLAYER_START_UNITS.y * UNIT_PX;

    this.jumpShadow = scene.add
      .ellipse(startX, startY + 14, 22, 9, 0x000000, 0.34)
      .setDepth(14)
      .setVisible(false);

    this.sprite = scene.physics.add.sprite(startX, startY, 'player_up');
    this.sprite.setDepth(15);
    this.sprite.setCollideWorldBounds(true);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 22);
    body.setOffset(9, 18);

    const normalizeCode = (e: KeyboardEvent): string => {
      if (e.code) return e.code;
      const k = e.key?.toLowerCase();
      if (k === 'w') return 'KeyW';
      if (k === 'a') return 'KeyA';
      if (k === 's') return 'KeyS';
      if (k === 'd') return 'KeyD';
      if (k === 'e') return 'KeyE';
      if (k === 'p') return 'KeyP';
      if (k === 'm') return 'KeyM';
      if (k === ' ') return 'Space';
      return e.key || '';
    };

    this.onKeyDownBound = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const code = normalizeCode(e);
      if (!this.heldKeys.has(code)) {
        this.justPressedKeys.add(code);
      }
      this.heldKeys.add(code);

      if (
        code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        e.preventDefault();
      }
    };

    this.onKeyUpBound = (e: KeyboardEvent) => {
      this.heldKeys.delete(normalizeCode(e));
    };

    this.onBlurBound = () => {
      this.heldKeys.clear();
      this.justPressedKeys.clear();
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.virtualSprint = false;
    };

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    document.addEventListener('visibilitychange', this.onBlurBound);
  }

  public setControlMode(mode: ControlMode): void {
    if (this.controlMode === mode) return;
    this.controlMode = mode;
    if (mode === 'desktop') {
      this.virtualMoveX = 0;
      this.virtualMoveY = 0;
      this.virtualSprint = false;
    }
  }

  public setVirtualMove(nx: number, ny: number): void {
    this.virtualMoveX = Math.max(-1, Math.min(1, nx));
    this.virtualMoveY = Math.max(-1, Math.min(1, ny));
  }

  public setVirtualSprint(active: boolean): void {
    this.virtualSprint = active;
  }

  public triggerVirtualPress(code: 'Space' | 'KeyE'): void {
    this.justPressedKeys.add(code);
  }

  public consumeJustPressed(code: string): boolean {
    if (this.justPressedKeys.has(code)) {
      this.justPressedKeys.delete(code);
      return true;
    }
    return false;
  }

  public clearTransientPresses(): void {
    this.justPressedKeys.clear();
  }

  public clearAllInputs(): void {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.stopMotion();
  }

  public stopMotion(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
    }
    this.isMoving = false;
    this.isSprinting = false;
    if (this.jumpHopTimer <= 0) {
      this.sprite.setScale(1, 1);
      this.jumpShadow.setVisible(false);
    }
  }

  public triggerJumpHop(): void {
    this.jumpHopTimer = 0.28;
    this.sprite.setScale(0.9, 1.24);
  }

  public tryExplorationJump(): boolean {
    if (this.explorationJumpCooldown > 0) return false;
    this.explorationJumpCooldown = 0.36;
    this.jumpHopTimer = 0.32;
    this.sprite.setScale(1.24, 1.28);
    return true;
  }

  public resetToStart(): void {
    this.sprite.setPosition(PLAYER_START_UNITS.x * UNIT_PX, PLAYER_START_UNITS.y * UNIT_PX);
    this.facingX = 0;
    this.facingY = -1;
    this.lookOffsetX = 0;
    this.lookOffsetY = 0;
    this.explorationJumpCooldown = 0;
    this.jumpHopTimer = 0;
    this.jumpShadow.setVisible(false);
    this.sprite.setRotation(0);
    this.sprite.setTexture('player_up');
    this.sprite.setAlpha(1);
    this.clearAllInputs();
  }

  public teleportToUnits(ux: number, uy: number): void {
    this.sprite.setPosition(ux * UNIT_PX, uy * UNIT_PX);
    this.stopMotion();
  }

  public update(dt: number, invulnerabilityRemaining: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    if (this.explorationJumpCooldown > 0) {
      this.explorationJumpCooldown = Math.max(0, this.explorationJumpCooldown - dt);
    }

    // Invulnerability blink visual
    if (invulnerabilityRemaining > 0) {
      this.sprite.setAlpha(Math.sin(invulnerabilityRemaining * 28) > 0 ? 0.42 : 0.95);
    } else if (this.sprite.alpha !== 1) {
      this.sprite.setAlpha(1);
    }

    // Jump hop arc + ground shadow cue
    if (this.jumpHopTimer > 0) {
      this.jumpHopTimer = Math.max(0, this.jumpHopTimer - dt);
      const hopArc = Math.sin((this.jumpHopTimer / 0.32) * Math.PI);
      const targetScale = 1 + hopArc * 0.24;
      this.sprite.scaleX += (targetScale - this.sprite.scaleX) * Math.min(1, dt * 18);
      this.sprite.scaleY += (targetScale - this.sprite.scaleY) * Math.min(1, dt * 18);
      this.jumpShadow
        .setPosition(this.sprite.x, this.sprite.y + 14 + hopArc * 8)
        .setScale(1 - hopArc * 0.28)
        .setVisible(true);
    } else if (this.jumpShadow.visible) {
      this.jumpShadow.setVisible(false);
    }

    if (!this.gameState.canPlayerMove()) {
      const curState = this.gameState.getState();
      if (curState === GameState.PLAYTIME_CHALLENGE || curState === GameState.PRINCIPAL_DETENTION) {
        this.gameState.updateStamina(dt, false, false);
      }
      this.lookOffsetX *= Math.exp(-8 * dt);
      this.lookOffsetY *= Math.exp(-8 * dt);
      this.stopMotion();
      return;
    }

    let kbX = 0;
    let kbY = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) kbY -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) kbY += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) kbX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) kbX += 1;

    let moveX = 0;
    let moveY = 0;
    let moveMag = 0;

    if (kbX !== 0 || kbY !== 0) {
      const kbLen = Math.hypot(kbX, kbY);
      moveX = kbX / kbLen;
      moveY = kbY / kbLen;
      moveMag = 1;
    } else {
      const vLen = Math.hypot(this.virtualMoveX, this.virtualMoveY);
      if (vLen > 0.02) {
        moveX = this.virtualMoveX / vLen;
        moveY = this.virtualMoveY / vLen;
        moveMag = Math.min(1, vLen);
      }
    }

    const moving = moveMag > 0.02;
    this.isMoving = moving;

    // Gentle movement-direction sightline pan (zero mouse rotation or cursor-driven screen movement)
    const targetLookX = moving ? moveX * 22 : 0;
    const targetLookY = moving ? moveY * 16 : 0;
    const lookBlend = Math.min(1, dt * 7);
    this.lookOffsetX += (targetLookX - this.lookOffsetX) * lookBlend;
    this.lookOffsetY += (targetLookY - this.lookOffsetY) * lookBlend;

    const wantsSprint =
      this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight') || this.virtualSprint;
    const sprinting = this.gameState.updateStamina(dt, moving, wantsSprint);
    this.isSprinting = sprinting;

    if (!moving) {
      body.setVelocity(0, 0);
      if (this.jumpHopTimer <= 0) {
        this.sprite.setScale(1, 1);
      }
      return;
    }

    this.facingX = moveX;
    this.facingY = moveY;

    const maxSpeed = sprinting ? 276 : 174;
    const speed = maxSpeed * moveMag;
    body.setVelocity(moveX * speed, moveY * speed);

    // Upright top-down 4-directional sprite facing
    if (Math.abs(moveX) > Math.abs(moveY)) {
      this.sprite.setTexture(moveX > 0 ? 'player_right' : 'player_left');
    } else {
      this.sprite.setTexture(moveY > 0 ? 'player_down' : 'player_up');
    }

    // Distance-synced walking bob & subtle squash-stretch (unless mid-jump hop)
    this.walkDistance += speed * dt;
    if (this.jumpHopTimer <= 0) {
      const stride = Math.sin(this.walkDistance * 0.085);
      this.sprite.setScale(1 + stride * 0.05, 1 - Math.abs(stride) * 0.06);
    }
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    document.removeEventListener('visibilitychange', this.onBlurBound);
    this.jumpShadow.destroy();
    this.sprite.destroy();
  }
}
