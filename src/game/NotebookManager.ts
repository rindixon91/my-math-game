import Phaser from 'phaser';
import { GameStateManager } from './GameState';
import { NOTEBOOK_SPAWNS, UNIT_PX } from './MapLayout';
import { getDifficultyLabel, getQuestionByNotebookId } from './QuestionDatabase';

export interface NotebookEntity {
  notebookId: number;
  roomName: string;
  xPx: number;
  yPx: number;
  sprite: Phaser.GameObjects.Image;
  badgeText: Phaser.GameObjects.Text;
  cooldownGraphics: Phaser.GameObjects.Graphics;
}

export class NotebookManager {
  private scene: Phaser.Scene;
  private gameState: GameStateManager;
  private entities: NotebookEntity[] = [];

  constructor(scene: Phaser.Scene, gameState: GameStateManager) {
    this.scene = scene;
    this.gameState = gameState;
  }

  public spawnNotebooks(): void {
    this.destroyAll();

    for (const spawn of NOTEBOOK_SPAWNS) {
      const q = getQuestionByNotebookId(spawn.notebookId);
      const xPx = spawn.x * UNIT_PX;
      const yPx = spawn.y * UNIT_PX;

      // Desk pedestal under notebook
      this.scene.add
        .rectangle(xPx, yPx + 4, 42, 32, 0x92400e)
        .setStrokeStyle(2, 0x451a03)
        .setDepth(4);

      const sprite = this.scene.add.image(xPx, yPx, 'notebook_active').setDepth(7);

      const badgeText = this.scene.add
        .text(xPx, yPx - 26, `#${spawn.notebookId} · ${getDifficultyLabel(q.difficulty)}`, {
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15,23,42,0.85)',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(12);

      const cooldownGraphics = this.scene.add.graphics().setDepth(12);

      this.entities.push({
        notebookId: spawn.notebookId,
        roomName: spawn.roomName,
        xPx,
        yPx,
        sprite,
        badgeText,
        cooldownGraphics,
      });
    }
  }

  public getNearestInteractableNotebook(playerX: number, playerY: number): NotebookEntity | null {
    let best: NotebookEntity | null = null;
    let bestDist = 56;
    for (const ent of this.entities) {
      const status = this.gameState.getNotebookStatus(ent.notebookId);
      if (status?.completed) continue;
      const dist = Math.hypot(ent.xPx - playerX, ent.yPx - playerY);
      if (dist <= bestDist) {
        bestDist = dist;
        best = ent;
      }
    }
    return best;
  }

  public update(timeSec: number): void {
    for (const ent of this.entities) {
      const status = this.gameState.getNotebookStatus(ent.notebookId);
      const q = getQuestionByNotebookId(ent.notebookId);
      ent.cooldownGraphics.clear();

      if (!status) continue;

      if (status.completed) {
        ent.sprite.setTexture('notebook_done');
        ent.sprite.setPosition(ent.xPx, ent.yPx);
        ent.sprite.setAlpha(0.75);
        ent.badgeText.setText(`#${ent.notebookId} SELESAI`);
        ent.badgeText.setColor('#86efac');
      } else if (status.cooldownRemaining > 0) {
        ent.sprite.setTexture('notebook_cooldown');
        ent.sprite.setPosition(ent.xPx, ent.yPx);
        ent.sprite.setAlpha(0.95);
        ent.badgeText.setText(`DIKUNCI ${status.cooldownRemaining.toFixed(1)}s`);
        ent.badgeText.setColor('#fca5a5');

        // Visible radial cooldown arc around notebook
        const ratio = Math.min(1, status.cooldownRemaining / 10);
        const startAng = -Math.PI / 2;
        ent.cooldownGraphics.lineStyle(3, 0xef4444, 0.95);
        ent.cooldownGraphics.beginPath();
        ent.cooldownGraphics.arc(
          ent.xPx,
          ent.yPx,
          22,
          startAng,
          startAng + Math.PI * 2 * ratio,
          false
        );
        ent.cooldownGraphics.strokePath();
      } else {
        ent.sprite.setTexture('notebook_active');
        ent.sprite.setAlpha(1);
        const bob = Math.sin(timeSec * 3.8 + ent.notebookId) * 3;
        ent.sprite.setPosition(ent.xPx, ent.yPx + bob);
        ent.badgeText.setText(`#${ent.notebookId} · ${getDifficultyLabel(q.difficulty)}`);
        ent.badgeText.setColor('#fef08a');
      }
    }
  }

  public destroyAll(): void {
    for (const ent of this.entities) {
      ent.sprite.destroy();
      ent.badgeText.destroy();
      ent.cooldownGraphics.destroy();
    }
    this.entities = [];
  }
}
