import { Color, MeshStandardMaterial, Vector3 } from 'three';
import { FLOOR_Y } from './cabinetLayout';
import { GRAIN_HUE } from './textureStats';
import { loadTextureSet, type LoadedTextureSet, type TextureSetId } from './textures';

/**
 * Service-issue steel that has been in service.
 *
 * A MeshStandardMaterial with three additions, all driven by uniforms so every
 * worn material shares one shader program:
 *
 * 1. Scanned grain. The colour map is reduced to its light and dark (15% of
 *    its own hue kept) and normalised by its per-channel mean, then
 *    multiplied into the tint — so the palette stays exactly as designed and
 *    only the texture of the surface changes. Roughness is normalised the
 *    same way.
 * 2. Edge wear. Using the per-face `edgeUv` from `metricBox`, paint within a
 *    few millimetres of a face edge chips back to bare steel along a noise
 *    line: brighter, smoother, fully metallic.
 * 3. Grime. The last 35cm above the floor darken and go matte, with a noisy
 *    top edge so it reads as dirt, not a gradient.
 *
 * Before the textures arrive the material renders flat (with wear and grime
 * already on); when they arrive they are attached and the material recompiles.
 * If they never arrive it stays flat and warns once.
 */
export interface WornMaterialOptions {
  tint: string;
  roughness: number;
  metalness: number;
  set: TextureSetId;
  /** 'full' also uses the colour map; 'surface' only the normal and roughness maps. */
  maps?: 'full' | 'surface';
  /** 0–1: how far paint has chipped back from the edges. */
  edgeWear?: number;
  /** 0–1: dirt near the floor. */
  grime?: number;
  /** 0–1: how strongly the scan varies colour, roughness and relief. */
  detail?: number;
}

/**
 * Bare steel where paint has chipped. Kept below mirror-bright and fairly
 * rough: brighter and smoother, the thin worn edges caught the environment's
 * cold light card at grazing angles and read as neon outlines in close-ups.
 */
const BARE_STEEL = '#767872';

const VERTEX_HEADER = /* glsl */ `
attribute vec4 edgeUv;
varying vec4 vWornEdge;
varying vec2 vWornUv;
varying vec3 vWornWorld;
`;

const VERTEX_BODY = /* glsl */ `
vWornEdge = edgeUv;
vWornUv = uv;
vWornWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`;

const FRAGMENT_HEADER = /* glsl */ `
uniform float uWornEdge;
uniform float uWornGrime;
uniform float uWornDetail;
uniform vec3 uWornColorMean;
uniform float uWornRoughMean;
uniform vec3 uWornBare;
uniform float uWornFloorY;
varying vec4 vWornEdge;
varying vec2 vWornUv;
varying vec3 vWornWorld;

float wornHash( vec2 p ) {
  p = fract( p * vec2( 123.34, 456.21 ) );
  p += dot( p, p + 45.32 );
  return fract( p.x * p.y );
}

float wornNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( wornHash( i ), wornHash( i + vec2( 1.0, 0.0 ) ), u.x ),
    mix( wornHash( i + vec2( 0.0, 1.0 ) ), wornHash( i + vec2( 1.0, 1.0 ) ), u.x ),
    u.y
  );
}
`;

const MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec3 wornTexel = texture2D( map, vMapUv ).rgb;
  float wornLum = dot( wornTexel, vec3( 0.2126, 0.7152, 0.0722 ) );
  vec3 wornGrain = mix( vec3( wornLum ), wornTexel, ${GRAIN_HUE.toFixed(3)} ) / uWornColorMean;
  diffuseColor.rgb *= mix( vec3( 1.0 ), wornGrain, uWornDetail );
#endif
`;

const ROUGHNESS_FRAGMENT = /* glsl */ `
float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
  float wornRough = texture2D( roughnessMap, vRoughnessMapUv ).g / uWornRoughMean;
  roughnessFactor *= mix( 1.0, wornRough, uWornDetail );
#endif
`;

const WEAR_FRAGMENT = /* glsl */ `
// Edge wear: a face without edgeUv (width 0) never wears. Chips come and go
// along an edge — where the noise is low the paint is intact — so it reads as
// handling damage rather than an outline drawn round every box.
float wornEdgeDist = min(
  min( vWornEdge.x, vWornEdge.z - vWornEdge.x ),
  min( vWornEdge.y, vWornEdge.w - vWornEdge.y )
);
float wornChip = wornNoise( vWornUv * 14.0 ) * 0.7 + wornNoise( vWornUv * 90.0 ) * 0.3;
float wornWidth = 0.009 * uWornEdge * smoothstep( 0.45, 0.8, wornChip );
float wornMask = vWornEdge.z > 0.0 && wornWidth > 0.0
  ? 1.0 - smoothstep( wornWidth * 0.6, wornWidth, wornEdgeDist )
  : 0.0;
diffuseColor.rgb = mix( diffuseColor.rgb, uWornBare, wornMask );
roughnessFactor = mix( roughnessFactor, 0.45, wornMask );
metalnessFactor = mix( metalnessFactor, 0.95, wornMask );

// Grime: dirt collects in the last 35cm above the floor.
float wornHeight = vWornWorld.y - uWornFloorY
  + ( wornNoise( vWornWorld.xz * 6.0 + vWornWorld.y * 3.0 ) - 0.5 ) * 0.12;
float wornGrimeMask = uWornGrime * ( 1.0 - smoothstep( 0.0, 0.35, wornHeight ) );
diffuseColor.rgb *= 1.0 - 0.25 * wornGrimeMask;
roughnessFactor = mix( roughnessFactor, 1.0, 0.3 * wornGrimeMask );
`;

interface WornUniforms {
  uWornEdge: { value: number };
  uWornGrime: { value: number };
  uWornDetail: { value: number };
  uWornColorMean: { value: Vector3 };
  uWornRoughMean: { value: number };
  uWornBare: { value: Color };
  uWornFloorY: { value: number };
}

function attach(
  material: MeshStandardMaterial,
  uniforms: WornUniforms,
  textures: LoadedTextureSet,
  maps: 'full' | 'surface',
  detail: number,
): void {
  if (maps === 'full') {
    material.map = textures.color;
    uniforms.uWornColorMean.value.fromArray(textures.colorMean);
  }
  material.normalMap = textures.normal;
  material.normalScale.setScalar(0.35 + 0.65 * detail);
  material.roughnessMap = textures.roughness;
  uniforms.uWornRoughMean.value = textures.roughnessMean;
  material.needsUpdate = true;
}

export function createWornMaterial(options: WornMaterialOptions): MeshStandardMaterial {
  const {
    tint,
    roughness,
    metalness,
    set,
    maps = 'full',
    edgeWear = 0,
    grime = 0,
    detail = 1,
  } = options;

  const material = new MeshStandardMaterial({ color: new Color(tint), roughness, metalness });
  material.userData.worn = true;

  const uniforms: WornUniforms = {
    uWornEdge: { value: edgeWear },
    uWornGrime: { value: grime },
    uWornDetail: { value: detail },
    uWornColorMean: { value: new Vector3(1, 1, 1) },
    uWornRoughMean: { value: 1 },
    uWornBare: { value: new Color(BARE_STEEL) },
    uWornFloorY: { value: FLOOR_Y },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEADER}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEADER}`)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', ROUGHNESS_FRAGMENT)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${WEAR_FRAGMENT}`);
  };

  let disposed = false;
  material.addEventListener('dispose', () => {
    disposed = true;
  });

  loadTextureSet(set)
    .then((textures) => {
      if (!disposed) attach(material, uniforms, textures, maps, detail);
    })
    .catch((error: unknown) => {
      console.warn(`[wornMaterial] "${set}" textures unavailable, keeping the flat material.`, error);
    });

  return material;
}
