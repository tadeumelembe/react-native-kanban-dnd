import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { DragState } from './board-context';
import { CardContent } from './card';
import { KanbanCard } from './types';

type DragOverlayProps = { drag: DragState; card: KanbanCard | null; width: number };

/** The floating copy of the dragged card that follows the finger. */
export function DragOverlay({ drag, card, width }: DragOverlayProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag.pointer.get().x + drag.grabOffset.get().x },
      { translateY: drag.pointer.get().y + drag.grabOffset.get().y },
      { rotate: '2deg' },
      { scale: 1.03 },
    ],
  }));

  if (!card) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { width }, style]}>
      <CardContent card={card} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
