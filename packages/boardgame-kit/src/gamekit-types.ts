export type InputType = 'mouse' | 'touch' | 'pen' | 'keyboard' | 'system';

export type Visibility = 'public' | 'hidden' | 'owner-only' | 'team-only' | 'committed' | 'revealed';

export type GenericPieceKind = 'card' | 'token' | 'dice' | 'tile' | 'meeple' | 'marker' | 'cube' | 'custom';

export type ContainerKind = 'zone' | 'slot' | 'deck' | 'pile' | 'bag' | 'track' | 'grid' | 'node' | 'edge' | 'cell' | 'custom';

export type CollectionMode = 'ordered' | 'unordered' | 'random' | 'stack' | 'supply';

export type Location =
  | { type: 'container'; containerId: string; index?: number }
  | { type: 'grid'; x: number; y: number; layer?: string }
  | { type: 'hex'; q: number; r: number; s?: number; layer?: string }
  | { type: 'graph-node'; nodeId: string }
  | { type: 'graph-edge'; edgeId: string; segment?: number }
  | { type: 'track'; trackId: string; index: number }
  | { type: 'absolute'; x: number; y: number };

export type ResourceBundle = Record<string, number>;

export type GameKitPiece<TMeta = Record<string, unknown>> = {
  id: string;
  kind: GenericPieceKind;
  ownerId?: string;
  visibility?: Visibility;
  states?: string[];
  value?: number | string;
  faceDown?: boolean;
  disabled?: boolean;
  meta?: TMeta;
};

export type GameContainer<TMeta = Record<string, unknown>> = {
  id: string;
  kind: ContainerKind;
  title?: string;
  ownerId?: string;
  pieceIds: string[];
  capacity?: number;
  accepts?: GenericPieceKind[];
  visibility?: Visibility;
  meta?: TMeta;
};

export type GameCollection<TMeta = Record<string, unknown>> = {
  id: string;
  mode: CollectionMode;
  pieceIds: string[];
  ownerId?: string;
  visibility?: Visibility;
  meta?: TMeta;
};

export type GameAttachment<TMeta = Record<string, unknown>> = {
  id: string;
  hostPieceId: string;
  pieceId: string;
  slotId?: string;
  visibility?: Visibility;
  meta?: TMeta;
};

export type ResourceStore = {
  ownerId?: string;
  values: ResourceBundle;
  min?: ResourceBundle;
  max?: ResourceBundle;
};

export type TrackState = {
  id: string;
  min?: number;
  max: number;
  markers: Record<string, number>;
  meta?: Record<string, unknown>;
};

export type TurnState = {
  playerId?: string;
  order?: string[];
  index?: number;
  round?: number;
};

export type PhaseState = {
  id: string;
  label?: string;
  meta?: Record<string, unknown>;
};

export type GameKitState<
  TPiece extends GameKitPiece = GameKitPiece,
  TContainer extends GameContainer = GameContainer,
  TCollection extends GameCollection = GameCollection,
> = {
  pieces: Record<string, TPiece>;
  containers: Record<string, TContainer>;
  collections?: Record<string, TCollection>;
  locations?: Record<string, Location>;
  attachments?: Record<string, GameAttachment>;
  resources?: Record<string, ResourceStore>;
  tracks?: Record<string, TrackState>;
  turn?: TurnState;
  phase?: PhaseState;
  meta?: Record<string, unknown>;
};

export type RuleResult = {
  allowed: boolean;
  reason?: string;
  code?: string;
  meta?: Record<string, unknown>;
};

export type GamePatch<TState = GameKitState> =
  | { type: 'state.replace'; state: TState }
  | { type: 'piece.patch'; pieceId: string; patch: Partial<GameKitPiece> }
  | { type: 'piece.remove'; pieceId: string }
  | { type: 'piece.move'; pieceId: string; to: Location }
  | { type: 'container.set'; containerId: string; pieceIds: string[] }
  | { type: 'collection.set'; collectionId: string; pieceIds: string[] }
  | { type: 'attachment.set'; attachment: GameAttachment }
  | { type: 'attachment.remove'; attachmentId: string }
  | { type: 'resource.set'; storeId: string; values: ResourceBundle }
  | { type: 'track.set'; trackId: string; markerId: string; index: number }
  | { type: 'phase.set'; phase: PhaseState }
  | { type: 'turn.set'; turn: TurnState }
  | { type: 'custom'; apply: (state: TState) => TState };

export type GameAction =
  | { type: 'piece.select'; pieceId: string; actorId?: string }
  | { type: 'piece.move'; pieceId: string; from?: Location; to: Location; actorId?: string }
  | { type: 'piece.flip'; pieceId: string; faceDown?: boolean; actorId?: string }
  | { type: 'piece.patch'; pieceId: string; patch: Partial<GameKitPiece>; actorId?: string }
  | { type: 'piece.attach'; pieceId: string; hostPieceId: string; slotId?: string; actorId?: string }
  | { type: 'piece.detach'; attachmentId: string; actorId?: string }
  | { type: 'container.add'; containerId: string; pieceId: string; index?: number; actorId?: string }
  | { type: 'container.remove'; containerId: string; pieceId: string; actorId?: string }
  | { type: 'container.reorder'; containerId: string; pieceId: string; targetPieceId: string; position?: 'before' | 'after'; actorId?: string }
  | { type: 'collection.draw'; collectionId: string; count?: number; from?: 'top' | 'bottom' | 'random'; to: Location; actorId?: string }
  | { type: 'collection.shuffle'; collectionId: string; actorId?: string }
  | { type: 'resource.gain'; storeId: string; resources: ResourceBundle; actorId?: string }
  | { type: 'resource.pay'; storeId: string; resources: ResourceBundle; actorId?: string }
  | { type: 'track.advance'; trackId: string; markerId: string; amount: number; actorId?: string }
  | { type: 'phase.set'; phase: PhaseState; actorId?: string }
  | { type: 'turn.set'; turn: TurnState; actorId?: string }
  | { type: 'custom'; name: string; payload?: unknown; actorId?: string };

export type GameEventType =
  | 'input.pointer-down'
  | 'input.pointer-move'
  | 'input.pointer-up'
  | 'input.key-down'
  | 'input.key-up'
  | 'input.gesture-tap'
  | 'input.gesture-long-press'
  | 'input.gesture-pinch'
  | 'piece.hover'
  | 'piece.unhover'
  | 'piece.select'
  | 'piece.deselect'
  | 'piece.drag-start'
  | 'piece.drag-move'
  | 'piece.drag-end'
  | 'piece.drop'
  | 'target.enter'
  | 'target.leave'
  | 'target.preview'
  | 'target.confirm'
  | 'selection.change'
  | 'selection.commit'
  | 'selection.reveal'
  | 'action.request'
  | 'action.preview'
  | 'action.validate'
  | 'action.reject'
  | 'action.commit'
  | 'action.resolve'
  | 'action.cancel'
  | 'action.undo'
  | 'action.redo'
  | 'state.patch'
  | 'state.replace'
  | 'state.sync'
  | 'state.rollback'
  | 'turn.start'
  | 'turn.end'
  | 'phase.enter'
  | 'phase.exit'
  | 'round.start'
  | 'round.end'
  | 'game.end'
  | 'piece.move'
  | 'piece.flip'
  | 'piece.attach'
  | 'piece.detach'
  | 'piece.exhaust'
  | 'piece.refresh'
  | 'collection.draw'
  | 'collection.peek'
  | 'collection.reveal'
  | 'collection.shuffle'
  | 'collection.discard'
  | 'collection.trash'
  | 'collection.refill'
  | 'resource.gain'
  | 'resource.pay'
  | 'resource.set'
  | 'track.advance'
  | 'track.set'
  | 'dice.roll'
  | 'visibility.hide'
  | 'visibility.reveal'
  | 'animation.start'
  | 'animation.end';

export type GameEvent<TType extends string = GameEventType, TPayload = unknown> = {
  id: string;
  type: TType;
  at: number;
  actorId?: string;
  source?: Location;
  target?: Location;
  pieceIds?: string[];
  actionId?: string;
  inputType?: InputType;
  payload?: TPayload;
  meta?: Record<string, unknown>;
};

export type RuleContext<TState = GameKitState> = {
  state: TState;
  actorId?: string;
  action?: GameAction;
  pieceId?: string;
  target?: Location;
};

export type GameRulesAdapter<TState = GameKitState> = {
  canSelect?: (ctx: RuleContext<TState> & { pieceId: string }) => boolean | RuleResult;
  canDrag?: (ctx: RuleContext<TState> & { pieceId: string }) => boolean | RuleResult;
  canDrop?: (ctx: RuleContext<TState> & { pieceId: string; target: Location }) => boolean | RuleResult;
  canTarget?: (ctx: RuleContext<TState> & { sourceId: string; targetId: string }) => boolean | RuleResult;
  getValidTargets?: (ctx: RuleContext<TState> & { pieceId: string }) => Location[];
  getAvailableActions?: (ctx: RuleContext<TState>) => GameAction[];
  validateAction?: (action: GameAction, state: TState) => boolean | RuleResult;
  resolveAction?: (action: GameAction, state: TState) => GamePatch<TState>[];
  score?: (state: TState) => unknown;
  isGameEnd?: (state: TState) => boolean;
};
