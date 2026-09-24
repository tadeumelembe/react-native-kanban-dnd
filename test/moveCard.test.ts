import assert from 'node:assert/strict';
import { test } from 'node:test';

import { moveCard } from '../src/moveCard.ts';

type Column = { id: string; title: string; color?: string; cards: { id: string }[] };

const columns: Column[] = [
  { id: 'a', title: 'A', color: 'red', cards: [{ id: '1' }, { id: '2' }, { id: '3' }] },
  { id: 'b', title: 'B', cards: [{ id: '4' }] },
  { id: 'c', title: 'C', cards: [] },
];

const ids = (cols: Column[]) =>
  cols.map((c) => `${c.id}:${c.cards.map((card) => card.id).join('')}`).join(' ');

test('reorders within a column', () => {
  assert.equal(ids(moveCard(columns, '3', 'a', 0)), 'a:312 b:4 c:');
  assert.equal(ids(moveCard(columns, '1', 'a', 2)), 'a:231 b:4 c:');
  assert.equal(ids(moveCard(columns, '1', 'a', 0)), 'a:123 b:4 c:');
});

test('moves across columns', () => {
  assert.equal(ids(moveCard(columns, '4', 'c', 0)), 'a:123 b: c:4');
  assert.equal(ids(moveCard(columns, '2', 'b', 0)), 'a:13 b:24 c:');
});

test('clamps out-of-range indexes', () => {
  assert.equal(ids(moveCard(columns, '2', 'b', 99)), 'a:13 b:42 c:');
});

test('returns the same array for unknown cards or columns', () => {
  assert.equal(moveCard(columns, 'x', 'b', 0), columns);
  assert.equal(moveCard(columns, '1', 'x', 0), columns);
});

test('keeps untouched columns and extra column fields', () => {
  const result = moveCard(columns, '4', 'c', 0);
  assert.equal(result[0], columns[0]);
  assert.equal(result[2].title, 'C');
  assert.equal(moveCard(columns, '1', 'b', 0)[0].color, 'red');
});
