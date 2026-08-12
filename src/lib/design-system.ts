export type DesignToken = {
  id: string;
  name: string;
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow';
  value: string | number;
};

export type DesignComponent = {
  id: string;
  name: string;
  description?: string;
  elementIds: string[];
  variants: Record<string, string[]>;
};

export type DesignLibrary = {
  id: string;
  name: string;
  tokens: DesignToken[];
  components: DesignComponent[];
};

export const starterTokens: DesignToken[] = [
  { id: 'color-ink', name: 'color.ink', category: 'color', value: '#111111' },
  { id: 'color-paper', name: 'color.paper', category: 'color', value: '#FFFFFF' },
  { id: 'color-muted', name: 'color.muted', category: 'color', value: '#737373' },
  { id: 'space-1', name: 'space.1', category: 'spacing', value: 8 },
  { id: 'space-2', name: 'space.2', category: 'spacing', value: 16 },
  { id: 'space-3', name: 'space.3', category: 'spacing', value: 24 },
  { id: 'radius-sm', name: 'radius.sm', category: 'radius', value: 8 },
  { id: 'radius-lg', name: 'radius.lg', category: 'radius', value: 24 },
  { id: 'type-display', name: 'type.display', category: 'typography', value: '800 / 64 / -0.03em' },
  { id: 'type-body', name: 'type.body', category: 'typography', value: '500 / 18 / 1.5' }
];

export const starterLibrary: DesignLibrary = {
  id: 'resit-core',
  name: 'Resit Core',
  tokens: starterTokens,
  components: []
};
