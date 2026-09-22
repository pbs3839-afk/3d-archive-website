'use client';

import {
  DRAWER_FACE_THICKNESS,
  LOCKER_FRONT_Z,
  localCellX,
  localCellY,
} from '@/lib/cabinetLayout';
import { DrawerPull } from './DoorFurniture';
import { Drawer } from './Drawer';
import { useCabinetMaterials } from './materials';

interface SealedLockerProps {
  column: number;
  row: number;
}

/**
 * A drawer that holds nothing.
 *
 * The reference cabinet is dense with identical fronts; five lonely drawers in
 * a big empty carcass would not read as an archive. These fill the grid, stay
 * visibly darker, carry a SEALED card in the pull, and are completely inert —
 * no handlers, no tub, no lamp, and nothing registered with the registry, so
 * they cost almost nothing and can never be selected by mistake.
 */
export function SealedLocker({ column, row }: SealedLockerProps) {
  const materials = useCabinetMaterials();

  return (
    <group position={[localCellX(column), localCellY(row), LOCKER_FRONT_Z]}>
      <Drawer
        hollow
        seed={column * 10 + row + 1}
        faceMaterial={materials.lockerDoorSealed}
        bodyMaterial={materials.interior}
      >
        <DrawerPull
          dim
          code="SEALED"
          faceThickness={DRAWER_FACE_THICKNESS}
          bodyMaterial={materials.bodyDark}
          metalMaterial={materials.plate}
        />
      </Drawer>
    </group>
  );
}
