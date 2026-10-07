---
name: verify
description: Run the react-native-kanban-dnd checks (Biome lint, typecheck, unit tests, bob build) and fix failures. Use after changing anything in src/ or test/, before committing, or when the user asks to verify, check, or validate the library.
---

# Verify the library

Run from the repo root, in this order. Stop and fix each failure before going on.

1. `yarn lint`: Biome lint, formatting, and import order. Fix formatting with `yarn format`. Fix lint errors by hand.
2. `yarn typecheck`: `tsc --noEmit` over `src/` (the test files aren't included).
3. `yarn test`: Node's built-in test runner with `--experimental-strip-types`, running `test/moveCard.test.ts` and `test/getDropIndex.test.ts`.
4. `yarn build`: react-native-builder-bob, output to `lib/`. This catches export and declaration problems that typecheck misses.

The Husky pre-commit hook runs steps 1–3. Never bypass it with `--no-verify`.

## Writing tests

- Tests import the source with an explicit `.ts` extension, for example `import { moveCard } from '../src/moveCard.ts'`, because Node runs the files directly.
- Only pure, React-free modules can be unit tested this way (`moveCard`, `getDropIndex`). Keep new logic that needs tests in a pure module like these.
- **A new test file must be added to the `test` script in `package.json`.** The script lists files explicitly and doesn't use a glob.

## UI changes

The checks above don't exercise gestures or animation. For changes to `KanbanBoard`, `KanbanColumn`, `KanbanCard`, or `DragOverlay`, also run the example app (`yarn example ios` or `yarn example android`). Check these on a device or simulator:

- reordering within a column
- moving between columns
- auto-scroll at the board and column edges
- `canDropCard` blocking
- drops into empty columns

If you can't run the app, say so instead of claiming the change works.
