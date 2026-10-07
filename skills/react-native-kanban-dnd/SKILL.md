---
name: react-native-kanban-dnd
description: Build drag-and-drop Kanban boards in React Native with react-native-kanban-dnd. Use when the user wants a Kanban board, task board, or draggable cards between columns in a React Native or Expo app, or is working with KanbanBoard, useKanbanBoard, moveCard, or any import from 'react-native-kanban-dnd'.
---

# react-native-kanban-dnd

A controlled, fully typed drag-and-drop Kanban board for React Native, built on Reanimated 4, Worklets, and Gesture Handler. Long-press a card to drag it within or between columns.

## Setup checklist

Check these before writing board code. Most "it doesn't drag" bugs come from skipping one.

1. **New Architecture** is required (Reanimated 4). It's on by default from React Native 0.76 and Expo SDK 52.
2. **Install the package with its peer dependencies:**
   - Expo: `npx expo install react-native-kanban-dnd react-native-gesture-handler react-native-reanimated react-native-worklets`
   - React Native CLI: `npm install react-native-kanban-dnd react-native-gesture-handler react-native-reanimated react-native-worklets`, then `cd ios && pod install`
3. **Babel:** Expo's `babel-preset-expo` already includes the Worklets plugin. With React Native CLI, add `'react-native-worklets/plugin'` as the **last** entry in `plugins` in `babel.config.js`, then restart Metro with `--reset-cache`.
4. **Gesture root:** the app root must be wrapped in `<GestureHandlerRootView style={{ flex: 1 }}>`. Expo Router apps put it in `app/_layout.tsx`.
5. **Rebuild the native app** after adding the native dependencies. Expo Go is fine only if its bundled versions match. Otherwise use a development build.
6. **Give the board room:** put it in a parent with `flex: 1` (and a `SafeAreaView` if needed). A zero-height parent renders nothing.

## Minimal board

```tsx
import { KanbanBoard, useKanbanBoard, type KanbanColumnData } from 'react-native-kanban-dnd';

const initialColumns: KanbanColumnData[] = [
  { id: 'todo', title: 'To Do', cards: [{ id: '1', title: 'Design onboarding', description: 'Wireframes' }] },
  { id: 'doing', title: 'In Progress', cards: [] },
  { id: 'done', title: 'Done', cards: [] },
];

export function Board() {
  const { columns, setColumns, onMoveCard } = useKanbanBoard(initialColumns);
  return <KanbanBoard columns={columns} onMoveCard={onMoveCard} />;
}
```

`useKanbanBoard(initial)` returns `{ columns, setColumns, onMoveCard }`. Use `setColumns` to add, edit, or remove cards.

## Core rules

- **The board is controlled.** It renders `columns` and calls `onMoveCard` on a drop. It never changes its own data.
- **Update state synchronously in `onMoveCard`.** For server-backed data, update optimistically first, then persist, and roll back on failure. If the update is late, the card visibly jumps back.
- **Use `moveCard` for external stores** (Redux, Zustand, React Query cache, and so on):
  ```ts
  import { moveCard } from 'react-native-kanban-dnd';
  onMoveCard={({ card, toColumnId, toIndex }) => setColumns((prev) => moveCard(prev, card.id, toColumnId, toIndex))}
  ```
  `toIndex` counts positions **as if the moved card were already removed** from its column. Don't add or subtract 1 for same-column moves. `moveCard` already handles this and keeps any extra column fields.
- **Card and column `id`s must be unique strings** across the whole board. Cards need only `id`. The built-in renderer also reads `title` and `description`.
- **Custom shapes use generics.** Pass the card type, and optionally the column type, to get typed render callbacks:
  ```tsx
  type Task = { id: string; title: string; priority: 'low' | 'high' };
  const { columns, onMoveCard } = useKanbanBoard<Task>(initial);
  <KanbanBoard<Task> columns={columns} onMoveCard={onMoveCard} renderCard={({ card }) => ...} />
  ```
  For extra column fields: `type Col = KanbanColumnData<Task> & { color: string }`, then `useKanbanBoard<Task, Col>` and `<KanbanBoard<Task, Col>>`.

## Customization

| Need | Use |
| --- | --- |
| Custom card UI | `renderCard={({ card, column, index, isDragging }) => ...}`. `isDragging` is true for the floating copy under the finger, so use it for a lifted style. |
| Column header, footer, empty state | `renderColumnHeader`, `renderColumnFooter` (for example an "Add card" input), `renderEmptyColumn`. Each gets `{ column, cardCount }`. |
| Colors | `theme={{ columnBackground, columnHighlightBackground, cardBackground, cardBorder, text, mutedText, boardBackground, shadow }}`, merged over the light or dark default. Force a scheme with `colorScheme="dark"`. `lightTheme` and `darkTheme` are exported. |
| Layout and typography | `styles={{ board, boardContent, column, columnHeader, columnTitle, columnCount, columnContent, card, cardTitle, cardDescription, emptyText, dragOverlay }}` |
| Lock cards | `canDragCard={(card, column) => boolean}` |
| Restrict columns | `canDropCard={(card, fromColumn, toColumn) => boolean}`. Blocked columns fade to `blockedColumnOpacity` while dragging. A drop there returns the card to where it started. |
| Haptics and analytics | `onDragStart({ card, columnId, index })`, `onDragEnd({ card, fromColumnId, fromIndex, toColumnId, toIndex })`. `toColumnId` is `null` when the drag was cancelled. |
| Sizing and feel | `columnWidth` (280), `cardGap` (8), `columnGap` (12), `longPressDelay` (250 ms), `autoScrollThreshold` (60), `autoScrollSpeed` (12), `dragScale` (1.03), `dragRotation` ('2deg'), `showColumnCount` (true), `emptyColumnText` ('No cards') |

## Pitfalls

- **Column background colors go in `theme`, not `styles.column`.** The column background is animated for the drag highlight, so a `backgroundColor` in `styles.column` gets overridden.
- `styles.card*` only apply to the built-in card. With `renderCard`, style the card yourself.
- **Don't wrap cards in your own `Pressable` with long-press handlers or gesture detectors** that compete with the drag gesture. A short-tap `onPress` for opening details usually works alongside the drag, but test it on a device.
- **Don't nest the board inside a vertical `ScrollView`.** The board scrolls horizontally and each column scrolls vertically, with auto-scroll near the edges.
- **Keep `theme` and `styles` objects stable** (hoist them out of the component, or `useMemo` them) to avoid recomputing the board config on every render.
- **For a text input in a column footer**, wrap the screen in `KeyboardAvoidingView` (`behavior="padding"` on iOS, `"height"` on Android).
- For new cards, generate unique ids (for example `crypto.randomUUID()` or a counter). Never use the array index.

## Full example: typed board with custom cards, rules, and haptics

```tsx
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import { KanbanBoard, useKanbanBoard, type KanbanColumnData } from 'react-native-kanban-dnd';

type Task = { id: string; title: string; priority: 'low' | 'high'; locked?: boolean };

const initial: KanbanColumnData<Task>[] = [
  { id: 'todo', title: 'To Do', cards: [{ id: 't1', title: 'Write spec', priority: 'high' }] },
  { id: 'done', title: 'Done', cards: [] },
  { id: 'archived', title: 'Archived', cards: [] },
];

const theme = { columnHighlightBackground: '#E0F2FE' };

export function TaskBoard() {
  const { columns, onMoveCard } = useKanbanBoard<Task>(initial);
  return (
    <KanbanBoard<Task>
      columns={columns}
      onMoveCard={onMoveCard}
      theme={theme}
      canDragCard={(card) => !card.locked}
      canDropCard={(_card, from, to) => to.id !== 'archived' || from.id === 'done'}
      onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
      onDragEnd={({ toColumnId }) => toColumnId && Haptics.selectionAsync()}
      renderCard={({ card, isDragging }) => (
        <View style={[styles.card, isDragging && styles.lifted]}>
          <Text style={styles.title}>{card.title}</Text>
          <Text>{card.priority}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E6E8' },
  lifted: { borderColor: '#0EA5E9' },
  title: { fontWeight: '600' },
});
```

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Long-press does nothing | Missing `GestureHandlerRootView`, or a competing gesture or long-press handler on the card |
| `Failed to create a worklet` or Reanimated init errors | Worklets Babel plugin missing or not last (React Native CLI), or the Metro cache wasn't reset |
| Native module not found | The app wasn't rebuilt after installing the peer dependencies, or pods weren't installed |
| Card snaps back after drop | `onMoveCard` doesn't update `columns`, updates it asynchronously, or the drop column is blocked by `canDropCard` |
| Card lands one slot off | Custom move logic that adjusts `toIndex`. Use `moveCard` |
| Board is blank | The parent has no height. Give it `flex: 1` |
