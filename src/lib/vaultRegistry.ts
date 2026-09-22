import type { Object3D } from 'three';

/**
 * Same seam as `lockerRegistry`, for the cabinet's two full-height outer
 * doors. Whoever renders them — the procedural cabinet today, `OuterDoor_Left`
 * / `OuterDoor_Right` from the GLB tomorrow — registers the hinge pivots here,
 * and the choreographer animates whatever it finds.
 */
export interface VaultDoors {
  left: Object3D | null;
  right: Object3D | null;
}

const doors: VaultDoors = { left: null, right: null };

export function registerVaultDoor(
  side: 'left' | 'right',
  node: Object3D | null,
): void {
  doors[side] = node;
}

export function getVaultDoors(): VaultDoors {
  return doors;
}

