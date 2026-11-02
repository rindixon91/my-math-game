import Phaser from 'phaser';
import {
  ArchitecturalDoor,
  compileArchitecturalWalls,
  FURNITURE_PROPS,
  getZoneAtUnits,
  ITEM_SPAWNS,
  MAP_HEIGHT_UNITS,
  MAP_WIDTH_UNITS,
  SCHOOL_DOORS,
  SCHOOL_EXITS,
  SCHOOL_ZONES,
  SchoolExitSpec,
  SchoolNavGrid,
  UNIT_PX,
  VENDING_MACHINES,
  VendingMachineSpec,
  WallSegment,
} from './MapLayout';
import { ItemType } from './InventoryManager';

export interface LiveDoorInstance {
  spec: ArchitecturalDoor;
  visualClosed: Phaser.GameObjects.Container;
  visualOpen: Phaser.GameObjects.Rectangle;
  collider: Phaser.Physics.Arcade.Image;
  isOpen: boolean;
  isLocked: boolean;
  openTimer: number;
  lockTimer: number;
}

export interface LivePickupInstance {
  id: string;
  type: ItemType;
  sprite: Phaser.GameObjects.Image;
  xPx: number;
  yPx: number;
  collected: boolean;
}

export class MapManager {
  private scene: Phaser.Scene;
  public readonly walls: WallSegment[];
  public readonly navGrid: SchoolNavGrid;
  public readonly wallGroup: Phaser.Physics.Arcade.StaticGroup;
  public readonly propGroup: Phaser.Physics.Arcade.StaticGroup;
  public readonly doorColliderGroup: Phaser.Physics.Arcade.StaticGroup;
  public readonly playtimeRestrictedBarrierGroup: Phaser.Physics.Arcade.StaticGroup;

  private doors = new Map<string, LiveDoorInstance>();
  private lockedDoorIds = new Set<string>();
  private pickups: LivePickupInstance[] = [];
  private exitHighlightGraphics!: Phaser.GameObjects.Graphics;
  private highlightedExitId: string | null = null;
  private beaconPulse = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.walls = compileArchitecturalWalls(SCHOOL_ZONES, SCHOOL_DOORS);
    this.navGrid = new SchoolNavGrid(this.walls, FURNITURE_PROPS, VENDING_MACHINES);
    this.wallGroup = scene.physics.add.staticGroup();
    this.propGroup = scene.physics.add.staticGroup();
    this.doorColliderGroup = scene.physics.add.staticGroup();
    this.playtimeRestrictedBarrierGroup = scene.physics.add.staticGroup();
  }

  public buildSchoolWorld(): void {
    const worldW = MAP_WIDTH_UNITS * UNIT_PX;
    const worldH = MAP_HEIGHT_UNITS * UNIT_PX;
    this.scene.physics.world.setBounds(0, 0, worldW, worldH);

    // 0. Seamless exterior grass margin so rotated desktop cameras never expose empty corners near map edges
    this.scene.add
      .tileSprite(worldW * 0.5, worldH * 0.5, worldW + 2400, worldH + 2400, 'tile_grass')
      .setDepth(0);

    // 1. Pre-bake static grass, continuous floors, room labels, furniture, vending machines,
    //    and single-layer 0.8-unit walls into ONE crisp CanvasTexture for <1ms frame draws!
    this.bakeStaticSchoolFloorplan(worldW, worldH);
    this.scene.add.image(worldW * 0.5, worldH * 0.5, 'school_baked_floorplan').setDepth(1);

    // 2. Create exact 1:1 static physics collision bodies matching walls, furniture, and vending machines
    this.buildWallAndPropColliders();

    // 3. Interactive Doors inside actual wall openings
    this.buildDoors();

    // 4. Collectible items
    this.spawnWorldPickups();

    // 5. Exit highlight graphics layer
    this.exitHighlightGraphics = this.scene.add.graphics().setDepth(9);
  }

  private bakeStaticSchoolFloorplan(worldW: number, worldH: number): void {
    if (this.scene.textures.exists('school_baked_floorplan')) {
      this.scene.textures.remove('school_baked_floorplan');
    }
    const baked = this.scene.textures.createCanvas('school_baked_floorplan', worldW, worldH);
    if (!baked) return;
    const ctx = baked.getContext();

    const getTileCanvas = (key: string): HTMLCanvasElement | null => {
      const tex = this.scene.textures.get(key);
      const src = tex?.getSourceImage();
      return src instanceof HTMLCanvasElement ? src : null;
    };

    // A. Outdoor green schoolyard grass
    const grassTile = getTileCanvas('tile_grass');
    if (grassTile) {
      const pat = ctx.createPattern(grassTile, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, worldW, worldH);
      }
    } else {
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(0, 0, worldW, worldH);
    }

    // B. Continuous school floor across all connected corridors & rooms
    const styleToKey: Record<string, string> = {
      corridor: 'tile_corridor',
      classroom_blue: 'tile_classroom_blue',
      classroom_wood: 'tile_classroom_wood',
      faculty_green: 'tile_faculty_green',
      canteen_checker: 'tile_canteen_checker',
      detention_slate: 'tile_detention_slate',
      lab_tile: 'tile_lab_tile',
    };

    for (const zone of SCHOOL_ZONES) {
      const x = zone.x1 * UNIT_PX;
      const y = zone.y1 * UNIT_PX;
      const w = (zone.x2 - zone.x1) * UNIT_PX;
      const h = (zone.y2 - zone.y1) * UNIT_PX;

      const tileCanvas = getTileCanvas(styleToKey[zone.floorStyle] || 'tile_corridor');
      if (tileCanvas) {
        const pat = ctx.createPattern(tileCanvas, 'repeat');
        if (pat) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.clip();
          ctx.fillStyle = pat;
          ctx.fillRect(x, y, w, h);
          ctx.restore();
        }
      }

      // Room floor name label
      if (zone.kind !== 'CORRIDOR') {
        ctx.save();
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.fillStyle = zone.kind === 'FACULTY' ? 'rgba(20, 83, 45, 0.8)' : 'rgba(30, 41, 59, 0.78)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.name.toUpperCase(), x + w * 0.5, y + 20);
        ctx.restore();
      }

      // Classroom wall chalkboards
      if (zone.kind === 'CLASSROOM') {
        const boardX =
          zone.id === 'CLASSROOM_B'
            ? (zone.x2 - 0.8) * UNIT_PX - 4
            : (zone.x1 + 0.8) * UNIT_PX - 4;
        const boardY = ((zone.y1 + zone.y2) * 0.5) * UNIT_PX - 48;
        ctx.fillStyle = '#143622';
        ctx.fillRect(boardX, boardY, 8, 96);
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 2;
        ctx.strokeRect(boardX, boardY, 8, 96);
      }
    }

    // North-West Noise Phone prop
    ctx.fillStyle = '#facc15';
    ctx.fillRect(24 * UNIT_PX - 25, 5.5 * UNIT_PX - 8, 50, 16);
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 2;
    ctx.strokeRect(24 * UNIT_PX - 25, 5.5 * UNIT_PX - 8, 50, 16);
    ctx.fillStyle = '#422006';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TELEFON', 24 * UNIT_PX, 5.5 * UNIT_PX + 3);

    // Outdoor schoolyard trees
    const treeCanvas = getTileCanvas('prop_tree');
    const treeCoords = [
      [8, 16], [10, 30], [8, 76], [9, 108], [10, 134],
      [44, 6], [68, 6], [92, 6], [122, 6], [149, 18],
      [149, 48], [149, 74], [149, 114], [148, 138],
      [34, 148], [54, 148], [96, 148], [122, 148],
    ];
    if (treeCanvas) {
      for (const [tx, ty] of treeCoords) {
        ctx.drawImage(treeCanvas, tx * UNIT_PX - 32, ty * UNIT_PX - 32);
      }
    }

    // Exit Exterior Labels (UTARA, TIMUR, BARAT, SELATAN)
    ctx.save();
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText('KELUAR UTARA', 56 * UNIT_PX, 11.2 * UNIT_PX);
    ctx.fillText('KELUAR SELATAN', 74 * UNIT_PX, 151.2 * UNIT_PX);
    ctx.fillText('KELUAR BARAT', 11.5 * UNIT_PX, 86 * UNIT_PX);
    ctx.fillText('KELUAR TIMUR', 148.5 * UNIT_PX, 91 * UNIT_PX);
    ctx.restore();

    // C. Furniture & Vending Machines
    const colorMap: Record<string, { fill: string; stroke: string }> = {
      DESK: { fill: '#b47b44', stroke: '#78350f' },
      TEACHER_DESK: { fill: '#92400e', stroke: '#451a03' },
      BOOKSHELF: { fill: '#7c2d12', stroke: '#431407' },
      LAB_BENCH: { fill: '#0f766e', stroke: '#134e4a' },
      COMPUTER_DESK: { fill: '#475569', stroke: '#1e293b' },
      CAFETERIA_TABLE: { fill: '#d97706', stroke: '#78350f' },
      LOCKER_BANK: { fill: '#2563eb', stroke: '#1e3a8a' },
    };

    for (const prop of FURNITURE_PROPS) {
      const cx = prop.x * UNIT_PX;
      const cy = prop.y * UNIT_PX;
      const wPx = prop.width * UNIT_PX;
      const hPx = prop.height * UNIT_PX;
      const style = colorMap[prop.kind] ?? colorMap.DESK;

      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(cx - wPx * 0.5, cy - hPx * 0.5 + 3, wPx, hPx);

      ctx.fillStyle = style.fill;
      ctx.fillRect(cx - wPx * 0.5, cy - hPx * 0.5, wPx, hPx);
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - wPx * 0.5, cy - hPx * 0.5, wPx, hPx);

      if (prop.kind === 'COMPUTER_DESK') {
        for (let offset = -1; offset <= 1; offset++) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(cx - 9, cy + offset * 28 - 7, 18, 14);
          ctx.strokeStyle = '#0f172a';
          ctx.strokeRect(cx - 9, cy + offset * 28 - 7, 18, 14);
        }
      } else if (prop.kind === 'LAB_BENCH') {
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 18, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const vm of VENDING_MACHINES) {
      const cx = vm.x * UNIT_PX;
      const cy = vm.y * UNIT_PX;
      const wPx = vm.width * UNIT_PX;
      const hPx = vm.height * UNIT_PX;
      const isBsoda = vm.dispenses === ItemType.BSODA;

      ctx.fillStyle = isBsoda ? '#1d4ed8' : '#ea580c';
      ctx.fillRect(cx - wPx * 0.5, cy - hPx * 0.5, wPx, hPx);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - wPx * 0.5, cy - hPx * 0.5, wPx, hPx);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isBsoda ? 'BSODA 25¢' : 'ZESTY 25¢', cx, cy);
    }

    // D. Single-layer shared walls (0.8 units = 12.8px thick)
    for (const seg of this.walls) {
      const x = seg.x1 * UNIT_PX;
      const y = seg.y1 * UNIT_PX;
      const wPx = (seg.x2 - seg.x1) * UNIT_PX;
      const hPx = (seg.y2 - seg.y1) * UNIT_PX;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, wPx, hPx);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x + 2, y + 2, Math.max(2, wPx - 4), Math.max(2, hPx - 4));
    }

    baked.refresh();
  }

  private createStaticRectCollider(
    group: Phaser.Physics.Arcade.StaticGroup,
    cx: number,
    cy: number,
    wPx: number,
    hPx: number
  ): Phaser.Physics.Arcade.Image {
    const col = group.create(cx, cy, 'pixel_invisible') as Phaser.Physics.Arcade.Image;
    col.setOrigin(0.5, 0.5);
    col.setVisible(false);
    col.setDisplaySize(wPx, hPx);
    col.refreshBody();
    return col;
  }

  private buildWallAndPropColliders(): void {
    for (const seg of this.walls) {
      const wPx = (seg.x2 - seg.x1) * UNIT_PX;
      const hPx = (seg.y2 - seg.y1) * UNIT_PX;
      const cx = (seg.x1 + seg.x2) * 0.5 * UNIT_PX;
      const cy = (seg.y1 + seg.y2) * 0.5 * UNIT_PX;
      this.createStaticRectCollider(this.wallGroup, cx, cy, wPx, hPx);
    }

    for (const prop of FURNITURE_PROPS) {
      if (!prop.solid) continue;
      this.createStaticRectCollider(
        this.propGroup,
        prop.x * UNIT_PX,
        prop.y * UNIT_PX,
        prop.width * UNIT_PX,
        prop.height * UNIT_PX
      );
    }

    for (const vm of VENDING_MACHINES) {
      this.createStaticRectCollider(
        this.propGroup,
        vm.x * UNIT_PX,
        vm.y * UNIT_PX,
        vm.width * UNIT_PX,
        vm.height * UNIT_PX
      );
    }
  }

  private buildDoors(): void {
    this.doors.clear();
    this.lockedDoorIds.clear();

    for (const spec of SCHOOL_DOORS) {
      const spanPx = (spec.end - spec.start) * UNIT_PX;
      const thickPx = 11;
      const isH = spec.orientation === 'H';
      const cx = (isH ? (spec.start + spec.end) * 0.5 : spec.coord) * UNIT_PX;
      const cy = (isH ? spec.coord : (spec.start + spec.end) * 0.5) * UNIT_PX;
      const wPx = isH ? spanPx : thickPx;
      const hPx = isH ? thickPx : spanPx;

      let fillColor = 0x2563eb;
      let strokeColor = 0x1e3a8a;
      if (spec.kind === 'FACULTY') {
        fillColor = 0x9a3412;
        strokeColor = 0x431407;
      } else if (spec.kind === 'DOUBLE') {
        fillColor = 0xfacc15;
        strokeColor = 0x854d0e;
      } else if (spec.kind === 'DETENTION') {
        fillColor = 0x1d4ed8;
        strokeColor = 0x0f172a;
      } else if (spec.kind === 'EXIT') {
        fillColor = 0xb91c1c;
        strokeColor = 0x450a0a;
      }

      const closedContainer = this.scene.add.container(cx, cy).setDepth(8);
      const leaf = this.scene.add.rectangle(0, 0, wPx, hPx, fillColor).setStrokeStyle(2, strokeColor);
      closedContainer.add(leaf);

      if (spec.label) {
        const badge = this.scene.add
          .text(0, 0, spec.label, {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: spec.kind === 'EXIT' ? '10px' : '9px',
            fontStyle: 'bold',
            color: '#ffffff',
          })
          .setOrigin(0.5);
        closedContainer.add(badge);
      }

      const visualOpen = this.scene.add
        .rectangle(cx, cy, wPx, hPx, fillColor, 0.22)
        .setDepth(2)
        .setVisible(false);

      const collider = this.createStaticRectCollider(this.doorColliderGroup, cx, cy, wPx, hPx);
      const body = collider.body as Phaser.Physics.Arcade.StaticBody;

      const startsLocked =
        spec.kind === 'EXIT' || spec.id === 'DOOR_LOCK_WEST' || spec.id === 'DOOR_LOCK_EAST';
      body.enable = startsLocked;
      if (startsLocked) {
        this.lockedDoorIds.add(spec.id);
      }

      // Permanent invisible boundary across all restricted room & exit doorways for Playtime ONLY
      // (DOUBLE doors connect hallways & the Canteen, so Playtime passes through DOUBLE doors freely)
      if (spec.kind !== 'DOUBLE') {
        const barrierSpanPx = spanPx + 8;
        const barrierThickPx = 13;
        const bwPx = isH ? barrierSpanPx : barrierThickPx;
        const bhPx = isH ? barrierThickPx : barrierSpanPx;
        this.createStaticRectCollider(this.playtimeRestrictedBarrierGroup, cx, cy, bwPx, bhPx);
      }

      this.doors.set(spec.id, {
        spec,
        visualClosed: closedContainer,
        visualOpen,
        collider,
        isOpen: false,
        isLocked: startsLocked,
        openTimer: 0,
        lockTimer: 0,
      });
    }
  }

  public spawnWorldPickups(): void {
    for (const p of this.pickups) {
      p.sprite.destroy();
    }
    this.pickups = [];

    for (const spec of ITEM_SPAWNS) {
      const sprite = this.scene.add
        .image(spec.x * UNIT_PX, spec.y * UNIT_PX, `item_${spec.type}`)
        .setDepth(6);
      this.pickups.push({
        id: spec.id,
        type: spec.type,
        sprite,
        xPx: spec.x * UNIT_PX,
        yPx: spec.y * UNIT_PX,
        collected: false,
      });
    }
  }

  public resetWorldForNewGame(): void {
    this.highlightedExitId = null;
    this.exitHighlightGraphics.clear();
    this.lockedDoorIds.clear();

    for (const door of this.doors.values()) {
      const startsLocked =
        door.spec.kind === 'EXIT' ||
        door.spec.id === 'DOOR_LOCK_WEST' ||
        door.spec.id === 'DOOR_LOCK_EAST';
      door.isOpen = false;
      door.openTimer = 0;
      door.lockTimer = 0;
      this.setDoorLocked(door.spec.id, startsLocked);
      door.visualClosed.setVisible(true);
      door.visualOpen.setVisible(false);
    }

    this.spawnWorldPickups();
  }

  public setDoorLocked(doorId: string, locked: boolean, durationSec = 0): void {
    const door = this.doors.get(doorId);
    if (!door) return;
    door.isLocked = locked;
    door.lockTimer = locked ? durationSec : 0;
    const body = door.collider.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = locked;
    if (locked) {
      door.isOpen = false;
      door.openTimer = 0;
      door.visualClosed.setVisible(true);
      door.visualOpen.setVisible(false);
      this.lockedDoorIds.add(doorId);
    } else {
      this.lockedDoorIds.delete(doorId);
    }
  }

  public openDoorTemporarily(doorId: string, durationSec = 3.5): boolean {
    const door = this.doors.get(doorId);
    if (!door || door.isLocked) return false;
    const wasOpen = door.isOpen;
    door.isOpen = true;
    door.openTimer = Math.max(door.openTimer, durationSec);
    door.visualClosed.setVisible(false);
    door.visualOpen.setVisible(true);
    return !wasOpen;
  }

  public lockNearestDoubleDoor(xPx: number, yPx: number, durationSec = 12): boolean {
    let best: LiveDoorInstance | null = null;
    let bestDist = 140;
    for (const door of this.doors.values()) {
      if (door.spec.kind !== 'DOUBLE' || door.isLocked) continue;
      const d = Math.hypot(door.collider.x - xPx, door.collider.y - yPx);
      if (d < bestDist) {
        bestDist = d;
        best = door;
      }
    }
    if (!best) return false;
    this.setDoorLocked(best.spec.id, true, durationSec);
    return true;
  }

  public activateFinalEscapeExit(exitId: string): SchoolExitSpec | null {
    const exitSpec = SCHOOL_EXITS.find((e) => e.id === exitId) ?? SCHOOL_EXITS[0];
    this.highlightedExitId = exitSpec.id;
    this.setDoorLocked(exitSpec.doorId, false);
    this.openDoorTemporarily(exitSpec.doorId, 9999);
    return exitSpec;
  }

  public getFurthestExitFrom(xUnits: number, yUnits: number): SchoolExitSpec {
    let best = SCHOOL_EXITS[0];
    let bestDist = -1;
    for (const ex of SCHOOL_EXITS) {
      const d = Math.hypot(ex.triggerX - xUnits, ex.triggerY - yUnits);
      if (d > bestDist) {
        bestDist = d;
        best = ex;
      }
    }
    return best;
  }

  public getActiveExitSpec(): SchoolExitSpec | null {
    if (!this.highlightedExitId) return null;
    return SCHOOL_EXITS.find((e) => e.id === this.highlightedExitId) ?? null;
  }

  public getNearbyExit(xPx: number, yPx: number): SchoolExitSpec | null {
    const ux = xPx / UNIT_PX;
    const uy = yPx / UNIT_PX;
    for (const ex of SCHOOL_EXITS) {
      if (Math.hypot(ex.triggerX - ux, ex.triggerY - uy) <= ex.triggerRadius) {
        return ex;
      }
    }
    return null;
  }

  public getNearbyVendingMachine(xPx: number, yPx: number): VendingMachineSpec | null {
    const ux = xPx / UNIT_PX;
    const uy = yPx / UNIT_PX;
    for (const vm of VENDING_MACHINES) {
      if (Math.hypot(vm.x - ux, vm.y - uy) <= 5.2) {
        return vm;
      }
    }
    return null;
  }

  public getNearbyPickup(xPx: number, yPx: number): LivePickupInstance | null {
    for (const p of this.pickups) {
      if (p.collected) continue;
      if (Math.hypot(p.xPx - xPx, p.yPx - yPx) <= 46) {
        return p;
      }
    }
    return null;
  }

  private distanceToDoorSegmentPx(door: LiveDoorInstance, xPx: number, yPx: number): number {
    const s = door.spec.start * UNIT_PX;
    const e = door.spec.end * UNIT_PX;
    if (door.spec.orientation === 'H') {
      const clampedX = Math.max(s, Math.min(e, xPx));
      const doorY = door.spec.coord * UNIT_PX;
      return Math.hypot(xPx - clampedX, yPx - doorY);
    } else {
      const doorX = door.spec.coord * UNIT_PX;
      const clampedY = Math.max(s, Math.min(e, yPx));
      return Math.hypot(xPx - doorX, yPx - clampedY);
    }
  }

  public getNearbyClosedDoor(xPx: number, yPx: number): LiveDoorInstance | null {
    let best: LiveDoorInstance | null = null;
    let bestDist = 60;
    for (const d of this.doors.values()) {
      if (d.isOpen || d.spec.kind === 'EXIT') continue;
      const dist = this.distanceToDoorSegmentPx(d, xPx, yPx);
      if (dist <= bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  public unlockNearbyRestrictedDoor(xPx: number, yPx: number): LiveDoorInstance | null {
    let best: LiveDoorInstance | null = null;
    let bestDist = 72;
    for (const d of this.doors.values()) {
      if (!d.isLocked || d.spec.kind === 'EXIT') continue;
      const dist = this.distanceToDoorSegmentPx(d, xPx, yPx);
      if (dist <= bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    if (!best) return null;
    // Unlock both Lock Room doors together if unlocking the restricted Lock Room
    if (best.spec.id === 'DOOR_LOCK_WEST' || best.spec.id === 'DOOR_LOCK_EAST') {
      this.setDoorLocked('DOOR_LOCK_WEST', false);
      this.setDoorLocked('DOOR_LOCK_EAST', false);
      this.openDoorTemporarily(best.spec.id, 4.0);
    } else {
      this.setDoorLocked(best.spec.id, false);
      this.openDoorTemporarily(best.spec.id, 4.0);
    }
    return best;
  }

  public updateDoorsAndWorld(
    dt: number,
    actorPositionsPx: { x: number; y: number }[],
    timeSec: number,
    doubleDoorOnlyActorPositionsPx: { x: number; y: number }[] = []
  ): boolean {
    let anyDoorJustOpened = false;

    for (const door of this.doors.values()) {
      if (door.lockTimer > 0) {
        door.lockTimer = Math.max(0, door.lockTimer - dt);
        if (door.lockTimer === 0 && door.spec.kind !== 'EXIT') {
          this.setDoorLocked(door.spec.id, false);
        }
      }

      if (!door.isLocked && door.spec.kind !== 'EXIT') {
        for (const actor of actorPositionsPx) {
          if (this.distanceToDoorSegmentPx(door, actor.x, actor.y) < 56) {
            if (this.openDoorTemporarily(door.spec.id, 2.6)) {
              anyDoorJustOpened = true;
            }
          }
        }
        if (door.spec.kind === 'DOUBLE') {
          for (const actor of doubleDoorOnlyActorPositionsPx) {
            if (this.distanceToDoorSegmentPx(door, actor.x, actor.y) < 56) {
              if (this.openDoorTemporarily(door.spec.id, 2.6)) {
                anyDoorJustOpened = true;
              }
            }
          }
        }
      }

      if (door.isOpen && door.openTimer < 5000) {
        door.openTimer = Math.max(0, door.openTimer - dt);
        if (door.openTimer === 0) {
          door.isOpen = false;
          door.visualClosed.setVisible(true);
          door.visualOpen.setVisible(false);
        }
      }
    }

    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (!p.collected) {
        const bob = Math.sin(timeSec * 3.2 + i) * 2.5;
        p.sprite.x = p.xPx;
        p.sprite.y = p.yPx + bob;
      }
    }

    this.exitHighlightGraphics.clear();
    if (this.highlightedExitId) {
      const ex = this.getActiveExitSpec();
      if (ex) {
        this.beaconPulse += dt * 4.5;
        const exPx = ex.triggerX * UNIT_PX;
        const eyPx = ex.triggerY * UNIT_PX;
        const r = 34 + Math.sin(this.beaconPulse) * 8;
        this.exitHighlightGraphics.lineStyle(4, 0x22c55e, 0.9);
        this.exitHighlightGraphics.strokeCircle(exPx, eyPx, r);
        this.exitHighlightGraphics.fillStyle(0x22c55e, 0.22);
        this.exitHighlightGraphics.fillCircle(exPx, eyPx, r * 0.78);
      }
    }

    return anyDoorJustOpened;
  }

  public getLockedDoorIds(): ReadonlySet<string> {
    return this.lockedDoorIds;
  }

  public getRoomInfoAtPx(xPx: number, yPx: number): { name: string; isFacultyRestricted: boolean } {
    const z = getZoneAtUnits(xPx / UNIT_PX, yPx / UNIT_PX);
    if (!z) return { name: 'Halaman Sekolah', isFacultyRestricted: false };
    return { name: z.name, isFacultyRestricted: Boolean(z.isFacultyRestricted) };
  }
}
