import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PEEK_DEPTH,
  TOUR_ARRIVE,
  buildChapters,
  drawerPeek,
  locate,
  progressAt,
  totalLength,
} from '../../src/lib/chapters.ts';

const IDS = ['Locker_01', 'Locker_02', 'Locker_03', 'Locker_04', 'Locker_05'];
const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);

test('chapters run opening, vault, then one tour chapter per drawer in order', () => {
  const spans = buildChapters(false, IDS);
  assert.deepEqual(
    spans.map((span) => span.id),
    ['opening', 'vault', ...IDS.map((id) => `tour-${id}`)],
  );
  assert.deepEqual(spans.slice(2).map((span) => span.lockerId), IDS);
  assert.ok(spans.slice(2).every((span) => span.kind === 'tour'));
});

test('lengths: 8.6 screens wide, 7.4 narrow; the opening keeps the old intro distance', () => {
  const wide = buildChapters(false, IDS);
  const narrow = buildChapters(true, IDS);
  close(totalLength(wide), 8.6, 'wide total');
  close(totalLength(narrow), 7.4, 'narrow total');
  close(wide[0].length, 3.0, 'wide opening (400vh track minus one viewport)');
  close(narrow[0].length, 1.8, 'narrow opening (280vh track minus one viewport)');
  close(wide[0].end, 3.0 / 8.6, 'wide opening end');
  close(narrow[0].end, 1.8 / 7.4, 'narrow opening end');
});

test('spans tile 0..1 with no gaps', () => {
  for (const narrow of [false, true]) {
    const spans = buildChapters(narrow, IDS);
    assert.equal(spans[0].start, 0);
    assert.equal(spans.at(-1).end, 1);
    for (let i = 1; i < spans.length; i += 1) assert.equal(spans[i].start, spans[i - 1].end);
  }
});

test('locate: ends, boundaries and out-of-range progress', () => {
  const spans = buildChapters(false, IDS);
  const top = locate(spans, 0);
  assert.equal(top.span.id, 'opening');
  assert.equal(top.local, 0);
  const end = locate(spans, 1);
  assert.equal(end.span.id, 'tour-Locker_05');
  close(end.local, 1, 'local at p = 1');
  const boundary = locate(spans, spans[1].start);
  assert.equal(boundary.span.id, 'vault');
  close(boundary.local, 0, 'local at a boundary');
  assert.equal(locate(spans, -0.2).span.id, 'opening');
  assert.equal(locate(spans, 1.5).span.id, 'tour-Locker_05');
  assert.equal(locate(spans, 1.5).index, spans.length - 1);
});

test('progressAt is the inverse of locate', () => {
  const spans = buildChapters(false, IDS);
  for (const span of spans) {
    for (const local of [0, TOUR_ARRIVE, 0.5, 0.6, 0.99]) {
      const found = locate(spans, progressAt(span, local));
      assert.equal(found.span.id, span.id, `${span.id} at ${local}`);
      assert.ok(Math.abs(found.local - local) < 1e-9, `${span.id}: local ${found.local} != ${local}`);
    }
  }
});

test('drawerPeek: out while the tour holds on it, back in during the next move', () => {
  const spans = buildChapters(false, IDS);
  const [, vault, a, b] = spans;
  const at = (span, local, id) => drawerPeek(spans, progressAt(span, local), id);

  assert.equal(at(vault, 0.5, 'Locker_01'), 0, 'closed in the vault chapter');
  assert.equal(at(a, 0.2, 'Locker_01'), 0, 'closed while the camera travels to it');
  const sliding = at(a, 0.42, 'Locker_01');
  assert.ok(sliding > 0 && sliding < PEEK_DEPTH, `sliding out: ${sliding}`);
  close(at(a, 0.5, 'Locker_01'), PEEK_DEPTH, 'fully out at local 0.5');
  close(at(a, 0.999, 'Locker_01'), PEEK_DEPTH, 'held to the end of its chapter');

  const early = at(b, 0.1, 'Locker_01');
  const late = at(b, 0.3, 'Locker_01');
  assert.ok(early > late && late > 0, `sliding back in: ${early} then ${late}`);
  close(at(b, TOUR_ARRIVE, 'Locker_01'), 0, 'home once the next drawer is reached');
  assert.equal(at(b, 0.2, 'Locker_02'), 0, 'next drawer still closed during the move');
  assert.equal(at(b, 0.2, 'Locker_03'), 0, 'unrelated drawer untouched');
});

test('drawerPeek is continuous across a boundary, and the last drawer stays out', () => {
  const spans = buildChapters(false, IDS);
  const boundary = spans[3].start; // tour-Locker_01 -> tour-Locker_02
  close(
    drawerPeek(spans, boundary - 1e-9, 'Locker_01'),
    drawerPeek(spans, boundary, 'Locker_01'),
    'no jump at the boundary',
  );
  close(drawerPeek(spans, 1, 'Locker_05'), PEEK_DEPTH, 'E-15 still out at the end of the page');
});
