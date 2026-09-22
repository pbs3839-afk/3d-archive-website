'use client';

import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Object3D, PointLight } from 'three';
import { LOCKERS } from '@/data/archive';
import { registerLocker } from '@/lib/lockerRegistry';
import { registerVaultDoor } from '@/lib/vaultRegistry';
import { canSelectLocker, useArchiveStore } from '@/store/archiveStore';

/**
 * Adapter for the Blender model.
 *
 * NOTE: unverified until a GLB actually lands in /public/models — there is
 * nothing to load against yet. It exists so the swap is a config change rather
 * than a rewrite: the GLB nodes get registered with the same two registries
 * the procedural cabinet uses, so `<CameraController>`, the choreographer and
 * `<FileTray>` keep working untouched.
 *
 * Requirements on the export (see public/models/README.md):
 *  - every Door_* object's ORIGIN sits on its hinge line, not its centre
 *  - locker roots are named Locker_01 .. Locker_05 and match `data/archive.ts`
 *  - a locker root's local +Z points out of the cabinet
 */

/** First descendant whose name starts with `prefix` (Blender adds .001 etc). */
function findByPrefix(root: Object3D, prefix: string): Object3D | null {
  let found: Object3D | null = null;
  root.traverse((child) => {
    if (!found && child !== root && child.name.startsWith(prefix)) {
      found = child;
    }
  });
  return found;
}

export function GltfCabinet({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const selectLocker = useArchiveStore((s) => s.selectLocker);
  const setHoveredLocker = useArchiveStore((s) => s.setHoveredLocker);

  // Clone-free: one cabinet per page, so the loaded scene is used directly.
  const nodes = useMemo(() => {
    scene.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return {
      outerLeft: findByPrefix(scene, 'OuterDoor_Left'),
      outerRight: findByPrefix(scene, 'OuterDoor_Right'),
      lockers: LOCKERS.map((definition) => {
        const root = scene.getObjectByName(definition.id) ?? null;
        return {
          id: definition.id,
          root,
          drawer: root ? findByPrefix(root, 'Drawer') : null,
        };
      }),
    };
  }, [scene]);

  useEffect(() => {
    registerVaultDoor('left', nodes.outerLeft);
    registerVaultDoor('right', nodes.outerRight);

    nodes.lockers.forEach(({ id, root, drawer }) => {
      if (!root || !drawer) {
        console.warn(
          `[GltfCabinet] ${id}: missing root or a "Drawer" child in the GLB — ` +
            'this compartment will not open.',
        );
        return;
      }
      registerLocker(id, {
        root,
        drawer,
        interiorLight: findByPrefix(root, 'Interior_Light') as PointLight | null,
      });
    });

    return () => {
      registerVaultDoor('left', null);
      registerVaultDoor('right', null);
      nodes.lockers.forEach(({ id }) => registerLocker(id, null));
    };
  }, [nodes]);

  /** Walk up from the hit object to find which locker was clicked. */
  const lockerIdFor = (object: Object3D): string | null => {
    let cursor: Object3D | null = object;
    while (cursor) {
      if (LOCKERS.some((locker) => locker.id === cursor?.name)) return cursor.name;
      cursor = cursor.parent;
    }
    return null;
  };

  /** The locker under the pointer, if it may be selected right now. */
  const selectableIdFor = (object: Object3D): string | null => {
    const id = lockerIdFor(object);
    return id && canSelectLocker(useArchiveStore.getState(), id) ? id : null;
  };

  return (
    <primitive
      object={scene}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        const id = selectableIdFor(event.object);
        if (!id) return;
        event.stopPropagation();
        setHoveredLocker(id);
      }}
      onPointerOut={() => setHoveredLocker(null)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        const id = selectableIdFor(event.object);
        if (!id) return;
        event.stopPropagation();
        selectLocker(id);
      }}
    />
  );
}
