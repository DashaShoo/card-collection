import type { Rarity } from '../types';

export const rarityConfig: Record<
  Rarity,
  { label: string; color: string; border: string; bg: string; glow: string | null }
> = {
  common: {
    label: 'Обычная',
    color: 'text-gray-400',
    border: 'border-gray-600',
    bg: 'bg-gray-700',
    glow: null,
  },
  rare: {
    label: 'Редкая',
    color: 'text-blue-400',
    border: 'border-blue-500',
    bg: 'bg-blue-900',
    glow: '0 0 12px rgba(59,130,246,0.5)',
  },
  epic: {
    label: 'Эпическая',
    color: 'text-purple-400',
    border: 'border-purple-500',
    bg: 'bg-purple-900',
    glow: '0 0 12px rgba(168,85,247,0.5)',
  },
  legendary: {
    label: 'Легендарная',
    color: 'text-yellow-400',
    border: 'border-yellow-400',
    bg: 'bg-yellow-900',
    glow: '0 0 20px rgba(234,179,8,0.7)',
  },
};

export function formatDate(iso: string | null): string {
  if (!iso) return 'Неизвестно';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
