'use client';

import { useCallback } from 'react';
import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { DPR_BY_TIER } from '@/hooks/useDeviceProfile';
import { useBack } from '@/hooks/useArchiveNavigation';
import { useArchiveStore } from '@/store/archiveStore';
import { ArchiveChoreographer } from './ArchiveChoreographer';
import { Atmosphere } from './Atmosphere';
import { CameraController } from './CameraController';
import { FileTray } from './FileTray';
import { Lighting } from './Lighting';
import { CabinetMaterialsProvider } from './materials';
import { PostEffects } from './PostEffects';
import { Room } from './Room';
import { SecurityCabinet } from './SecurityCabinet';

/**
 * The WebGL layer.
 *
 * Child order matters: `<FileTray>` is mounted before `<ArchiveChoreographer>`
 * so the tray's layout effects (which publish its timelines) have run by the
 * time the choreographer's passive effect looks for them.
 *
 * Quality knobs all hang off one tier resolved from the device — pixel ratio,
 * antialiasing and shadows are the three settings that actually decide whether
 * this runs on a mid-range phone.
 */
export function Scene() {
  const quality = useArchiveStore((s) => s.quality);
  const back = useBack();

  // Stable identity: a fresh arrow function here re-runs R3F's event wiring on
  // every render of this component.
  const handlePointerMissed = useCallback(() => back(), [back]);

  return (
    <Canvas
      shadows={quality !== 'low'}
      dpr={DPR_BY_TIER[quality]}
      gl={{
        antialias: quality === 'high',
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
      }}
      camera={{ position: [0, 1.8, 12], fov: 34, near: 0.1, far: 140 }}
      performance={{ min: 0.5 }}
      // A click that hits no 3D object is a click on the background, because
      // every decorative mesh opts out of raycasting. Treat it as "step back".
      onPointerMissed={handlePointerMissed}
    >
      <color attach="background" args={['#07080a']} />

      <CabinetMaterialsProvider>
        <Lighting />
        <Room />
        <Atmosphere />
        <SecurityCabinet />
        <FileTray />
        <ArchiveChoreographer />
      </CabinetMaterialsProvider>

      <CameraController />
      <PostEffects />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
    </Canvas>
  );
}

export default Scene;
