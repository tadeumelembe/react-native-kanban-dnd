import { createContext, useContext, useMemo } from 'react';
import Animated, { AnimatedRef, SharedValue, useSharedValue } from 'react-native-reanimated';

import { KanbanCard } from './types';

export const CARD_GAP = 8;
export const COLUMN_WIDTH = 280;
export const EDGE_SIZE = 60;
export const MAX_SCROLL_STEP = 12;

/** Column position: `x`/`y` in board content coords, `bodyY` relative to the column. */
export type ColumnFrame = {
  x: number;
  y: number;
  width: number;
  bodyY: number;
  bodyHeight: number;
  contentHeight: number;
};

/** Card position within its column's scroll content. */
export type CardLayout = { y: number; height: number };

export type Point = { x: number; y: number };

/** Shared values only, so it can be captured by worklets. */
export interface DragState {
  activeId: SharedValue<string | null>;
  activeColumn: SharedValue<string | null>;
  activeIndex: SharedValue<number>;
  activeHeight: SharedValue<number>;
  /** Finger position relative to the board container. */
  pointer: SharedValue<Point>;
  /** Offset from the finger to the dragged card's top-left corner. */
  grabOffset: SharedValue<Point>;
  hoverColumn: SharedValue<string | null>;
  /** Drop index in the hover column, counted without the dragged card. */
  hoverIndex: SharedValue<number>;

  boardScrollX: SharedValue<number>;
  columnScroll: SharedValue<Record<string, number>>;
  columnFrames: SharedValue<Record<string, ColumnFrame>>;
  cardLayouts: SharedValue<Record<string, CardLayout>>;
  order: SharedValue<Record<string, string[]>>;
}

export interface BoardContextValue {
  drag: DragState;
  containerRef: AnimatedRef<Animated.View>;
  isDragging: boolean;
  startDrag: (card: KanbanCard, width: number) => void;
  endDrag: (cardId: string, toColumnId: string | null, toIndex: number) => void;
}

export function useDragState(): DragState {
  const activeId = useSharedValue<string | null>(null);
  const activeColumn = useSharedValue<string | null>(null);
  const activeIndex = useSharedValue(-1);
  const activeHeight = useSharedValue(0);
  const pointer = useSharedValue<Point>({ x: 0, y: 0 });
  const grabOffset = useSharedValue<Point>({ x: 0, y: 0 });
  const hoverColumn = useSharedValue<string | null>(null);
  const hoverIndex = useSharedValue(-1);
  const boardScrollX = useSharedValue(0);
  const columnScroll = useSharedValue<Record<string, number>>({});
  const columnFrames = useSharedValue<Record<string, ColumnFrame>>({});
  const cardLayouts = useSharedValue<Record<string, CardLayout>>({});
  const order = useSharedValue<Record<string, string[]>>({});

  return useMemo(
    () => ({
      activeId,
      activeColumn,
      activeIndex,
      activeHeight,
      pointer,
      grabOffset,
      hoverColumn,
      hoverIndex,
      boardScrollX,
      columnScroll,
      columnFrames,
      cardLayouts,
      order,
    }),
    // Shared values are stable for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoardContext must be used inside <Board>');
  return ctx;
}

/**
 * Vertical shift for the card at `index` in `columnId` while dragging: cards
 * after the dragged one close its slot, cards at/after the hover index open a gap.
 */
export function getCardOffset(ctx: DragState, columnId: string, index: number) {
  'worklet';
  if (ctx.activeId.get() === null) return 0;
  const slot = ctx.activeHeight.get() + CARD_GAP;
  let offset = 0;
  let i = index;
  if (columnId === ctx.activeColumn.get() && index > ctx.activeIndex.get()) {
    offset -= slot;
    i -= 1;
  }
  if (columnId === ctx.hoverColumn.get() && i >= ctx.hoverIndex.get()) {
    offset += slot;
  }
  return offset;
}
