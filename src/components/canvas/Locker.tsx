'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { gsap } from '@/lib/gsapConfig';
import { MeshBasicMaterial, type Group, type PointLight } from 'three';
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DRAWER_FACE_THICKNESS,
  LOCKER_DEPTH,
  LOCKER_FRONT_Z,
  drawerLampPosition,
  localCellX,
  localCellY,
} from '@/lib/cabinetLayout';
import { registerLocker } from '@/lib/lockerRegistry';
import { metricBox } from '@/lib/metricBox';
import { canSelectLocker, useArchiveStore } from '@/store/archiveStore';
import type { LockerDefinition } from '@/types/archive';
import { DrawerPull } from './DoorFurniture';
import { Drawer } from './Drawer';
import { UNIT_BOX, useCabinetMaterials } from './materials';
import { noRaycast } from './noRaycast';

const INNER_W = CELL_WIDTH - 0.026;
const INNER_H = CELL_HEIGHT - 0.026;
const WALL = 0.012;

interface LockerProps {
  definition: LockerDefinition;
}

/**
 * One interactive compartment: a bay in the carcass with a drawer in it.
 *
 * Owns its own presentation (bay, drawer, pull, hover glow) and registers the
 * drawer with `lockerRegistry`. It deliberately does NOT animate its own
 * drawer on selection: the open sequence is camera-first and has to stay in
 * step with the camera move, so `<ArchiveChoreographer>` drives the whole
 * thing as one timeline. Keeping the sequence in one timeline is what stops
 * the drawer sliding out before the camera has arrived.
 */
export function Locker({ definition }: LockerProps) {
  const materials = useCabinetMaterials();
  const rootRef = useRef<Group>(null);
  const drawerRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);

  const { id, code, column, row } = definition;
  /** This compartment's patch of the steel texture (see `metricBox`). */
  const seed = column * 10 + row + 1;

  const isHovered = useArchiveStore((s) => s.hoveredLocker === id);
  const isSelected = useArchiveStore((s) => s.selectedLocker === id);
  const isTouch = useArchiveStore((s) => s.isTouch);
  const interactive = useArchiveStore((s) => canSelectLocker(s, id));
  /** The tour is holding on this drawer: a faint outline says it opens. */
  const isTourFocus = useArchiveStore(
    (s) => s.stage === 'tour' && s.tourReady && s.tourStop === id,
  );
  const setHoveredLocker = useArchiveStore((s) => s.setHoveredLocker);
  const selectLocker = useArchiveStore((s) => s.selectLocker);

  /** One glow material per locker so each can fade independently. */
  const glowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ffb257',
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => glowMaterial.dispose(), [glowMaterial]);

  // Publish the drawer so the choreographer can pull it.
  useEffect(() => {
    const root = rootRef.current;
    const drawer = drawerRef.current;
    if (!root || !drawer) return;

    registerLocker(id, { root, drawer, interiorLight: lightRef.current });
    return () => registerLocker(id, null);
  }, [id]);

  // Cursor affordance — pointer only, and only while lockers accept input.
  useEffect(() => {
    if (isTouch || !isHovered || !interactive) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [isHovered, interactive, isTouch]);

  const highlight = (isHovered && interactive) || isSelected;

  useFrame((_, delta) => {
    // Frame-rate independent approach, mutating refs rather than state so
    // hovering never triggers a React render of the 3D tree.
    const k = 1 - Math.exp(-delta * 9);
    const targetOpacity = isSelected ? 0.6 : highlight ? 0.45 : isTourFocus ? 0.3 : 0;
    glowMaterial.opacity += (targetOpacity - glowMaterial.opacity) * k;
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    setHoveredLocker(id);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHoveredLocker(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    event.stopPropagation();

    // Step 0 of the sequence: the drawer knocks back a few millimetres, the
    // way a real one does when you take hold of it, so the click registers
    // before the camera starts moving.
    const drawer = drawerRef.current;
    if (drawer) {
      // From wherever the drawer sits: in the tour it is already peeking out.
      const rest = drawer.position.z;
      gsap.fromTo(
        drawer.position,
        { z: rest },
        {
          z: rest - 0.012,
          duration: 0.1,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
          overwrite: true,
        },
      );
    }
    selectLocker(id);
  };

  return (
    <group
      ref={rootRef}
      position={[localCellX(column), localCellY(row), LOCKER_FRONT_Z]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* ------------------------------------------------ bay in the carcass */}
      <mesh
        geometry={metricBox(INNER_W, INNER_H, 0.02, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[0, 0, -LOCKER_DEPTH]}
        receiveShadow
      />
      <mesh
        geometry={metricBox(INNER_W, WALL, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[0, INNER_H / 2, -LOCKER_DEPTH / 2]}
      />
      <mesh
        geometry={metricBox(INNER_W, WALL, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[0, -INNER_H / 2, -LOCKER_DEPTH / 2]}
        receiveShadow
      />
      <mesh
        geometry={metricBox(WALL, INNER_H, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[-INNER_W / 2, 0, -LOCKER_DEPTH / 2]}
      />
      <mesh
        geometry={metricBox(WALL, INNER_H, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[INNER_W / 2, 0, -LOCKER_DEPTH / 2]}
      />

      {/* Reading lamp over the pulled-out drawer — raised by the choreographer
          once open. It hangs above and in front of the file, not level with
          it: at tab height it sat in the gap between two folders, blew the
          ones behind it out to white and left the front one in shadow. */}
      <pointLight
        ref={lightRef}
        position={drawerLampPosition()}
        intensity={0}
        distance={1.4}
        decay={2}
        color="#cfe4ff"
      />

      {/* ----------------------------------------------------------- drawer */}
      <Drawer
        ref={drawerRef}
        seed={seed}
        faceMaterial={materials.lockerDoor}
        bodyMaterial={materials.interior}
        railMaterial={materials.handle}
      >
        <DrawerPull
          live
          code={code}
          faceThickness={DRAWER_FACE_THICKNESS}
          bodyMaterial={materials.bodyDark}
          metalMaterial={materials.handle}
        />
      </Drawer>

      {/* -------------------------------------------- hover / selection glow
          Raycast is disabled per-mesh, not on the group: the raycaster
          recurses into children regardless of what the parent does. */}
      <group position={[0, 0, 0.03]}>
        <mesh
          geometry={UNIT_BOX}
          material={glowMaterial}
          raycast={noRaycast}
          position={[0, CELL_HEIGHT / 2 - 0.005, 0]}
          scale={[CELL_WIDTH, 0.008, 0.004]}
        />
        <mesh
          geometry={UNIT_BOX}
          material={glowMaterial}
          raycast={noRaycast}
          position={[0, -CELL_HEIGHT / 2 + 0.005, 0]}
          scale={[CELL_WIDTH, 0.008, 0.004]}
        />
        <mesh
          geometry={UNIT_BOX}
          material={glowMaterial}
          raycast={noRaycast}
          position={[-CELL_WIDTH / 2 + 0.005, 0, 0]}
          scale={[0.008, CELL_HEIGHT, 0.004]}
        />
        <mesh
          geometry={UNIT_BOX}
          material={glowMaterial}
          raycast={noRaycast}
          position={[CELL_WIDTH / 2 - 0.005, 0, 0]}
          scale={[0.008, CELL_HEIGHT, 0.004]}
        />
      </group>
    </group>
  );
}
