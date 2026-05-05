import type { CardDragMove, CardDrop, GameCardData, ZoneCards, ZoneId } from './types';

export function moveCardInZones<TCard extends GameCardData>(zones: ZoneCards<TCard>, move: CardDrop | CardDragMove): ZoneCards<TCard> {
  const { card, originZoneId: from, targetZoneId: to, targetCardId, targetPosition } = move;
  if (!from || !to || !(from in zones) || !(to in zones)) return zones;
  if (from === to && targetCardId === card.id) return zones;

  const movingCard = zones[from].find((item) => item.id === card.id);
  if (!movingCard) return zones;

  const nextSource = zones[from].filter((item) => item.id !== card.id);
  const nextTargetBase = from === to ? nextSource : zones[to].filter((item) => item.id !== card.id);
  const targetCardIndex = targetCardId ? nextTargetBase.findIndex((item) => item.id === targetCardId) : -1;
  const insertAt = targetCardIndex >= 0 ? targetCardIndex + (targetPosition === 'after' ? 1 : 0) : nextTargetBase.length;
  const nextTarget = [...nextTargetBase.slice(0, insertAt), movingCard, ...nextTargetBase.slice(insertAt)];

  return {
    ...zones,
    [from]: from === to ? nextTarget : nextSource,
    [to]: nextTarget,
  };
}

export function drawCards<TCard extends GameCardData>(
  zones: ZoneCards<TCard>,
  deckZoneId: ZoneId,
  targetZoneId: ZoneId,
  count = 1,
  mapDrawnCard: (card: TCard) => TCard = (card) => card,
): ZoneCards<TCard> {
  if (!(deckZoneId in zones) || !(targetZoneId in zones) || count <= 0) return zones;
  const drawn = zones[deckZoneId].slice(0, count).map(mapDrawnCard);
  if (drawn.length === 0) return zones;

  return {
    ...zones,
    [deckZoneId]: zones[deckZoneId].slice(drawn.length),
    [targetZoneId]: [...zones[targetZoneId], ...drawn],
  };
}

export function reorderCards<TCard extends GameCardData>(
  cards: TCard[],
  cardId: string,
  targetCardId: string,
  targetPosition: 'before' | 'after' = 'before',
): TCard[] {
  if (cardId === targetCardId) return cards;
  const movingCard = cards.find((card) => card.id === cardId);
  if (!movingCard) return cards;

  const withoutMoving = cards.filter((card) => card.id !== cardId);
  const targetIndex = withoutMoving.findIndex((card) => card.id === targetCardId);
  if (targetIndex < 0) return cards;
  const insertAt = targetIndex + (targetPosition === 'after' ? 1 : 0);

  return [...withoutMoving.slice(0, insertAt), movingCard, ...withoutMoving.slice(insertAt)];
}
