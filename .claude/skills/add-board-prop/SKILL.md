---
name: add-board-prop
description: Add or change a KanbanBoard prop, theme key, or style key in react-native-kanban-dnd, wired through types, defaults, context, and docs. Use when the user asks for a new configuration option, callback, render prop, theme color, or style override on the board.
---

# Add a board prop

Every public option goes through the same path. Skipping a step leaves the option undocumented, or stale inside memoized config.

## 1. Public type: `src/types.ts`

Add the prop to `KanbanBoardProps` with a JSDoc comment. Give optional props a `@default` tag. Card and column values must use the `TCard` and `TColumn` generics, never concrete types. If the prop introduces a new event or info shape, define an exported interface next to the existing `Kanban*Event` and `Kanban*Info` types.

## 2. Default value: `src/KanbanBoard.tsx`

Destructure the prop with its default in the `props` destructuring at the top of `KanbanBoard`. The default must match the `@default` tag.

## 3. Where it's read

- **Callbacks used only at drag start or end** (like `onDragStart` and `canDropCard`): read them from `latest.current` inside `startDrag` or `endDrag`. Don't add them to the config or to the dependency arrays. This keeps the drag callbacks stable.
- **Values that columns, cards, or the overlay need while rendering:** add the field to `BoardConfig` in `src/context.ts`. Add it to the `config` `useMemo` object **and** its dependency array in `KanbanBoard.tsx`. For generic render callbacks and predicates, cast them as the existing ones do (`as BoardConfig['renderCard']`).
- **Values read inside worklets** (gesture callbacks, `useAnimatedStyle`, `useFrameCallback`): they must be plain serializable values, or shared values in `DragState`. Don't call JS-thread callbacks from a worklet. Use `scheduleOnRN` from `react-native-worklets`, as `KanbanCard` does.

## 4. Theme keys and style keys

- **New color:** add it to the `KanbanTheme` interface in `src/theme.ts`, and give it a value in **both** `lightTheme` and `darkTheme`.
- **New style slot:** add it to `KanbanStyles` in `src/types.ts` with a comment saying which element it targets. Apply it as `[baseStyle, config.styles.<key>]` so user styles win. Animated colors belong in `theme`, not in a style key.

## 5. Exports: `src/index.ts`

Export any new public type or helper.

## 6. Docs: `README.md`

- Add a row to the **Props** table, keeping its order and format (`Prop | Type | Default | Description`). Theme keys go in the theme table, and style keys go in the `Keys:` list under **Styles**.
- If the option changes typical usage, add a short example in the matching **Customization** subsection.
- Update `skills/react-native-kanban-dnd/SKILL.md` too. It's the user-facing Claude skill, and its customization table should list the new option.

## 7. Example and checks

Use the option in `example/app/(tabs)/index.tsx` if it's user-visible and the example benefits. Then run the `verify` skill.
