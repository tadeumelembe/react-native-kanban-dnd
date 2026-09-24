import { useCallback, useState } from 'react';

import { moveCard } from './moveCard';
import type { KanbanCardBase, KanbanColumnData, KanbanMoveEvent } from './types';

/**
 * Keeps board state locally. Pass `onMoveCard` straight to `<KanbanBoard>`, or
 * use `setColumns` to add, edit or remove cards.
 */
export function useKanbanBoard<
  TCard extends KanbanCardBase,
  TColumn extends KanbanColumnData<TCard> = KanbanColumnData<TCard>,
>(initialColumns: TColumn[] | (() => TColumn[])) {
  const [columns, setColumns] = useState<TColumn[]>(initialColumns);

  const onMoveCard = useCallback((event: KanbanMoveEvent<TCard>) => {
    setColumns((prev) =>
      moveCard<TCard, TColumn>(prev, event.card.id, event.toColumnId, event.toIndex)
    );
  }, []);

  return { columns, setColumns, onMoveCard };
}
