import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import type { KanbanTheme } from './theme';

/** The minimum shape of a card. Add any extra fields you need. */
export interface KanbanCardBase {
  id: string;
}

/** Card shape understood by the built-in card renderer. */
export interface KanbanCardData extends KanbanCardBase {
  title?: string;
  description?: string;
}

export interface KanbanColumnData<TCard extends KanbanCardBase = KanbanCardData> {
  id: string;
  title: string;
  cards: TCard[];
}

export interface KanbanMoveEvent<TCard extends KanbanCardBase = KanbanCardData> {
  card: TCard;
  fromColumnId: string;
  fromIndex: number;
  toColumnId: string;
  /** Index in the target column, counted as if the card had already been removed. */
  toIndex: number;
}

export interface KanbanDragStartEvent<TCard extends KanbanCardBase = KanbanCardData> {
  card: TCard;
  columnId: string;
  index: number;
}

export interface KanbanDragEndEvent<TCard extends KanbanCardBase = KanbanCardData> {
  card: TCard;
  fromColumnId: string;
  fromIndex: number;
  /** `null` when the drag was cancelled or dropped outside an allowed column. */
  toColumnId: string | null;
  toIndex: number;
}

export interface KanbanRenderCardInfo<
  TCard extends KanbanCardBase,
  TColumn extends KanbanColumnData<TCard>,
> {
  card: TCard;
  column: TColumn;
  index: number;
  /** `true` for the floating copy that follows the finger while dragging. */
  isDragging: boolean;
}

export interface KanbanRenderColumnInfo<
  TCard extends KanbanCardBase,
  TColumn extends KanbanColumnData<TCard>,
> {
  column: TColumn;
  cardCount: number;
}

export interface KanbanStyles {
  /** Outer container of the board. */
  board?: StyleProp<ViewStyle>;
  /** Content container of the horizontal scroll view (padding, gap between columns). */
  boardContent?: StyleProp<ViewStyle>;
  /** Column container. Use `theme.columnBackground` for its color, as it is animated. */
  column?: StyleProp<ViewStyle>;
  columnHeader?: StyleProp<ViewStyle>;
  columnTitle?: StyleProp<TextStyle>;
  columnCount?: StyleProp<TextStyle>;
  /** Content container of a column's vertical scroll view. */
  columnContent?: StyleProp<ViewStyle>;
  /** Built-in card container. Ignored when `renderCard` is provided. */
  card?: StyleProp<ViewStyle>;
  cardTitle?: StyleProp<TextStyle>;
  cardDescription?: StyleProp<TextStyle>;
  emptyText?: StyleProp<TextStyle>;
  /** Wrapper of the floating card while dragging (shadow, elevation). */
  dragOverlay?: StyleProp<ViewStyle>;
}

export interface KanbanBoardProps<
  TCard extends KanbanCardBase = KanbanCardData,
  TColumn extends KanbanColumnData<TCard> = KanbanColumnData<TCard>,
> {
  /** Board data. The board is controlled: update `columns` in `onMoveCard`. */
  columns: TColumn[];
  /** Called when a card is dropped in a new position. Update your state synchronously here. */
  onMoveCard: (event: KanbanMoveEvent<TCard>) => void;

  onDragStart?: (event: KanbanDragStartEvent<TCard>) => void;
  onDragEnd?: (event: KanbanDragEndEvent<TCard>) => void;
  /** Return `false` to prevent a card from being dragged. */
  canDragCard?: (card: TCard, column: TColumn) => boolean;
  /** Return `false` to prevent dropping a card into `toColumn`. */
  canDropCard?: (card: TCard, fromColumn: TColumn, toColumn: TColumn) => boolean;

  renderCard?: (info: KanbanRenderCardInfo<TCard, TColumn>) => ReactNode;
  renderColumnHeader?: (info: KanbanRenderColumnInfo<TCard, TColumn>) => ReactNode;
  /** Rendered below the cards of each column, e.g. an "Add card" button. */
  renderColumnFooter?: (info: KanbanRenderColumnInfo<TCard, TColumn>) => ReactNode;
  renderEmptyColumn?: (info: KanbanRenderColumnInfo<TCard, TColumn>) => ReactNode;

  /** Color overrides, merged over the light or dark default theme. */
  theme?: Partial<KanbanTheme>;
  /** Forces a color scheme. Defaults to the device setting. */
  colorScheme?: 'light' | 'dark';
  styles?: KanbanStyles;

  /** @default 280 */
  columnWidth?: number;
  /** Vertical space between cards. @default 8 */
  cardGap?: number;
  /** Horizontal space between columns. @default 12 */
  columnGap?: number;
  /** How long a card must be pressed before it can be dragged, in ms. @default 250 */
  longPressDelay?: number;
  /** Distance from an edge that triggers auto-scrolling while dragging. @default 60 */
  autoScrollThreshold?: number;
  /** Maximum auto-scroll speed, in points per frame. @default 12 */
  autoScrollSpeed?: number;
  /** Scale of the floating card while dragging. @default 1.03 */
  dragScale?: number;
  /** Rotation of the floating card while dragging. @default '2deg' */
  dragRotation?: string;
  /** Opacity of columns the dragged card can't be dropped into (see `canDropCard`). @default 0.4 */
  blockedColumnOpacity?: number;
  /** @default true */
  showColumnCount?: boolean;
  /** Text shown in empty columns when `renderEmptyColumn` is not set. @default 'No cards' */
  emptyColumnText?: string;
}
