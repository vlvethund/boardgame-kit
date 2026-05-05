import type { ReactNode } from 'react';

export type CardId = string;
export type TokenId = string;
export type DiceId = string;
export type ZoneId = string;

export type CardTone = 'ember' | 'aqua' | 'violet' | 'jade' | 'steel';
export type CardState = 'idle' | 'selected' | 'targetable' | 'disabled' | 'playable';
export type CardAnimation = 'draw' | 'reveal' | 'flip' | 'discard' | 'none';
export type AnimationPreset = 'draw' | 'reveal' | 'flip' | 'discard' | 'move' | 'shake' | 'pulse' | 'damage' | 'heal' | 'score' | 'roll' | 'reject' | 'none';

export type GameCardData = {
  id: CardId;
  title: string;
  cost?: number;
  type?: string;
  text?: string;
  power?: number;
  art?: string;
  tone?: CardTone;
  faceDown?: boolean;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};

export type ZoneKind = 'deck' | 'hand' | 'board' | 'discard' | 'market' | 'graveyard' | 'exile' | 'custom';

export type CardZone<TCard extends GameCardData = GameCardData> = {
  id: ZoneId;
  title?: string;
  kind?: ZoneKind;
  cards: TCard[];
  meta?: Record<string, unknown>;
};

export type ZoneCards<TCard extends GameCardData = GameCardData> = Record<ZoneId, TCard[]>;

export type TokenShape = 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'diamond' | 'custom';

export type GameTokenData = {
  id: TokenId;
  label?: string;
  value?: number | string;
  shape?: TokenShape;
  image?: string;
  svg?: ReactNode;
  preserveImageShape?: boolean;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};

export type DiceData = {
  id: DiceId;
  sides: number;
  value?: number;
  label?: string;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};

export type PieceKind = 'card' | 'token' | 'dice';
export type PieceId = string;

export type GamePiece =
  | { id: PieceId; kind: 'card'; data: GameCardData }
  | { id: PieceId; kind: 'token'; data: GameTokenData }
  | { id: PieceId; kind: 'dice'; data: DiceData };

export type PieceZoneData = {
  id: ZoneId;
  title?: string;
  pieces: GamePiece[];
  kind?: ZoneKind;
  meta?: Record<string, unknown>;
};

export type CardGesture = {
  card: GameCardData;
  originZoneId?: ZoneId;
};

export type CardMoveOrigin = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CardDrop = CardGesture & {
  targetZoneId?: ZoneId;
  targetCardId?: CardId;
  targetPosition?: 'before' | 'after';
  moveOrigin?: CardMoveOrigin;
};

export type CardDragMove = CardGesture & {
  targetZoneId?: ZoneId;
  targetCardId?: CardId;
  targetPosition?: 'before' | 'after';
};

export type CardRenderer = (card: GameCardData) => ReactNode;

export type ZoneAccepts = (card: GameCardData, zoneId: ZoneId) => boolean;

export type CardGameEvent = {
  type:
    | 'card:tap'
    | 'card:long-press'
    | 'card:drag-start'
    | 'card:drag-move'
    | 'card:drop'
    | 'card:select'
    | 'card:target'
    | 'card:play'
    | 'card:discard';
  card: GameCardData;
  originZoneId?: ZoneId;
  targetZoneId?: ZoneId;
  targetCardId?: CardId;
  targetPosition?: 'before' | 'after';
  pointer?: { x: number; y: number };
  inputType?: 'mouse' | 'touch' | 'pen' | 'keyboard';
};

export type CanDropCard = (event: CardDrop) => boolean;

export type PieceEvent = {
  piece: GamePiece;
  originZoneId?: ZoneId;
  targetZoneId?: ZoneId;
  targetPieceId?: PieceId;
  targetPosition?: 'before' | 'after' | 'inside';
  pointer?: { x: number; y: number };
  inputType?: 'mouse' | 'touch' | 'pen' | 'keyboard';
};

export type RulesAdapter = {
  canDrag?: (event: PieceEvent) => boolean;
  canDrop?: (event: PieceEvent) => boolean;
  canSelect?: (piece: GamePiece) => boolean;
  canTarget?: (source: GamePiece, target: GamePiece) => boolean;
  getValidTargets?: (piece: GamePiece) => PieceId[];
};

export type SelectionMode = 'none' | 'single' | 'multi';
