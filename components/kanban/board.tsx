import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import {
  BoardContext,
  BoardContextValue,
  CARD_GAP,
  EDGE_SIZE,
  MAX_SCROLL_STEP,
  useDragState,
} from './board-context';
import { Column } from './column';
import { DragOverlay } from './drag-overlay';
import { KanbanCard, KanbanColumn } from './types';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const COLUMN_SPACING = 12;
const HIT_SLOP = COLUMN_SPACING / 2;

type BoardProps = {
  columns: KanbanColumn[];
  onMoveCard: (cardId: string, toColumnId: string, toIndex: number) => void;
};

export function Board({ columns, onMoveCard }: BoardProps) {
  const containerRef = useAnimatedRef<Animated.View>();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const drag = useDragState();
  const viewportWidth = useSharedValue(0);
  const contentWidth = useSharedValue(0);

  const [activeCard, setActiveCard] = useState<{ card: KanbanCard; width: number } | null>(null);
  const [dropCount, setDropCount] = useState(0);

  useEffect(() => {
    drag.order.set(Object.fromEntries(columns.map((c) => [c.id, c.cards.map((card) => card.id)])));
  }, [columns, drag]);

  const resetDrag = useCallback(() => {
    drag.activeId.set(null);
    drag.activeColumn.set(null);
    drag.activeIndex.set(-1);
    drag.hoverColumn.set(null);
    drag.hoverIndex.set(-1);
  }, [drag]);

  // Clear drag offsets in the same commit that renders the new card order.
  useLayoutEffect(() => {
    if (dropCount > 0) resetDrag();
  }, [dropCount, resetDrag]);

  const startDrag = useCallback((card: KanbanCard, width: number) => {
    setActiveCard({ card, width });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const endDrag = useCallback(
    (cardId: string, toColumnId: string | null, toIndex: number) => {
      setActiveCard(null);
      if (toColumnId === null || toIndex < 0) {
        resetDrag();
        return;
      }
      onMoveCard(cardId, toColumnId, toIndex);
      setDropCount((n) => n + 1);
      Haptics.selectionAsync();
    },
    [onMoveCard, resetDrag]
  );

  const scrollHandler = useAnimatedScrollHandler((e) => {
    drag.boardScrollX.set(e.contentOffset.x);
  });

  // Each frame while dragging: auto-scroll near the edges and update the drop target.
  useFrameCallback(() => {
    if (drag.activeId.get() === null) return;
    const { x, y } = drag.pointer.get();

    let step = 0;
    if (x < EDGE_SIZE) step = -MAX_SCROLL_STEP * (1 - Math.max(x, 0) / EDGE_SIZE);
    else if (x > viewportWidth.get() - EDGE_SIZE)
      step = MAX_SCROLL_STEP * (1 - Math.max(viewportWidth.get() - x, 0) / EDGE_SIZE);
    if (step !== 0) {
      const maxScroll = Math.max(0, contentWidth.get() - viewportWidth.get());
      const next = Math.min(maxScroll, Math.max(0, drag.boardScrollX.get() + step));
      if (next !== drag.boardScrollX.get()) {
        drag.boardScrollX.set(next);
        scrollTo(scrollRef, next, 0, false);
      }
    }

    const contentX = x + drag.boardScrollX.get();
    const frames = drag.columnFrames.get();
    let hoverColumn: string | null = null;
    for (const columnId in frames) {
      const frame = frames[columnId];
      // Split the gap between columns so a drop there still lands somewhere.
      if (contentX >= frame.x - HIT_SLOP && contentX < frame.x + frame.width + HIT_SLOP) {
        hoverColumn = columnId;
        break;
      }
    }
    drag.hoverColumn.set(hoverColumn);
    if (hoverColumn === null) return;

    const frame = frames[hoverColumn];
    const contentY = y - (frame.y + frame.bodyY) + (drag.columnScroll.get()[hoverColumn] ?? 0);
    const cardIds = drag.order.get()[hoverColumn] ?? [];
    const isSourceColumn = hoverColumn === drag.activeColumn.get();
    const slot = drag.activeHeight.get() + CARD_GAP;

    let index = 0;
    for (let i = 0; i < cardIds.length; i++) {
      if (cardIds[i] === drag.activeId.get()) continue;
      const layout = drag.cardLayouts.get()[cardIds[i]];
      if (!layout) continue;
      // Position with the dragged card's slot already closed.
      const top = isSourceColumn && i > drag.activeIndex.get() ? layout.y - slot : layout.y;
      if (contentY > top + layout.height / 2) index++;
      else break;
    }
    drag.hoverIndex.set(index);
  });

  const isDragging = activeCard !== null;
  const context = useMemo<BoardContextValue>(
    () => ({ drag, containerRef, isDragging, startDrag, endDrag }),
    [drag, containerRef, isDragging, startDrag, endDrag]
  );

  return (
    <BoardContext.Provider value={context}>
      <Animated.View ref={containerRef} style={styles.container}>
        <AnimatedScrollView
          ref={scrollRef}
          horizontal
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          scrollEnabled={activeCard === null}
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => viewportWidth.set(e.nativeEvent.layout.width)}
          onContentSizeChange={(w: number) => contentWidth.set(w)}
          contentContainerStyle={styles.content}>
          {columns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
        </AnimatedScrollView>
        <DragOverlay drag={drag} card={activeCard?.card ?? null} width={activeCard?.width ?? 0} />
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
    gap: COLUMN_SPACING,
  },
});
