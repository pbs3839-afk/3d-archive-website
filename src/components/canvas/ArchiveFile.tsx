'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Color, MeshBasicMaterial, MeshStandardMaterial, type Group } from 'three';
import { FILE_CARD, FILE_HOVER_LIFT } from '@/lib/cabinetLayout';
import { cardFaceTexture } from '@/lib/cardFaceTexture';
import { classificationStyle } from '@/lib/classification';
import { stencilTexture } from '@/lib/stencilTexture';
import { useArchiveStore } from '@/store/archiveStore';
import type { ArchiveFileData } from '@/types/archive';
import { UNIT_BOX, UNIT_PLANE } from './materials';
import { noRaycast } from './noRaycast';

export interface FileCardHandle {
  id: string;
  group: Group;
  paper: MeshStandardMaterial;
  stripe: MeshBasicMaterial;
}

interface ArchiveFileProps {
  file: ArchiveFileData;
  /** Handed up so `<FileTray>` can drive one staggered timeline for all cards. */
  register: (id: string, handle: FileCardHandle | null) => void;
}

/**
 * One dossier, as a sheet of card stock.
 *
 * Two nested groups on purpose: the OUTER group is owned by the tray's GSAP
 * timeline (deploy / retract), the INNER group is owned by the hover lerp.
 * If both wrote to the same transform the hover would fight the timeline and
 * cards would snap around mid-animation.
 *
 * Two printed layers, both textures on the card's own surface: a stencilled
 * tab that reads while the card hangs in the file, and the full face (see
 * `lib/cardFaceTexture.ts`) that fades in once the card is lifted out to be
 * read. Picking stays with the card mesh.
 */
export function ArchiveFile({ file, register }: ArchiveFileProps) {
  const outerRef = useRef<Group>(null);
  const innerRef = useRef<Group>(null);

  const isHovered = useArchiveStore((s) => s.hoveredFile === file.id);
  const isSelected = useArchiveStore((s) => s.selectedFile === file.id);
  const isTouch = useArchiveStore((s) => s.isTouch);
  const interactive = useArchiveStore(
    (s) => s.stage === 'locker' && s.isLockerOpen && !s.isCameraMoving,
  );
  const setHoveredFile = useArchiveStore((s) => s.setHoveredFile);
  const selectFile = useArchiveStore((s) => s.selectFile);

  const style = classificationStyle(file.classification);

  /** Stencilled tab code, drawn on the strip that stays visible when filed. */
  const tabLabel = useMemo(
    () =>
      new MeshBasicMaterial({
        map: stencilTexture(file.codename.replace('PROJECT ', ''), {
          color: '#2b2720',
          width: 512,
          height: 96,
          fontSize: 62,
          letterSpacing: 6,
        }),
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    [file.codename],
  );
  useEffect(() => () => tabLabel.dispose(), [tabLabel]);

  /** Full printed face, transparent until the card is lifted out to be read. */
  const face = useMemo(
    () =>
      new MeshStandardMaterial({
        map: cardFaceTexture(file),
        transparent: true,
        opacity: 0,
        roughness: 0.94,
        metalness: 0,
        depthWrite: false,
      }),
    [file],
  );
  useEffect(() => () => face.dispose(), [face]);

  const { paper, stripe } = useMemo(() => {
    const paperMaterial = new MeshStandardMaterial({
      color: new Color('#9e9684'),
      roughness: 0.94,
      metalness: 0,
      transparent: true,
      opacity: 0,
    });
    const stripeMaterial = new MeshBasicMaterial({
      color: new Color(style.hex),
      transparent: true,
      opacity: 0,
      toneMapped: false,
    });
    return { paper: paperMaterial, stripe: stripeMaterial };
  }, [style.hex]);

  useEffect(
    () => () => {
      paper.dispose();
      stripe.dispose();
    },
    [paper, stripe],
  );

  // Layout effect: the tray reads these handles in its own layout effect, and
  // child layout effects flush before the parent's.
  useLayoutEffect(() => {
    const group = outerRef.current;
    if (!group) return;
    register(file.id, { id: file.id, group, paper, stripe });
    return () => register(file.id, null);
  }, [file.id, register, paper, stripe]);

  useEffect(() => {
    if (isTouch || !isHovered || !interactive) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [isHovered, interactive, isTouch]);

  // The selected card is already lifted clear by the tray's timeline, so hover
  // only nudges the ones still in the file.
  const lifted = isHovered && interactive && !isSelected;
  // Hover lifts the card on its rail; only selection reveals the full face.
  // A hovered card is still hanging behind others, so its face would be mostly
  // hidden anyway — the tab is what reads at that stage.
  const showFullLabel = isSelected;

  useFrame((_, delta) => {
    const inner = innerRef.current;
    if (!inner) return;
    const k = 1 - Math.exp(-delta * 10);
    // Up, not forward: these cards hang in a drawer, and the gesture that reads
    // as "picking one out" is raising it above its neighbours.
    const targetY = lifted ? FILE_HOVER_LIFT : 0;
    inner.position.y += (targetY - inner.position.y) * k;

    // The face follows the paper's own opacity so it can never show on a card
    // that is still fading in or out of the drawer.
    const faceTarget = showFullLabel ? paper.opacity : 0;
    face.opacity += (faceTarget - face.opacity) * (1 - Math.exp(-delta * 7));

    // A card at full opacity is drawn as opaque. The ambient-occlusion pass
    // treats transparent materials separately, and a card left transparent
    // can show the occlusion of whatever hangs behind it. Fading cards stay
    // transparent; the switch happens once each way.
    const opaque = paper.opacity >= 0.999;
    if (paper.transparent === opaque) {
      paper.transparent = !opaque;
      paper.needsUpdate = true;
    }
  });

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    setHoveredFile(file.id);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHoveredFile(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    selectFile(file.id);
  };

  const faceZ = FILE_CARD.thickness / 2 + 0.001;

  return (
    <group ref={outerRef}>
      <group ref={innerRef}>
        <mesh
          geometry={UNIT_BOX}
          material={paper}
          scale={[FILE_CARD.width, FILE_CARD.height, FILE_CARD.thickness]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          castShadow
        />

        {/* classification stripe along the head of the card */}
        <mesh
          geometry={UNIT_PLANE}
          material={stripe}
          raycast={noRaycast}
          position={[0, FILE_CARD.height / 2 - 0.022, faceZ]}
          scale={[FILE_CARD.width - 0.04, 0.016, 1]}
        />

        {/* The tab: a stencilled code on the strip of card that stays visible
            above the one filed in front of it. This is what you read while
            browsing, exactly as you would with real folders. */}
        <mesh
          geometry={UNIT_PLANE}
          material={tabLabel}
          raycast={noRaycast}
          visible={!showFullLabel}
          position={[0, FILE_CARD.height / 2 - 0.05, faceZ]}
          scale={[0.26, 0.045, 1]}
        />

        {/* The full printed face. Only the card being read shows it — you
            cannot read four hanging folders at once either — and it fades in
            as the card comes up out of the file. */}
        <mesh
          geometry={UNIT_PLANE}
          material={face}
          raycast={noRaycast}
          position={[0, 0, faceZ + 0.0005]}
          scale={[FILE_CARD.width, FILE_CARD.height, 1]}
        />
      </group>
    </group>
  );
}
