import { useCallback, useState } from 'react';

import { KanbanColumn } from './types';

/**
 * Moves a card to `toIndex` of `toColumnId`. `toIndex` is the position in the
 * target column as it looks with the moved card already removed.
 */
export function moveCardInColumns(
  columns: KanbanColumn[],
  cardId: string,
  toColumnId: string,
  toIndex: number
): KanbanColumn[] {
  const card = columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
  if (!card || !columns.some((c) => c.id === toColumnId)) return columns;

  return columns.map((column) => {
    const cards = column.cards.filter((c) => c.id !== cardId);
    if (column.id === toColumnId) {
      const index = Math.max(0, Math.min(toIndex, cards.length));
      cards.splice(index, 0, card);
    }
    return cards.length === column.cards.length && column.id !== toColumnId
      ? column
      : { ...column, cards };
  });
}

export function useBoard(initial: KanbanColumn[]) {
  const [columns, setColumns] = useState(initial);

  const moveCard = useCallback((cardId: string, toColumnId: string, toIndex: number) => {
    setColumns((prev) => moveCardInColumns(prev, cardId, toColumnId, toIndex));
  }, []);

  return { columns, moveCard };
}
