import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownToLine, Eye, RotateCcw, Sparkles } from 'lucide-react';
import {
  CardArt,
  CardBody,
  CardCost,
  DragLayerProvider,
  CardHeader,
  CardPower,
  CardText,
  CardTitle,
  CardType,
  Deck,
  DiceTray,
  DiscardPile,
  GameToken,
  Hand,
  MarketRow,
  PieceZone,
  TokenZone,
  Zone,
  createCardGameController,
  moveCardInZones,
  type CardDragMove,
  type CardDrop,
  type CardGesture,
  type DiceData,
  type GameCardData,
  type GamePiece,
  type GameTokenData,
} from '@boardgame-kit/react';
import '@boardgame-kit/react/styles.css';
import './styles.css';

type Zones = Record<'deck' | 'hand' | 'board' | 'market' | 'discard', GameCardData[]>;

const seedCards: GameCardData[] = [
  { id: 'ember-adept', title: 'Ember Adept', cost: 1, type: 'Unit', text: 'Tap to select. Drag to a zone.', power: 2, tone: 'ember' },
  { id: 'tidal-map', title: 'Tidal Map', cost: 2, type: 'Tactic', text: 'Long press to preview targetable cards.', tone: 'aqua' },
  { id: 'jade-warden', title: 'Jade Warden', cost: 3, type: 'Unit', text: 'Playable cards glow with a ready edge.', power: 4, tone: 'jade' },
  { id: 'rift-key', title: 'Rift Key', cost: 0, type: 'Relic', text: 'Cards can be custom-rendered per game.', tone: 'violet' },
  { id: 'steel-vow', title: 'Steel Vow', cost: 1, type: 'Guard', text: 'Drop onto discard to trigger discard motion.', power: 1, tone: 'steel' },
  { id: 'flare-shot', title: 'Flare Shot', cost: 2, type: 'Spell', text: 'Zones expose stable data-zone-id targets.', tone: 'ember' },
  { id: 'market-sage', title: 'Market Sage', cost: 4, type: 'Ally', text: 'Market rows are just zones with row layout.', power: 3, tone: 'aqua' },
  { id: 'root-sigil', title: 'Root Sigil', cost: 2, type: 'Relic', text: 'Use adapters for Zustand or boardgame.io.', tone: 'jade' },
];

const seedTokens: GameTokenData[] = [
  { id: 'wound-1', label: 'Wound', value: 1, shape: 'triangle', color: '#be503e', textColor: '#fff' },
  { id: 'guard-1', label: 'Guard', value: 2, shape: 'square', color: '#5c6870', textColor: '#fff' },
  { id: 'mana-1', label: 'Mana', value: 3, shape: 'pentagon', color: '#277a87', textColor: '#fff' },
  { id: 'focus-1', label: 'Focus', value: 'F', shape: 'hexagon', color: '#4d8a58', textColor: '#fff' },
  {
    id: 'sigil-svg',
    label: 'Sigil',
    svg: (
      <svg viewBox="0 0 64 64" role="img" aria-label="Sigil token">
        <path d="M32 3 60 32 32 61 4 32Z" fill="#7657a6" />
        <path d="M32 13 50 32 32 51 14 32Z" fill="#dfc8f4" />
        <circle cx="32" cy="32" r="8" fill="#17201c" />
      </svg>
    ),
  },
];

const seedDice: DiceData[] = [
  { id: 'd4', sides: 4, value: 3, color: '#f8faf6' },
  { id: 'd6', sides: 6, value: 5, color: '#ffd7a1' },
  { id: 'd12', sides: 12, value: 9, color: '#dfc8f4' },
  { id: 'd20', sides: 20, value: 17, color: '#bce9e5' },
];

function MarketCardFace(card: GameCardData) {
  return (
    <>
      <CardHeader>
        <CardType>{card.type ?? 'Market'}</CardType>
        <CardCost>{card.cost ?? '-'}</CardCost>
      </CardHeader>
      <CardArt src={card.art}>
        <Sparkles size={28} />
      </CardArt>
      <CardBody>
        <CardTitle>{card.title}</CardTitle>
        <CardText>{card.text}</CardText>
      </CardBody>
      {typeof card.power === 'number' && <CardPower>{card.power}</CardPower>}
    </>
  );
}

function App() {
  const [zones, setZones] = React.useState<Zones>(() => ({
    deck: seedCards.slice(4),
    hand: seedCards.slice(0, 4),
    board: [],
    market: seedCards.slice(6),
    discard: [],
  }));
  const [selectedCardId, setSelectedCardId] = React.useState<string>();
  const [targetCardIds, setTargetCardIds] = React.useState<string[]>([]);
  const [moveOrigins, setMoveOrigins] = React.useState<Record<string, CardDrop['moveOrigin']>>({});
  const [tokens, setTokens] = React.useState(seedTokens);
  const [dice, setDice] = React.useState(seedDice);
  const [log, setLog] = React.useState('Tap, long press, or drag a card.');
  const revealTimer = React.useRef<number | undefined>(undefined);
  const lastPreviewMove = React.useRef('');
  const zonesRef = React.useRef(zones);
  zonesRef.current = zones;
  const controller = React.useMemo(
    () =>
      createCardGameController<GameCardData>({
        getZones: () => zonesRef.current,
        setZones: (updater) => {
          setZones((current) => (typeof updater === 'function' ? updater(current) : updater) as Zones);
        },
      }),
    [],
  );

  const playableCardIds = zones.hand.slice(0, 3).map((card) => card.id);
  const mixedPieces: GamePiece[] = [
    ...(zones.board[0] ? [{ id: `piece-${zones.board[0].id}`, kind: 'card' as const, data: zones.board[0] }] : []),
    ...tokens.slice(0, 2).map((token) => ({ id: `piece-${token.id}`, kind: 'token' as const, data: token })),
    ...dice.slice(0, 1).map((die) => ({ id: `piece-${die.id}`, kind: 'dice' as const, data: die })),
  ];

  function handleTap({ card, originZoneId }: CardGesture) {
    setSelectedCardId((current) => (current === card.id ? undefined : card.id));
    setTargetCardIds([]);
    setLog(`Tapped ${card.title} in ${originZoneId}.`);
  }

  function handleLongPress({ card }: CardGesture) {
    const targets = [...zones.board, ...zones.market].map((item) => item.id);
    setTargetCardIds(targets);
    setSelectedCardId(card.id);
    setLog(`Long press: ${card.title} is choosing a target.`);
  }

  function handleDragMove(move: CardDragMove) {
    if (!move.originZoneId || move.originZoneId !== move.targetZoneId || !move.targetCardId || move.targetCardId === move.card.id) return;

    const previewKey = `${move.card.id}:${move.originZoneId}:${move.targetCardId}:${move.targetPosition}`;
    if (previewKey === lastPreviewMove.current) return;
    lastPreviewMove.current = previewKey;
    setZones((current) => moveCardInZones(current, move) as Zones);
  }

  function handleDrop(drop: CardDrop) {
    const { card, originZoneId, targetZoneId } = drop;
    lastPreviewMove.current = '';
    if (targetZoneId && drop.moveOrigin) {
      setMoveOrigins((current) => ({ ...current, [card.id]: drop.moveOrigin }));
      window.setTimeout(() => {
        setMoveOrigins((current) => {
          const { [card.id]: _finished, ...rest } = current;
          return rest;
        });
      }, 360);
    }
    setZones((current) => moveCardInZones(current, drop) as Zones);
    setSelectedCardId(undefined);
    setTargetCardIds([]);
    setLog(
      targetZoneId
        ? `Moved ${card.title}: ${originZoneId} -> ${targetZoneId}${drop.targetCardId ? ` (${drop.targetPosition} ${drop.targetCardId})` : ''}.`
        : `Released ${card.title} outside a zone.`,
    );
  }

  function draw() {
    controller.deck('deck').drawTo('hand', 1, (card) => ({ ...card, faceDown: false }));
    setLog('Drew one card into hand.');
  }

  function reveal() {
    if (revealTimer.current) {
      window.clearTimeout(revealTimer.current);
    }
    const revealedCardId = controller.deck('deck').top()?.id;
    controller.deck('deck').drawTo('board', 1, (card) => ({ ...card, faceDown: true }));
    revealTimer.current = window.setTimeout(() => {
      if (!revealedCardId) return;
      controller.card(revealedCardId).reveal();
    }, 80);
    setLog('Revealed one card onto the board.');
  }

  function reset() {
    setZones({
      deck: seedCards.slice(4),
      hand: seedCards.slice(0, 4),
      board: [],
      market: seedCards.slice(6),
      discard: [],
    });
    setSelectedCardId(undefined);
    setTargetCardIds([]);
    setMoveOrigins({});
    setTokens(seedTokens);
    setDice(seedDice);
    setLog('Demo reset.');
  }

  function rollDie(die: DiceData) {
    const nextValue = Math.floor(Math.random() * die.sides) + 1;
    setDice((current) => current.map((item) => (item.id === die.id ? { ...item, value: nextValue } : item)));
    setLog(`Rolled d${die.sides}: ${nextValue}.`);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p>React library prototype</p>
          <h1>Game Card Kit</h1>
        </div>
        <div className="toolbar" aria-label="Demo controls">
          <button type="button" onClick={draw} title="Draw one card">
            <ArrowDownToLine size={18} />
            Draw
          </button>
          <button type="button" onClick={reveal} title="Reveal one card">
            <Eye size={18} />
            Reveal
          </button>
          <button type="button" onClick={reset} title="Reset demo">
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </header>

      <div className="table">
        <div className="top-row">
          <Deck cards={zones.deck} onCardDrop={handleDrop} />
          <MarketRow
            id="market"
            title="Market Row"
            cards={zones.market}
            selectedCardId={selectedCardId}
            targetCardIds={targetCardIds}
            moveOrigins={moveOrigins}
            renderCard={MarketCardFace}
            onCardTap={handleTap}
            onCardLongPress={handleLongPress}
            onCardDragMove={handleDragMove}
            onCardDrop={handleDrop}
          />
          <DiscardPile cards={zones.discard} onCardDrop={handleDrop} />
        </div>

        <Zone
          id="board"
          title="Board Zone"
          cards={zones.board}
          layout="grid"
          selectedCardId={selectedCardId}
          targetCardIds={targetCardIds}
          moveOrigins={moveOrigins}
          onCardTap={handleTap}
          onCardLongPress={handleLongPress}
          onCardDragMove={handleDragMove}
          onCardDrop={handleDrop}
        >
          <div className="zone-hint">
            <Sparkles size={16} />
            Drop hand cards here
          </div>
          <div className="gck-board-tools">
            <TokenZone
              id="status-tokens"
              title="Tokens"
              tokens={tokens}
              layout="row"
              onTokenClick={(token) => setLog(`Token clicked: ${token.label ?? token.id}.`)}
            />
            <TokenZone
              id="stacked-tokens"
              title="Stack"
              tokens={tokens.slice(0, 3)}
              layout="stack"
              renderToken={(token) => <GameToken token={token} size="lg" />}
            />
            <DiceTray dice={dice} title="Dice" onRoll={rollDie} />
            <PieceZone
              id="mixed-pieces"
              title="Mixed Pieces"
              pieces={mixedPieces}
              layout="row"
              onPieceClick={(piece) => setLog(`Piece clicked: ${piece.kind}.`)}
            />
          </div>
        </Zone>

        <Hand
          id="hand"
          title="Player Hand"
          cards={zones.hand}
          selectedCardId={selectedCardId}
          targetCardIds={targetCardIds}
          playableCardIds={playableCardIds}
          moveOrigins={moveOrigins}
          onCardTap={handleTap}
          onCardLongPress={handleLongPress}
          onCardDragMove={handleDragMove}
          onCardDrop={handleDrop}
        />
      </div>

      <footer className="status-bar">
        <span>{log}</span>
        <code>Card / Deck / Hand / Zone / DiscardPile / MarketRow</code>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DragLayerProvider>
      <App />
    </DragLayerProvider>
  </React.StrictMode>,
);
