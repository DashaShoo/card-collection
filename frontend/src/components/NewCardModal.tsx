import { useEffect } from 'react';
import type { Card } from '../types';
import { rarityConfig, formatDate } from '../utils/rarity';

interface Props {
  card: Card;
  onClose: () => void;
}

export default function NewCardModal({ card, onClose }: Props) {
  const cfg = rarityConfig[card.rarity];
  const isNew = card.count === 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`relative bg-gray-900 rounded-2xl border-2 ${cfg.border} p-8 max-w-sm w-full flex flex-col items-center gap-5`}
        style={cfg.glow ? { boxShadow: cfg.glow } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Вы получили</p>
          {isNew ? (
            <p className="text-orange-400 font-bold text-lg">Новая карточка!</p>
          ) : (
            <p className="text-blue-400 font-bold text-lg">Дубликат ×{card.count}</p>
          )}
        </div>

        <div
          className={`w-48 h-48 rounded-2xl border-2 ${cfg.border} bg-gray-800 flex items-center justify-center p-5 animate-bounce-once`}
          style={cfg.glow ? { boxShadow: cfg.glow } : undefined}
        >
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain" />
        </div>

        <div className="text-center flex flex-col items-center gap-2">
          <h2 className="text-white text-2xl font-bold">{card.name}</h2>
          <span className={`text-sm px-3 py-1 rounded-full ${cfg.bg} ${cfg.color} font-semibold`}>
            {cfg.label}
          </span>
          {!isNew && (
            <p className="text-gray-500 text-xs mt-1">
              Впервые получена: {formatDate(card.firstObtainedAt)}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-2 px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
        >
          Отлично!
        </button>
      </div>
    </div>
  );
}
