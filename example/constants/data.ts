import type { KanbanColumnData } from 'react-native-kanban-dnd';

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
}

export const COLUMNS: KanbanColumnData<Task>[] = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [
      { id: '1', title: 'Design onboarding', description: 'Wireframes for the three intro screens', priority: 'high' },
      { id: '2', title: 'Set up analytics', priority: 'medium' },
      { id: '3', title: 'Write release notes', description: 'Summarize changes since 1.2', priority: 'low' },
      { id: '5', title: 'Fix login crash', description: 'Happens on Android 13 only', priority: 'high' },
      { id: '6', title: 'Update dependencies', priority: 'low' },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [{ id: '4', title: 'Dark mode', description: 'Theme tokens and settings toggle', priority: 'medium' }],
  },
  { id: 'done', title: 'Done', cards: [] },
  { id: 'archived', title: 'Archived', cards: [] },
];
