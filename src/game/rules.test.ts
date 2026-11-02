import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DifficultyLevel,
  getDifficultyLabel,
  getQuestionByNotebookId,
  QUESTION_DATABASE,
  validateNotebookAnswer,
} from './QuestionDatabase';
import { GameState, GameStateManager, isBaldiPursuitState } from './GameState';
import {
  computeJoystickVector,
  detectControlMode,
  InputCapabilitySignals,
} from './inputPlatform';
import { ITEM_METADATA, ItemType } from './InventoryManager';
import { PrincipalAudioController, PrincipalAudioPorts } from './PrincipalAudioController';
import {
  PROPORTION_NOTES_HEADER,
  solveCrossMultiplicationMethod,
  solveProportionMethod,
  solveUnitaryMethod,
  THREE_PROPORTION_METHODS,
  UNDERSTANDING_PROPORTION_POINTS,
  WORKED_EXAMPLE_PROBLEM,
} from './proportionNotes';
import {
  BALDI_START_UNITS,
  BULLY_HALLWAY_SPOTS,
  BULLY_MIN_NPC_DIST_UNITS,
  BULLY_MIN_PLAYER_DIST_UNITS,
  compileArchitecturalWalls,
  DETENTION_SPAWN_UNITS,
  FURNITURE_PROPS,
  getZoneAtUnits,
  isPlaytimeAllowedAtUnits,
  isPlaytimeAllowedDoor,
  ITEM_SPAWNS,
  NOTEBOOK_SPAWNS,
  pickRandomBullySpot,
  PLAYER_START_UNITS,
  PLAYTIME_ALLOWED_ZONE_KINDS,
  PLAYTIME_PATROL_POINTS,
  SCHOOL_DOORS,
  SCHOOL_EXITS,
  SCHOOL_ZONES,
  SchoolNavGrid,
  VENDING_MACHINES,
  WALL_THICKNESS_UNITS,
} from './MapLayout';

test('QuestionDatabase contains 7 Kadaran questions with 2 Easy, 2 Medium, 3 Hard distribution', () => {
  assert.equal(QUESTION_DATABASE.length, 7);
  const easy = QUESTION_DATABASE.filter((q) => q.difficulty === DifficultyLevel.EASY).length;
  const med = QUESTION_DATABASE.filter((q) => q.difficulty === DifficultyLevel.MEDIUM).length;
  const hard = QUESTION_DATABASE.filter((q) => q.difficulty === DifficultyLevel.HARD).length;
  assert.equal(easy, 2);
  assert.equal(med, 2);
  assert.equal(hard, 3);

  // Validate exact correct answers specified in syllabus prompt
  assert.equal(validateNotebookAnswer(1, 'B'), true); // RM15
  assert.equal(validateNotebookAnswer(2, 'C'), true); // 10
  assert.equal(validateNotebookAnswer(3, 'C'), true); // RM49
  assert.equal(validateNotebookAnswer(4, 'C'), true); // 225 km
  assert.equal(validateNotebookAnswer(5, 'C'), true); // 420
  assert.equal(validateNotebookAnswer(6, 'C'), true); // 8.4 kg
  assert.equal(validateNotebookAnswer(7, 'C'), true); // 22 litres
  assert.equal(validateNotebookAnswer(1, 'A'), false);
});

test('Notebook wrong answer triggers 10s cooldown, retains exact question, and increases Baldi speed progressively', () => {
  const gs = new GameStateManager();
  gs.startNewGame();
  assert.equal(gs.getBaldiSpeedPercent(), 100);

  const originalQ = getQuestionByNotebookId(1).question;

  // Open Notebook 1 and answer wrong
  assert.equal(gs.tryOpenNotebook(1).opened, true);
  assert.equal(gs.getState(), GameState.NOTEBOOK_QUESTION);

  const resWrong = gs.submitNotebookAnswer(1, 'A');
  assert.equal(resWrong.correct, false);
  assert.equal(gs.getCompletedNotebookCount(), 0);
  assert.equal(gs.getBaldiSpeedPercent(), 110);
  assert.equal(gs.getEffectiveState(), GameState.NOTEBOOK_COOLDOWN);

  const nb1 = gs.getNotebookStatus(1)!;
  assert.equal(nb1.cooldownRemaining, 10);

  // Cannot reopen during 10s cooldown
  assert.equal(gs.tryOpenNotebook(1).opened, false);
  assert.equal(gs.tryOpenNotebook(1).reason, 'cooldown');

  // Tick 5 seconds -> still locked at 5s
  gs.tick(5);
  assert.equal(gs.getNotebookStatus(1)!.cooldownRemaining, 5);
  assert.equal(gs.tryOpenNotebook(1).opened, false);

  // Tick remaining 5 seconds -> automatically reactivated with SAME question!
  gs.tick(5);
  assert.equal(gs.getNotebookStatus(1)!.cooldownRemaining, 0);
  assert.equal(getQuestionByNotebookId(1).question, originalQ);
  assert.equal(gs.tryOpenNotebook(1).opened, true);

  // Answering correctly updates progress to 1/7 and does NOT reset Baldi's 110% speed
  const resCorrect = gs.submitNotebookAnswer(1, 'B');
  assert.equal(resCorrect.correct, true);
  assert.equal(gs.getCompletedNotebookCount(), 1);
  assert.equal(gs.getBaldiSpeedPercent(), 110);

  // Cannot complete same notebook twice
  assert.equal(gs.tryOpenNotebook(1).opened, false);
  assert.equal(gs.tryOpenNotebook(1).reason, 'completed');
});

test('Completing all 7 notebooks triggers FINAL_ESCAPE state and enables victory at exit', () => {
  const gs = new GameStateManager();
  gs.startNewGame();

  // Cannot escape before 7 notebooks
  assert.equal(gs.triggerVictory(), false);

  const answers = ['B', 'C', 'C', 'C', 'C', 'C', 'C'] as const;
  for (let id = 1; id <= 7; id++) {
    assert.equal(gs.tryOpenNotebook(id).opened, true);
    const out = gs.submitNotebookAnswer(id, answers[id - 1], 'EXIT_NORTH');
    assert.equal(out.correct, true);
    if (id === 7) {
      assert.equal(out.triggeredFinalEscape, true);
    }
  }

  assert.equal(gs.getState(), GameState.FINAL_ESCAPE);
  assert.equal(gs.getCompletedNotebookCount(), 7);
  assert.equal(gs.triggerVictory(), true);
  assert.equal(gs.getState(), GameState.VICTORY);
});

test('Baldi attacks reduce hearts with invulnerability and trigger full reset on final heart', () => {
  const gs = new GameStateManager();
  gs.startNewGame();

  const hit1 = gs.applyBaldiAttack();
  assert.equal(hit1.damaged, true);
  assert.equal(hit1.remainingLives, 2);
  assert.equal(gs.getEffectiveState(), GameState.DAMAGE_INVULNERABILITY);

  // Immediate follow-up collision during invulnerability does zero damage
  const blockedHit = gs.applyBaldiAttack();
  assert.equal(blockedHit.damaged, false);
  assert.equal(blockedHit.remainingLives, 2);

  gs.tick(3.0);
  const hit2 = gs.applyBaldiAttack();
  assert.equal(hit2.remainingLives, 1);

  gs.tick(3.0);
  const hit3 = gs.applyBaldiAttack();
  assert.equal(hit3.triggeredGameOver, true);
  assert.equal(gs.getState(), GameState.GAME_OVER);
  // Progress reset cleanly
  assert.equal(gs.getCompletedNotebookCount(), 0);
  assert.equal(gs.getSnapshot().lives, 3);
  assert.equal(gs.getBaldiSpeedPercent(), 100);
});

test('Principal detention, Playtime 3-jump challenge, and Bully item theft enforce rules and prevent state conflicts', () => {
  const gs = new GameStateManager();
  gs.startNewGame();
  gs.inventory.addItem(ItemType.BSODA);
  gs.inventory.addItem(ItemType.ZESTY_BAR);

  // Bully steals all items without touching notebooks or lives
  assert.equal(gs.tryOpenNotebook(1).opened, true);
  gs.submitNotebookAnswer(1, 'B');
  const stolen = gs.triggerBullyEncounter();
  assert.equal(stolen.length, 2);
  assert.equal(gs.inventory.countItems(), 0);
  assert.equal(gs.getCompletedNotebookCount(), 1);
  assert.equal(gs.getSnapshot().lives, 3);

  // Principal Detention: 10 seconds, blocks movement & notebooks & Playtime
  assert.equal(gs.startPrincipalDetention(), true);
  assert.equal(gs.getState(), GameState.PRINCIPAL_DETENTION);
  assert.equal(gs.canPlayerMove(), false);
  assert.equal(gs.tryOpenNotebook(2).opened, false);
  assert.equal(gs.startPlaytimeChallenge(), false);

  gs.tick(10.1);
  assert.equal(gs.getState(), GameState.PLAYING);
  assert.equal(gs.canPlayerMove(), true);

  // Playtime 3-jump challenge: resets to 0/3 on miss, releases on 3/3
  assert.equal(gs.startPlaytimeChallenge(), true);
  assert.equal(gs.tryOpenNotebook(2).opened, false);
  const cycleRef = { jumped: false };

  // Advance into sweet spot [0.36, 0.64] -> 0.5 / 0.72 = ~0.69s
  gs.advancePlaytimeRope(0.7, cycleRef);
  assert.equal(gs.attemptPlaytimeJump(cycleRef).outcome, 'hit');
  assert.equal(gs.getSnapshot().playtime.jumpsCompleted, 1);

  // Jump immediately again in same cycle -> miss -> resets to 0/3!
  assert.equal(gs.attemptPlaytimeJump(cycleRef).outcome, 'miss');
  assert.equal(gs.getSnapshot().playtime.jumpsCompleted, 0);

  // Now complete 3 uninterrupted jumps
  for (let j = 1; j <= 3; j++) {
    cycleRef.jumped = false;
    // Set phase cleanly into sweet spot via advancing from ~0.05 by 0.62s (+0.446 -> ~0.496)
    gs.advancePlaytimeRope(0.62, cycleRef);
    const out = gs.attemptPlaytimeJump(cycleRef);
    if (j < 3) {
      assert.equal(out.outcome, 'hit');
      // Advance past cycle wrap (1.0) into next cycle ~0.05
      gs.advancePlaytimeRope(0.77, cycleRef);
    } else {
      assert.equal(out.outcome, 'completed');
    }
  }
  assert.equal(gs.getState(), GameState.PLAYING);
});

test('Architectural MapLayout has single-layer 0.8-unit walls, open corridors, valid doorways, and 100% A* reachability', () => {
  const walls = compileArchitecturalWalls(SCHOOL_ZONES, SCHOOL_DOORS);
  assert.ok(walls.length > 20, 'Should generate shared boundary wall segments');

  // 1. Check wall thickness is strictly within 0.5 - 1.0 units
  for (const w of walls) {
    assert.ok(w.thickness >= 0.5 && w.thickness <= 1.0);
    assert.equal(w.thickness, WALL_THICKNESS_UNITS);
  }

  // 2. Verify NO two parallel walls overlap each other (strictly single-layer!)
  const hWalls = walls.filter((w) => w.orientation === 'H');
  for (let i = 0; i < hWalls.length; i++) {
    for (let j = i + 1; j < hWalls.length; j++) {
      if (Math.abs(hWalls[i].coord - hWalls[j].coord) < 1e-3) {
        const overlap = Math.min(hWalls[i].end, hWalls[j].end) - Math.max(hWalls[i].start, hWalls[j].start);
        assert.ok(overlap <= 1e-3, `Overlapping horizontal walls: ${hWalls[i].id} & ${hWalls[j].id}`);
      }
    }
  }
  const vWalls = walls.filter((w) => w.orientation === 'V');
  for (let i = 0; i < vWalls.length; i++) {
    for (let j = i + 1; j < vWalls.length; j++) {
      if (Math.abs(vWalls[i].coord - vWalls[j].coord) < 1e-3) {
        const overlap = Math.min(vWalls[i].end, vWalls[j].end) - Math.max(vWalls[i].start, vWalls[j].start);
        assert.ok(overlap <= 1e-3, `Overlapping vertical walls: ${vWalls[i].id} & ${vWalls[j].id}`);
      }
    }
  }

  // 3. Verify every Door sits inside a wall cutout (no wall segment blocks the midpoint of any doorway)
  //    and connects two accessible spaces!
  for (const door of SCHOOL_DOORS) {
    const mid = (door.start + door.end) * 0.5;
    const dx = door.orientation === 'H' ? mid : door.coord;
    const dy = door.orientation === 'H' ? door.coord : mid;

    for (const w of walls) {
      const insideWall = dx > w.x1 + 0.05 && dx < w.x2 - 0.05 && dy > w.y1 + 0.05 && dy < w.y2 - 0.05;
      assert.equal(insideWall, false, `Door ${door.id} midpoint is blocked by wall ${w.id}`);
    }

    if (door.kind !== 'EXIT') {
      const sideA =
        door.orientation === 'H'
          ? getZoneAtUnits(dx, dy - 1.5, SCHOOL_ZONES)
          : getZoneAtUnits(dx - 1.5, dy, SCHOOL_ZONES);
      const sideB =
        door.orientation === 'H'
          ? getZoneAtUnits(dx, dy + 1.5, SCHOOL_ZONES)
          : getZoneAtUnits(dx + 1.5, dy, SCHOOL_ZONES);
      assert.ok(sideA && sideB, `Interior door ${door.id} must connect two walkable zones`);
    }
  }

  // 4. Verify A* Pathfinding reaches ALL 7 Notebooks, ALL 4 Exits, Detention, Principal's Office, Lock Room, Canteen, Staff Room!
  const nav = new SchoolNavGrid(walls, FURNITURE_PROPS, VENDING_MACHINES);

  for (const nb of NOTEBOOK_SPAWNS) {
    const path = nav.findPath(PLAYER_START_UNITS.x, PLAYER_START_UNITS.y, nb.x, nb.y);
    assert.ok(
      path.length > 0,
      `Notebook #${nb.notebookId} in ${nb.roomName} must be reachable via A* from Player Start`
    );
  }

  for (const item of ITEM_SPAWNS) {
    const path = nav.findPath(PLAYER_START_UNITS.x, PLAYER_START_UNITS.y, item.x, item.y);
    assert.ok(path.length > 0, `Item ${item.id} in ${item.roomName} must be reachable via A*`);
  }

  for (const ex of SCHOOL_EXITS) {
    const path = nav.findPath(PLAYER_START_UNITS.x, PLAYER_START_UNITS.y, ex.triggerX, ex.triggerY);
    assert.ok(path.length > 0, `School exit ${ex.id} must be reachable via A*`);
  }

  const detPath = nav.findPath(
    PLAYER_START_UNITS.x,
    PLAYER_START_UNITS.y,
    DETENTION_SPAWN_UNITS.x,
    DETENTION_SPAWN_UNITS.y
  );
  assert.ok(detPath.length > 0, 'Detention Room must be reachable via A*');
});

test('NPC SchoolNavGrid clearance, recovery point, and detour pathfinding avoid wall corners and locked doorways', () => {
  const walls = compileArchitecturalWalls(SCHOOL_ZONES, SCHOOL_DOORS);
  const nav = new SchoolNavGrid(walls, FURNITURE_PROPS, VENDING_MACHINES);

  // Open corridor & centered doorway lines are walkable; segment across solid Classroom A wall (x=68, y=112) is rejected
  assert.equal(nav.hasWalkableLine(74, 136, 74, 120), true);
  assert.equal(nav.hasWalkableLine(64, 119, 72, 119), true);
  assert.equal(nav.hasWalkableLine(64, 112, 72, 112), false);

  // Recovery point pulls an NPC snagged near Classroom A's wall jamb (68, 123) into safe clearance
  const rec = nav.findRecoveryPoint(68.1, 122.8);
  assert.equal(nav.hasWalkableLine(rec.x, rec.y, rec.x, rec.y), true);
  const col = Math.floor(rec.x / 2);
  const row = Math.floor(rec.y / 2);
  assert.equal(nav.isCellWalkable(col, row), true);

  // Detour path avoids a blocked corridor cell and still reaches Classroom A notebook
  const normalPath = nav.findPath(BALDI_START_UNITS.x, BALDI_START_UNITS.y, 56, 119);
  assert.ok(normalPath.length > 3);
  const midStep = normalPath[Math.floor(normalPath.length / 2)];
  const detour = nav.findDetourPath(
    BALDI_START_UNITS.x,
    BALDI_START_UNITS.y,
    56,
    119,
    midStep.x,
    midStep.y
  );
  assert.ok(detour.length > 0, 'Detour path must still reach target classroom');
  const blockedCol = Math.floor(midStep.x / 2);
  const blockedRow = Math.floor(midStep.y / 2);
  for (const pt of detour) {
    assert.equal(
      Math.floor(pt.x / 2) === blockedCol && Math.floor(pt.y / 2) === blockedRow,
      false,
      'Detour path must bypass the obstructed cell'
    );
  }

  // Restricted Lock Room has two doors; locking West door routes NPCs cleanly through East Wing
  const lockedWest = new Set<string>(['DOOR_LOCK_WEST']);
  const routeViaEast = nav.findPath(104, 116, 120, 116, lockedWest);
  assert.ok(routeViaEast.length > 0, 'NPC should reroute around a single locked door when an alternate door is open');
  const bothLocked = new Set<string>(['DOOR_LOCK_WEST', 'DOOR_LOCK_EAST']);
  const routeBlocked = nav.findPath(104, 116, 120, 116, bothLocked);
  assert.equal(routeBlocked.length, 0, 'NPC respects fully locked restricted room');
});

test('Bully random hallway appearance spans full 12-unit corridors and avoids player, NPCs, and repeats', () => {
  const walls = compileArchitecturalWalls(SCHOOL_ZONES, SCHOOL_DOORS);
  const nav = new SchoolNavGrid(walls, FURNITURE_PROPS, VENDING_MACHINES);

  assert.ok(BULLY_HALLWAY_SPOTS.length >= 8);
  for (const spot of BULLY_HALLWAY_SPOTS) {
    assert.equal(spot.spanUnits, 12, `Bully spot ${spot.id} must span full 12-unit hallway`);
    const zone = getZoneAtUnits(spot.x, spot.y, SCHOOL_ZONES);
    assert.ok(zone && zone.kind === 'CORRIDOR', `Bully spot ${spot.id} must be inside a hallway`);
    const path = nav.findPath(PLAYER_START_UNITS.x, PLAYER_START_UNITS.y, spot.x, spot.y);
    assert.ok(path.length > 0, `Bully spot ${spot.id} must be reachable`);
  }

  const playerNearWestNorth = { x: 24, y: 40 };
  const npcs = [
    { x: 104, y: 134 }, // on SOUTH_EAST
    { x: 50, y: 86 },   // on CENTRAL_VENDING_W
  ];
  const distinctChosen = new Set<string>();
  let lastId: string | null = 'EAST_WING';

  for (let i = 0; i < 20; i++) {
    const rngVal = (i * 0.137) % 1;
    const picked = pickRandomBullySpot(BULLY_HALLWAY_SPOTS, playerNearWestNorth, npcs, lastId, () => rngVal);
    assert.notEqual(picked.id, lastId, 'Should not immediately repeat previous hallway spot');
    assert.ok(
      Math.hypot(picked.x - playerNearWestNorth.x, picked.y - playerNearWestNorth.y) >= BULLY_MIN_PLAYER_DIST_UNITS,
      'Must not spawn on top of player'
    );
    for (const npc of npcs) {
      assert.ok(
        Math.hypot(picked.x - npc.x, picked.y - npc.y) >= BULLY_MIN_NPC_DIST_UNITS,
        'Must not spawn on top of NPCs'
      );
    }
    distinctChosen.add(picked.id);
    lastId = picked.id;
  }
  assert.ok(distinctChosen.size >= 4, 'Bully hallway selection should vary across multiple corridors');
});

test('Baldi Final Aggressive Form activates strictly at 7/7 notebooks with furious speed, banner, and Main Exit objective', () => {
  const gs = new GameStateManager();
  gs.startNewGame();

  const answers = ['B', 'C', 'C', 'C', 'C', 'C', 'C'] as const;

  // Collect first 6 notebooks cleanly: final aggressive mode MUST NOT activate yet
  for (let id = 1; id <= 6; id++) {
    assert.equal(gs.tryOpenNotebook(id).opened, true);
    const res = gs.submitNotebookAnswer(id, answers[id - 1]);
    assert.equal(res.correct, true);
    assert.equal(res.triggeredFinalEscape, false);
    assert.equal(gs.getState(), GameState.PLAYING);
    assert.equal(gs.getBaldiSpeedPercent(), 100);
  }

  // Collect 7th notebook: triggers Baldi's Final Aggressive Form & Main Exit (EXIT_SOUTH)
  assert.equal(gs.tryOpenNotebook(7).opened, true);
  const seventh = gs.submitNotebookAnswer(7, answers[6]);
  assert.equal(seventh.correct, true);
  assert.equal(seventh.triggeredFinalEscape, true);

  const snap = gs.getSnapshot();
  assert.equal(snap.state, GameState.FINAL_ESCAPE);
  assert.equal(snap.notebooksCompletedCount, 7);
  assert.equal(snap.activeExitId, 'EXIT_SOUTH');
  assert.ok(snap.baldiSpeedMultiplier >= 1.65, 'Baldi speed must surge significantly in 7/7 final form');
  assert.ok(gs.getBaldiSpeedPercent() >= 165);
  assert.equal(snap.notificationBanner?.text, 'KESEMUA 7 BUKU NOTA DIKUMPULKAN! BALDI AMAT BERANG!');
});

test('Playtime interaction never pauses Baldi pursuit, furious state, or Baldi attacks', () => {
  assert.equal(isBaldiPursuitState(GameState.PLAYING), true);
  assert.equal(isBaldiPursuitState(GameState.FINAL_ESCAPE), true);
  assert.equal(isBaldiPursuitState(GameState.PLAYTIME_CHALLENGE), true);
  assert.equal(isBaldiPursuitState(GameState.PRINCIPAL_DETENTION), true);
  assert.equal(isBaldiPursuitState(GameState.PAUSED), false);
  assert.equal(isBaldiPursuitState(GameState.NOTEBOOK_QUESTION), false);
  assert.equal(isBaldiPursuitState(GameState.MAIN_MENU), false);

  const gs = new GameStateManager();
  gs.startNewGame();

  // Start Playtime jump-rope: player movement is restricted, but Baldi pursuit & attack stay active!
  assert.equal(gs.startPlaytimeChallenge(), true);
  assert.equal(gs.getState(), GameState.PLAYTIME_CHALLENGE);
  assert.equal(gs.canPlayerMove(), false);
  assert.equal(gs.isBaldiPursuitActive(), true);

  // Baldi catches player DURING Playtime's jump-rope -> deals heart damage without canceling Playtime's minigame!
  const cycleRef = { jumped: false };
  gs.advancePlaytimeRope(0.7, cycleRef);
  assert.equal(gs.attemptPlaytimeJump(cycleRef).outcome, 'hit');
  assert.equal(gs.getSnapshot().playtime.jumpsCompleted, 1);

  const strikeDuringRope = gs.applyBaldiAttack();
  assert.equal(strikeDuringRope.damaged, true);
  assert.equal(strikeDuringRope.remainingLives, 2);
  assert.equal(gs.getState(), GameState.PLAYTIME_CHALLENGE, 'Non-lethal Baldi strike runs simultaneously without breaking Playtime state');
  assert.equal(gs.getSnapshot().playtime.jumpsCompleted, 1);

  // Pausing with P and resuming returns cleanly to PLAYTIME_CHALLENGE
  gs.togglePause();
  assert.equal(gs.getState(), GameState.PAUSED);
  assert.equal(gs.isBaldiPursuitActive(), false);
  gs.togglePause();
  assert.equal(gs.getState(), GameState.PLAYTIME_CHALLENGE);
  assert.equal(gs.isBaldiPursuitActive(), true);

  // Also verify during 7/7 Final Escape: Playtime interaction keeps Baldi's furious speed & state active
  gs.startNewGame();
  const answers = ['B', 'C', 'C', 'C', 'C', 'C', 'C'] as const;
  for (let id = 1; id <= 7; id++) {
    gs.tryOpenNotebook(id);
    gs.submitNotebookAnswer(id, answers[id - 1]);
  }
  assert.equal(gs.isFinalEscapeActive(), true);
  assert.equal(gs.startPlaytimeChallenge(), true);
  assert.equal(gs.isBaldiPursuitActive(), true);
  assert.equal(gs.isFinalEscapeActive(), true);
  assert.ok(gs.getBaldiSpeedPercent() >= 165);
});

test('Playtime restricted roaming permits ONLY hallways and Canteen while leaving Baldi and Principal unrestricted', () => {
  const walls = compileArchitecturalWalls(SCHOOL_ZONES, SCHOOL_DOORS);
  const nav = new SchoolNavGrid(walls, FURNITURE_PROPS, VENDING_MACHINES);

  // 1. Verify zone classification: ONLY CORRIDOR and CANTEEN are allowed for Playtime
  for (const zone of SCHOOL_ZONES) {
    const cx = (zone.x1 + zone.x2) * 0.5;
    const cy = (zone.y1 + zone.y2) * 0.5;
    const expectedAllowed = zone.kind === 'CORRIDOR' || zone.kind === 'CANTEEN';
    assert.equal(
      isPlaytimeAllowedAtUnits(cx, cy),
      expectedAllowed,
      `Zone ${zone.id} (${zone.kind}) Playtime permission mismatch`
    );
  }

  // 2. Verify door permissions: Playtime can pass ONLY DOUBLE doors (Canteen West/East & Hallway double doors)
  for (const door of SCHOOL_DOORS) {
    const mid = (door.start + door.end) * 0.5;
    const dx = door.orientation === 'H' ? mid : door.coord;
    const dy = door.orientation === 'H' ? door.coord : mid;
    assert.equal(isPlaytimeAllowedDoor(door), door.kind === 'DOUBLE');
    assert.equal(
      isPlaytimeAllowedAtUnits(dx, dy),
      door.kind === 'DOUBLE',
      `Door ${door.id} (${door.kind}) midpoint Playtime permission mismatch`
    );
  }

  // 3. Verify all PLAYTIME_PATROL_POINTS lie in hallways or Canteen (including Canteen interior)
  //    and every consecutive patrol leg connects strictly via CORRIDOR + CANTEEN cells
  let hasCanteenWaypoint = false;
  let hasCorridorWaypoint = false;
  for (let i = 0; i < PLAYTIME_PATROL_POINTS.length; i++) {
    const curr = PLAYTIME_PATROL_POINTS[i];
    const next = PLAYTIME_PATROL_POINTS[(i + 1) % PLAYTIME_PATROL_POINTS.length];
    const z = getZoneAtUnits(curr.x, curr.y);
    assert.ok(z, `Patrol point #${i} must be inside an interior zone`);
    assert.ok(
      z.kind === 'CORRIDOR' || z.kind === 'CANTEEN',
      `Patrol point #${i} (${z.id}) must be CORRIDOR or CANTEEN`
    );
    if (z.kind === 'CANTEEN') hasCanteenWaypoint = true;
    if (z.kind === 'CORRIDOR') hasCorridorWaypoint = true;

    const leg = nav.findPath(
      curr.x,
      curr.y,
      next.x,
      next.y,
      undefined,
      undefined,
      PLAYTIME_ALLOWED_ZONE_KINDS
    );
    assert.ok(leg.length > 0, `Playtime must navigate freely from patrol #${i} to next`);
    for (const step of leg) {
      assert.equal(
        isPlaytimeAllowedAtUnits(step.x, step.y),
        true,
        `Playtime patrol step (${step.x}, ${step.y}) entered a restricted room!`
      );
    }
  }
  assert.equal(hasCanteenWaypoint, true, 'Playtime patrol must include Canteen');
  assert.equal(hasCorridorWaypoint, true, 'Playtime patrol must include Hallways');

  // 4. Verify Playtime can cross Canteen West & East double doors freely in both directions
  assert.equal(
    nav.hasWalkableLine(25, 31, 35, 31, 0.58, undefined, PLAYTIME_ALLOWED_ZONE_KINDS),
    true,
    'Playtime must walk freely through West Canteen double door'
  );
  assert.equal(
    nav.hasWalkableLine(93, 31, 103, 31, 0.58, undefined, PLAYTIME_ALLOWED_ZONE_KINDS),
    true,
    'Playtime must walk freely through East Canteen double door'
  );

  // 5. Verify Playtime NEVER paths or walks into ANY restricted room (Classrooms A-D, Library, Science Lab,
  //    Computer Lab, Staff Room, Faculty Lounge, Media Annex, Principal's Office, Lock Room, Detention Room)
  const forbiddenTargets = [
    ...NOTEBOOK_SPAWNS.map((nb) => ({ label: nb.roomName, x: nb.x, y: nb.y })),
    { label: 'Classroom A just inside doorway', x: 66.5, y: 119 },
    { label: 'Staff Room', x: 40, y: 110 },
    { label: 'Faculty Lounge', x: 42, y: 70 },
    { label: 'Faculty Media Room', x: 59, y: 101 },
    { label: "Principal's Office", x: 120, y: 65 },
    { label: 'Lock Room', x: 120, y: 116 },
    { label: 'Detention Room', x: DETENTION_SPAWN_UNITS.x, y: DETENTION_SPAWN_UNITS.y },
  ];

  for (const target of forbiddenTargets) {
    assert.equal(
      isPlaytimeAllowedAtUnits(target.x, target.y),
      false,
      `${target.label} must be off-limits to Playtime`
    );
    const playPath = nav.findPath(
      74,
      119,
      target.x,
      target.y,
      undefined,
      undefined,
      PLAYTIME_ALLOWED_ZONE_KINDS
    );
    assert.equal(
      playPath.length,
      0,
      `Playtime findPath must refuse entering ${target.label}`
    );

    // Meanwhile, Baldi & Principal (unrestricted nav.findPath) MUST still reach every unlocked room!
    const unrestrictedPath = nav.findPath(74, 119, target.x, target.y);
    assert.ok(
      unrestrictedPath.length > 0,
      `Baldi and Principal must still enter ${target.label} without restriction`
    );
  }

  // Playtime cannot cut across Classroom A doorway or look/chase through Staff Room
  assert.equal(
    nav.hasWalkableLine(72, 119, 64, 119, 0.58, undefined, PLAYTIME_ALLOWED_ZONE_KINDS),
    false,
    'Playtime hasWalkableLine must block crossing Classroom A doorway'
  );
  assert.equal(
    nav.hasWalkableLine(72, 119, 64, 119, 0.58),
    true,
    'Baldi and Principal hasWalkableLine must still cross Classroom A doorway'
  );
  assert.equal(
    nav.hasLineOfSight(74, 119, 60, 119, 28, PLAYTIME_ALLOWED_ZONE_KINDS),
    false,
    'Playtime line-of-sight must not target a player inside Classroom A'
  );
});

test('Principal audio sequence enforces warning SFX, continuous pursuit music, synchronised 10..0 detention countdown, and repeated-detection reset while Baldi stays active', () => {
  const events: string[] = [];
  const ports: PrincipalAudioPorts = {
    playPrincipalWarning: () => events.push('warning'),
    playPrincipalDetentionCatch: () => events.push('detention_catch'),
    startSchoolMusic: () => events.push('music:school'),
    startHorrorEscapeMusic: () => events.push('music:horror'),
    startPrincipalPursuitMusic: () => events.push('music:pursuit'),
    stopMusic: () => events.push('music:stop'),
    startDetentionCountdown: (sec) => events.push(`countdown:start:${sec}`),
    syncDetentionCountdownTick: (sec) => events.push(`countdown:tick:${sec}`),
    stopDetentionCountdown: () => events.push('countdown:stop'),
    setSimulationPaused: (p) => events.push(`paused:${p}`),
  };

  const gs = new GameStateManager();
  gs.startNewGame();
  const controller = new PrincipalAudioController(ports);
  controller.resetForNewSession();
  events.length = 0; // Clear initial boot events

  // Normal hallway play: no duplicate school music restarts
  controller.sync({
    state: gs.getState(),
    isFinalEscape: false,
    principalJustDetectedViolation: false,
    principalIsPursuing: false,
    justEnteredDetention: false,
    detentionRemainingSeconds: 0,
  });
  assert.deepEqual(events, []);
  assert.equal(controller.getMode(), 'SCHOOL');

  // 1 & 2. Initial rule violation detected -> play distinctive warning ONCE + immediately start pursuit music
  controller.sync({
    state: gs.getState(),
    isFinalEscape: false,
    principalJustDetectedViolation: true,
    principalIsPursuing: true,
    justEnteredDetention: false,
    detentionRemainingSeconds: 0,
  });
  assert.deepEqual(events, ['warning', 'music:pursuit']);
  assert.equal(controller.getMode(), 'PRINCIPAL_PURSUIT');

  // 3. During chase (60 continuous frames + repeated sprinting infraction mid-chase):
  //    NEVER restart pursuit music or replay warning during the same chase!
  events.length = 0;
  for (let frame = 0; frame < 60; frame++) {
    controller.sync({
      state: gs.getState(),
      isFinalEscape: false,
      principalJustDetectedViolation: false,
      principalIsPursuing: true,
      justEnteredDetention: false,
      detentionRemainingSeconds: 0,
    });
  }
  assert.deepEqual(events, []);
  assert.equal(controller.getMode(), 'PRINCIPAL_PURSUIT');

  // 4. Principal catches player -> transfers to Detention Room:
  //    - Stop pursuit music
  //    - Play detention catch + start countdown at 10
  //    - Baldi pursuit remains 100% active during PRINCIPAL_DETENTION!
  assert.equal(gs.startPrincipalDetention(), true);
  assert.equal(gs.getState(), GameState.PRINCIPAL_DETENTION);
  assert.equal(gs.isBaldiPursuitActive(), true, 'Baldi AI must NEVER pause during Principal detention');

  controller.sync({
    state: gs.getState(),
    isFinalEscape: false,
    principalJustDetectedViolation: false,
    principalIsPursuing: false,
    justEnteredDetention: true,
    detentionRemainingSeconds: gs.getSnapshot().detentionRemaining,
  });
  assert.deepEqual(events, ['music:stop', 'detention_catch', 'countdown:start:10']);
  assert.equal(controller.getMode(), 'DETENTION_COUNTDOWN');

  // Step through all 10 seconds in 0.25s increments -> countdown ticks MUST stay 1:1 synchronised (9..1)
  // without duplicate ticks, and stop cleanly at 0 resuming normal SCHOOL music!
  events.length = 0;
  for (let step = 0; step < 40; step++) {
    gs.tick(0.25);
    const snap = gs.getSnapshot();
    controller.sync({
      state: snap.state,
      isFinalEscape: snap.isFinalEscape,
      principalJustDetectedViolation: false,
      principalIsPursuing: false,
      justEnteredDetention: false,
      detentionRemainingSeconds: snap.detentionRemaining,
    });
  }

  assert.equal(gs.getState(), GameState.PLAYING);
  assert.equal(controller.getMode(), 'SCHOOL');
  assert.deepEqual(events, [
    'countdown:tick:9',
    'countdown:tick:8',
    'countdown:tick:7',
    'countdown:tick:6',
    'countdown:tick:5',
    'countdown:tick:4',
    'countdown:tick:3',
    'countdown:tick:2',
    'countdown:tick:1',
    'countdown:stop',
    'music:school',
  ]);

  // 5. Repeated detection: committing a second rule violation resets & triggers the full sequence cleanly!
  events.length = 0;
  controller.sync({
    state: gs.getState(),
    isFinalEscape: false,
    principalJustDetectedViolation: true,
    principalIsPursuing: true,
    justEnteredDetention: false,
    detentionRemainingSeconds: 0,
  });
  assert.deepEqual(events, ['warning', 'music:pursuit']);
  assert.equal(controller.getMode(), 'PRINCIPAL_PURSUIT');

  // Escaping Principal's chase without getting caught transitions cleanly back to SCHOOL music
  events.length = 0;
  controller.sync({
    state: gs.getState(),
    isFinalEscape: false,
    principalJustDetectedViolation: false,
    principalIsPursuing: false,
    justEnteredDetention: false,
    detentionRemainingSeconds: 0,
  });
  assert.deepEqual(events, ['music:school']);
  assert.equal(controller.getMode(), 'SCHOOL');

  // Verify Baldi approach pathfinding during Detention when DOOR_DETENTION is locked:
  // Baldi must navigate all the way across the school right up to the outside of DOOR_DETENTION without freezing!
  const walls = compileArchitecturalWalls(SCHOOL_ZONES, SCHOOL_DOORS);
  const nav = new SchoolNavGrid(walls, FURNITURE_PROPS, VENDING_MACHINES);
  const lockedDetention = new Set<string>(['DOOR_DETENTION']);
  const approachPath = nav.findPathOrClosestApproach(
    PLAYER_START_UNITS.x,
    PLAYER_START_UNITS.y,
    DETENTION_SPAWN_UNITS.x,
    DETENTION_SPAWN_UNITS.y,
    lockedDetention
  );
  assert.ok(approachPath.length > 5, 'Baldi must actively path toward Detention even while DOOR_DETENTION is locked');
  const finalStep = approachPath[approachPath.length - 1];
  assert.ok(
    Math.hypot(finalStep.x - 98, finalStep.y - 70) < 6,
    'Baldi approach path should reach right outside the locked Detention Room door'
  );
});

test('Platform control detection uses touch/input capabilities (never screen size) and switches dynamically', () => {
  const desktopBase: InputCapabilitySignals = {
    pointerCoarse: false,
    pointerFine: true,
    anyPointerCoarse: false,
    anyPointerFine: true,
    hoverNone: false,
    anyHover: true,
    maxTouchPoints: 0,
    hasOntouchstart: false,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    lastDynamicInput: null,
  };

  // Standard desktop/laptop -> desktop mode regardless of window resizing (no viewport dimensions exist in signals)
  assert.equal(detectControlMode(desktopBase), 'desktop');

  // Mobile phone (iPhone) -> touch mode
  const iphoneSignals: InputCapabilitySignals = {
    pointerCoarse: true,
    pointerFine: false,
    anyPointerCoarse: true,
    anyPointerFine: false,
    hoverNone: true,
    anyHover: false,
    maxTouchPoints: 5,
    hasOntouchstart: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    lastDynamicInput: null,
  };
  assert.equal(detectControlMode(iphoneSignals), 'touch');

  // iPadOS 13+ requesting desktop website (MacIntel UA + multi-touch points) -> touch mode
  const ipadDesktopUASignals: InputCapabilitySignals = {
    pointerCoarse: true,
    pointerFine: false,
    anyPointerCoarse: true,
    anyPointerFine: false,
    hoverNone: true,
    anyHover: false,
    maxTouchPoints: 5,
    hasOntouchstart: true,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    platform: 'MacIntel',
    lastDynamicInput: null,
  };
  assert.equal(detectControlMode(ipadDesktopUASignals), 'touch');

  // iPadOS with Magic Keyboard / trackpad reporting fine pointer initially still recognized as iPad touch until keyboard used,
  // and switches cleanly between keyboard_game and touch
  const ipadWithTrackpad: InputCapabilitySignals = {
    ...ipadDesktopUASignals,
    pointerCoarse: false,
    pointerFine: true,
    anyPointerFine: true,
    anyHover: true,
  };
  assert.equal(detectControlMode(ipadWithTrackpad), 'touch');
  assert.equal(detectControlMode({ ...ipadWithTrackpad, lastDynamicInput: 'keyboard_game' }), 'desktop');
  assert.equal(detectControlMode({ ...ipadWithTrackpad, lastDynamicInput: 'touch' }), 'touch');

  // Android tablet -> touch mode
  const androidTabletSignals: InputCapabilitySignals = {
    pointerCoarse: true,
    pointerFine: false,
    anyPointerCoarse: true,
    anyPointerFine: false,
    hoverNone: true,
    anyHover: false,
    maxTouchPoints: 10,
    hasOntouchstart: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    platform: 'Linux armv8l',
    lastDynamicInput: null,
  };
  assert.equal(detectControlMode(androidTabletSignals), 'touch');

  // Windows laptop with secondary touchscreen (primary pointer is fine mouse/trackpad + hover) -> desktop by default,
  // switches to touch if user touches screen, and switches back to desktop on mouse or WASD key press
  const windowsTouchLaptop: InputCapabilitySignals = {
    pointerCoarse: false,
    pointerFine: true,
    anyPointerCoarse: true,
    anyPointerFine: true,
    hoverNone: false,
    anyHover: true,
    maxTouchPoints: 10,
    hasOntouchstart: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    platform: 'Win32',
    lastDynamicInput: null,
  };
  assert.equal(detectControlMode(windowsTouchLaptop), 'desktop');
  assert.equal(detectControlMode({ ...windowsTouchLaptop, lastDynamicInput: 'touch' }), 'touch');
  assert.equal(detectControlMode({ ...windowsTouchLaptop, lastDynamicInput: 'mouse' }), 'desktop');
  assert.equal(detectControlMode({ ...windowsTouchLaptop, lastDynamicInput: 'keyboard_game' }), 'desktop');
});

test('Virtual joystick vector math applies radial deadzone, circular clamping, and normalized analog output', () => {
  const idle = computeJoystickVector(0, 0, 50);
  assert.equal(idle.active, false);
  assert.equal(idle.nx, 0);
  assert.equal(idle.ny, 0);

  // Inside 14% radial deadzone -> inactive movement, slight visual knob tracking
  const deadzone = computeJoystickVector(4, 3, 50, 0.14); // dist = 5, 5/50 = 0.10 <= 0.14
  assert.equal(deadzone.active, false);
  assert.equal(deadzone.nx, 0);
  assert.equal(deadzone.ny, 0);

  // Full horizontal deflection beyond maxRadius -> clamped cleanly to maxRadius and nx = 1
  const fullRight = computeJoystickVector(120, 0, 50, 0.14);
  assert.equal(fullRight.active, true);
  assert.equal(fullRight.clampedX, 50);
  assert.equal(fullRight.clampedY, 0);
  assert.equal(fullRight.nx, 1);
  assert.equal(fullRight.ny, 0);

  // Full diagonal deflection -> circular clamping preserves 45-degree unit circle magnitude <= 1
  const diag = computeJoystickVector(-100, -100, 50, 0.14);
  assert.equal(diag.active, true);
  assert.ok(Math.abs(Math.hypot(diag.clampedX, diag.clampedY) - 50) < 1e-6);
  assert.ok(Math.abs(Math.hypot(diag.nx, diag.ny) - 1) < 1e-6);
  assert.ok(diag.nx < -0.7 && diag.ny < -0.7);

  // Android tablet requesting "Desktop site" (Linux x86_64 UA, coarse primary pointer, no hover) -> touch mode
  const androidTabletDesktopSite: InputCapabilitySignals = {
    pointerCoarse: true,
    pointerFine: false,
    anyPointerCoarse: true,
    anyPointerFine: false,
    hoverNone: true,
    anyHover: false,
    maxTouchPoints: 5,
    hasOntouchstart: true,
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    platform: 'Linux x86_64',
    lastDynamicInput: null,
  };
  assert.equal(detectControlMode(androidTabletDesktopSite), 'touch');
});

test('Form 1 KSSM Chapter 4.3 Proportion notes module computes 288 g across all three methods', () => {
  assert.equal(
    PROPORTION_NOTES_HEADER.fullHeading,
    'Matematik Tingkatan 1 KSSM – Bab 4.3: Kadaran'
  );
  assert.equal(UNDERSTANDING_PROPORTION_POINTS.length, 3);
  assert.equal(THREE_PROPORTION_METHODS.length, 3);
  assert.deepEqual(
    THREE_PROPORTION_METHODS.map((m) => m.title),
    ['Kaedah Unitari', 'Kaedah Kadaran', 'Kaedah Pendaraban Silang']
  );

  const { flourParts, waterParts, flourMassGrams } = WORKED_EXAMPLE_PROBLEM;
  assert.equal(flourParts, 5);
  assert.equal(waterParts, 3);
  assert.equal(flourMassGrams, 480);

  const m1 = solveUnitaryMethod(flourParts, waterParts, flourMassGrams);
  assert.equal(m1.onePartGrams, 96);
  assert.equal(m1.answerGrams, 288);

  const m2 = solveProportionMethod(flourParts, waterParts, flourMassGrams);
  assert.equal(m2.scaleFactor, 96);
  assert.equal(m2.answerGrams, 288);

  const m3 = solveCrossMultiplicationMethod(flourParts, waterParts, flourMassGrams);
  assert.equal(m3.crossProduct, 1440);
  assert.equal(m3.answerGrams, 288);
});

test('Bahasa Melayu KSSM Tingkatan 1 localisation covers questions, notes terminology, items, and school zones', () => {
  assert.equal(getDifficultyLabel(DifficultyLevel.EASY), 'MUDAH');
  assert.equal(getDifficultyLabel(DifficultyLevel.MEDIUM), 'SEDERHANA');
  assert.equal(getDifficultyLabel(DifficultyLevel.HARD), 'SUKAR');

  for (const q of QUESTION_DATABASE) {
    assert.ok(q.topic.includes('Matematik Tingkatan 1 KSSM'), `Notebook #${q.notebookId} topic must use KSSM BM`);
    assert.ok(q.topic.includes('Kadaran'), `Notebook #${q.notebookId} topic must mention Kadaran`);
    assert.ok(q.question.length > 20);
  }

  const combinedNotes = [
    PROPORTION_NOTES_HEADER.fullHeading,
    PROPORTION_NOTES_HEADER.baldiNote,
    ...UNDERSTANDING_PROPORTION_POINTS,
    ...THREE_PROPORTION_METHODS.flatMap((m) => [m.title, ...m.steps]),
    WORKED_EXAMPLE_PROBLEM.ratioStatement,
    WORKED_EXAMPLE_PROBLEM.questionStatement,
  ].join(' ');

  const requiredKssmTerms = [
    'nisbah',
    'kadar',
    'kadaran',
    'kaedah unitari',
    'kaedah kadaran',
    'kaedah pendaraban silang',
    'pengangka',
    'penyebut',
    'pecahan',
    'nisbah setara',
    'selesaikan',
    'hitung',
    'buku nota',
  ];

  const lowerNotes = combinedNotes.toLowerCase();
  for (const term of requiredKssmTerms) {
    assert.ok(lowerNotes.includes(term), `Expected KSSM Bahasa Melayu term "${term}" in notes content`);
  }

  for (const meta of Object.values(ITEM_METADATA)) {
    assert.ok(meta.name.length > 0 && meta.description.length > 10);
  }
});
