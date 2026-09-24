import { useMemo } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { measure, useAnimatedRef, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

import { CARD_GAP, getCardOffset, useBoardContext } from './board-context';
import { KanbanCard } from './types';

const LONG_PRESS_MS = 250;

export function CardContent({ card }: { card: KanbanCard }) {
  const background = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={[styles.card, { backgroundColor: background, borderColor: border }]}>
      <ThemedText type="defaultSemiBold">{card.title}</ThemedText>
      {card.description ? (
        <ThemedText style={[styles.description, { color: muted }]}>{card.description}</ThemedText>
      ) : null}
    </View>
  );
}

type CardProps = { card: KanbanCard; columnId: string; index: number };

export function Card({ card, columnId, index }: CardProps) {
  const { drag, containerRef, startDrag, endDrag } = useBoardContext();
  const ref = useAnimatedRef<Animated.View>();
  const id = card.id;

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
        .activateAfterLongPress(LONG_PRESS_MS)
        // Gesture callbacks run as worklets on the UI thread, not during render.
        // eslint-disable-next-line react-hooks/refs
        .onStart((e) => {
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
          scheduleOnRN(startDrag, card, cardFrame.width);
        })
        .onUpdate((e) => {
          if (drag.activeId.get() !== id) return;
          const origin = measure(containerRef);
          if (!origin) return;
          drag.pointer.set({ x: e.absoluteX - origin.pageX, y: e.absoluteY - origin.pageY });
        })
        .onFinalize((_e, success) => {
          if (drag.activeId.get() !== id) return;
          if (success) {
            scheduleOnRN(endDrag, id, drag.hoverColumn.get(), drag.hoverIndex.get());
          } else {
            scheduleOnRN(endDrag, id, null, -1);
          }
        }),
    [card, id, columnId, index, drag, ref, containerRef, startDrag, endDrag]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const isDragged = drag.activeId.get() === id;
    const offset = getCardOffset(drag, columnId, index);
    return {
      opacity: isDragged ? 0 : 1,
      transform: [
        { translateY: drag.activeId.get() === null ? 0 : withTiming(offset, { duration: 150 }) },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View ref={ref} onLayout={onLayout} style={[styles.wrapper, animatedStyle]}>
        <CardContent card={card} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: CARD_GAP,
  },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
