import { useLayoutEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { BoardConfig, DragState } from './context';
import { renderCardContent } from './KanbanCard';
import type { KanbanCardBase, KanbanColumnData } from './types';

export type ActiveDrag = {
  card: KanbanCardBase;
  column: KanbanColumnData<KanbanCardBase>;
  index: number;
  width: number;
};

type DragOverlayProps = { drag: DragState; config: BoardConfig; active: ActiveDrag | null };

/** The floating copy of the dragged card that follows the finger. */
export function DragOverlay({ drag, config, active }: DragOverlayProps) {
  const { dragScale, dragRotation } = config;
  // 0 = resting card, 1 = fully lifted (dragScale / dragRotation).
  const lift = useSharedValue(0);
  const rotation = Number.parseFloat(dragRotation) || 0;
  const rotationUnit = dragRotation.endsWith('rad') ? 'rad' : 'deg';

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag.pointer.get().x + drag.grabOffset.get().x },
      { translateY: drag.pointer.get().y + drag.grabOffset.get().y },
      { rotate: `${rotation * lift.get()}${rotationUnit}` },
      { scale: 1 + (dragScale - 1) * lift.get() },
    ],
  }));

  // Reset between drags so the next overlay mounts at the resting size.
  useLayoutEffect(() => {
    if (!active) lift.set(0);
  }, [active]);

  // Fires once the overlay is laid out natively: hide the source card and grow.
  const onLayout = () => {
    drag.overlayReady.set(true);
    lift.set(withTiming(1, { duration: 90 }));
  };

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        styles.overlay,
        { width: active.width, shadowColor: config.theme.shadow },
        config.styles.dragOverlay,
        style,
      ]}>
      {renderCardContent(config, active.card, active.column, active.index, true)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
