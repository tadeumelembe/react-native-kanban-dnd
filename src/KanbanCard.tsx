import { useMemo } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { measure, useAnimatedRef, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { type BoardConfig, getCardOffset, useBoardContext } from './context';
import type { KanbanCardBase, KanbanCardData, KanbanColumnData } from './types';

/** The built-in card look, used when `renderCard` is not provided. */
export function DefaultCard({ card, config }: { card: KanbanCardData; config: BoardConfig }) {
  const { theme, styles: custom } = config;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder },
        custom.card,
      ]}>
      {card.title ? (
        <Text style={[styles.title, { color: theme.text }, custom.cardTitle]}>{card.title}</Text>
      ) : null}
      {card.description ? (
        <Text style={[styles.description, { color: theme.mutedText }, custom.cardDescription]}>
          {card.description}
        </Text>
      ) : null}
    </View>
  );
}

export function renderCardContent(
  config: BoardConfig,
  card: KanbanCardBase,
  column: KanbanColumnData<KanbanCardBase>,
  index: number,
  isDragging: boolean
) {
  if (config.renderCard) return config.renderCard({ card, column, index, isDragging });
  return <DefaultCard card={card} config={config} />;
}

type CardProps = {
  card: KanbanCardBase;
  column: KanbanColumnData<KanbanCardBase>;
  index: number;
};

export function KanbanCard({ card, column, index }: CardProps) {
  const { drag, config, containerRef, startDrag, endDrag } = useBoardContext();
  const ref = useAnimatedRef<Animated.View>();
  const id = card.id;
  const columnId = column.id;
  const { cardGap, longPressDelay } = config;
  const enabled = config.canDragCard ? config.canDragCard(card, column) : true;

  const onLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    drag.cardLayouts.modify((layouts) => {
      'worklet';
      layouts[id] = { y, height };
      return layouts;
    });
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activateAfterLongPress(longPressDelay)
        // Gesture callbacks run as worklets on the UI thread, not during render.
        // eslint-disable-next-line react-hooks/refs
        .onStart((e) => {
          'worklet';
          const cardFrame = measure(ref);
          const origin = measure(containerRef);
          if (!cardFrame || !origin) return;

          drag.activeId.set(id);
          drag.activeColumn.set(columnId);
          drag.activeIndex.set(index);
          drag.activeHeight.set(cardFrame.height);
          drag.hoverColumn.set(columnId);
          drag.hoverIndex.set(index);
          drag.grabOffset.set({ x: cardFrame.pageX - e.absoluteX, y: cardFrame.pageY - e.absoluteY });
          drag.pointer.set({ x: e.absoluteX - origin.pageX, y: e.absoluteY - origin.pageY });
          scheduleOnRN(startDrag, id, columnId, index, cardFrame.width);
        })
        .onUpdate((e) => {
          'worklet';
          if (drag.activeId.get() !== id) return;
          const origin = measure(containerRef);
          if (!origin) return;
          drag.pointer.set({ x: e.absoluteX - origin.pageX, y: e.absoluteY - origin.pageY });
        })
        .onFinalize((_e, success) => {
          'worklet';
          if (drag.activeId.get() !== id) return;
          const toColumn = success ? drag.hoverColumn.get() : null;
          scheduleOnRN(endDrag, id, columnId, index, toColumn, drag.hoverIndex.get());
        }),
    [enabled, longPressDelay, id, columnId, index, drag, ref, containerRef, startDrag, endDrag]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const offset = getCardOffset(drag, cardGap, columnId, index);
    return {
      opacity: drag.activeId.get() === id ? 0 : 1,
      transform: [
        { translateY: drag.activeId.get() === null ? 0 : withTiming(offset, { duration: 150 }) },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        ref={ref}
        onLayout={onLayout}
        style={[{ marginBottom: cardGap }, animatedStyle]}>
        {renderCardContent(config, card, column, index, false)}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  title: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
