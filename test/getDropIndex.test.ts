import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getDropIndex } from '../src/getDropIndex.ts';

// Column: A (tall, 100) at 0, B (60) at 108, C (60) at 176. Gap between cards is 8.
const layouts = {
  a: { y: 0, height: 100 },
  b: { y: 108, height: 60 },
  c: { y: 176, height: 60 },
};
const cardIds = ['a', 'b', 'c'];
const dragA = { cardIds, layouts, activeId: 'a', activeIndex: 0, slot: 108 };

test('grabbing a card anywhere does not move its neighbours', () => {
  // A picked up, not moved yet: its center is at 50 whether grabbed at the top or bottom.
  assert.equal(getDropIndex({ ...dragA, gapIndex: 0, dragCenter: 50 }), 0);
});

test('the card below moves up only once the dragged center passes its midpoint', () => {
  // B is shown at 108..168 while the gap is at index 0; its midpoint is 138.
  assert.equal(getDropIndex({ ...dragA, gapIndex: 0, dragCenter: 137 }), 0);
  assert.equal(getDropIndex({ ...dragA, gapIndex: 0, dragCenter: 139 }), 1);
});

test('the new position is stable on the next frame', () => {
  // Gap now at 1: B shown at 0..60, C still at 176..236.
  assert.equal(getDropIndex({ ...dragA, gapIndex: 1, dragCenter: 139 }), 1);
  // Moving back up past B's new midpoint (30) swaps them back.
  assert.equal(getDropIndex({ ...dragA, gapIndex: 1, dragCenter: 29 }), 0);
});

test('dragging past the last card drops at the end', () => {
  assert.equal(getDropIndex({ ...dragA, gapIndex: 1, dragCenter: 400 }), 2);
});

test('cards from another column open a gap at the right spot', () => {
  const fromOther = { cardIds, layouts, activeId: 'x', activeIndex: -1, slot: 68, gapIndex: Infinity };
  assert.equal(getDropIndex({ ...fromOther, dragCenter: 10 }), 0);
  assert.equal(getDropIndex({ ...fromOther, dragCenter: 120 }), 1);
  assert.equal(getDropIndex({ ...fromOther, dragCenter: 500 }), 3);
});

test('an empty column always drops at index 0', () => {
  assert.equal(
    getDropIndex({ cardIds: [], layouts: {}, activeId: 'x', activeIndex: -1, slot: 68, gapIndex: Infinity, dragCenter: 300 }),
    0
  );
});
