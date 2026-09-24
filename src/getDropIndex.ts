import type { CardLayout } from './context';

export interface DropIndexInput {
  /** Card ids of the hovered column, in order. */
  cardIds: string[];
  layouts: Record<string, CardLayout>;
  activeId: string | null;
  /** Index of the dragged card in this column, or -1 if it comes from another column. */
  activeIndex: number;
  /** Height of the dragged card plus the gap between cards. */
  slot: number;
  /** Drop index currently shown as a gap in this column (Infinity if none). */
  gapIndex: number;
  /** Center of the dragged card, in the column's content coords. */
  dragCenter: number;
}

/**
 * Counts the cards whose midpoint, where they are currently shown, is above the
 * dragged card's center. A card only moves once the center crosses it, no
 * matter where the dragged card was grabbed.
 */
export function getDropIndex(input: DropIndexInput) {
  'worklet';
  const { cardIds, layouts, activeId, activeIndex, slot, gapIndex, dragCenter } = input;
  let index = 0;
  for (let i = 0; i < cardIds.length; i++) {
    if (cardIds[i] === activeId) continue;
    const layout = layouts[cardIds[i]];
    if (!layout) continue;
    // Position with the dragged card's slot closed, then with the drop gap opened.
    let top = activeIndex >= 0 && i > activeIndex ? layout.y - slot : layout.y;
    if (index >= gapIndex) top += slot;
    if (dragCenter > top + layout.height / 2) index++;
    else break;
  }
  return index;
}
