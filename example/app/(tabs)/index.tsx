import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KanbanBoard, useKanbanBoard } from 'react-native-kanban-dnd';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLUMNS, type Priority, type Task } from '@/constants/data';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#3FA36B',
  medium: '#E0A030',
  high: '#E5484D',
};

let nextId = 100;

export default function BoardScreen() {
  const colors = Colors[useColorScheme()];
  const { columns, setColumns, onMoveCard } = useKanbanBoard<Task>(COLUMNS);

  const addCard = (columnId: string) => {
    const card: Task = { id: String(nextId++), title: 'New task', priority: 'low' };
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, cards: [...c.cards, card] } : c))
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <KanbanBoard<Task>
          columns={columns}
          onMoveCard={onMoveCard}
          onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          onDragEnd={({ toColumnId }) => toColumnId && Haptics.selectionAsync()}
          // Only finished work can be archived.
          canDropCard={(_card, from, to) => to.id !== 'archived' || from.id === 'done'}
          theme={{
            columnBackground: colors.background,
            columnHighlightBackground: colors.highlight,
            cardBackground: colors.card,
            cardBorder: colors.border,
            text: colors.text,
            mutedText: colors.muted,
          }}
          styles={{ columnTitle: styles.columnTitle }}
          columnWidth={290}
          renderCard={({ card, isDragging }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: isDragging ? colors.tint : colors.border },
              ]}>
              <View style={[styles.priority, { backgroundColor: PRIORITY_COLORS[card.priority] }]} />
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
                {card.description ? (
                  <Text style={[styles.cardDescription, { color: colors.muted }]}>{card.description}</Text>
                ) : null}
                <Text style={[styles.priorityLabel, { color: PRIORITY_COLORS[card.priority] }]}>
                  {card.priority.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          renderColumnFooter={({ column }) => (
            <Pressable onPress={() => addCard(column.id)} style={styles.addButton}>
              <Text style={[styles.addText, { color: colors.muted }]}>+ Add card</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  columnTitle: {
    fontSize: 17,
    letterSpacing: 0.2,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  priority: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  addText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
