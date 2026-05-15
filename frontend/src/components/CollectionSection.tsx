import { useState } from 'react';
import type { Card } from '../types';
import CardItem from './CardItem';
import CardModal from './CardModal';

interface Props {
  name: string;
  cards: Card[];
}

export default function CollectionSection({ name, cards }: Props) {
  const [selected, setSelected] = useState<Card | null>(null);

  const owned = cards.filter((c) => c.isOwner).length;
  const total = cards.length;

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-white text-xl font-bold">{name}</h2>
        <span className="text-gray-500 text-sm">
          {owned}/{total}
        </span>
        {owned === total && (
          <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-semibold">
            Завершена
          </span>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} onClick={() => setSelected(card)} />
        ))}
      </div>

      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
