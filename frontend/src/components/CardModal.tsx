import { useEffect } from 'react';
import type { Card } from '../types';
import { rarityConfig, formatDate } from '../utils/rarity';

interface Props {
  card: Card;
  onClose: () => void;
}

export default function CardModal({ card, onClose }: Props) {
  const cfg = rarityConfig[card.rarity];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`relative bg-gray-900 rounded-2xl border-2 ${cfg.border} p-6 max-w-sm w-full flex flex-col items-center gap-4`}
        style={cfg.glow ? { boxShadow: cfg.glow } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div
          className={`w-40 h-40 rounded-xl border ${cfg.border} bg-gray-800 flex items-center justify-center p-4`}
        >
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain" />
        </div>

        <div className="text-center">
          <h2 className="text-white text-xl font-bold">{card.name}</h2>
          <span className={`mt-1 inline-block text-sm px-3 py-1 rounded-full ${cfg.bg} ${cfg.color} font-semibold`}>
            {cfg.label}
          </span>
        </div>

        {card.isOwner ? (
          <div className="w-full bg-gray-800 rounded-xl p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">В коллекции:</span>
              <span className="text-white font-semibold">{card.count} шт.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Впервые получена:</span>
              <span className="text-white font-semibold">{formatDate(card.firstObtainedAt)}</span>
            </div>
          </div>
        ) : (
          <div className="w-full bg-gray-800 rounded-xl p-4 text-center text-gray-400 text-sm">
            Карточка ещё не получена
          </div>
        )}
      </div>
    </div>
  );
}
