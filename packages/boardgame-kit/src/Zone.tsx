import { CSSProperties, ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import type { CardMoveOrigin, GameCardData, ZoneAccepts, ZoneId } from './types';
import { GameCard, type GameCardProps } from './GameCard';

export type ZoneLayout = 'stack' | 'fan' | 'row' | 'grid';

export type ZoneProps = {
  id: ZoneId;
  title?: string;
  cards?: GameCardData[];
  layout?: ZoneLayout;
  accepts?: ZoneAccepts;
  selectedCardId?: string;
  targetCardIds?: string[];
  playableCardIds?: string[];
  moveOrigins?: Record<string, CardMoveOrigin | undefined>;
  emptyLabel?: string;
  renderCard?: GameCardProps['renderCard'];
  onCardTap?: GameCardProps['onTap'];
  onCardLongPress?: GameCardProps['onLongPress'];
  onCardDragMove?: GameCardProps['onDragMove'];
  onCardDrop?: GameCardProps['onDrop'];
  children?: ReactNode;
};

export function Zone({
  id,
  title,
  cards = [],
  layout = 'row',
  selectedCardId,
  targetCardIds = [],
  playableCardIds = [],
  moveOrigins = {},
  emptyLabel = 'Drop cards here',
  renderCard,
  onCardTap,
  onCardLongPress,
  onCardDragMove,
  onCardDrop,
  children,
}: ZoneProps) {
  const midpoint = (cards.length - 1) / 2;
  const cardElements = useRef(new Map<string, HTMLDivElement>());
  const previousRects = useRef(new Map<string, DOMRect>());
  const activeAnimations = useRef<Animation[]>([]);
  const cardOrder = useMemo(() => cards.map((card) => card.id).join('|'), [cards]);

  useLayoutEffect(() => {
    activeAnimations.current.forEach((animation) => animation.cancel());
    const animations: Animation[] = [];

    for (const card of cards) {
      const element = cardElements.current.get(card.id);
      const previousRect = previousRects.current.get(card.id);
      const moveOrigin = moveOrigins[card.id];
      if (!element || element.dataset.dragging === 'true') continue;

      const nextRect = element.getBoundingClientRect();
      const originRect = previousRect ?? moveOrigin;
      if (!originRect) continue;

      const deltaX = originRect.left - nextRect.left;
      const deltaY = originRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue;

      const currentTransform = getComputedStyle(element).transform;
      const baseTransform = currentTransform === 'none' ? '' : currentTransform;
      const animation = element.animate(
        [
          {
            opacity: previousRect ? 1 : 0.86,
            transform: `translate(${deltaX}px, ${deltaY}px) scale(${originRect.width / nextRect.width}, ${originRect.height / nextRect.height}) ${baseTransform}`,
          },
          { opacity: 1, transform: baseTransform || 'none' },
        ],
        {
          duration: previousRect ? 320 : 360,
          easing: 'cubic-bezier(0.18, 0.9, 0.22, 1)',
        },
      );

      animation.addEventListener('finish', () => {
        animation.cancel();
        activeAnimations.current = activeAnimations.current.filter((item) => item !== animation);
      });
      animations.push(animation);
    }
    activeAnimations.current = animations;

    previousRects.current = new Map(
      cards.flatMap((card) => {
        const element = cardElements.current.get(card.id);
        return element ? ([[card.id, element.getBoundingClientRect()]] as const) : [];
      }),
    );

    return () => {
      activeAnimations.current.forEach((animation) => animation.cancel());
      activeAnimations.current = [];
    };
  }, [cardOrder]);

  return (
    <section className="gck-zone" data-zone-id={id} data-layout={layout}>
      {title && (
        <div className="gck-zone__header">
          <span>{title}</span>
          <small>{cards.length}</small>
        </div>
      )}
      <div className="gck-zone__cards">
        {cards.map((card, cardIndex) => {
          const slotIndex = cardIndex - midpoint;

          return (
            <div
              key={card.id}
              ref={(element) => {
              if (element) {
                cardElements.current.set(card.id, element);
              } else {
                cardElements.current.delete(card.id);
              }
              }}
              className="gck-card-slot"
              data-card-id={card.id}
              data-compact={layout === 'stack' ? 'true' : 'false'}
              style={
                {
                  '--card-index': slotIndex,
                } as CSSProperties
              }
            >
              <GameCard
                card={card}
                zoneId={id}
                index={slotIndex}
                fan={layout === 'fan'}
                compact={layout === 'stack'}
                renderCard={renderCard}
                selected={selectedCardId === card.id}
                targetable={targetCardIds.includes(card.id)}
                playable={playableCardIds.includes(card.id)}
                animation={card.faceDown ? 'none' : 'reveal'}
                onTap={onCardTap}
                onLongPress={onCardLongPress}
                onDragMove={onCardDragMove}
                onDrop={onCardDrop}
              />
            </div>
          );
        })}
        {cards.length === 0 && <div className="gck-zone__empty">{emptyLabel}</div>}
        {children}
      </div>
    </section>
  );
}
