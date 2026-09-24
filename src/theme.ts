import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export interface KanbanTheme {
  /** Background behind the columns. */
  boardBackground: string;
  columnBackground: string;
  /** Column background while a card is dragged over it. */
  columnHighlightBackground: string;
  cardBackground: string;
  cardBorder: string;
  text: string;
  mutedText: string;
  shadow: string;
}

export const lightTheme: KanbanTheme = {
  boardBackground: 'transparent',
  columnBackground: '#F1F3F5',
  columnHighlightBackground: '#E6F4F9',
  cardBackground: '#FFFFFF',
  cardBorder: '#E3E6E8',
  text: '#11181C',
  mutedText: '#687076',
  shadow: '#000000',
};

export const darkTheme: KanbanTheme = {
  boardBackground: 'transparent',
  columnBackground: '#1E2022',
  columnHighlightBackground: '#1B3440',
  cardBackground: '#2A2D2F',
  cardBorder: '#34383B',
  text: '#ECEDEE',
  mutedText: '#9BA1A6',
  shadow: '#000000',
};

export function useKanbanTheme(overrides?: Partial<KanbanTheme>, colorScheme?: 'light' | 'dark') {
  const systemScheme = useColorScheme();
  const scheme = colorScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  return useMemo(
    () => ({ ...(scheme === 'dark' ? darkTheme : lightTheme), ...overrides }),
    [scheme, overrides]
  );
}
