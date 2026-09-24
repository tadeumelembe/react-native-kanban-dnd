import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

import { COLUMN_WIDTH, ColumnFrame, EDGE_SIZE, MAX_SCROLL_STEP, useBoardContext } from './board-context';
import { Card } from './card';
import { KanbanColumn } from './types';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const EMPTY_FRAME: ColumnFrame = { x: 0, y: 0, width: 0, bodyY: 0, bodyHeight: 0, contentHeight: 0 };

export function Column({ column }: { column: KanbanColumn }) {
  const { drag, isDragging } = useBoardContext();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const id = column.id;

  const surface = useThemeColor({}, 'surface');
  const highlight = useThemeColor({}, 'highlight');
  const muted = useThemeColor({}, 'muted');

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
    if (y < EDGE_SIZE) step = -MAX_SCROLL_STEP * (1 - Math.max(y, 0) / EDGE_SIZE);
    else if (y > frame.bodyHeight - EDGE_SIZE)
      step = MAX_SCROLL_STEP * (1 - Math.max(frame.bodyHeight - y, 0) / EDGE_SIZE);
    if (step === 0) return;

    const current = drag.columnScroll.get()[id] ?? 0;
    const maxScroll = Math.max(0, frame.contentHeight - frame.bodyHeight);
    const next = Math.min(maxScroll, Math.max(0, current + step));
    if (next === current) return;
    drag.columnScroll.set({ ...drag.columnScroll.get(), [id]: next });
    scrollTo(scrollRef, 0, next, false);
  });

  const highlightStyle = useAnimatedStyle(() => ({
    backgroundColor: drag.activeId.get() !== null && drag.hoverColumn.get() === id ? highlight : surface,
  }));

  return (
    <Animated.View onLayout={onColumnLayout} style={[styles.column, highlightStyle]}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">{column.title}</ThemedText>
        <ThemedText style={[styles.count, { color: muted }]}>{column.cards.length}</ThemedText>
      </View>
      <View style={styles.body} onLayout={onBodyLayout}>
        <AnimatedScrollView
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          scrollEnabled={!isDragging}
          onContentSizeChange={(_w: number, h: number) => updateFrame({ contentHeight: h })}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {column.cards.map((card, index) => (
            <Card key={card.id} card={card} columnId={id} index={index} />
          ))}
          {column.cards.length === 0 ? (
            <ThemedText style={[styles.empty, { color: muted }]}>No cards</ThemedText>
          ) : null}
        </AnimatedScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: COLUMN_WIDTH,
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
