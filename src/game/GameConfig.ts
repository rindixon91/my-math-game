import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { GameScene } from './GameScene';
import { GameStateManager } from './GameState';

export interface PhaserBridge {
  game: Phaser.Game;
  scene: GameScene;
  destroy: () => void;
}

function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function createBaldiPhaserGame(
  parentElement: HTMLElement,
  gameState: GameStateManager,
  audioManager: AudioManager
): PhaserBridge {
  const scene = new GameScene(gameState, audioManager);
  const isSoftware = detectSoftwareGl();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    parent: parentElement,
    width: parentElement.clientWidth || window.innerWidth || 1280,
    height: parentElement.clientHeight || window.innerHeight || 720,
    backgroundColor: '#1b5e20',
    pixelArt: true,
    antialias: false,
    fps: isSoftware
      ? { target: 24, forceSetTimeOut: true }
      : { target: 60 },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [scene],
  };

  const game = new Phaser.Game(config);

  return {
    game,
    scene,
    destroy: () => {
      game.destroy(true);
    },
  };
}
