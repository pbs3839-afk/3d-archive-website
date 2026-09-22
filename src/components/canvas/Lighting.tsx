'use client';

import { useEffect, useRef } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { SpotLight } from 'three';
import { CABINET_CENTER_Y } from '@/lib/cabinetLayout';
import { LIGHT_TARGETS, getAmbientLevel, registerSceneHandle } from '@/lib/sceneRegistry';
import { SHADOW_MAP_BY_TIER } from '@/hooks/useDeviceProfile';
import { useArchiveStore } from '@/store/archiveStore';

/**
 * Holds the environment's strength to the intro's lighting level every frame.
 * Every frame, not once: drei's <Environment> resets the scene's intensity to
 * its own default whenever it re-renders.
 */
function EnvironmentLevel() {
  useFrame(({ scene }) => {
    scene.environmentIntensity = LIGHT_TARGETS.environment * getAmbientLevel();
  });
  return null;
}

/**
 * A dark room with the light pointed at one object.
 *
 * Three sources only: a warm key from high front-right that does all the
 * modelling and casts the single shadow in the scene, a cold fill from the
 * left so the unlit side does not go pure black, and a dim ambient so the room
 * reads as a room. Intensities are candela — three has been physically-based
 * since r155, so these numbers are much larger than pre-r155 examples.
 *
 * Both spots start at zero: the scroll intro raises them as the cabinet
 * emerges from the dark.
 */
export function Lighting() {
  const quality = useArchiveStore((s) => s.quality);
  const keyRef = useRef<SpotLight>(null);
  const fillRef = useRef<SpotLight>(null);

  const shadowSize = SHADOW_MAP_BY_TIER[quality];
  const castShadow = shadowSize > 0;

  useEffect(() => {
    registerSceneHandle('keyLight', keyRef.current);
    registerSceneHandle('fillLight', fillRef.current);
    return () => {
      registerSceneHandle('keyLight', null);
      registerSceneHandle('fillLight', null);
    };
  }, []);

  // Spot lights aim at their `target`, which defaults to the origin. Parking
  // it at the cabinet's centre keeps the hot spot on the doors rather than the
  // floor in front of them.
  useEffect(() => {
    [keyRef.current, fillRef.current].forEach((light) => {
      if (!light) return;
      light.target.position.set(0, CABINET_CENTER_Y, 0);
      light.target.updateMatrixWorld();
    });
  }, []);

  return (
    <>
      <ambientLight intensity={0.22} color="#39485c" />

      <spotLight
        ref={keyRef}
        position={[2.9, 5.4, 4.9]}
        angle={0.66}
        penumbra={0.88}
        intensity={0}
        distance={22}
        decay={2}
        color="#ffeeda"
        castShadow={castShadow}
        shadow-mapSize-width={shadowSize || 512}
        shadow-mapSize-height={shadowSize || 512}
        shadow-bias={-0.0015}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={18}
      />

      <spotLight
        ref={fillRef}
        position={[-4.4, 2.6, 4.4]}
        angle={0.85}
        penumbra={1}
        intensity={0}
        distance={20}
        decay={2}
        color="#7d9fc8"
      />

      {/* A faint bounce off the floor so the plinth is not a black void. */}
      <pointLight
        position={[0, 0.3, 2.4]}
        intensity={2.2}
        distance={6}
        decay={2}
        color="#4a5a70"
      />

      {/* Reflections for the steel: a dark service room lit by two ceiling
          tubes, a warm bounce from the key side and a cold wall on the fill
          side — built in-scene from light cards and rendered once. Never a
          `preset`: those fetch an HDRI from a CDN at runtime. */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={3}
          color="#e6edf2"
          position={[0, 5, 3]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[6, 0.35, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          color="#e6edf2"
          position={[0, 5, -1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[6, 0.35, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#ffe2c4"
          position={[4, 2.5, 5]}
          target={[0, 1.4, 0]}
          scale={[2.5, 2.5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.5}
          color="#7d9fc8"
          position={[-6, 2, 2]}
          target={[0, 1.4, 0]}
          scale={[4, 3, 1]}
        />
      </Environment>
      <EnvironmentLevel />

      {/* Fog does the heavy lifting in the intro: the cabinet is literally
          lost in the dark until the camera comes forward. */}
      <fog attach="fog" args={['#07080a', 5, 34]} />
    </>
  );
}
