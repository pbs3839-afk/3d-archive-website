'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';
import { gsap } from '@/lib/gsapConfig';
import type { Group } from 'three';
import { getLocker } from '@/data/archive';
import {
  filedCardPose,
  raisedCardPose,
  storedFilePose,
} from '@/lib/cabinetLayout';
import { getLockerHandle } from '@/lib/lockerRegistry';
import { registerTray } from '@/lib/trayRegistry';
import { useArchiveStore } from '@/store/archiveStore';
import { ArchiveFile, type FileCardHandle } from './ArchiveFile';

/**
 * A card travels in and out of the file standing upright.
 *
 * Filed, it leans back; lifted straight up while leaning, its top edge swings
 * back as it rises and, on the top row, scrapes through the cornice overhang.
 * Upright, the lift runs in the card's own plane — the way a hanging folder is
 * pulled by its tabs — and clears both the cornice and its neighbours.
 */
const UPRIGHT = { x: 0, y: 0, z: 0 } as const;

/** True when a card already hangs on its rail (nothing to put back). */
function isFiled(card: FileCardHandle, index: number): boolean {
  const pose = filedCardPose(index);
  const { position, rotation } = card.group;
  return (
    Math.abs(position.y - pose.position[1]) < 1e-4 &&
    Math.abs(position.z - pose.position[2]) < 1e-4 &&
    Math.abs(rotation.x - pose.rotation[0]) < 1e-4
  );
}

/**
 * Return one card to its rail: stand it up and slide it back over the file,
 * drop it straight down, and only then let it lean back against its
 * neighbours. The reverse of the raise, for the same reason — a raised card
 * coming straight down would cut through the tabs of the cards it hangs
 * behind, and a leaning one would sweep into them.
 *
 * A card that is already filed is left alone; standing it up would make it
 * twitch for no reason.
 */
function settleBack(card: FileCardHandle, index: number): gsap.core.Timeline {
  const tl = gsap.timeline();
  if (isFiled(card, index)) return tl;

  const pose = filedCardPose(index);
  tl.to(card.group.position, { z: pose.position[2], duration: 0.42, ease: 'power2.inOut' }, 0);
  tl.to(card.group.rotation, { ...UPRIGHT, duration: 0.42, ease: 'power2.inOut' }, 0);
  tl.to(
    card.group.position,
    { x: pose.position[0], y: pose.position[1], duration: 0.36, ease: 'power2.inOut' },
    0.26,
  );
  tl.to(
    card.group.rotation,
    {
      x: pose.rotation[0],
      y: pose.rotation[1],
      z: pose.rotation[2],
      duration: 0.24,
      ease: 'power2.out',
    },
    0.5,
  );
  return tl;
}

/**
 * The cards belonging to the open locker.
 *
 * Mounted as a sibling of the cabinet rather than a child of the locker, and
 * aligned to the locker's world transform read from the registry. That is what
 * keeps it working when the GLB replaces the primitives: the tray never needs
 * to know how the cabinet was built, only where the locker ended up.
 *
 * Owns the stagger. `<ArchiveChoreographer>` decides *when* the cards move;
 * this decides *how*.
 */
export function FileTray() {
  const selectedLocker = useArchiveStore((s) => s.selectedLocker);
  const groupRef = useRef<Group>(null);
  const handles = useRef(new Map<string, FileCardHandle>());

  const locker = getLocker(selectedLocker);

  const register = useCallback((id: string, handle: FileCardHandle | null) => {
    if (handle) {
      handles.current.set(id, handle);
    } else {
      handles.current.delete(id);
    }
  }, []);

  /** Cards in filed order, skipping any that have not mounted yet. */
  const ordered = useCallback((): FileCardHandle[] => {
    if (!locker) return [];
    return locker.files
      .map((file) => handles.current.get(file.id))
      .filter((handle): handle is FileCardHandle => Boolean(handle));
  }, [locker]);

  // Align to the locker and park every card inside it, before first paint so
  // no card is ever visible in the wrong place for a frame.
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || !selectedLocker || !locker) return;

    const handle = getLockerHandle(selectedLocker);
    if (handle) {
      handle.root.updateWorldMatrix(true, false);
      group.position.setFromMatrixPosition(handle.root.matrixWorld);
      group.quaternion.setFromRotationMatrix(handle.root.matrixWorld);
    }

    ordered().forEach((card, index) => {
      const pose = storedFilePose(index);
      card.group.position.set(...pose.position);
      card.group.rotation.set(...pose.rotation);
      card.paper.opacity = 0;
      card.stripe.opacity = 0;
    });
  }, [selectedLocker, locker, ordered]);

  // Publish the timelines. Layout effect so the choreographer's passive effect
  // is guaranteed to find a registered tray in the same commit.
  useLayoutEffect(() => {
    const controller = {
      relayout: () => {
        const selected = useArchiveStore.getState().selectedFile;
        ordered().forEach((card, index) => {
          const pose =
            card.id === selected ? raisedCardPose(index) : filedCardPose(index);
          card.group.position.set(...pose.position);
          card.group.rotation.set(...pose.rotation);
        });
      },
      deploy: () => {
        const cards = ordered();
        const tl = gsap.timeline();
        cards.forEach((card, index) => {
          const pose = filedCardPose(index);
          const at = index * 0.07;
          tl.to(
            card.group.position,
            {
              x: pose.position[0],
              y: pose.position[1],
              z: pose.position[2],
              duration: 0.85,
              ease: 'power3.out',
            },
            at,
          );
          tl.to(
            card.group.rotation,
            {
              x: pose.rotation[0],
              y: pose.rotation[1],
              z: pose.rotation[2],
              duration: 0.85,
              ease: 'power3.out',
            },
            at,
          );
          tl.to(card.paper, { opacity: 1, duration: 0.42, ease: 'power1.out' }, at);
          tl.to(card.stripe, { opacity: 0.92, duration: 0.42, ease: 'power1.out' }, at);
        });
        return tl;
      },

      retract: () => {
        const cards = ordered();
        const tl = gsap.timeline();
        cards.forEach((card, index) => {
          const pose = storedFilePose(index);
          // Last card out is first card back in.
          const at = (cards.length - 1 - index) * 0.06;
          tl.to(
            card.group.position,
            {
              x: pose.position[0],
              y: pose.position[1],
              z: pose.position[2],
              duration: 0.55,
              ease: 'power2.inOut',
            },
            at,
          );
          tl.to(
            card.group.rotation,
            {
              x: pose.rotation[0],
              y: pose.rotation[1],
              z: pose.rotation[2],
              duration: 0.55,
              ease: 'power2.inOut',
            },
            at,
          );
          tl.to(card.paper, { opacity: 0, duration: 0.4, ease: 'power1.out' }, at + 0.1);
          tl.to(card.stripe, { opacity: 0, duration: 0.4, ease: 'power1.out' }, at + 0.1);
        });
        return tl;
      },

      /**
       * Take one card out of the file to be read, and put back any other card
       * that was out. Driving both from one call is what stops a second
       * selection from leaving two cards raised.
       *
       * The move is staged, lift THEN draw out, like pulling a real folder.
       * Done in one diagonal tween, a card from the back of the file would
       * travel straight through the tabs of every card in front of it. The
       * card stands upright before it rises (see `UPRIGHT`) and only tips
       * back to the reading angle once it is on its way out. Rising while
       * still leaning — even for a few frames — pushed a hovered top-row
       * card's edge 2.5cm into the cornice, so the lift waits for the turn.
       */
      raise: (fileId: string) => {
        const tl = gsap.timeline();
        ordered().forEach((card, index) => {
          if (card.id !== fileId) {
            tl.add(settleBack(card, index), 0);
            return;
          }
          const pose = raisedCardPose(index);
          tl.to(card.group.rotation, { ...UPRIGHT, duration: 0.14, ease: 'power2.out' }, 0);
          tl.to(
            card.group.position,
            { y: pose.position[1], duration: 0.38, ease: 'power2.out' },
            0.1,
          );
          tl.to(
            card.group.position,
            { z: pose.position[2], duration: 0.5, ease: 'power3.inOut' },
            0.32,
          );
          tl.to(
            card.group.rotation,
            {
              x: pose.rotation[0],
              y: pose.rotation[1],
              z: pose.rotation[2],
              duration: 0.5,
              ease: 'power2.inOut',
            },
            0.38,
          );
        });
        return tl;
      },

      /** Put every card back in the file. */
      lower: () => {
        const tl = gsap.timeline();
        ordered().forEach((card, index) => tl.add(settleBack(card, index), 0));
        return tl;
      },
    };

    registerTray(controller);
    return () => registerTray(null);
  }, [ordered]);

  if (!locker) return null;

  return (
    <group ref={groupRef}>
      {locker.files.map((file) => (
        <ArchiveFile key={file.id} file={file} register={register} />
      ))}
    </group>
  );
}
