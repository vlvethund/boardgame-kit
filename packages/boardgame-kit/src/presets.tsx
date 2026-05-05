import { Layers, ShoppingBag, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { GameCardData } from './types';
import { Zone, type ZoneProps } from './Zone';
import { GameCard, type GameCardProps } from './GameCard';

export function Deck({ cards, onCardDrop, title = 'Deck' }: Pick<ZoneProps, 'cards' | 'onCardDrop' | 'title'>) {
  const top = cards?.[0];
  const remainingLayers = Math.min(Math.max((cards?.length ?? 0) - 1, 0), 3);

  return (
    <section className="gck-zone gck-pile" data-zone-id="deck" data-layout="stack">
      <div className="gck-zone__header">
        <span>{title}</span>
        <small>{cards?.length ?? 0}</small>
      </div>
      <div className="gck-zone__cards">
        {top ? (
          <div className="gck-pile__stack" data-count={cards?.length ?? 0}>
            {Array.from({ length: remainingLayers }).map((_, layerIndex) => (
              <div key={layerIndex} className="gck-pile__layer" style={{ '--pile-layer': layerIndex + 1 } as CSSProperties} />
            ))}
            <GameCard card={{ ...top, faceDown: true }} zoneId="deck" compact animation="draw" onDrop={onCardDrop} />
          </div>
        ) : (
          <div className="gck-pile__ghost">
            <Layers size={28} />
          </div>
        )}
      </div>
    </section>
  );
}

export function Hand(props: ZoneProps) {
  return <Zone {...props} layout="fan" emptyLabel="Your hand is empty" />;
}

export function DiscardPile({ cards, onCardDrop, title = 'Discard' }: Pick<ZoneProps, 'cards' | 'onCardDrop' | 'title'>) {
  const top = cards && cards.length > 0 ? cards[cards.length - 1] : undefined;

  return (
    <section className="gck-zone gck-pile" data-zone-id="discard" data-layout="stack">
      <div className="gck-zone__header">
        <span>{title}</span>
        <small>{cards?.length ?? 0}</small>
      </div>
      <div className="gck-zone__cards">
        {top ? (
          <GameCard card={top} zoneId="discard" compact animation="discard" onDrop={onCardDrop} />
        ) : (
          <div className="gck-pile__ghost">
            <Trash2 size={28} />
          </div>
        )}
      </div>
    </section>
  );
}

export function MarketRow(props: ZoneProps) {
  return <Zone {...props} layout="row" emptyLabel="Market is empty" />;
}

export function Card({ card, ...props }: { card: GameCardData } & Omit<GameCardProps, 'card'>) {
  return <GameCard card={card} {...props} />;
}

export function MarketToken() {
  return (
    <div className="gck-market-token">
      <ShoppingBag size={15} />
    </div>
  );
}
