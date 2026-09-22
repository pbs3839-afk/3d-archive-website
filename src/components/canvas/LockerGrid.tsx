'use client';

import { useMemo } from 'react';
import { allGridCells } from '@/lib/cabinetLayout';
import { LOCKERS } from '@/data/archive';
import { Locker } from './Locker';
import { SealedLocker } from './SealedLocker';

/**
 * Fills every cell of the cabinet's inner grid.
 *
 * Cells claimed by an entry in `data/archive.ts` become interactive lockers;
 * the rest are sealed dummies. Adding a sixth dossier locker is therefore a
 * data edit, not a component edit.
 */
export function LockerGrid() {
  const sealedCells = useMemo(() => {
    const claimed = new Set(
      LOCKERS.map((locker) => `${locker.column}:${locker.row}`),
    );
    return allGridCells().filter(
      (cell) => !claimed.has(`${cell.column}:${cell.row}`),
    );
  }, []);

  return (
    <group>
      {LOCKERS.map((locker) => (
        <Locker key={locker.id} definition={locker} />
      ))}
      {sealedCells.map((cell) => (
        <SealedLocker
          key={`sealed-${cell.column}-${cell.row}`}
          column={cell.column}
          row={cell.row}
        />
      ))}
    </group>
  );
}
