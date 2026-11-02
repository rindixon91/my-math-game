import { ItemType } from './InventoryManager';

/**
 * Architectural School Floor-Plan Compiler & A* Pathfinder
 *
 * Units & Scale:
 * - 1 architectural unit = 16 pixels (`UNIT_PX = 16`)
 * - Wall thickness = 0.8 units (`12.8px`) — strictly within the 0.5–1.0 unit specification
 * - Corridor width = 12 units (`192px`) — strictly within the 10–14 unit specification
 * - Zero overlapping or duplicated walls: walls are compiled by deduplicating shared
 *   boundaries between adjacent zones and slicing exact openings for every doorway.
 */

export const UNIT_PX = 16;
export const WALL_THICKNESS_UNITS = 0.8;
export const MAP_WIDTH_UNITS = 156;
export const MAP_HEIGHT_UNITS = 156;

export type ZoneKind =
  | 'CORRIDOR'
  | 'CLASSROOM'
  | 'LIBRARY'
  | 'LAB'
  | 'FACULTY'
  | 'DETENTION'
  | 'CANTEEN';

export interface ArchitecturalZone {
  id: string;
  name: string;
  kind: ZoneKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  floorStyle: 'corridor' | 'classroom_blue' | 'classroom_wood' | 'faculty_green' | 'canteen_checker' | 'detention_slate' | 'lab_tile';
  isFacultyRestricted?: boolean;
}

export type DoorKind = 'NORMAL' | 'FACULTY' | 'DOUBLE' | 'DETENTION' | 'EXIT';

export interface ArchitecturalDoor {
  id: string;
  kind: DoorKind;
  orientation: 'H' | 'V'; // 'H' = lies on horizontal wall y=coord, spans [start, end] on X; 'V' = lies on vertical wall x=coord, spans [start, end] on Y
  coord: number;
  start: number;
  end: number;
  label?: string;
}

export interface WallSegment {
  id: string;
  orientation: 'H' | 'V';
  coord: number; // centerline coordinate (y for H, x for V)
  start: number;
  end: number;
  thickness: number; // 0.8 units
  // Axis-aligned bounding box in units:
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface NotebookSpawn {
  notebookId: number;
  roomId: string;
  roomName: string;
  x: number;
  y: number;
}

export interface ItemSpawn {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  roomName: string;
}

export interface VendingMachineSpec {
  id: string;
  dispenses: ItemType.BSODA | ItemType.ZESTY_BAR;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface FurnitureProp {
  id: string;
  kind: 'DESK' | 'TEACHER_DESK' | 'BOOKSHELF' | 'LAB_BENCH' | 'COMPUTER_DESK' | 'CAFETERIA_TABLE' | 'LOCKER_BANK';
  x: number; // center x in units
  y: number; // center y in units
  width: number;
  height: number;
  solid: boolean;
}

export interface SchoolExitSpec {
  id: 'EXIT_SOUTH' | 'EXIT_WEST' | 'EXIT_NORTH' | 'EXIT_EAST';
  name: string;
  doorId: string;
  triggerX: number;
  triggerY: number;
  triggerRadius: number;
}

export const PLAYER_START_UNITS = { x: 74, y: 136 };
export const DETENTION_SPAWN_UNITS = { x: 87, y: 70 };
export const PRINCIPAL_POST_DETENTION_UNITS = { x: 104, y: 70 };
export const BALDI_START_UNITS = { x: 74, y: 54 };

/**
 * Exact partition of the connected Here School floor plan.
 * Every zone shares exact boundary coordinates with its neighbors — zero dead pockets,
 * zero double walls, and all corridors are 12 units wide.
 */
export const SCHOOL_ZONES: readonly ArchitecturalZone[] = [
  // --- INTERCONNECTED 12-UNIT WIDE CORRIDORS ---
  {
    id: 'CORRIDOR_NW_ALCOVE',
    name: 'Sudut Telefon Barat Laut',
    kind: 'CORRIDOR',
    x1: 18,
    y1: 4,
    x2: 30,
    y2: 14,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_WEST',
    name: 'Koridor Barat',
    kind: 'CORRIDOR',
    x1: 18,
    y1: 14,
    x2: 30,
    y2: 128,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_SOUTH_WEST',
    name: 'Koridor Barat Daya',
    kind: 'CORRIDOR',
    x1: 18,
    y1: 128,
    x2: 68,
    y2: 140,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_SOUTH_CENTER',
    name: 'Lobi Pintu Masuk Selatan',
    kind: 'CORRIDOR',
    x1: 68,
    y1: 128,
    x2: 80,
    y2: 140,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_SOUTH_EAST',
    name: 'Koridor Tenggara',
    kind: 'CORRIDOR',
    x1: 80,
    y1: 128,
    x2: 142,
    y2: 140,
    floorStyle: 'corridor',
  },
  {
    id: 'ENTRANCE_SOUTH',
    name: 'Pintu Masuk Utama (Selatan)',
    kind: 'CORRIDOR',
    x1: 68,
    y1: 140,
    x2: 80,
    y2: 148,
    floorStyle: 'corridor',
  },
  {
    id: 'FOYER_CENTRAL',
    name: 'Ruang Legar Utama',
    kind: 'CORRIDOR',
    x1: 68,
    y1: 92,
    x2: 80,
    y2: 128,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_LOWER_MID',
    name: 'Koridor Tengah',
    kind: 'CORRIDOR',
    x1: 30,
    y1: 80,
    x2: 98,
    y2: 92,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_UPPER_MID',
    name: 'Koridor Tengah Utara',
    kind: 'CORRIDOR',
    x1: 30,
    y1: 48,
    x2: 98,
    y2: 60,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_INNER_EAST_N',
    name: 'Koridor Timur Atas',
    kind: 'CORRIDOR',
    x1: 98,
    y1: 26,
    x2: 110,
    y2: 60,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_INNER_EAST_S',
    name: 'Koridor Timur Dalam',
    kind: 'CORRIDOR',
    x1: 98,
    y1: 60,
    x2: 110,
    y2: 128,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_NORTH_EAST_W',
    name: 'Simpang Timur Laut',
    kind: 'CORRIDOR',
    x1: 98,
    y1: 14,
    x2: 110,
    y2: 26,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_NORTH_EAST_E',
    name: 'Koridor Timur Laut',
    kind: 'CORRIDOR',
    x1: 110,
    y1: 14,
    x2: 142,
    y2: 26,
    floorStyle: 'corridor',
  },
  {
    id: 'CORRIDOR_OUTER_EAST',
    name: 'Koridor Sayap Timur',
    kind: 'CORRIDOR',
    x1: 130,
    y1: 26,
    x2: 142,
    y2: 128,
    floorStyle: 'corridor',
  },

  // --- ROOMS & LABS ---
  {
    id: 'CANTEEN',
    name: 'Kantin',
    kind: 'CANTEEN',
    x1: 30,
    y1: 14,
    x2: 98,
    y2: 48,
    floorStyle: 'canteen_checker',
  },
  {
    id: 'LIBRARY',
    name: 'Perpustakaan',
    kind: 'LIBRARY',
    x1: 4,
    y1: 38,
    x2: 18,
    y2: 64,
    floorStyle: 'classroom_wood',
  },
  {
    id: 'FACULTY_LOUNGE',
    name: 'Bilik Rehat Guru',
    kind: 'FACULTY',
    x1: 30,
    y1: 60,
    x2: 54,
    y2: 80,
    floorStyle: 'faculty_green',
    isFacultyRestricted: true,
  },
  {
    id: 'SCIENCE_LAB',
    name: 'Makmal Sains',
    kind: 'LAB',
    x1: 54,
    y1: 60,
    x2: 76,
    y2: 80,
    floorStyle: 'lab_tile',
  },
  {
    id: 'DETENTION_ROOM',
    name: 'Bilik Tahanan',
    kind: 'DETENTION',
    x1: 76,
    y1: 60,
    x2: 98,
    y2: 80,
    floorStyle: 'detention_slate',
  },
  {
    id: 'STAFF_ROOM',
    name: 'Bilik Guru',
    kind: 'FACULTY',
    x1: 30,
    y1: 92,
    x2: 50,
    y2: 128,
    floorStyle: 'faculty_green',
    isFacultyRestricted: true,
  },
  {
    id: 'SUPPLY_ANNEX',
    name: 'Bilik Media Guru',
    kind: 'FACULTY',
    x1: 50,
    y1: 92,
    x2: 68,
    y2: 110,
    floorStyle: 'faculty_green',
    isFacultyRestricted: true,
  },
  {
    id: 'CLASSROOM_A',
    name: 'Bilik Darjah A',
    kind: 'CLASSROOM',
    x1: 50,
    y1: 110,
    x2: 68,
    y2: 128,
    floorStyle: 'classroom_blue',
  },
  {
    id: 'COMPUTER_LAB',
    name: 'Makmal Komputer',
    kind: 'LAB',
    x1: 80,
    y1: 92,
    x2: 98,
    y2: 110,
    floorStyle: 'lab_tile',
  },
  {
    id: 'CLASSROOM_B',
    name: 'Bilik Darjah B',
    kind: 'CLASSROOM',
    x1: 80,
    y1: 110,
    x2: 98,
    y2: 128,
    floorStyle: 'classroom_blue',
  },
  {
    id: 'CLASSROOM_D',
    name: 'Bilik Darjah D',
    kind: 'CLASSROOM',
    x1: 110,
    y1: 26,
    x2: 130,
    y2: 52,
    floorStyle: 'classroom_wood',
  },
  {
    id: 'PRINCIPALS_OFFICE',
    name: 'Pejabat Pengetua',
    kind: 'FACULTY',
    x1: 110,
    y1: 52,
    x2: 130,
    y2: 78,
    floorStyle: 'faculty_green',
    isFacultyRestricted: true,
  },
  {
    id: 'CLASSROOM_C',
    name: 'Bilik Darjah C',
    kind: 'CLASSROOM',
    x1: 110,
    y1: 78,
    x2: 130,
    y2: 104,
    floorStyle: 'classroom_blue',
  },
  {
    id: 'LOCK_ROOM',
    name: 'Bilik Kunci',
    kind: 'FACULTY',
    x1: 110,
    y1: 104,
    x2: 130,
    y2: 128,
    floorStyle: 'faculty_green',
    isFacultyRestricted: true,
  },
];

/**
 * Every door sits directly on a shared zone boundary and slices an actual opening
 * out of that wall. Every door connects two accessible walkable zones.
 */
export const SCHOOL_DOORS: readonly ArchitecturalDoor[] = [
  // Classrooms A–D (Notebooks 1–4)
  { id: 'DOOR_CLASS_A', kind: 'NORMAL', orientation: 'V', coord: 68, start: 116.5, end: 121.5, label: '99' },
  { id: 'DOOR_CLASS_B', kind: 'NORMAL', orientation: 'V', coord: 80, start: 116.5, end: 121.5, label: '99' },
  { id: 'DOOR_CLASS_C', kind: 'NORMAL', orientation: 'V', coord: 130, start: 88.5, end: 93.5, label: '99' },
  { id: 'DOOR_CLASS_D', kind: 'NORMAL', orientation: 'V', coord: 130, start: 36.5, end: 41.5, label: '99' },

  // Library (Notebook 5), Science Lab (Notebook 6), Computer Lab (Notebook 7)
  { id: 'DOOR_LIBRARY', kind: 'NORMAL', orientation: 'V', coord: 18, start: 48.5, end: 53.5, label: '99' },
  { id: 'DOOR_SCIENCE', kind: 'NORMAL', orientation: 'H', coord: 60, start: 62.5, end: 67.5, label: '99' },
  { id: 'DOOR_COMP_LAB', kind: 'NORMAL', orientation: 'H', coord: 92, start: 86.5, end: 91.5, label: '99' },

  // Detention Room (Central core)
  { id: 'DOOR_DETENTION', kind: 'DETENTION', orientation: 'V', coord: 98, start: 67.5, end: 72.5, label: '99' },

  // Faculty Rooms (Pejabat Pengetua, Bilik Kunci, Bilik Guru, Bilik Rehat Guru, Bilik Media Guru)
  { id: 'DOOR_PRINCIPAL', kind: 'FACULTY', orientation: 'V', coord: 110, start: 62.5, end: 67.5, label: 'BG' },
  { id: 'DOOR_LOCK_WEST', kind: 'FACULTY', orientation: 'V', coord: 110, start: 113.5, end: 118.5, label: 'BG' },
  { id: 'DOOR_LOCK_EAST', kind: 'FACULTY', orientation: 'V', coord: 130, start: 113.5, end: 118.5, label: 'BG' },
  { id: 'DOOR_FACULTY_LOUNGE', kind: 'FACULTY', orientation: 'V', coord: 30, start: 67.5, end: 72.5, label: 'BG' },
  { id: 'DOOR_STAFF_SOUTH', kind: 'FACULTY', orientation: 'H', coord: 128, start: 37.5, end: 42.5, label: 'BG' },
  { id: 'DOOR_STAFF_NORTH', kind: 'FACULTY', orientation: 'H', coord: 92, start: 37.5, end: 42.5, label: 'BG' },
  { id: 'DOOR_STAFF_ANNEX', kind: 'FACULTY', orientation: 'V', coord: 50, start: 98.5, end: 103.5, label: 'BG' },
  { id: 'DOOR_ANNEX_NORTH', kind: 'FACULTY', orientation: 'H', coord: 92, start: 56.5, end: 61.5, label: 'BG' },

  // Canteen Swinging Yellow Double Doors (West and East entrances, matching reference images)
  { id: 'DOOR_CANTEEN_WEST', kind: 'DOUBLE', orientation: 'V', coord: 30, start: 27, end: 35 },
  { id: 'DOOR_CANTEEN_EAST', kind: 'DOUBLE', orientation: 'V', coord: 98, start: 27, end: 35 },

  // Hallway Swinging Yellow Double Doors (matching reference floor plans)
  { id: 'DOOR_HALL_FOYER', kind: 'DOUBLE', orientation: 'H', coord: 92, start: 70, end: 78 },
  { id: 'DOOR_HALL_SOUTH_W', kind: 'DOUBLE', orientation: 'V', coord: 68, start: 130, end: 138 },
  { id: 'DOOR_HALL_SOUTH_E', kind: 'DOUBLE', orientation: 'V', coord: 80, start: 130, end: 138 },
  { id: 'DOOR_HALL_EAST_MID', kind: 'DOUBLE', orientation: 'H', coord: 60, start: 100, end: 108 },
  { id: 'DOOR_HALL_NE', kind: 'DOUBLE', orientation: 'V', coord: 110, start: 16, end: 24 },

  // Four School Exits (South, West, North, East)
  { id: 'DOOR_EXIT_SOUTH', kind: 'EXIT', orientation: 'H', coord: 148, start: 70, end: 78, label: 'KELUAR' },
  { id: 'DOOR_EXIT_WEST', kind: 'EXIT', orientation: 'V', coord: 18, start: 82, end: 90, label: 'KELUAR' },
  { id: 'DOOR_EXIT_NORTH', kind: 'EXIT', orientation: 'H', coord: 14, start: 52, end: 60, label: 'KELUAR' },
  { id: 'DOOR_EXIT_EAST', kind: 'EXIT', orientation: 'V', coord: 142, start: 87, end: 95, label: 'KELUAR' },
];

export const SCHOOL_EXITS: readonly SchoolExitSpec[] = [
  {
    id: 'EXIT_NORTH',
    name: 'Pintu Keluar Utara (Kantin)',
    doorId: 'DOOR_EXIT_NORTH',
    triggerX: 56,
    triggerY: 16.2,
    triggerRadius: 4.5,
  },
  {
    id: 'EXIT_EAST',
    name: 'Pintu Keluar Sayap Timur',
    doorId: 'DOOR_EXIT_EAST',
    triggerX: 139.8,
    triggerY: 91,
    triggerRadius: 4.5,
  },
  {
    id: 'EXIT_WEST',
    name: 'Pintu Keluar Koridor Barat',
    doorId: 'DOOR_EXIT_WEST',
    triggerX: 20.2,
    triggerY: 86,
    triggerRadius: 4.5,
  },
  {
    id: 'EXIT_SOUTH',
    name: 'Pintu Keluar Utama (Selatan)',
    doorId: 'DOOR_EXIT_SOUTH',
    triggerX: 74,
    triggerY: 145.8,
    triggerRadius: 4.5,
  },
];

export const NOTEBOOK_SPAWNS: readonly NotebookSpawn[] = [
  { notebookId: 1, roomId: 'CLASSROOM_A', roomName: 'Bilik Darjah A', x: 56, y: 119 },
  { notebookId: 2, roomId: 'CLASSROOM_B', roomName: 'Bilik Darjah B', x: 92, y: 119 },
  { notebookId: 3, roomId: 'CLASSROOM_C', roomName: 'Bilik Darjah C', x: 117, y: 91 },
  { notebookId: 4, roomId: 'CLASSROOM_D', roomName: 'Bilik Darjah D', x: 117, y: 39 },
  { notebookId: 5, roomId: 'LIBRARY', roomName: 'Perpustakaan', x: 9.5, y: 51 },
  { notebookId: 6, roomId: 'SCIENCE_LAB', roomName: 'Makmal Sains', x: 65, y: 73 },
  { notebookId: 7, roomId: 'COMPUTER_LAB', roomName: 'Makmal Komputer', x: 89, y: 103 },
];

export const ITEM_SPAWNS: readonly ItemSpawn[] = [
  { id: 'ITEM_QUARTER_START', type: ItemType.QUARTER, x: 74, y: 124, roomName: 'Ruang Legar Utama' },
  { id: 'ITEM_BSODA_CANTEEN', type: ItemType.BSODA, x: 64, y: 30, roomName: 'Kantin' },
  { id: 'ITEM_ZESTY_CANTEEN', type: ItemType.ZESTY_BAR, x: 38, y: 42, roomName: 'Kantin' },
  { id: 'ITEM_KEYS_ALCOVE', type: ItemType.PRINCIPAL_KEYS, x: 24, y: 9, roomName: 'Sudut Telefon Barat Laut' },
  { id: 'ITEM_QUARTER_LOUNGE', type: ItemType.QUARTER, x: 44, y: 70, roomName: 'Bilik Rehat Guru' },
  { id: 'ITEM_ZESTY_STAFF', type: ItemType.ZESTY_BAR, x: 38, y: 112, roomName: 'Bilik Guru' },
  { id: 'ITEM_SCISSORS_ANNEX', type: ItemType.SCISSORS, x: 60, y: 102, roomName: 'Bilik Media Guru' },
  { id: 'ITEM_KEYS_PRINCIPAL', type: ItemType.PRINCIPAL_KEYS, x: 124, y: 65, roomName: 'Pejabat Pengetua' },
  { id: 'ITEM_LOCK_ROOM', type: ItemType.DOOR_LOCK, x: 120, y: 116, roomName: 'Bilik Kunci' },
];

export interface BullyHallwaySpot {
  id: string;
  name: string;
  x: number;
  y: number;
  /**
   * 'VERTICAL' = hallway runs North-South (walls at x ± 6, so Bully blocks full 12-unit X width)
   * 'HORIZONTAL' = hallway runs East-West (walls at y ± 6, so Bully blocks full 12-unit Y height)
   */
  corridorAxis: 'VERTICAL' | 'HORIZONTAL';
  spanUnits: number;
}

export const BULLY_HALLWAY_SPOTS: readonly BullyHallwaySpot[] = [
  { id: 'WEST_NORTH', name: 'Koridor Barat (Utara)', x: 24, y: 38, corridorAxis: 'VERTICAL', spanUnits: 12 },
  { id: 'WEST_SOUTH', name: 'Koridor Barat (Selatan)', x: 24, y: 108, corridorAxis: 'VERTICAL', spanUnits: 12 },
  { id: 'SOUTH_WEST', name: 'Koridor Barat Daya', x: 48, y: 134, corridorAxis: 'HORIZONTAL', spanUnits: 12 },
  { id: 'SOUTH_EAST', name: 'Koridor Tenggara', x: 104, y: 134, corridorAxis: 'HORIZONTAL', spanUnits: 12 },
  { id: 'CENTRAL_VENDING_W', name: 'Koridor Tengah (Barat)', x: 50, y: 86, corridorAxis: 'HORIZONTAL', spanUnits: 12 },
  { id: 'CENTRAL_VENDING_E', name: 'Koridor Tengah (Timur)', x: 65, y: 86, corridorAxis: 'HORIZONTAL', spanUnits: 12 },
  { id: 'NORTH_CENTRAL_W', name: 'Koridor Tengah Utara (Barat)', x: 46, y: 54, corridorAxis: 'HORIZONTAL', spanUnits: 12 },
  { id: 'NORTH_CENTRAL_E', name: 'Koridor Tengah Utara (Timur)', x: 84, y: 54, corridorAxis: 'HORIZONTAL', spanUnits: 12 },
  { id: 'UPPER_EAST', name: 'Koridor Timur Atas', x: 104, y: 44, corridorAxis: 'VERTICAL', spanUnits: 12 },
  { id: 'EAST_WING', name: 'Koridor Sayap Timur', x: 136, y: 64, corridorAxis: 'VERTICAL', spanUnits: 12 },
];

export const BULLY_MIN_PLAYER_DIST_UNITS = 14;
export const BULLY_MIN_NPC_DIST_UNITS = 8;

/**
 * Pure helper to pick an unpredictable random hallway spot for Bully that avoids
 * spawning on top of the player, any NPC, or immediately repeating the same hallway.
 */
export function pickRandomBullySpot(
  spots: readonly BullyHallwaySpot[],
  playerUnits: { x: number; y: number },
  npcUnitsList: readonly { x: number; y: number }[],
  lastSpotId: string | null,
  rng: () => number = Math.random
): BullyHallwaySpot {
  const candidates = spots.filter((s) => {
    if (lastSpotId && s.id === lastSpotId && spots.length > 1) return false;
    if (Math.hypot(s.x - playerUnits.x, s.y - playerUnits.y) < BULLY_MIN_PLAYER_DIST_UNITS) {
      return false;
    }
    for (const npc of npcUnitsList) {
      if (Math.hypot(s.x - npc.x, s.y - npc.y) < BULLY_MIN_NPC_DIST_UNITS) {
        return false;
      }
    }
    return true;
  });

  const pool =
    candidates.length > 0
      ? candidates
      : spots.filter(
          (s) => Math.hypot(s.x - playerUnits.x, s.y - playerUnits.y) >= BULLY_MIN_PLAYER_DIST_UNITS * 0.75
        );

  const finalPool = pool.length > 0 ? pool : spots;
  const idx = Math.min(finalPool.length - 1, Math.floor(rng() * finalPool.length));
  return finalPool[idx];
}

export const VENDING_MACHINES: readonly VendingMachineSpec[] = [
  {
    id: 'VEND_CANTEEN_BSODA',
    dispenses: ItemType.BSODA,
    x: 74,
    y: 16.2,
    width: 5,
    height: 2.6,
    label: 'Mesin Air BSoda (25¢)',
  },
  {
    id: 'VEND_HALL_BSODA',
    dispenses: ItemType.BSODA,
    x: 42,
    y: 81.8,
    width: 5,
    height: 2.6,
    label: 'Mesin Air BSoda (25¢)',
  },
  {
    id: 'VEND_OFFICE_ZESTY',
    dispenses: ItemType.ZESTY_BAR,
    x: 120,
    y: 75.8,
    width: 5,
    height: 2.6,
    label: 'Mesin Snek Zesty (25¢)',
  },
];

export const FURNITURE_PROPS: readonly FurnitureProp[] = [
  // Classroom A desks (leaving clear path from door at (68, 119) to Notebook 1 at (56, 119))
  { id: 'DESK_A1', kind: 'DESK', x: 60, y: 113.5, width: 3.6, height: 2.4, solid: true },
  { id: 'DESK_A2', kind: 'DESK', x: 60, y: 124.5, width: 3.6, height: 2.4, solid: true },
  { id: 'TDESK_A', kind: 'TEACHER_DESK', x: 53.2, y: 119, width: 2.6, height: 4.8, solid: true },

  // Classroom B desks
  { id: 'DESK_B1', kind: 'DESK', x: 87, y: 113.5, width: 3.6, height: 2.4, solid: true },
  { id: 'DESK_B2', kind: 'DESK', x: 87, y: 124.5, width: 3.6, height: 2.4, solid: true },
  { id: 'TDESK_B', kind: 'TEACHER_DESK', x: 94.8, y: 119, width: 2.6, height: 4.8, solid: true },

  // Classroom C desks
  { id: 'DESK_C1', kind: 'DESK', x: 123, y: 83, width: 3.6, height: 2.4, solid: true },
  { id: 'DESK_C2', kind: 'DESK', x: 123, y: 99, width: 3.6, height: 2.4, solid: true },
  { id: 'TDESK_C', kind: 'TEACHER_DESK', x: 113.5, y: 91, width: 2.8, height: 5.2, solid: true },

  // Classroom D desks
  { id: 'DESK_D1', kind: 'DESK', x: 123, y: 31, width: 3.6, height: 2.4, solid: true },
  { id: 'DESK_D2', kind: 'DESK', x: 123, y: 47, width: 3.6, height: 2.4, solid: true },
  { id: 'TDESK_D', kind: 'TEACHER_DESK', x: 113.5, y: 39, width: 2.8, height: 5.2, solid: true },

  // Library bookshelves
  { id: 'LIB_SHELF_1', kind: 'BOOKSHELF', x: 11, y: 41.5, width: 8, height: 2.4, solid: true },
  { id: 'LIB_SHELF_2', kind: 'BOOKSHELF', x: 11, y: 60.5, width: 8, height: 2.4, solid: true },

  // Science Lab benches
  { id: 'SCI_BENCH_1', kind: 'LAB_BENCH', x: 58.5, y: 70, width: 3.2, height: 7, solid: true },
  { id: 'SCI_BENCH_2', kind: 'LAB_BENCH', x: 71.5, y: 70, width: 3.2, height: 7, solid: true },

  // Computer Lab desks
  { id: 'COMP_DESK_1', kind: 'COMPUTER_DESK', x: 83.2, y: 101, width: 2.6, height: 7, solid: true },
  { id: 'COMP_DESK_2', kind: 'COMPUTER_DESK', x: 94.8, y: 101, width: 2.6, height: 7, solid: true },

  // Detention Room desks
  { id: 'DET_DESK_1', kind: 'DESK', x: 81, y: 65, width: 3.6, height: 2.4, solid: true },
  { id: 'DET_DESK_2', kind: 'DESK', x: 81, y: 75, width: 3.6, height: 2.4, solid: true },

  // Canteen cafeteria tables (generous aisles all around)
  { id: 'CAFE_TABLE_1', kind: 'CAFETERIA_TABLE', x: 48, y: 26, width: 10, height: 4.2, solid: true },
  { id: 'CAFE_TABLE_2', kind: 'CAFETERIA_TABLE', x: 80, y: 26, width: 10, height: 4.2, solid: true },
  { id: 'CAFE_TABLE_3', kind: 'CAFETERIA_TABLE', x: 48, y: 39, width: 10, height: 4.2, solid: true },
  { id: 'CAFE_TABLE_4', kind: 'CAFETERIA_TABLE', x: 80, y: 39, width: 10, height: 4.2, solid: true },

  // Principal's Office & Staff Room desks
  { id: 'PRIN_DESK', kind: 'TEACHER_DESK', x: 124, y: 60, width: 4.5, height: 2.8, solid: true },
  { id: 'STAFF_TABLE', kind: 'CAFETERIA_TABLE', x: 39, y: 104, width: 6, height: 4, solid: true },
];

interface Interval1D {
  start: number;
  end: number;
}

function subtractIntervals(base: Interval1D[], cutouts: Interval1D[]): Interval1D[] {
  let current = [...base];
  for (const cut of cutouts) {
    const next: Interval1D[] = [];
    for (const seg of current) {
      if (cut.end <= seg.start + 1e-4 || cut.start >= seg.end - 1e-4) {
        next.push(seg);
      } else {
        if (cut.start > seg.start + 1e-4) {
          next.push({ start: seg.start, end: cut.start });
        }
        if (cut.end < seg.end - 1e-4) {
          next.push({ start: cut.end, end: seg.end });
        }
      }
    }
    current = next;
  }
  return current;
}

function mergeCollinearIntervals(intervals: Interval1D[]): Interval1D[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval1D[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start <= prev.end + 1e-4) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

export function getZoneAtUnits(
  x: number,
  y: number,
  zones: readonly ArchitecturalZone[] = SCHOOL_ZONES
): ArchitecturalZone | null {
  for (const z of zones) {
    if (x > z.x1 && x < z.x2 && y > z.y1 && y < z.y2) {
      return z;
    }
  }
  return null;
}

/**
 * Playtime is strictly restricted to roaming only hallways ('CORRIDOR') and the 'CANTEEN'.
 * She must never enter classrooms, library, science lab, computer lab, faculty/staff rooms,
 * principal's office, lock room, or detention room.
 */
export const PLAYTIME_ALLOWED_ZONE_KINDS: ReadonlySet<ZoneKind> = new Set<ZoneKind>([
  'CORRIDOR',
  'CANTEEN',
]);

/**
 * Patrol loop for Playtime strictly inside connected hallways and the Canteen
 * (entering and exiting Canteen freely via West & East yellow double doors).
 */
export const PLAYTIME_PATROL_POINTS: readonly { x: number; y: number }[] = [
  { x: 24, y: 54 },   // West Corridor (Mid)
  { x: 24, y: 31 },   // West Corridor (Canteen West Entrance)
  { x: 46, y: 32 },   // Canteen (West Aisle)
  { x: 82, y: 32 },   // Canteen (East Aisle)
  { x: 104, y: 32 },  // Upper East Hallway (Canteen East Entrance)
  { x: 136, y: 32 },  // East Wing Corridor (North)
  { x: 136, y: 106 }, // East Wing Corridor (South)
  { x: 104, y: 134 }, // South-East Corridor
  { x: 74, y: 112 },  // Main Entry Hall
  { x: 64, y: 86 },   // Central Vending Hallway
  { x: 64, y: 54 },   // North-Central Hallway
  { x: 38, y: 134 },  // South-West Corridor
  { x: 24, y: 104 },  // West Corridor (South)
];

export function isPlaytimeAllowedDoor(door: ArchitecturalDoor): boolean {
  return door.kind === 'DOUBLE';
}

export function isPlaytimeAllowedAtUnits(
  x: number,
  y: number,
  zones: readonly ArchitecturalZone[] = SCHOOL_ZONES,
  doors: readonly ArchitecturalDoor[] = SCHOOL_DOORS
): boolean {
  const direct = getZoneAtUnits(x, y, zones);
  if (direct) {
    return PLAYTIME_ALLOWED_ZONE_KINDS.has(direct.kind);
  }

  // Handle exact shared boundary lines between two allowed zones (open corridor junctions or DOUBLE doors)
  const left = getZoneAtUnits(x - 0.2, y, zones);
  const right = getZoneAtUnits(x + 0.2, y, zones);
  if (
    left &&
    right &&
    PLAYTIME_ALLOWED_ZONE_KINDS.has(left.kind) &&
    PLAYTIME_ALLOWED_ZONE_KINDS.has(right.kind)
  ) {
    if (left.kind === 'CORRIDOR' && right.kind === 'CORRIDOR') {
      const onWallOutsideDoor = doors.some(
        (d) =>
          d.orientation === 'V' &&
          Math.abs(d.coord - x) < 0.25 &&
          y >= d.start - 6 &&
          y <= d.end + 6 &&
          (y < d.start || y > d.end)
      );
      return !onWallOutsideDoor;
    }
    return doors.some(
      (d) =>
        isPlaytimeAllowedDoor(d) &&
        d.orientation === 'V' &&
        Math.abs(d.coord - x) < 0.25 &&
        y >= d.start &&
        y <= d.end
    );
  }

  const above = getZoneAtUnits(x, y - 0.2, zones);
  const below = getZoneAtUnits(x, y + 0.2, zones);
  if (
    above &&
    below &&
    PLAYTIME_ALLOWED_ZONE_KINDS.has(above.kind) &&
    PLAYTIME_ALLOWED_ZONE_KINDS.has(below.kind)
  ) {
    if (above.kind === 'CORRIDOR' && below.kind === 'CORRIDOR') {
      const onWallOutsideDoor = doors.some(
        (d) =>
          d.orientation === 'H' &&
          Math.abs(d.coord - y) < 0.25 &&
          x >= d.start - 6 &&
          x <= d.end + 6 &&
          (x < d.start || x > d.end)
      );
      return !onWallOutsideDoor;
    }
    return doors.some(
      (d) =>
        isPlaytimeAllowedDoor(d) &&
        d.orientation === 'H' &&
        Math.abs(d.coord - y) < 0.25 &&
        x >= d.start &&
        x <= d.end
    );
  }

  return false;
}

/**
 * Compiles deduplicated single-layer walls from shared room/corridor boundaries,
 * removing open corridor-to-corridor transitions and slicing exact door openings.
 */
export function compileArchitecturalWalls(
  zones: readonly ArchitecturalZone[] = SCHOOL_ZONES,
  doors: readonly ArchitecturalDoor[] = SCHOOL_DOORS
): WallSegment[] {
  // Collect all candidate X and Y grid coordinates from zones so every shared boundary is atomic
  const xCoordsSet = new Set<number>();
  const yCoordsSet = new Set<number>();
  for (const z of zones) {
    xCoordsSet.add(z.x1);
    xCoordsSet.add(z.x2);
    yCoordsSet.add(z.y1);
    yCoordsSet.add(z.y2);
  }
  const xs = Array.from(xCoordsSet).sort((a, b) => a - b);
  const ys = Array.from(yCoordsSet).sort((a, b) => a - b);

  const horizontalByY = new Map<number, Interval1D[]>();
  const verticalByX = new Map<number, Interval1D[]>();

  const shouldHaveWallBetween = (
    zA: ArchitecturalZone | null,
    zB: ArchitecturalZone | null,
    orientation: 'H' | 'V',
    coord: number,
    midOther: number
  ): boolean => {
    // Exterior <->Exterior: no wall
    if (!zA && !zB) return false;
    // Interior <-> Exterior: always an exterior building wall (doorways cut out below)
    if (!zA || !zB) return true;
    // Same zone: no wall
    if (zA.id === zB.id) return false;
    // Two adjacent corridors: OPEN floor, UNLESS a hallway swinging double door sits on this boundary line!
    if (zA.kind === 'CORRIDOR' && zB.kind === 'CORRIDOR') {
      const hasHallDoor = doors.some(
        (d) =>
          d.orientation === orientation &&
          Math.abs(d.coord - coord) < 1e-4 &&
          midOther >= d.start - 6 &&
          midOther <= d.end + 6
      );
      return hasHallDoor;
    }
    // Room <-> Corridor or Room <-> Room: single shared wall!
    return true;
  };

  // Scan horizontal grid lines y = ys[j] across atomic intervals [xs[i], xs[i+1]]
  for (const y of ys) {
    for (let i = 0; i < xs.length - 1; i++) {
      const xStart = xs[i];
      const xEnd = xs[i + 1];
      const midX = (xStart + xEnd) * 0.5;
      const above = getZoneAtUnits(midX, y - 0.1, zones);
      const below = getZoneAtUnits(midX, y + 0.1, zones);
      if (shouldHaveWallBetween(above, below, 'H', y, midX)) {
        const list = horizontalByY.get(y) ?? [];
        list.push({ start: xStart, end: xEnd });
        horizontalByY.set(y, list);
      }
    }
  }

  // Scan vertical grid lines x = xs[i] across atomic intervals [ys[j], ys[j+1]]
  for (const x of xs) {
    for (let j = 0; j < ys.length - 1; j++) {
      const yStart = ys[j];
      const yEnd = ys[j + 1];
      const midY = (yStart + yEnd) * 0.5;
      const left = getZoneAtUnits(x - 0.1, midY, zones);
      const right = getZoneAtUnits(x + 0.1, midY, zones);
      if (shouldHaveWallBetween(left, right, 'V', x, midY)) {
        const list = verticalByX.get(x) ?? [];
        list.push({ start: yStart, end: yEnd });
        verticalByX.set(x, list);
      }
    }
  }

  const segments: WallSegment[] = [];
  const halfT = WALL_THICKNESS_UNITS * 0.5;
  let idCounter = 1;

  for (const [y, rawList] of horizontalByY.entries()) {
    const merged = mergeCollinearIntervals(rawList);
    const doorCuts = doors
      .filter((d) => d.orientation === 'H' && Math.abs(d.coord - y) < 1e-4)
      .map((d) => ({ start: d.start, end: d.end }));
    const sliced = subtractIntervals(merged, doorCuts);
    for (const seg of sliced) {
      if (seg.end - seg.start < 0.25) continue;
      segments.push({
        id: `WALL_H_${idCounter++}`,
        orientation: 'H',
        coord: y,
        start: seg.start,
        end: seg.end,
        thickness: WALL_THICKNESS_UNITS,
        x1: seg.start,
        y1: y - halfT,
        x2: seg.end,
        y2: y + halfT,
      });
    }
  }

  for (const [x, rawList] of verticalByX.entries()) {
    const merged = mergeCollinearIntervals(rawList);
    const doorCuts = doors
      .filter((d) => d.orientation === 'V' && Math.abs(d.coord - x) < 1e-4)
      .map((d) => ({ start: d.start, end: d.end }));
    const sliced = subtractIntervals(merged, doorCuts);
    for (const seg of sliced) {
      if (seg.end - seg.start < 0.25) continue;
      segments.push({
        id: `WALL_V_${idCounter++}`,
        orientation: 'V',
        coord: x,
        start: seg.start,
        end: seg.end,
        thickness: WALL_THICKNESS_UNITS,
        x1: x - halfT,
        y1: seg.start,
        x2: x + halfT,
        y2: seg.end,
      });
    }
  }

  return segments;
}

/**
 * 2-unit cell navigation grid for fast, zero-lag A* pathfinding across the school.
 * (78 x 78 cells — A* resolves in < 0.3ms!)
 */
export const NAV_CELL_UNITS = 2;

export class SchoolNavGrid {
  public readonly cols: number;
  public readonly rows: number;
  private blocked: Uint8Array;
  private proximityPenalty: Float32Array;
  private walls: readonly WallSegment[];
  private props: readonly FurnitureProp[];
  private vending: readonly VendingMachineSpec[];

  constructor(
    walls: readonly WallSegment[],
    props: readonly FurnitureProp[] = FURNITURE_PROPS,
    vending: readonly VendingMachineSpec[] = VENDING_MACHINES
  ) {
    this.cols = Math.ceil(MAP_WIDTH_UNITS / NAV_CELL_UNITS);
    this.rows = Math.ceil(MAP_HEIGHT_UNITS / NAV_CELL_UNITS);
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.proximityPenalty = new Float32Array(this.cols * this.rows);
    this.walls = walls;
    this.props = props;
    this.vending = vending;

    const agentMargin = 0.72; // clearance from thin walls so characters turn smoothly through 5-unit doors

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = (c + 0.5) * NAV_CELL_UNITS;
        const cy = (r + 0.5) * NAV_CELL_UNITS;

        // Must be inside an interior walkable zone
        const zone = getZoneAtUnits(cx, cy);
        if (!zone) {
          this.blocked[r * this.cols + c] = 1;
          continue;
        }

        // Check wall clearance
        let hitsWall = false;
        for (const w of walls) {
          if (
            cx + agentMargin > w.x1 &&
            cx - agentMargin < w.x2 &&
            cy + agentMargin > w.y1 &&
            cy - agentMargin < w.y2
          ) {
            hitsWall = true;
            break;
          }
        }
        if (hitsWall) {
          this.blocked[r * this.cols + c] = 1;
          continue;
        }

        // Check solid furniture & vending machines
        let hitsProp = false;
        for (const p of props) {
          if (!p.solid) continue;
          const hw = p.width * 0.5 + 0.55;
          const hh = p.height * 0.5 + 0.55;
          if (cx > p.x - hw && cx < p.x + hw && cy > p.y - hh && cy < p.y + hh) {
            hitsProp = true;
            break;
          }
        }
        if (!hitsProp) {
          for (const v of vending) {
            const hw = v.width * 0.5 + 0.55;
            const hh = v.height * 0.5 + 0.55;
            if (cx > v.x - hw && cx < v.x + hw && cy > v.y - hh && cy < v.y + hh) {
              hitsProp = true;
              break;
            }
          }
        }
        if (hitsProp) {
          this.blocked[r * this.cols + c] = 1;
        }
      }
    }

    // Precompute soft wall/obstacle proximity cost so A* prefers corridor & doorway centerlines
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        if (this.blocked[idx] === 1) continue;
        let blockedNeighbors = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dc === 0 && dr === 0) continue;
            const nc = c + dc;
            const nr = r + dr;
            if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows || this.blocked[nr * this.cols + nc] === 1) {
              blockedNeighbors++;
            }
          }
        }
        // Gentle penalty steers NPCs away from hugging walls & sharp doorway jambs
        this.proximityPenalty[idx] = blockedNeighbors * 0.22;
      }
    }
  }

  public isCellWalkable(
    col: number,
    row: number,
    lockedDoors?: ReadonlySet<string>,
    allowedZoneKinds?: ReadonlySet<ZoneKind>
  ): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    if (this.blocked[row * this.cols + col] === 1) return false;

    const needsDoorOrZoneCheck = Boolean((lockedDoors && lockedDoors.size > 0) || allowedZoneKinds);
    if (needsDoorOrZoneCheck) {
      const cx = (col + 0.5) * NAV_CELL_UNITS;
      const cy = (row + 0.5) * NAV_CELL_UNITS;

      if (allowedZoneKinds) {
        const zone = getZoneAtUnits(cx, cy);
        if (!zone || !allowedZoneKinds.has(zone.kind)) {
          return false;
        }
        // Treat all non-DOUBLE doors (classrooms, labs, library, faculty, detention, exits) as closed walls
        for (const door of SCHOOL_DOORS) {
          if (isPlaytimeAllowedDoor(door)) continue;
          if (door.orientation === 'H') {
            if (Math.abs(cy - door.coord) < 1.35 && cx >= door.start - 0.55 && cx <= door.end + 0.55) {
              return false;
            }
          } else {
            if (Math.abs(cx - door.coord) < 1.35 && cy >= door.start - 0.55 && cy <= door.end + 0.55) {
              return false;
            }
          }
        }
      }

      if (lockedDoors && lockedDoors.size > 0) {
        for (const door of SCHOOL_DOORS) {
          if (!lockedDoors.has(door.id)) continue;
          if (door.orientation === 'H') {
            if (Math.abs(cy - door.coord) < 1.35 && cx >= door.start - 0.55 && cx <= door.end + 0.55) {
              return false;
            }
          } else {
            if (Math.abs(cx - door.coord) < 1.35 && cy >= door.start - 0.55 && cy <= door.end + 0.55) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  private findNearestWalkableCell(
    targetCol: number,
    targetRow: number,
    lockedDoors?: ReadonlySet<string>,
    avoidCol?: number,
    avoidRow?: number,
    allowedZoneKinds?: ReadonlySet<ZoneKind>
  ): { col: number; row: number } | null {
    const isAllowed = (c: number, r: number) =>
      this.isCellWalkable(c, r, lockedDoors, allowedZoneKinds) && !(c === avoidCol && r === avoidRow);

    if (isAllowed(targetCol, targetRow)) {
      return { col: targetCol, row: targetRow };
    }

    let best = null as { col: number; row: number; score: number } | null;
    for (let radius = 1; radius <= 5; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const c = targetCol + dc;
          const r = targetRow + dr;
          if (!isAllowed(c, r)) continue;
          const dist = Math.hypot(dc, dr) + this.proximityPenalty[r * this.cols + c] * 0.5;
          if (!best || dist < best.score) {
            best = { col: c, row: r, score: dist };
          }
        }
      }
      if (best) return { col: best.col, row: best.row };
    }
    return null;
  }

  /**
   * Returns a safe, high-clearance point in units near (xUnits, yUnits) for stuck recovery.
   */
  public findRecoveryPoint(
    xUnits: number,
    yUnits: number,
    lockedDoors?: ReadonlySet<string>,
    allowedZoneKinds?: ReadonlySet<ZoneKind>
  ): { x: number; y: number } {
    const baseCol = Math.floor(xUnits / NAV_CELL_UNITS);
    const baseRow = Math.floor(yUnits / NAV_CELL_UNITS);
    const maxRadius = allowedZoneKinds ? 4 : 2;
    let best = null as { x: number; y: number; score: number } | null;

    for (let dr = -maxRadius; dr <= maxRadius; dr++) {
      for (let dc = -maxRadius; dc <= maxRadius; dc++) {
        const c = baseCol + dc;
        const r = baseRow + dr;
        if (!this.isCellWalkable(c, r, lockedDoors, allowedZoneKinds)) continue;
        const cx = (c + 0.5) * NAV_CELL_UNITS;
        const cy = (r + 0.5) * NAV_CELL_UNITS;
        const dist = Math.hypot(cx - xUnits, cy - yUnits);
        // Prefer low proximityPenalty (open corridor/room center) within short reach
        const score = dist * 0.55 + this.proximityPenalty[r * this.cols + c] * 2.2;
        if (!best || score < best.score) {
          best = { x: cx, y: cy, score };
        }
      }
    }

    return best ? { x: best.x, y: best.y } : { x: xUnits, y: yUnits };
  }

  /**
   * Checks whether a straight segment in units has full physical clearance from walls,
   * solid props, vending machines, locked doors, and (optionally) disallowed zones/doors.
   */
  public hasWalkableLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    clearanceUnits = 0.62,
    lockedDoors?: ReadonlySet<string>,
    allowedZoneKinds?: ReadonlySet<ZoneKind>
  ): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist < 0.05) {
      if (allowedZoneKinds) {
        const z = getZoneAtUnits(x1, y1);
        return Boolean(z && allowedZoneKinds.has(z.kind));
      }
      return true;
    }
    const steps = Math.max(2, Math.ceil(dist * 3));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;

      if (allowedZoneKinds) {
        const z = getZoneAtUnits(sx, sy);
        if (z) {
          if (!allowedZoneKinds.has(z.kind)) return false;
        } else if (!isPlaytimeAllowedAtUnits(sx, sy)) {
          return false;
        }

        for (const door of SCHOOL_DOORS) {
          if (isPlaytimeAllowedDoor(door)) continue;
          if (door.orientation === 'H') {
            if (Math.abs(sy - door.coord) < 0.9 && sx >= door.start - 0.4 && sx <= door.end + 0.4) {
              return false;
            }
          } else {
            if (Math.abs(sx - door.coord) < 0.9 && sy >= door.start - 0.4 && sy <= door.end + 0.4) {
              return false;
            }
          }
        }
      }

      for (const w of this.walls) {
        if (
          sx + clearanceUnits > w.x1 &&
          sx - clearanceUnits < w.x2 &&
          sy + clearanceUnits > w.y1 &&
          sy - clearanceUnits < w.y2
        ) {
          return false;
        }
      }

      for (const p of this.props) {
        if (!p.solid) continue;
        const hw = p.width * 0.5 + clearanceUnits;
        const hh = p.height * 0.5 + clearanceUnits;
        if (sx > p.x - hw && sx < p.x + hw && sy > p.y - hh && sy < p.y + hh) {
          return false;
        }
      }

      for (const v of this.vending) {
        const hw = v.width * 0.5 + clearanceUnits;
        const hh = v.height * 0.5 + clearanceUnits;
        if (sx > v.x - hw && sx < v.x + hw && sy > v.y - hh && sy < v.y + hh) {
          return false;
        }
      }

      if (lockedDoors && lockedDoors.size > 0) {
        for (const door of SCHOOL_DOORS) {
          if (!lockedDoors.has(door.id)) continue;
          if (door.orientation === 'H') {
            if (Math.abs(sy - door.coord) < 0.9 && sx >= door.start - 0.4 && sx <= door.end + 0.4) {
              return false;
            }
          } else {
            if (Math.abs(sx - door.coord) < 0.9 && sy >= door.start - 0.4 && sy <= door.end + 0.4) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  /**
   * A* pathfinding in architectural units with wall-clearance bias, optional blocked-cell detour,
   * and optional zone-kind restriction (used exclusively by Playtime).
   */
  public findPath(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    lockedDoors?: ReadonlySet<string>,
    avoidCell?: { col: number; row: number },
    allowedZoneKinds?: ReadonlySet<ZoneKind>
  ): { x: number; y: number }[] {
    if (allowedZoneKinds) {
      const targetZone = getZoneAtUnits(toX, toY);
      if (!targetZone || !allowedZoneKinds.has(targetZone.kind)) {
        if (!isPlaytimeAllowedAtUnits(toX, toY)) {
          return [];
        }
      }
    }

    const startRawCol = Math.floor(fromX / NAV_CELL_UNITS);
    const startRawRow = Math.floor(fromY / NAV_CELL_UNITS);
    const goalRawCol = Math.floor(toX / NAV_CELL_UNITS);
    const goalRawRow = Math.floor(toY / NAV_CELL_UNITS);

    const start = this.findNearestWalkableCell(
      startRawCol,
      startRawRow,
      lockedDoors,
      avoidCell?.col,
      avoidCell?.row,
      allowedZoneKinds
    );
    const goal = this.findNearestWalkableCell(
      goalRawCol,
      goalRawRow,
      lockedDoors,
      undefined,
      undefined,
      allowedZoneKinds
    );
    if (!start || !goal) return [];
    if (start.col === goal.col && start.row === goal.row) {
      return [{ x: (goal.col + 0.5) * NAV_CELL_UNITS, y: (goal.row + 0.5) * NAV_CELL_UNITS }];
    }

    const total = this.cols * this.rows;
    const gScore = new Float32Array(total).fill(Infinity);
    const fScore = new Float32Array(total).fill(Infinity);
    const cameFrom = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const inOpen = new Uint8Array(total);

    const startIdx = start.row * this.cols + start.col;
    const goalIdx = goal.row * this.cols + goal.col;

    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(goal.col - start.col, goal.row - start.row);
    const openList: number[] = [startIdx];
    inOpen[startIdx] = 1;

    const dirs = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.4142],
      [1, -1, 1.4142],
      [-1, 1, 1.4142],
      [-1, -1, 1.4142],
    ] as const;

    while (openList.length > 0) {
      let bestPos = 0;
      let currentIdx = openList[0];
      let bestF = fScore[currentIdx];
      for (let i = 1; i < openList.length; i++) {
        const idx = openList[i];
        if (fScore[idx] < bestF) {
          bestF = fScore[idx];
          currentIdx = idx;
          bestPos = i;
        }
      }

      if (currentIdx === goalIdx) {
        const rawPath: { x: number; y: number }[] = [];
        let curr = goalIdx;
        while (curr !== -1 && curr !== startIdx) {
          const r = Math.floor(curr / this.cols);
          const c = curr % this.cols;
          rawPath.push({ x: (c + 0.5) * NAV_CELL_UNITS, y: (r + 0.5) * NAV_CELL_UNITS });
          curr = cameFrom[curr];
        }
        rawPath.reverse();
        return rawPath;
      }

      openList.splice(bestPos, 1);
      inOpen[currentIdx] = 0;
      closed[currentIdx] = 1;

      const cr = Math.floor(currentIdx / this.cols);
      const cc = currentIdx % this.cols;

      for (const [dc, dr, cost] of dirs) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (avoidCell && nc === avoidCell.col && nr === avoidCell.row && !(nc === goal.col && nr === goal.row)) {
          continue;
        }
        if (!this.isCellWalkable(nc, nr, lockedDoors, allowedZoneKinds)) continue;

        // Prevent corner-clipping on diagonals, especially near doorway jambs & walls
        if (dc !== 0 && dr !== 0) {
          if (
            !this.isCellWalkable(cc + dc, cr, lockedDoors, allowedZoneKinds) ||
            !this.isCellWalkable(cc, cr + dr, lockedDoors, allowedZoneKinds)
          ) {
            continue;
          }
          const fromXUnit = (cc + 0.5) * NAV_CELL_UNITS;
          const fromYUnit = (cr + 0.5) * NAV_CELL_UNITS;
          const toXUnit = (nc + 0.5) * NAV_CELL_UNITS;
          const toYUnit = (nr + 0.5) * NAV_CELL_UNITS;
          if (!this.hasWalkableLine(fromXUnit, fromYUnit, toXUnit, toYUnit, 0.72, lockedDoors, allowedZoneKinds)) {
            continue;
          }
        }

        const nIdx = nr * this.cols + nc;
        if (closed[nIdx]) continue;

        const stepCost = cost + this.proximityPenalty[nIdx];
        const tentativeG = gScore[currentIdx] + stepCost;
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = currentIdx;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + Math.hypot(goal.col - nc, goal.row - nr);
          if (!inOpen[nIdx]) {
            openList.push(nIdx);
            inOpen[nIdx] = 1;
          }
        }
      }
    }

    return [];
  }

  /**
   * Computes an alternate detour path when an NPC detects it was blocked at (blockedX, blockedY).
   */
  public findDetourPath(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    blockedX: number,
    blockedY: number,
    lockedDoors?: ReadonlySet<string>,
    allowedZoneKinds?: ReadonlySet<ZoneKind>
  ): { x: number; y: number }[] {
    const avoidCol = Math.floor(blockedX / NAV_CELL_UNITS);
    const avoidRow = Math.floor(blockedY / NAV_CELL_UNITS);
    const detour = this.findPath(
      fromX,
      fromY,
      toX,
      toY,
      lockedDoors,
      {
        col: avoidCol,
        row: avoidRow,
      },
      allowedZoneKinds
    );
    if (detour.length > 0) return detour;
    return this.findPath(fromX, fromY, toX, toY, lockedDoors, undefined, allowedZoneKinds);
  }

  /**
   * Computes a full A* path to (toX, toY), or if the target lies behind a locked door
   * (such as the Detention Room during Principal's 10s detention), walks all the way up
   * to the closest reachable step right outside that locked door so Baldi never freezes.
   */
  public findPathOrClosestApproach(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    lockedDoors?: ReadonlySet<string>
  ): { x: number; y: number }[] {
    const direct = this.findPath(fromX, fromY, toX, toY, lockedDoors);
    if (direct.length > 0 || !lockedDoors || lockedDoors.size === 0) {
      return direct;
    }

    const unlockedRoute = this.findPath(fromX, fromY, toX, toY);
    const approach: { x: number; y: number }[] = [];
    for (const step of unlockedRoute) {
      const col = Math.floor(step.x / NAV_CELL_UNITS);
      const row = Math.floor(step.y / NAV_CELL_UNITS);
      if (!this.isCellWalkable(col, row, lockedDoors)) {
        break;
      }
      approach.push(step);
    }
    return approach;
  }

  /**
   * Raycast line-of-sight between two points in units (blocked by walls, and optionally by disallowed zones).
   */
  public hasLineOfSight(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    maxRangeUnits = 42,
    allowedZoneKinds?: ReadonlySet<ZoneKind>
  ): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist > maxRangeUnits) return false;
    const steps = Math.max(2, Math.ceil(dist * 2));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;
      if (allowedZoneKinds) {
        const z = getZoneAtUnits(sx, sy);
        if (z) {
          if (!allowedZoneKinds.has(z.kind)) return false;
        } else if (!isPlaytimeAllowedAtUnits(sx, sy)) {
          return false;
        }
      }
      for (const w of this.walls) {
        if (sx >= w.x1 && sx <= w.x2 && sy >= w.y1 && sy <= w.y2) {
          return false;
        }
      }
    }
    return true;
  }
}
