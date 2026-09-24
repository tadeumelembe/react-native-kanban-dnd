import { KanbanColumn } from '@/components/kanban/types';

export const COLUMNS: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [
      { id: '1', title: 'Task 1', description: 'Description 1' },
      { id: '2', title: 'Task 2', description: 'Description 2' },
      { id: '3', title: 'Task 3', description: 'Description 3' },
      { id: '5', title: 'Task 5', description: 'Description 5' },
      { id: '6', title: 'Task 6', description: 'Description 6' },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [{ id: '4', title: 'Task 4', description: 'Description 4' }],
  },
  { id: 'done', title: 'Done', cards: [] },
  { id: 'cancelled', title: 'Cancelled', cards: [] },
  { id: 'archived', title: 'Archived', cards: [] },
];
