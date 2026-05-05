import { createContext, ReactNode, useContext } from 'react';
import type { CanDropCard, CardGameEvent, CardZone, GameCardData, ZoneCards } from './types';

export type CardGameContextValue<TCard extends GameCardData = GameCardData> = {
  zones?: ZoneCards<TCard>;
  zoneDefinitions?: CardZone<TCard>[];
  canDrop?: CanDropCard;
  onCardEvent?: (event: CardGameEvent) => void;
};

const CardGameContext = createContext<CardGameContextValue | undefined>(undefined);

export type CardGameProviderProps<TCard extends GameCardData = GameCardData> = CardGameContextValue<TCard> & {
  children: ReactNode;
};

export function CardGameProvider<TCard extends GameCardData = GameCardData>({
  zones,
  zoneDefinitions,
  canDrop,
  onCardEvent,
  children,
}: CardGameProviderProps<TCard>) {
  return <CardGameContext.Provider value={{ zones, zoneDefinitions, canDrop, onCardEvent }}>{children}</CardGameContext.Provider>;
}

export function useCardGame<TCard extends GameCardData = GameCardData>() {
  return useContext(CardGameContext) as CardGameContextValue<TCard> | undefined;
}
