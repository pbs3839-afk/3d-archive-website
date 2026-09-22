/**
 * Single source of truth for cabinet geometry.
 *
 * Every procedural mesh, every camera pose and every file position is derived
 * from the constants below. Nothing hard-codes a magic coordinate, so the whole
 * cabinet can be re-proportioned by editing this file alone.
 *
 * Units are metres. The cabinet group is placed at [0, CABINET_CENTER_Y, 0]
 * and all `local*` helpers return coordinates in that group's space.
 */

export const FLOOR_Y = 0;
export const PLINTH_HEIGHT = 0.11;

export const CABINET = {
  width: 3.24,
  height: 2.56,
  depth: 0.62,
  shell: 0.05,
} as const;

/** World Y of the cabinet group origin (its vertical centre). */
export const CABINET_CENTER_Y = FLOOR_Y + PLINTH_HEIGHT + CABINET.height / 2;

/**
 * Three columns of deep drawers.
 *
 * Five rows gave a denser wall, but the compartments were then only 38cm tall
 * against a 34.5cm card — a filed card sat 3.7cm below the rim with no room to
 * lean, so there was nothing to look down into. Three rows buys 69cm of
 * interior and lets the cards stand in the drawer the way folders actually do.
 */
export const GRID = {
  columns: 3,
  rows: 3,
  gap: 0.038,
} as const;

const INNER_PAD_X = 0.1;
const INNER_PAD_Y = 0.09;

export const GRID_WIDTH = CABINET.width - CABINET.shell * 2 - INNER_PAD_X * 2;
export const GRID_HEIGHT = CABINET.height - CABINET.shell * 2 - INNER_PAD_Y * 2;

export const CELL_WIDTH =
  (GRID_WIDTH - GRID.gap * (GRID.columns - 1)) / GRID.columns;
export const CELL_HEIGHT =
  (GRID_HEIGHT - GRID.gap * (GRID.rows - 1)) / GRID.rows;

/** Local Z of a closed drawer face — recessed so the outer doors clear the pulls. */
export const LOCKER_FRONT_Z = CABINET.depth / 2 - 0.09;

/** Depth of a single locker bay: from the drawer face back to the carcass's back shell. */
export const LOCKER_DEPTH = LOCKER_FRONT_Z + CABINET.depth / 2 - CABINET.shell;

/**
 * The compartments are filing-cabinet drawers: they pull straight out toward
 * the viewer rather than swinging open.
 *
 * Full extension, like a real filing cabinet, and for the same reason: the
 * folders at the back have to come out past the carcass. The front lip and
 * cornice stand 9–13cm proud of the drawer faces, and on the top row a drawer
 * pulled only part way left its rear folders under them — the overhang hid
 * their tabs from above. The tub still keeps 1.6cm engaged in the bay, so the
 * drawer never looks like it is about to fall out.
 */
export const DRAWER_TRAVEL = 0.44;
export const DRAWER_FACE_THICKNESS = 0.026;
export const DRAWER_WALL = 0.014;
/** Interior clearance of a drawer, derived from the cell it sits in. */
export const DRAWER_INSET = 0.022;

/** Depth of the drawer tub behind its front face. */
export const DRAWER_TUB_DEPTH = LOCKER_DEPTH - 0.05;

/** Local Z of the outer doors' closed plane. */
export const OUTER_DOOR_Z = CABINET.depth / 2 + 0.012;
export const OUTER_DOOR_WIDTH = CABINET.width / 2;
export const OUTER_DOOR_HEIGHT = CABINET.height - 0.02;
export const OUTER_DOOR_THICKNESS = 0.035;

/** How far each outer door swings, in radians. Left is negative, right positive. */
export const OUTER_DOOR_OPEN_ANGLE = 2.16; // ~124deg

export function localCellX(column: number): number {
  return -GRID_WIDTH / 2 + CELL_WIDTH / 2 + column * (CELL_WIDTH + GRID.gap);
}

export function localCellY(row: number): number {
  return GRID_HEIGHT / 2 - CELL_HEIGHT / 2 - row * (CELL_HEIGHT + GRID.gap);
}

/** Every [column, row] pair in the grid, row-major. */
export function allGridCells(): Array<{ column: number; row: number }> {
  const cells: Array<{ column: number; row: number }> = [];
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let column = 0; column < GRID.columns; column += 1) {
      cells.push({ column, row });
    }
  }
  return cells;
}

/* ------------------------------------------------------------------ files */

export const FILE_CARD = {
  width: 0.58,
  height: 0.345,
  thickness: 0.014,
} as const;

export interface FilePose {
  position: [number, number, number];
  rotation: [number, number, number];
}

/**
 * How far back a filed card leans, in radians from upright.
 *
 * Small on purpose. Leaned far enough to present its whole face to an
 * overhead camera, the frontmost card fills the shot and hides every card
 * behind it. Folders in a real drawer stand near-vertical and you read their
 * tabs, which is what this angle reproduces.
 */
export const FILE_LEAN = 0.18;

/** Most cards one drawer holds. The file is laid out for a full drawer. */
export const FILE_CAPACITY = 4;

/** Gap between filed cards, front to back. */
const FILE_PITCH = 0.07;

/** Clear space between the frontmost card's lower edge and the drawer front. */
const FILE_FRONT_CLEARANCE = 0.02;

/**
 * How much of a hanging card stands proud of the drawer's top edge. This strip
 * is the tab: it carries the classification colour and the codename, and on
 * the frontmost card it is the only part not hidden behind the drawer face.
 */
const TAB_REVEAL = 0.08;

/** Top edge of the drawer face (and of the hanging rails), cell-relative. */
export const drawerTopY = (): number => (CELL_HEIGHT - DRAWER_INSET * 2) / 2;

/**
 * Z of the frontmost filed card's centre once the drawer is fully open,
 * measured from the locker's closed face: behind the inner face of the drawer
 * front by the clearance, half the card's thickness, and the distance its lower
 * edge swings forward when it leans back.
 */
const frontSlotZ = (): number =>
  DRAWER_TRAVEL -
  DRAWER_FACE_THICKNESS -
  FILE_FRONT_CLEARANCE -
  FILE_CARD.thickness / 2 -
  (FILE_CARD.height / 2) * Math.sin(FILE_LEAN);

/**
 * Where a card hangs once the drawer is open.
 *
 * These are hanging folders: suspended from rails along the top of the tub, so
 * each card's tab rises a few centimetres above the drawer face while the body
 * hangs down inside. That is the only arrangement that works with a full-height
 * drawer front — cards standing on the tub floor sit entirely below the front's
 * top edge and are hidden from any camera short of straight overhead.
 *
 * Positions are INSIDE the tub, i.e. behind the drawer front. An earlier
 * version added the pitch forward from the front face instead of back from it,
 * which filed the cards in mid-air in front of the drawer. Index 0 hangs at the
 * back so the tabs read top-to-bottom on screen in the same order as the
 * dossier index.
 *
 * The file is packed against the drawer FRONT, not the back: the front of the
 * drawer is the part that is out in the open. Slots are laid out for a full
 * drawer, so a short file leaves the front slot empty rather than shifting the
 * whole file — the camera framing stays the same for every drawer.
 */
export function filedCardPose(index: number): FilePose {
  const top = drawerTopY() + TAB_REVEAL;
  return {
    position: [
      0,
      top - (FILE_CARD.height / 2) * Math.cos(FILE_LEAN),
      frontSlotZ() - (FILE_CAPACITY - 1 - index) * FILE_PITCH,
    ],
    rotation: [-FILE_LEAN, 0, 0],
  };
}

/**
 * Where a card sits before the drawer has finished opening: sunk down inside
 * the tub, below the face's top edge and faded out. The deploy tween lifts it
 * up onto its rail, which reads as the folders settling into view.
 */
export function storedFilePose(index: number): FilePose {
  const filed = filedCardPose(index);
  return {
    position: [filed.position[0], filed.position[1] - 0.2, filed.position[2]],
    rotation: filed.rotation,
  };
}

/**
 * How far a selected card is lifted before it is drawn out. Enough for its
 * bottom edge to clear the tabs of every card still hanging in the file, so
 * the forward move never passes through them.
 */
export const RAISE_LIFT = 0.36;

/**
 * Where the selected card goes: lifted clear of the file, drawn out to a fixed
 * reading position just in front of the drawer, and tipped toward the camera.
 *
 * The reading position is the same for every card, wherever it hung, so the
 * close-up framing never jumps between files. It sits in front of the drawer
 * lamp, which therefore lights the file behind it rather than blowing out the
 * sheet being read.
 */
export function raisedCardPose(index: number): FilePose {
  const filed = filedCardPose(index);
  return {
    position: [filed.position[0], filed.position[1] + RAISE_LIFT, DRAWER_TRAVEL + 0.16],
    rotation: [-0.28, 0, 0],
  };
}

/** Where the drawer lamp hangs: over the front edge of the open drawer. */
export function drawerLampPosition(): [number, number, number] {
  return [0, drawerTopY() + 0.4, DRAWER_TRAVEL - 0.01];
}

/** How far a hovered card rises on its rail, before it is selected. */
export const FILE_HOVER_LIFT = 0.08;
