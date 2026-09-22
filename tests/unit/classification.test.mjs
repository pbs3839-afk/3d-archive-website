import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highestClassification } from '../../src/lib/classification.ts';

test('highestClassification picks the most sensitive level', () => {
  assert.equal(highestClassification(['CONFIDENTIAL', 'TOP SECRET', 'SECRET']), 'TOP SECRET');
  assert.equal(highestClassification(['RESTRICTED', 'SECRET', 'CONFIDENTIAL']), 'SECRET');
  assert.equal(highestClassification(['RESTRICTED']), 'RESTRICTED');
  assert.equal(highestClassification([]), null);
});
