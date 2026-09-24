import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

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
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag.pointer.get().x + drag.grabOffset.get().x },
      { translateY: drag.pointer.get().y + drag.grabOffset.get().y },
      { rotate: dragRotation },
      { scale: dragScale },
    ],
  }));

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
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
