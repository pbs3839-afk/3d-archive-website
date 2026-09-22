import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricBox, metricPlane } from '../../src/lib/metricBox.ts';

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: ${actual} != ${expected}`);

test('every face carries its own size in metres in edgeUv', () => {
  const geometry = metricBox(2, 1, 0.5, 7);
  const edge = geometry.getAttribute('edgeUv');
  // +x, -x: depth × height | +y, -y: width × depth | +z, -z: width × height
  const sizes = [[0.5, 1], [0.5, 1], [2, 0.5], [2, 0.5], [2, 1], [2, 1]];
  assert.equal(edge.count, 24);
  for (let i = 0; i < 24; i += 1) {
    const [w, h] = sizes[Math.floor(i / 4)];
    close(edge.getZ(i), w, `face width at vertex ${i}`);
    close(edge.getW(i), h, `face height at vertex ${i}`);
    assert.ok([0, w].some((v) => Math.abs(edge.getX(i) - v) < 1e-5), `u at ${i} is an edge`);
    assert.ok([0, h].some((v) => Math.abs(edge.getY(i) - v) < 1e-5), `v at ${i} is an edge`);
  }
});

test('uv is edgeUv shifted by one offset for the whole box', () => {
  const geometry = metricBox(2, 1, 0.5, 7);
  const uv = geometry.getAttribute('uv');
  const edge = geometry.getAttribute('edgeUv');
  const du = uv.getX(0) - edge.getX(0);
  const dv = uv.getY(0) - edge.getY(0);
  assert.ok(du >= 0 && du < 4 && dv >= 0 && dv < 4, `offset (${du}, ${dv}) within [0, 4)`);
  for (let i = 0; i < uv.count; i += 1) {
    close(uv.getX(i) - edge.getX(i), du, `u offset at ${i}`);
    close(uv.getY(i) - edge.getY(i), dv, `v offset at ${i}`);
  }
});

test('same size and seed share geometry; another seed gets another patch', () => {
  const a = metricBox(0.9, 0.7, 0.026, 11);
  const b = metricBox(0.9, 0.7, 0.026, 11);
  const c = metricBox(0.9, 0.7, 0.026, 12);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a.getAttribute('uv').getX(0), c.getAttribute('uv').getX(0));
});

test('plane uvs are metric and have no edge attribute', () => {
  const plane = metricPlane(46, 46);
  const uv = plane.getAttribute('uv');
  const xs = Array.from({ length: uv.count }, (_, i) => uv.getX(i));
  close(Math.max(...xs) - Math.min(...xs), 46, 'u span');
  assert.equal(plane.getAttribute('edgeUv'), undefined);
});
