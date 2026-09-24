import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { BoardContext, type BoardConfig, type BoardContextValue, useDragState } from './context';
import { type ActiveDrag, DragOverlay } from './DragOverlay';
import { getDropIndex } from './getDropIndex';
import { KanbanColumn } from './KanbanColumn';
import { useKanbanTheme } from './theme';
import type { KanbanBoardProps, KanbanCardBase, KanbanCardData, KanbanColumnData } from './types';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

type AnyColumn = KanbanColumnData<KanbanCardBase>;

export function KanbanBoard<
  TCard extends KanbanCardBase = KanbanCardData,
  TColumn extends KanbanColumnData<TCard> = KanbanColumnData<TCard>,
>(props: KanbanBoardProps<TCard, TColumn>) {
  const {
    columns,
    theme: themeOverrides,
    colorScheme,
    styles: customStyles,
    columnWidth = 280,
    cardGap = 8,
    columnGap = 12,
    longPressDelay = 250,
    autoScrollThreshold = 60,
    autoScrollSpeed = 12,
    dragScale = 1.03,
    dragRotation = '2deg',
    blockedColumnOpacity = 0.4,
    showColumnCount = true,
    emptyColumnText = 'No cards',
    renderCard,
    renderColumnHeader,
    renderColumnFooter,
    renderEmptyColumn,
    canDragCard,
  } = props;

  const theme = useKanbanTheme(themeOverrides, colorScheme);
  const containerRef = useAnimatedRef<Animated.View>();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const drag = useDragState();
  const viewportWidth = useSharedValue(0);
  const contentWidth = useSharedValue(0);

  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [dropCount, setDropCount] = useState(0);

  // Latest props for the drag callbacks, so they stay stable across renders.
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    drag.order.set(Object.fromEntries(columns.map((c) => [c.id, c.cards.map((card) => card.id)])));
  }, [columns, drag]);

  const resetDrag = useCallback(() => {
    drag.activeId.set(null);
    drag.activeColumn.set(null);
    drag.activeIndex.set(-1);
    drag.hoverColumn.set(null);
    drag.hoverIndex.set(-1);
    drag.blockedColumns.set({});
  }, [drag]);

  // Clear drag offsets in the same commit that renders the new card order.
  useLayoutEffect(() => {
    if (dropCount > 0) resetDrag();
  }, [dropCount, resetDrag]);

  const startDrag = useCallback(
    (cardId: string, columnId: string, index: number, width: number) => {
      const { columns: cols, canDropCard, onDragStart } = latest.current;
      const column = cols.find((c) => c.id === columnId);
      const card = column?.cards.find((c) => c.id === cardId);
      if (!column || !card) return;

      if (canDropCard) {
        const blocked: Record<string, boolean> = {};
        for (const target of cols) {
          if (target.id !== columnId && !canDropCard(card, column, target)) blocked[target.id] = true;
        }
        drag.blockedColumns.set(blocked);
      }
      setActive({ card, column: column as AnyColumn, index, width });
      onDragStart?.({ card, columnId, index });
    },
    [drag]
  );

  const endDrag = useCallback(
    (
      cardId: string,
      fromColumnId: string,
      fromIndex: number,
      toColumnId: string | null,
      toIndex: number
    ) => {
      const { columns: cols, canDropCard, onDragEnd, onMoveCard } = latest.current;
      setActive(null);

      const fromColumn = cols.find((c) => c.id === fromColumnId);
      const card = fromColumn?.cards.find((c) => c.id === cardId);
      const toColumn = cols.find((c) => c.id === toColumnId);
      if (!fromColumn || !card) {
        resetDrag();
        return;
      }

      const allowed =
        toColumn !== undefined &&
        (toColumn.id === fromColumnId || !canDropCard || canDropCard(card, fromColumn, toColumn));
      const target = allowed ? toColumn.id : null;
      onDragEnd?.({ card, fromColumnId, fromIndex, toColumnId: target, toIndex: target ? toIndex : -1 });

      if (target === null || (target === fromColumnId && toIndex === fromIndex)) {
        resetDrag();
        return;
      }
      onMoveCard({ card, fromColumnId, fromIndex, toColumnId: target, toIndex });
      setDropCount((n) => n + 1);
    },
    [resetDrag]
  );

  const scrollHandler = useAnimatedScrollHandler((e) => {
    drag.boardScrollX.set(e.contentOffset.x);
  });

  // Each frame while dragging: auto-scroll near the edges and update the drop target.
  useFrameCallback(() => {
    if (drag.activeId.get() === null) return;
    const { x, y } = drag.pointer.get();
    const viewport = viewportWidth.get();

    let step = 0;
    if (x < autoScrollThreshold) {
      step = -autoScrollSpeed * (1 - Math.max(x, 0) / autoScrollThreshold);
    } else if (x > viewport - autoScrollThreshold) {
      step = autoScrollSpeed * (1 - Math.max(viewport - x, 0) / autoScrollThreshold);
    }
    if (step !== 0) {
      const maxScroll = Math.max(0, contentWidth.get() - viewport);
      const next = Math.min(maxScroll, Math.max(0, drag.boardScrollX.get() + step));
      if (next !== drag.boardScrollX.get()) {
        drag.boardScrollX.set(next);
        scrollTo(scrollRef, next, 0, false);
      }
    }

    const contentX = x + drag.boardScrollX.get();
    const frames = drag.columnFrames.get();
    const hitSlop = columnGap / 2;
    let hoverColumn: string | null = null;
    for (const columnId in frames) {
      const frame = frames[columnId];
      // Split the gap between columns so a drop there still lands somewhere.
      if (contentX >= frame.x - hitSlop && contentX < frame.x + frame.width + hitSlop) {
        hoverColumn = columnId;
        break;
      }
    }
    if (hoverColumn !== null && drag.blockedColumns.get()[hoverColumn]) hoverColumn = null;
    const previousHoverColumn = drag.hoverColumn.get();
    drag.hoverColumn.set(hoverColumn);
    if (hoverColumn === null) return;

    const frame = frames[hoverColumn];
    const activeHeight = drag.activeHeight.get();
    // Center of the dragged card (not the finger), in the column's content coords.
    const dragCenter =
      y +
      drag.grabOffset.get().y +
      activeHeight / 2 -
      (frame.y + frame.bodyY) +
      (drag.columnScroll.get()[hoverColumn] ?? 0);
    // The gap only exists in this column if it was already the hover column.
    const gapIndex = hoverColumn === previousHoverColumn ? drag.hoverIndex.get() : Infinity;
    const index = getDropIndex({
      cardIds: drag.order.get()[hoverColumn] ?? [],
      layouts: drag.cardLayouts.get(),
      activeId: drag.activeId.get(),
      activeIndex: hoverColumn === drag.activeColumn.get() ? drag.activeIndex.get() : -1,
      slot: activeHeight + cardGap,
      gapIndex,
      dragCenter,
    });
    drag.hoverIndex.set(index);
  });

  const config = useMemo<BoardConfig>(
    () => ({
      theme,
      styles: customStyles ?? {},
      columnWidth,
      cardGap,
      longPressDelay,
      autoScrollThreshold,
      autoScrollSpeed,
      dragScale,
      dragRotation,
      blockedColumnOpacity,
      showColumnCount,
      emptyColumnText,
      renderCard: renderCard as BoardConfig['renderCard'],
      renderColumnHeader: renderColumnHeader as BoardConfig['renderColumnHeader'],
      renderColumnFooter: renderColumnFooter as BoardConfig['renderColumnFooter'],
      renderEmptyColumn: renderEmptyColumn as BoardConfig['renderEmptyColumn'],
      canDragCard: canDragCard as BoardConfig['canDragCard'],
    }),
    [
      theme,
      customStyles,
      columnWidth,
      cardGap,
      longPressDelay,
      autoScrollThreshold,
      autoScrollSpeed,
      dragScale,
      dragRotation,
      blockedColumnOpacity,
      showColumnCount,
      emptyColumnText,
      renderCard,
      renderColumnHeader,
      renderColumnFooter,
      renderEmptyColumn,
      canDragCard,
    ]
  );

  const isDragging = active !== null;
  const context = useMemo<BoardContextValue>(
    () => ({ drag, config, containerRef, isDragging, startDrag, endDrag }),
    [drag, config, containerRef, isDragging, startDrag, endDrag]
  );

  return (
    <BoardContext.Provider value={context}>
      <Animated.View
        ref={containerRef}
        style={[styles.container, { backgroundColor: theme.boardBackground }, customStyles?.board]}>
        <AnimatedScrollView
          ref={scrollRef}
          horizontal
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          scrollEnabled={!isDragging}
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => viewportWidth.set(e.nativeEvent.layout.width)}
          onContentSizeChange={(w: number) => contentWidth.set(w)}
          contentContainerStyle={[styles.content, { gap: columnGap }, customStyles?.boardContent]}>
          {columns.map((column) => (
            <KanbanColumn key={column.id} column={column as AnyColumn} />
          ))}
        </AnimatedScrollView>
        <DragOverlay drag={drag} config={config} active={active} />
      </Animated.View>
    </BoardContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});
