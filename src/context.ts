import { createContext, useContext, useMemo } from 'react';
import type Animated from 'react-native-reanimated';
import { type AnimatedRef, type SharedValue, useSharedValue } from 'react-native-reanimated';

import type { KanbanTheme } from './theme';
import type { KanbanBoardProps, KanbanCardBase, KanbanColumnData, KanbanStyles } from './types';

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
  /** Columns the active card may not be dropped into. */
  blockedColumns: SharedValue<Record<string, boolean>>;

  boardScrollX: SharedValue<number>;
  columnScroll: SharedValue<Record<string, number>>;
  columnFrames: SharedValue<Record<string, ColumnFrame>>;
  cardLayouts: SharedValue<Record<string, CardLayout>>;
  order: SharedValue<Record<string, string[]>>;
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
  const blockedColumns = useSharedValue<Record<string, boolean>>({});
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
      blockedColumns,
      boardScrollX,
      columnScroll,
      columnFrames,
      cardLayouts,
      order,
    }),
    // Shared values are stable for the lifetime of the component.
    []
  );
}

type AnyCard = KanbanCardBase;
type AnyColumn = KanbanColumnData<AnyCard>;

/** Board props after defaults are applied, shared with columns and cards. */
export interface BoardConfig {
  theme: KanbanTheme;
  styles: KanbanStyles;
  columnWidth: number;
  cardGap: number;
  longPressDelay: number;
  autoScrollThreshold: number;
  autoScrollSpeed: number;
  dragScale: number;
  dragRotation: string;
  blockedColumnOpacity: number;
  showColumnCount: boolean;
  emptyColumnText: string;
  renderCard?: KanbanBoardProps<AnyCard, AnyColumn>['renderCard'];
  renderColumnHeader?: KanbanBoardProps<AnyCard, AnyColumn>['renderColumnHeader'];
  renderColumnFooter?: KanbanBoardProps<AnyCard, AnyColumn>['renderColumnFooter'];
  renderEmptyColumn?: KanbanBoardProps<AnyCard, AnyColumn>['renderEmptyColumn'];
  canDragCard?: KanbanBoardProps<AnyCard, AnyColumn>['canDragCard'];
}

export interface BoardContextValue {
  drag: DragState;
  config: BoardConfig;
  containerRef: AnimatedRef<Animated.View>;
  isDragging: boolean;
  startDrag: (cardId: string, columnId: string, index: number, width: number) => void;
  endDrag: (
    cardId: string,
    fromColumnId: string,
    fromIndex: number,
    toColumnId: string | null,
    toIndex: number
  ) => void;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('Kanban components must be rendered inside <KanbanBoard>');
  return ctx;
}

/**
 * Vertical shift for the card at `index` in `columnId` while dragging: cards
 * after the dragged one close its slot, cards at/after the hover index open a gap.
 */
export function getCardOffset(drag: DragState, cardGap: number, columnId: string, index: number) {
  'worklet';
  if (drag.activeId.get() === null) return 0;
  const slot = drag.activeHeight.get() + cardGap;
  let offset = 0;
  let i = index;
  if (columnId === drag.activeColumn.get() && index > drag.activeIndex.get()) {
    offset -= slot;
    i -= 1;
  }
  if (columnId === drag.hoverColumn.get() && i >= drag.hoverIndex.get()) {
    offset += slot;
  }
  return offset;
}
