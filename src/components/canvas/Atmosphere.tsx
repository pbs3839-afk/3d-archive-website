'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
  PointsMaterial,
} from 'three';
import { CABINET, CABINET_CENTER_Y } from '@/lib/cabinetLayout';
import { useArchiveStore, type QualityTier } from '@/store/archiveStore';

const COUNT_BY_TIER: Record<QualityTier, number> = {
  high: 260,
  medium: 140,
  low: 0,
};

/** A soft round dot, drawn once — a square particle reads as a bug. */
function motePixel(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new CanvasTexture(canvas);
}

/**
 * Dust in the light.
 *
 * The cheapest way to make a dark room feel like a volume rather than a black
 * backdrop: a few hundred additive points drifting through the key light's
 * cone. One draw call, no lighting, and they are the first thing dropped on a
 * low-end device.
 */
export function Atmosphere() {
  const quality = useArchiveStore((s) => s.quality);
  const count = COUNT_BY_TIER[quality];
  const pointsRef = useRef<Points>(null);

  const { geometry, material, drift } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * (CABINET.width + 3.4);
      positions[i * 3 + 1] = Math.random() * (CABINET.height + 1.4);
      positions[i * 3 + 2] = Math.random() * 4.6 - 0.4;
      speeds[i] = 0.012 + Math.random() * 0.03;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));

    const mat = new PointsMaterial({
      size: 0.021,
      sizeAttenuation: true,
      map: motePixel(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: AdditiveBlending,
      color: '#cbd8e6',
      toneMapped: false,
    });

    return { geometry: geo, material: mat, drift: speeds };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points || count === 0) return;

    const attribute = points.geometry.getAttribute('position') as BufferAttribute;
    const array = attribute.array as Float32Array;
    const t = state.clock.elapsedTime;
    const ceiling = CABINET.height + 1.4;

    for (let i = 0; i < count; i += 1) {
      const y = i * 3 + 1;
      array[y] += drift[i] * delta;
      if (array[y] > ceiling) array[y] = -0.2;
      // A touch of lateral wander so they do not rise in straight lines.
      array[i * 3] += Math.sin(t * 0.35 + i) * delta * 0.006;
    }
    attribute.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={[0, CABINET_CENTER_Y - CABINET.height / 2, 0]}
      frustumCulled={false}
      raycast={() => null}
    />
  );
}
