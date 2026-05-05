import type { CardDrop, CardId, DiceData, DiceId, GameCardData, GameTokenData, TokenId, ZoneCards, ZoneId } from './types';
import { drawCards, moveCardInZones, reorderCards } from './state';
import { rollDie } from './Dice';

export type CardGameControllerOptions<TCard extends GameCardData> = {
  getZones: () => ZoneCards<TCard>;
  setZones: (updater: ZoneCards<TCard> | ((zones: ZoneCards<TCard>) => ZoneCards<TCard>)) => void;
  onChange?: (zones: ZoneCards<TCard>) => void;
};

export type LocatedCard<TCard extends GameCardData> = {
  card: TCard;
  zoneId: ZoneId;
  index: number;
};

export function createCardGameController<TCard extends GameCardData>({ getZones, setZones, onChange }: CardGameControllerOptions<TCard>) {
  function commit(updater: (zones: ZoneCards<TCard>) => ZoneCards<TCard>) {
    setZones((current) => {
      const next = updater(current);
      onChange?.(next);
      return next;
    });
  }

  function locateCard(cardId: CardId): LocatedCard<TCard> | undefined {
    const zones = getZones();
    for (const [zoneId, cards] of Object.entries(zones)) {
      const index = cards.findIndex((card) => card.id === cardId);
      if (index >= 0) {
        return { card: cards[index], zoneId, index };
      }
    }
    return undefined;
  }

  function updateCard(cardId: CardId, update: (card: TCard) => TCard) {
    commit((zones) => {
      const located = locateCard(cardId);
      if (!located) return zones;
      return {
        ...zones,
        [located.zoneId]: zones[located.zoneId].map((card) => (card.id === cardId ? update(card) : card)),
      };
    });
  }

  function moveCard(cardId: CardId, targetZoneId: ZoneId, targetCardId?: CardId, targetPosition: 'before' | 'after' = 'after') {
    commit((zones) => {
      const located = locateCard(cardId);
      if (!located) return zones;
      const drop: CardDrop = {
        card: located.card,
        originZoneId: located.zoneId,
        targetZoneId,
        targetCardId,
        targetPosition,
      };
      return moveCardInZones(zones, drop) as ZoneCards<TCard>;
    });
  }

  return {
    get zones() {
      return getZones();
    },
    locateCard,
    card(cardId: CardId) {
      return {
        get() {
          return locateCard(cardId)?.card;
        },
        reveal() {
          updateCard(cardId, (card) => ({ ...card, faceDown: false }));
        },
        hide() {
          updateCard(cardId, (card) => ({ ...card, faceDown: true }));
        },
        flip() {
          updateCard(cardId, (card) => ({ ...card, faceDown: !card.faceDown }));
        },
        enable() {
          updateCard(cardId, (card) => ({ ...card, disabled: false }));
        },
        disable() {
          updateCard(cardId, (card) => ({ ...card, disabled: true }));
        },
        patch(patch: Partial<TCard>) {
          updateCard(cardId, (card) => ({ ...card, ...patch }));
        },
        moveTo(targetZoneId: ZoneId, options: { targetCardId?: CardId; position?: 'before' | 'after' } = {}) {
          moveCard(cardId, targetZoneId, options.targetCardId, options.position);
        },
        discard(discardZoneId: ZoneId = 'discard') {
          moveCard(cardId, discardZoneId);
        },
      };
    },
    zone(zoneId: ZoneId) {
      return {
        getCards() {
          return getZones()[zoneId] ?? [];
        },
        clear() {
          commit((zones) => ({ ...zones, [zoneId]: [] }));
        },
        add(card: TCard, index?: number) {
          commit((zones) => {
            const cards = zones[zoneId] ?? [];
            const insertAt = typeof index === 'number' ? Math.max(0, Math.min(index, cards.length)) : cards.length;
            return {
              ...zones,
              [zoneId]: [...cards.slice(0, insertAt), card, ...cards.slice(insertAt)],
            };
          });
        },
        remove(cardId: CardId) {
          commit((zones) => ({ ...zones, [zoneId]: (zones[zoneId] ?? []).filter((card) => card.id !== cardId) }));
        },
        reorder(cardId: CardId, targetCardId: CardId, position: 'before' | 'after' = 'before') {
          commit((zones) => ({ ...zones, [zoneId]: reorderCards(zones[zoneId] ?? [], cardId, targetCardId, position) }));
        },
        moveCardTo(cardId: CardId, targetZoneId: ZoneId, options: { targetCardId?: CardId; position?: 'before' | 'after' } = {}) {
          moveCard(cardId, targetZoneId, options.targetCardId, options.position);
        },
      };
    },
    deck(deckZoneId: ZoneId = 'deck') {
      return {
        getCards() {
          return getZones()[deckZoneId] ?? [];
        },
        top() {
          return getZones()[deckZoneId]?.[0];
        },
        drawTo(targetZoneId: ZoneId, count = 1, mapDrawnCard: (card: TCard) => TCard = (card) => card) {
          commit((zones) => drawCards(zones, deckZoneId, targetZoneId, count, mapDrawnCard) as ZoneCards<TCard>);
        },
        revealTo(targetZoneId: ZoneId, count = 1) {
          commit((zones) => drawCards(zones, deckZoneId, targetZoneId, count, (card) => ({ ...card, faceDown: false })) as ZoneCards<TCard>);
        },
        hideTop() {
          const top = getZones()[deckZoneId]?.[0];
          if (top) updateCard(top.id, (card) => ({ ...card, faceDown: true }));
        },
        shuffle(random = Math.random) {
          commit((zones) => {
            const cards = [...(zones[deckZoneId] ?? [])];
            for (let index = cards.length - 1; index > 0; index -= 1) {
              const swapIndex = Math.floor(random() * (index + 1));
              [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
            }
            return { ...zones, [deckZoneId]: cards };
          });
        },
      };
    },
    hand(handZoneId: ZoneId = 'hand') {
      return {
        getCards() {
          return getZones()[handZoneId] ?? [];
        },
        sort(compare: (a: TCard, b: TCard) => number) {
          commit((zones) => ({ ...zones, [handZoneId]: [...(zones[handZoneId] ?? [])].sort(compare) }));
        },
        reorder(cardId: CardId, targetCardId: CardId, position: 'before' | 'after' = 'before') {
          commit((zones) => ({ ...zones, [handZoneId]: reorderCards(zones[handZoneId] ?? [], cardId, targetCardId, position) }));
        },
        play(cardId: CardId, boardZoneId: ZoneId = 'board') {
          moveCard(cardId, boardZoneId);
        },
        discard(cardId: CardId, discardZoneId: ZoneId = 'discard') {
          moveCard(cardId, discardZoneId);
        },
      };
    },
    board(boardZoneId: ZoneId = 'board') {
      return {
        getCards() {
          return getZones()[boardZoneId] ?? [];
        },
        clear() {
          commit((zones) => ({ ...zones, [boardZoneId]: [] }));
        },
        moveToDiscard(cardId: CardId, discardZoneId: ZoneId = 'discard') {
          moveCard(cardId, discardZoneId);
        },
      };
    },
  };
}

export type CollectionControllerOptions<TItem extends { id: string }> = {
  getItems: () => TItem[];
  setItems: (updater: TItem[] | ((items: TItem[]) => TItem[])) => void;
};

function createCollectionController<TItem extends { id: string }>({ getItems, setItems }: CollectionControllerOptions<TItem>) {
  function commit(updater: (items: TItem[]) => TItem[]) {
    setItems((current) => updater(current));
  }

  return {
    getItems,
    get(id: string) {
      return getItems().find((item) => item.id === id);
    },
    patch(id: string, patch: Partial<TItem>) {
      commit((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    add(item: TItem) {
      commit((items) => [...items, item]);
    },
    remove(id: string) {
      commit((items) => items.filter((item) => item.id !== id));
    },
    clear() {
      commit(() => []);
    },
  };
}

export function createTokenController<TToken extends GameTokenData>(options: CollectionControllerOptions<TToken>) {
  const collection = createCollectionController(options);

  return {
    ...collection,
    token(tokenId: TokenId) {
      return {
        get: () => collection.get(tokenId),
        patch: (patch: Partial<TToken>) => collection.patch(tokenId, patch),
        increment: (amount = 1) => {
          const token = collection.get(tokenId);
          if (!token) return;
          const currentValue = typeof token.value === 'number' ? token.value : 0;
          collection.patch(tokenId, { value: currentValue + amount } as Partial<TToken>);
        },
        decrement: (amount = 1) => {
          const token = collection.get(tokenId);
          if (!token) return;
          const currentValue = typeof token.value === 'number' ? token.value : 0;
          collection.patch(tokenId, { value: currentValue - amount } as Partial<TToken>);
        },
        disable: () => collection.patch(tokenId, { disabled: true } as Partial<TToken>),
        enable: () => collection.patch(tokenId, { disabled: false } as Partial<TToken>),
        remove: () => collection.remove(tokenId),
      };
    },
  };
}

export function createDiceController<TDie extends DiceData>(options: CollectionControllerOptions<TDie>) {
  const collection = createCollectionController(options);

  return {
    ...collection,
    die(dieId: DiceId) {
      return {
        get: () => collection.get(dieId),
        setValue: (value: number) => collection.patch(dieId, { value } as Partial<TDie>),
        roll: (random = Math.random) => {
          const die = collection.get(dieId);
          if (!die) return;
          collection.patch(dieId, { value: rollDie(die.sides, random) } as Partial<TDie>);
        },
        disable: () => collection.patch(dieId, { disabled: true } as Partial<TDie>),
        enable: () => collection.patch(dieId, { disabled: false } as Partial<TDie>),
      };
    },
    rollAll(random = Math.random) {
      options.setItems((dice) => dice.map((die) => ({ ...die, value: rollDie(die.sides, random) })));
    },
  };
}
