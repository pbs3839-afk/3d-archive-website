import { BoxGeometry, BufferAttribute, PlaneGeometry } from 'three';

/**
 * Box and plane geometry with UVs measured in metres.
 *
 * The procedural cabinet used to scale one shared unit cube per mesh. That is
 * cheap, but its UVs run 0–1 on every face whatever the face's size, so a
 * texture laid on it stretches differently on a 3m panel and a 2cm handle.
 * Here each face's UVs are its real extent in metres, and a texture set's
 * `repeat` (1 / its real-world size) turns that into the right grain density.
 *
 * Every box also carries `edgeUv` = (u, v, faceWidth, faceHeight) in metres,
 * without the random offset, so the wear shader can measure how far a
 * fragment is from the edge of its face.
 *
 * Geometry is cached by dimensions and seed: identical parts share one
 * geometry, and `seed` is how two same-sized parts (nine drawer fronts) get
 * different patches of the texture instead of an obvious copy.
 */

/** Largest random UV offset, in metres — larger than every texture set's size. */
const MAX_OFFSET = 4;

const boxes = new Map<string, BoxGeometry>();
const planes = new Map<string, PlaneGeometry>();

function keyFor(dims: number[], seed: number): string {
  return `${dims.map((n) => n.toFixed(4)).join('x')}#${seed}`;
}

/** FNV-1a, folded into two numbers in [0, 1). Deterministic across reloads. */
function hash2(text: string): [number, number] {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const a = (h >>> 0) / 0x100000000;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  const b = (h >>> 0) / 0x100000000;
  return [a, b];
}

export function metricBox(width: number, height: number, depth: number, seed = 0): BoxGeometry {
  const key = keyFor([width, height, depth], seed);
  const cached = boxes.get(key);
  if (cached) return cached;

  const geometry = new BoxGeometry(width, height, depth);
  // BoxGeometry builds its faces in this order, four vertices each:
  // +x, -x (depth × height), +y, -y (width × depth), +z, -z (width × height).
  const faceSizes: Array<[number, number]> = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  const [a, b] = hash2(key);
  const offsetU = a * MAX_OFFSET;
  const offsetV = b * MAX_OFFSET;

  const uv = geometry.getAttribute('uv');
  const edge = new Float32Array(uv.count * 4);
  for (let i = 0; i < uv.count; i += 1) {
    const [faceWidth, faceHeight] = faceSizes[Math.floor(i / 4)];
    const u = uv.getX(i) * faceWidth;
    const v = uv.getY(i) * faceHeight;
    edge.set([u, v, faceWidth, faceHeight], i * 4);
    uv.setXY(i, u + offsetU, v + offsetV);
  }
  uv.needsUpdate = true;
  geometry.setAttribute('edgeUv', new BufferAttribute(edge, 4));

  boxes.set(key, geometry);
  return geometry;
}

/** A plane with metric UVs. No `edgeUv`: a floor has no worn edge. */
export function metricPlane(width: number, height: number, seed = 0): PlaneGeometry {
  const key = keyFor([width, height], seed);
  const cached = planes.get(key);
  if (cached) return cached;

  const geometry = new PlaneGeometry(width, height);
  const [a, b] = hash2(key);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * width + a * MAX_OFFSET, uv.getY(i) * height + b * MAX_OFFSET);
  }
  uv.needsUpdate = true;

  planes.set(key, geometry);
  return geometry;
}
