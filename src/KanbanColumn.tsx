import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  withTiming,
} from 'react-native-reanimated';

import { type ColumnFrame, useBoardContext } from './context';
import { KanbanCard } from './KanbanCard';
import type { KanbanCardBase, KanbanColumnData } from './types';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const HIGHLIGHT_DURATION = 200;

const EMPTY_FRAME: ColumnFrame = {
  x: 0,
  y: 0,
  width: 0,
  bodyY: 0,
  bodyHeight: 0,
  contentHeight: 0,
};

export function KanbanColumn({ column }: { column: KanbanColumnData<KanbanCardBase> }) {
  const { drag, config, isDragging } = useBoardContext();
  const { theme, styles: custom, autoScrollThreshold, autoScrollSpeed } = config;
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const id = column.id;
  const info = { column, cardCount: column.cards.length };

  const updateFrame = (patch: Partial<ColumnFrame>) => {
    drag.columnFrames.modify((frames) => {
      'worklet';
      frames[id] = { ...(frames[id] ?? EMPTY_FRAME), ...patch };
      return frames;
    });
  };

  const onColumnLayout = (e: LayoutChangeEvent) => {
    const { x, y, width } = e.nativeEvent.layout;
    updateFrame({ x, y, width });
  };

  const onBodyLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    updateFrame({ bodyY: y, bodyHeight: height });
  };

  const scrollHandler = useAnimatedScrollHandler((e) => {
    drag.columnScroll.set({ ...drag.columnScroll.get(), [id]: e.contentOffset.y });
  });

  // Scroll this column while a card is held near its top or bottom edge.
  useFrameCallback(() => {
    if (drag.activeId.get() === null || drag.hoverColumn.get() !== id) return;
    const frame = drag.columnFrames.get()[id];
    if (!frame) return;

    const y = drag.pointer.get().y - (frame.y + frame.bodyY);
    let step = 0;
    if (y < autoScrollThreshold) {
      step = -autoScrollSpeed * (1 - Math.max(y, 0) / autoScrollThreshold);
    } else if (y > frame.bodyHeight - autoScrollThreshold) {
      step = autoScrollSpeed * (1 - Math.max(frame.bodyHeight - y, 0) / autoScrollThreshold);
    }
    if (step === 0) return;

    const current = drag.columnScroll.get()[id] ?? 0;
    const maxScroll = Math.max(0, frame.contentHeight - frame.bodyHeight);
    const next = Math.min(maxScroll, Math.max(0, current + step));
    if (next === current) return;
    drag.columnScroll.set({ ...drag.columnScroll.get(), [id]: next });
    scrollTo(scrollRef, 0, next, false);
  });

  // 0 → 1 while a card is dragged over this column; the colors are blended from it.
  const highlight = useDerivedValue(() =>
    withTiming(drag.activeId.get() !== null && drag.hoverColumn.get() === id ? 1 : 0, {
      duration: HIGHLIGHT_DURATION,
    })
  );

  // Fade columns the dragged card isn't allowed into, so a refused drop isn't a surprise.
  const { blockedColumnOpacity } = config;
  const opacity = useDerivedValue(() =>
    withTiming(
      drag.activeId.get() !== null && drag.blockedColumns.get()[id] ? blockedColumnOpacity : 1,
      { duration: HIGHLIGHT_DURATION }
    )
  );

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    backgroundColor: interpolateColor(
      highlight.get(),
      [0, 1],
      [theme.columnBackground, theme.columnHighlightBackground]
    ),
  }));

  return (
    <Animated.View
      onLayout={onColumnLayout}
      style={[styles.column, { width: config.columnWidth }, custom.column, highlightStyle]}>
      {config.renderColumnHeader ? (
        config.renderColumnHeader(info)
      ) : (
        <View style={[styles.header, custom.columnHeader]}>
          <Text style={[styles.title, { color: theme.text }, custom.columnTitle]}>
            {column.title}
          </Text>
          {config.showColumnCount ? (
            <Text style={[styles.count, { color: theme.mutedText }, custom.columnCount]}>
              {column.cards.length}
            </Text>
          ) : null}
        </View>
      )}
      <View style={styles.body} onLayout={onBodyLayout}>
        <AnimatedScrollView
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          scrollEnabled={!isDragging}
          onContentSizeChange={(_w: number, h: number) => updateFrame({ contentHeight: h })}
          contentContainerStyle={[styles.content, custom.columnContent]}
          showsVerticalScrollIndicator={false}>
          {column.cards.map((card, index) => (
            <KanbanCard key={card.id} card={card} column={column} index={index} />
          ))}
          {column.cards.length === 0 ? (
            config.renderEmptyColumn ? (
              config.renderEmptyColumn(info)
            ) : (
              <Text style={[styles.empty, { color: theme.mutedText }, custom.emptyText]}>
                {config.emptyColumnText}
              </Text>
            )
          ) : null}
          {config.renderColumnFooter?.(info)}
        </AnimatedScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  count: {
    fontSize: 14,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 40,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
