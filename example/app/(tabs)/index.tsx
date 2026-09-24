import { SafeAreaView } from 'react-native-safe-area-context';

import { Board } from '@/components/kanban/board';
import { useBoard } from '@/components/kanban/use-board';
import { ThemedView } from '@/components/themed-view';
import { COLUMNS } from '@/constants/data';

export default function BoardScreen() {
  const { columns, moveCard } = useBoard(COLUMNS);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Board columns={columns} onMoveCard={moveCard} />
      </SafeAreaView>
    </ThemedView>
  );
}
