import Phaser from 'phaser';

/**
 * Generates crisp retro-pixelated 2D RPG textures for tiles, props, items,
 * notebooks, and characters onto Phaser's TextureManager (100% procedural, zero 404s).
 */
export function registerProceduralTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('tile_corridor')) return;

  makeCanvasTexture(scene, 'pixel_invisible', 4, 4, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 4, 4);
  });

  // 1. FLOOR TILES (64x64 repeatable patterns)
  makeCanvasTexture(scene, 'tile_corridor', 64, 64, (ctx) => {
    ctx.fillStyle = '#e7e5dc';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#d1cec2';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 32, 32);
    ctx.strokeRect(32, 0, 32, 32);
    ctx.strokeRect(0, 32, 32, 32);
    ctx.strokeRect(32, 32, 32, 32);
    // Subtle retro linoleum speckles
    ctx.fillStyle = '#c2bfb0';
    ctx.fillRect(8, 12, 2, 2);
    ctx.fillRect(44, 18, 2, 2);
    ctx.fillRect(22, 48, 2, 2);
    ctx.fillRect(52, 54, 2, 2);
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(18, 8, 2, 2);
    ctx.fillRect(40, 42, 2, 2);
  });

  makeCanvasTexture(scene, 'tile_classroom_blue', 64, 64, (ctx) => {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#bfdbfe';
    ctx.fillRect(2, 2, 28, 28);
    ctx.fillRect(34, 34, 28, 28);
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(34, 2, 28, 28);
    ctx.fillRect(2, 34, 28, 28);
  });

  makeCanvasTexture(scene, 'tile_classroom_wood', 64, 64, (ctx) => {
    ctx.fillStyle = '#c89d6c';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#a67b4b';
    ctx.lineWidth = 2;
    for (let y = 0; y < 64; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(32, 16);
    ctx.moveTo(16, 16);
    ctx.lineTo(16, 32);
    ctx.moveTo(48, 32);
    ctx.lineTo(48, 48);
    ctx.moveTo(24, 48);
    ctx.lineTo(24, 64);
    ctx.stroke();
  });

  makeCanvasTexture(scene, 'tile_faculty_green', 64, 64, (ctx) => {
    ctx.fillStyle = '#bbf7d0';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);
    ctx.strokeStyle = '#6ee7b7';
    ctx.strokeRect(0, 0, 64, 64);
  });

  makeCanvasTexture(scene, 'tile_canteen_checker', 64, 64, (ctx) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);
  });

  makeCanvasTexture(scene, 'tile_detention_slate', 64, 64, (ctx) => {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 30, 30);
    ctx.strokeRect(33, 1, 30, 30);
    ctx.strokeRect(1, 33, 30, 30);
    ctx.strokeRect(33, 33, 30, 30);
  });

  makeCanvasTexture(scene, 'tile_lab_tile', 64, 64, (ctx) => {
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 32, 32);
    ctx.strokeRect(32, 32, 32, 32);
  });

  makeCanvasTexture(scene, 'tile_grass', 64, 64, (ctx) => {
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#388e3c';
    for (let i = 0; i < 20; i++) {
      const gx = (i * 19) % 60;
      const gy = (i * 29) % 60;
      ctx.fillRect(gx, gy, 4, 4);
    }
    ctx.fillStyle = '#1b5e20';
    for (let i = 0; i < 12; i++) {
      const gx = (i * 31 + 7) % 60;
      const gy = (i * 17 + 11) % 60;
      ctx.fillRect(gx, gy, 3, 5);
    }
  });

  // 2. OUTDOOR TREE
  makeCanvasTexture(scene, 'prop_tree', 64, 64, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(32, 54, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(27, 40, 10, 15);
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.arc(32, 28, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(28, 24, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(24, 20, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. PLAYER SPRITES (down, up, left, right)
  (['down', 'up', 'left', 'right'] as const).forEach((dir) => {
    makeCanvasTexture(scene, `player_${dir}`, 40, 44, (ctx) => {
      // Contact shadow
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(20, 39, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(13, 29, 6, 10);
      ctx.fillRect(21, 29, 6, 10);

      // Backpack (visible on up/left/right)
      if (dir !== 'down') {
        ctx.fillStyle = '#b45309';
        const bx = dir === 'left' ? 24 : dir === 'right' ? 6 : 11;
        ctx.fillRect(bx, 17, dir === 'up' ? 18 : 10, 13);
      }

      // School uniform shirt (crisp white + blue vest)
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(10, 16, 20, 15);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(16, 16, 8, 7);
      // Red school tie on front
      if (dir === 'down') {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(19, 18, 2, 9);
      }

      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(20, 11, 9, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(20, 8, 9.2, Math.PI, Math.PI * 2);
      ctx.fill();
      if (dir === 'up') {
        ctx.fillRect(11, 6, 18, 10);
      }

      // Eyes
      ctx.fillStyle = '#0f172a';
      if (dir === 'down') {
        ctx.fillRect(16, 10, 2.5, 3);
        ctx.fillRect(21.5, 10, 2.5, 3);
      } else if (dir === 'left') {
        ctx.fillRect(13, 10, 2.5, 3);
      } else if (dir === 'right') {
        ctx.fillRect(24, 10, 2.5, 3);
      }
    });
  });

  // 4. BALDI SPRITE (Green long-sleeve sweater, blue trousers, bald head, wooden ruler!)
  makeCanvasTexture(scene, 'enemy_baldi', 48, 54, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(24, 48, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue trousers
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(16, 34, 6, 14);
    ctx.fillRect(26, 34, 6, 14);

    // Bright green sweater
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(12, 18, 24, 18);
    // Arms
    ctx.fillRect(7, 19, 5, 14);
    ctx.fillRect(36, 19, 5, 14);

    // Iconic wooden ruler in right hand!
    ctx.fillStyle = '#eab308';
    ctx.fillRect(38, 6, 5, 24);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.strokeRect(38, 6, 5, 24);

    // Bald head + single hair strand + red lips
    ctx.fillStyle = '#e5c298';
    ctx.beginPath();
    ctx.ellipse(24, 11, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(22, 2);
    ctx.lineTo(27, 4);
    ctx.stroke();

    // Wide staring eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(19, 8, 4, 4);
    ctx.fillRect(25, 8, 4, 4);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(20.5, 9.5, 2, 2);
    ctx.fillRect(26.5, 9.5, 2, 2);

    // Red lips
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(20, 15, 8, 2.5);
  });

  // 4B. BALDI FURIOUS FINAL FORM SPRITE (Glowing red eyes, angry brows, snarling grimace, crimson aura ruler)
  makeCanvasTexture(scene, 'enemy_baldi_furious', 48, 54, (ctx) => {
    // Crimson rage shadow
    ctx.fillStyle = 'rgba(220, 38, 38, 0.48)';
    ctx.beginPath();
    ctx.ellipse(24, 48, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue trousers
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(16, 34, 6, 14);
    ctx.fillRect(26, 34, 6, 14);

    // Darkened tense green sweater with red trim
    ctx.fillStyle = '#15803d';
    ctx.fillRect(12, 18, 24, 18);
    ctx.fillRect(7, 17, 5, 15);
    ctx.fillRect(36, 15, 5, 16);

    // Raised furious wooden ruler with red edge
    ctx.fillStyle = '#facc15';
    ctx.fillRect(38, 2, 6, 26);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(38, 2, 6, 26);

    // Flushed angry head
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(24, 11, 9.5, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sharp V-angled furious eyebrows
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(17, 6);
    ctx.lineTo(23, 8.5);
    ctx.moveTo(31, 6);
    ctx.lineTo(25, 8.5);
    ctx.stroke();

    // Glowing crimson eyes
    ctx.fillStyle = '#09090b';
    ctx.fillRect(18.5, 8.5, 4.5, 4);
    ctx.fillRect(25, 8.5, 4.5, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(20, 9.5, 2, 2);
    ctx.fillRect(26.5, 9.5, 2, 2);

    // Furious snarling grimace
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(18.5, 14.5, 11, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 15, 2, 1.5);
    ctx.fillRect(23, 15, 2, 1.5);
    ctx.fillRect(26, 15, 2, 1.5);
  });

  // 5. PRINCIPAL OF THE THING (Charcoal sweater, jeans, raised finger)
  makeCanvasTexture(scene, 'enemy_principal', 48, 54, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(24, 48, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jeans & brown socks/shoes
    ctx.fillStyle = '#475569';
    ctx.fillRect(16, 34, 6, 13);
    ctx.fillRect(26, 34, 6, 13);

    // Dark charcoal sweater
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(12, 18, 24, 17);
    ctx.fillRect(8, 12, 5, 14); // Raised arm pointing up!
    ctx.fillRect(35, 19, 5, 13);

    // Raised pointing finger
    ctx.fillStyle = '#d6a87c';
    ctx.fillRect(9, 7, 3, 6);

    // Head + brown hair + whistling O-mouth
    ctx.fillStyle = '#d6a87c';
    ctx.beginPath();
    ctx.arc(24, 11, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(24, 8, 8.8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 9, 2, 2);
    ctx.fillRect(26, 9, 2, 2);
    ctx.beginPath();
    ctx.arc(24, 15, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 6. PLAYTIME (Red dress, blue pants, messy scribbled hair, jump rope arc)
  makeCanvasTexture(scene, 'enemy_playtime', 50, 52, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(25, 46, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jump rope loop overhead
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(25, 24, 21, Math.PI * 0.85, Math.PI * 0.15, false);
    ctx.stroke();

    // Blue trousers + brown shoes
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(17, 34, 6, 10);
    ctx.fillRect(27, 34, 6, 10);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(15, 43, 8, 4);
    ctx.fillRect(27, 43, 8, 4);

    // Bright red dress
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(15, 19);
    ctx.lineTo(35, 19);
    ctx.lineTo(40, 35);
    ctx.lineTo(10, 35);
    ctx.closePath();
    ctx.fill();

    // Head + scribbled brown hair
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(25, 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(20 + i * 2, 8 + (i % 2) * 2, 5, 0, Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#09090b';
    ctx.fillRect(22, 10, 2, 3);
    ctx.fillRect(27, 10, 2, 3);
  });

  // 7. IT'S A BULLY (Large round orange torso, blue arms blocking corridor)
  makeCanvasTexture(scene, 'enemy_bully', 58, 58, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(29, 52, 19, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue legs & wide blocking arms
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(19, 39, 7, 13);
    ctx.fillRect(32, 39, 7, 13);
    ctx.fillRect(3, 22, 13, 6);
    ctx.fillRect(42, 22, 13, 6);

    // Big round orange body
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.ellipse(29, 29, 16, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.ellipse(27, 27, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#d6a87c';
    ctx.beginPath();
    ctx.arc(29, 11, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(21, 3, 16, 5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(25, 10, 2, 2);
    ctx.fillRect(32, 10, 2, 2);
  });

  // 8. NOTEBOOK TEXTURES (Active, Cooldown, Completed)
  makeCanvasTexture(scene, 'notebook_active', 32, 36, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(5, 6, 24, 28);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(4, 3, 24, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 8, 14, 9);
    // Spiral binding
    ctx.fillStyle = '#1e293b';
    for (let y = 5; y <= 29; y += 4) {
      ctx.fillRect(2, y, 4, 2);
    }
  });

  makeCanvasTexture(scene, 'notebook_cooldown', 32, 36, (ctx) => {
    ctx.fillStyle = '#475569';
    ctx.fillRect(4, 3, 24, 28);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(9, 9);
    ctx.lineTo(23, 25);
    ctx.moveTo(23, 9);
    ctx.lineTo(9, 25);
    ctx.stroke();
  });

  makeCanvasTexture(scene, 'notebook_done', 32, 36, (ctx) => {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(4, 3, 24, 28);
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(9, 17);
    ctx.lineTo(14, 23);
    ctx.lineTo(24, 10);
    ctx.stroke();
  });

  // 9. USABLE ITEMS & PROJECTILES
  makeCanvasTexture(scene, 'item_BSODA', 28, 32, (ctx) => {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(6, 4, 16, 24);
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(6, 3, 16, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 12, 12, 6);
  });

  makeCanvasTexture(scene, 'item_ZESTY_BAR', 32, 24, (ctx) => {
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(3, 5, 26, 14);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(7, 8, 18, 8);
  });

  makeCanvasTexture(scene, 'item_QUARTER', 26, 26, (ctx) => {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(13, 13, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  makeCanvasTexture(scene, 'item_SCISSORS', 28, 28, (ctx) => {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(7, 21);
    ctx.lineTo(22, 6);
    ctx.moveTo(21, 21);
    ctx.lineTo(6, 6);
    ctx.stroke();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(4, 18, 7, 7);
    ctx.strokeRect(17, 18, 7, 7);
  });

  makeCanvasTexture(scene, 'item_PRINCIPAL_KEYS', 28, 28, (ctx) => {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(10, 14, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(16, 12, 10, 4);
    ctx.fillRect(22, 16, 3, 4);
  });

  makeCanvasTexture(scene, 'item_DOOR_LOCK', 28, 28, (ctx) => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(14, 11, 6, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(6, 11, 16, 13);
  });

  makeCanvasTexture(scene, 'bsoda_wave', 56, 56, (ctx) => {
    const grad = ctx.createRadialGradient(28, 28, 4, 28, 28, 26);
    grad.addColorStop(0, 'rgba(191, 219, 254, 0.95)');
    grad.addColorStop(0.55, 'rgba(37, 99, 235, 0.85)');
    grad.addColorStop(1, 'rgba(29, 78, 216, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(28, 28, 26, 0, Math.PI * 2);
    ctx.fill();
  });
}

function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): void {
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, height);
  draw(ctx);
  tex.refresh();
}
