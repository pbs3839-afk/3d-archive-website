'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import {
  BoxGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { setTextureAnisotropy } from '@/lib/textures';
import { createWornMaterial } from '@/lib/wornMaterial';
import { useArchiveStore, type QualityTier } from '@/store/archiveStore';

/**
 * Shared geometry + materials for the cabinet.
 *
 * The grid is 15 lockers with two doors each, plus ribs on the outer doors —
 * several hundred meshes. Declaring `<meshStandardMaterial>` inline would
 * allocate one material and one geometry per mesh and compile a shader variant
 * for each. Everything here is created ONCE for the whole scene and handed
 * down through context. Textured parts use metric-UV geometry from
 * `lib/metricBox`; the unit box and plane below remain for untextured
 * overlays (glow frames, labels, dossier cards).
 *
 * Context rather than a module singleton so the materials are disposed with
 * the scene, which keeps hot-reload from leaking GPU programs.
 */

/** Unit cube — scale it per mesh rather than making a new BoxGeometry. */
export const UNIT_BOX = new BoxGeometry(1, 1, 1);
export const UNIT_PLANE = new PlaneGeometry(1, 1);

export interface CabinetMaterials {
  body: MeshStandardMaterial;
  bodyDark: MeshStandardMaterial;
  outerDoor: MeshStandardMaterial;
  rib: MeshStandardMaterial;
  lockerDoor: MeshStandardMaterial;
  lockerDoorSealed: MeshStandardMaterial;
  interior: MeshStandardMaterial;
  handle: MeshStandardMaterial;
  plate: MeshStandardMaterial;
  plinth: MeshStandardMaterial;
  floor: MeshStandardMaterial;
  wall: MeshStandardMaterial;
}

/**
 * How the paint on this cabinet has aged. Colour, roughness and metalness are
 * the original flat-shaded values, unchanged — the scans and the wear shader
 * add surface on top of them, not a new palette.
 */
const PAINT = { set: 'paintedSteel', maps: 'full' } as const;

/**
 * Aged service-issue steel: desaturated olive-grey, high roughness so it
 * catches the key light as a broad sheen rather than a chrome highlight.
 * The reference cabinet is cream enamel; this is the same object re-lit for a
 * dark room — and, with the worn material, one that has been in use for
 * decades: chipped edges on the doors and carcass, grime along the plinth,
 * handles polished smooth.
 */
export function createCabinetMaterials(): CabinetMaterials {
  return {
    body: createWornMaterial({ ...PAINT, tint: '#3e4139', roughness: 0.62, metalness: 0.7, edgeWear: 0.6, grime: 0.7 }),
    bodyDark: createWornMaterial({ ...PAINT, tint: '#24261f', roughness: 0.72, metalness: 0.62, edgeWear: 0.6, grime: 0.7 }),
    outerDoor: createWornMaterial({ ...PAINT, tint: '#474a40', roughness: 0.58, metalness: 0.74, edgeWear: 0.6, grime: 0.7 }),
    rib: createWornMaterial({ ...PAINT, tint: '#50534a', roughness: 0.54, metalness: 0.76, edgeWear: 0.6, grime: 0.7 }),
    lockerDoor: createWornMaterial({ ...PAINT, tint: '#54574b', roughness: 0.56, metalness: 0.72, edgeWear: 0.5, grime: 0.4 }),
    lockerDoorSealed: createWornMaterial({ ...PAINT, tint: '#26281f', roughness: 0.92, metalness: 0.25, edgeWear: 0.3, grime: 0.9 }),
    interior: createWornMaterial({ ...PAINT, tint: '#0f1113', roughness: 0.95, metalness: 0.12, grime: 0.2, detail: 0.5 }),
    handle: createWornMaterial({ set: 'paintedSteel', maps: 'surface', tint: '#9b978a', roughness: 0.34, metalness: 0.95, detail: 0.5 }),
    plate: createWornMaterial({ set: 'paintedSteel', maps: 'surface', tint: '#7d7867', roughness: 0.48, metalness: 0.85, edgeWear: 0.2 }),
    plinth: createWornMaterial({ ...PAINT, tint: '#191b17', roughness: 0.85, metalness: 0.45, edgeWear: 0.8, grime: 1 }),
    floor: createWornMaterial({ set: 'concreteFloor', tint: '#0b0c0d', roughness: 0.94, metalness: 0.25 }),
    wall: createWornMaterial({ set: 'plasterWall', tint: '#0b0c0d', roughness: 0.94, metalness: 0.25 }),
  };
}

/** Texture filtering at glancing angles, per device tier. */
const ANISOTROPY_BY_TIER: Record<QualityTier, number> = { high: 8, medium: 4, low: 2 };

const MaterialsContext = createContext<CabinetMaterials | null>(null);

export function CabinetMaterialsProvider({ children }: { children: ReactNode }) {
  const materials = useMemo(createCabinetMaterials, []);
  const quality = useArchiveStore((s) => s.quality);

  useEffect(() => {
    setTextureAnisotropy(ANISOTROPY_BY_TIER[quality]);
  }, [quality]);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );

  return (
    <MaterialsContext.Provider value={materials}>
      {children}
    </MaterialsContext.Provider>
  );
}

export function useCabinetMaterials(): CabinetMaterials {
  const materials = useContext(MaterialsContext);
  if (!materials) {
    throw new Error(
      'useCabinetMaterials must be used inside <CabinetMaterialsProvider>',
    );
  }
  return materials;
}
