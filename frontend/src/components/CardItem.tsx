import type { Card } from '../types';
import { rarityConfig } from '../utils/rarity';

interface Props {
  card: Card;
  onClick: () => void;
}

export default function CardItem({ card, onClick }: Props) {
  const cfg = rarityConfig[card.rarity];

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border-2 ${cfg.border} bg-gray-800
        flex flex-col overflow-hidden flex-shrink-0 w-36 h-52
        transition-all duration-200 hover:scale-105 hover:-translate-y-1
        ${!card.isOwner ? 'grayscale opacity-40' : ''}`}
      style={card.isOwner && cfg.glow ? { boxShadow: cfg.glow } : undefined}
    >
      <div className="flex-1 flex items-center justify-center bg-gray-700/40 p-3 min-h-0">
        <img
          src={card.imageUrl}
          alt={card.name}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="px-2 py-1.5 flex flex-col gap-1 bg-gray-800">
        <p className="text-white text-xs font-semibold truncate leading-tight">{card.name}</p>
        <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} font-medium w-fit`}>
          {cfg.label}
        </span>
      </div>

      {!card.isOwner && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 opacity-70" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C9.24 2 7 4.24 7 7v1H5v13h14V8h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v1H9V7c0-1.66 1.34-3 3-3zm0 9a2 2 0 110 4 2 2 0 010-4z" />
          </svg>
        </div>
      )}

      {card.isOwner && card.count > 1 && (
        <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold leading-none">
          {card.count > 9 ? '9+' : card.count}
        </div>
      )}
    </div>
  );
}
