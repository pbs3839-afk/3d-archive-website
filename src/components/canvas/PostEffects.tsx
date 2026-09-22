'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { useArchiveStore } from '@/store/archiveStore';

/**
 * Ambient occlusion — the contact shadow in every seam, gap and recess that a
 * cabinet built from boxes otherwise lacks — and the tone mapping that has to
 * come after it.
 *
 * Tone mapping moves into the composer while it runs, and the renderer's own
 * is switched off: applied in both places the image is mapped twice and goes
 * flat and grey. On the low tier there is no composer at all and the renderer
 * keeps doing it, exactly as before.
 *
 * The occlusion runs at half resolution and N8AO's "medium" quality, without
 * MSAA, on every tier. The quality tier is read from CPU cores and memory, so
 * a laptop with integrated graphics lands on "high" — and there
 * full-resolution, high-quality AO with 4× MSAA ran at 11 fps. Measured on an
 * Intel UHD at 1440×900 in one page session: composer off ~29 fps, these
 * settings ~24, the same with 4× MSAA ~18. The seams are soft shadows anyway;
 * half resolution costs nothing you can see.
 */
export function PostEffects() {
  const quality = useArchiveStore((s) => s.quality);
  const gl = useThree((state) => state.gl);
  const enabled = quality !== 'low';

  useEffect(() => {
    if (!enabled) return;
    gl.toneMapping = NoToneMapping;
    return () => {
      gl.toneMapping = ACESFilmicToneMapping;
    };
  }, [enabled, gl]);

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO
        aoRadius={0.35}
        distanceFalloff={0.35}
        intensity={2.5}
        quality="medium"
        halfRes
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
