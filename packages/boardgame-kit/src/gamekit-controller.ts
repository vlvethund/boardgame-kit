import type {
  GameAction,
  GameCollection,
  GameContainer,
  GameEvent,
  GameEventType,
  GameKitPiece,
  GameKitState,
  GamePatch,
  GameRulesAdapter,
  Location,
  ResourceBundle,
  RuleResult,
  TurnState,
} from './gamekit-types';

export type GameKitControllerOptions<TState extends GameKitState = GameKitState> = {
  getState: () => TState;
  setState: (updater: TState | ((state: TState) => TState)) => void;
  rules?: GameRulesAdapter<TState>;
  onEvent?: (event: GameEvent) => void;
  now?: () => number;
  createId?: (prefix: string) => string;
  random?: () => number;
};

export type ActionCommitResult<TState extends GameKitState = GameKitState> = {
  result: RuleResult;
  patches: GamePatch<TState>[];
};

function ok(): RuleResult {
  return { allowed: true };
}

function reject(reason: string, code = 'rejected'): RuleResult {
  return { allowed: false, reason, code };
}

function normalizeRuleResult(value: boolean | RuleResult | undefined): RuleResult {
  if (typeof value === 'boolean') return value ? ok() : reject('Action is not allowed.');
  return value ?? ok();
}

function insertAt<TItem>(items: TItem[], item: TItem, index?: number) {
  const safeIndex = typeof index === 'number' ? Math.max(0, Math.min(index, items.length)) : items.length;
  return [...items.slice(0, safeIndex), item, ...items.slice(safeIndex)];
}

function reorder<TItem>(items: TItem[], item: TItem, target: TItem, position: 'before' | 'after' = 'before') {
  if (item === target) return items;
  const withoutItem = items.filter((current) => current !== item);
  const targetIndex = withoutItem.findIndex((current) => current === target);
  if (targetIndex < 0) return items;
  return insertAt(withoutItem, item, targetIndex + (position === 'after' ? 1 : 0));
}

function removePieceFromContainers<TState extends GameKitState>(state: TState, pieceId: string): TState {
  let changed = false;
  const containers = Object.fromEntries(
    Object.entries(state.containers).map(([containerId, container]) => {
      const nextPieceIds = container.pieceIds.filter((id) => id !== pieceId);
      if (nextPieceIds.length !== container.pieceIds.length) changed = true;
      return [containerId, { ...container, pieceIds: nextPieceIds }];
    }),
  ) as TState['containers'];

  if (!changed) return state;
  return { ...state, containers };
}

function applyContainerLocation<TState extends GameKitState>(state: TState, pieceId: string, to: Extract<Location, { type: 'container' }>): TState {
  const target = state.containers[to.containerId];
  if (!target) return state;

  const withoutPiece = removePieceFromContainers(state, pieceId);
  const currentTarget = withoutPiece.containers[to.containerId];
  const nextTarget = {
    ...currentTarget,
    pieceIds: insertAt(currentTarget.pieceIds.filter((id) => id !== pieceId), pieceId, to.index),
  };

  return {
    ...withoutPiece,
    containers: {
      ...withoutPiece.containers,
      [to.containerId]: nextTarget,
    },
    locations: {
      ...withoutPiece.locations,
      [pieceId]: to,
    },
  };
}

function applyPatch<TState extends GameKitState>(state: TState, patch: GamePatch<TState>): TState {
  if (patch.type === 'state.replace') return patch.state;

  if (patch.type === 'custom') return patch.apply(state);

  if (patch.type === 'piece.patch') {
    const piece = state.pieces[patch.pieceId];
    if (!piece) return state;
    return {
      ...state,
      pieces: {
        ...state.pieces,
        [patch.pieceId]: { ...piece, ...patch.patch } as TState['pieces'][string],
      },
    };
  }

  if (patch.type === 'piece.remove') {
    const { [patch.pieceId]: _removed, ...pieces } = state.pieces;
    const withoutContainers = removePieceFromContainers({ ...state, pieces: pieces as TState['pieces'] }, patch.pieceId);
    const { [patch.pieceId]: _location, ...locations } = withoutContainers.locations ?? {};
    return { ...withoutContainers, locations };
  }

  if (patch.type === 'piece.move') {
    if (patch.to.type === 'container') return applyContainerLocation(state, patch.pieceId, patch.to);
    return {
      ...removePieceFromContainers(state, patch.pieceId),
      locations: {
        ...state.locations,
        [patch.pieceId]: patch.to,
      },
    };
  }

  if (patch.type === 'container.set') {
    const container = state.containers[patch.containerId];
    if (!container) return state;
    return {
      ...state,
      containers: {
        ...state.containers,
        [patch.containerId]: { ...container, pieceIds: patch.pieceIds } as TState['containers'][string],
      },
    };
  }

  if (patch.type === 'collection.set') {
    const collections = state.collections ?? {};
    const collection = collections[patch.collectionId];
    if (!collection) return state;
    return {
      ...state,
      collections: {
        ...collections,
        [patch.collectionId]: { ...collection, pieceIds: patch.pieceIds } as NonNullable<TState['collections']>[string],
      },
    };
  }

  if (patch.type === 'attachment.set') {
    return {
      ...state,
      attachments: {
        ...state.attachments,
        [patch.attachment.id]: patch.attachment,
      },
    };
  }

  if (patch.type === 'attachment.remove') {
    const { [patch.attachmentId]: _removed, ...attachments } = state.attachments ?? {};
    return { ...state, attachments };
  }

  if (patch.type === 'resource.set') {
    const resources = state.resources ?? {};
    const store = resources[patch.storeId] ?? { values: {} };
    return {
      ...state,
      resources: {
        ...resources,
        [patch.storeId]: { ...store, values: patch.values },
      },
    };
  }

  if (patch.type === 'track.set') {
    const tracks = state.tracks ?? {};
    const track = tracks[patch.trackId];
    if (!track) return state;
    return {
      ...state,
      tracks: {
        ...tracks,
        [patch.trackId]: {
          ...track,
          markers: { ...track.markers, [patch.markerId]: patch.index },
        },
      },
    };
  }

  if (patch.type === 'phase.set') {
    return { ...state, phase: patch.phase };
  }

  return { ...state, turn: (patch as Extract<GamePatch<TState>, { type: 'turn.set' }>).turn };
}

function getActorId(action: GameAction) {
  return 'actorId' in action ? action.actorId : undefined;
}

function getActionPieceIds(action: GameAction): string[] | undefined {
  if ('pieceId' in action) return [action.pieceId];
  return undefined;
}

function eventTypeForAction(action: GameAction): GameEventType | undefined {
  if (action.type === 'piece.select') return 'piece.select';
  if (action.type === 'piece.move') return 'piece.move';
  if (action.type === 'piece.flip') return 'piece.flip';
  if (action.type === 'piece.attach') return 'piece.attach';
  if (action.type === 'piece.detach') return 'piece.detach';
  if (action.type === 'collection.draw') return 'collection.draw';
  if (action.type === 'collection.shuffle') return 'collection.shuffle';
  if (action.type === 'resource.gain') return 'resource.gain';
  if (action.type === 'resource.pay') return 'resource.pay';
  if (action.type === 'track.advance') return 'track.advance';
  return undefined;
}

export function createGameKitController<TState extends GameKitState = GameKitState>({
  getState,
  setState,
  rules,
  onEvent,
  now = () => Date.now(),
  createId,
  random = Math.random,
}: GameKitControllerOptions<TState>) {
  let eventCount = 0;
  const nextId = createId ?? ((prefix: string) => `${prefix}-${++eventCount}`);

  function emit<TPayload>(type: GameEventType, payload?: TPayload, event?: Partial<GameEvent>) {
    onEvent?.({
      id: nextId('event'),
      type,
      at: now(),
      ...event,
      payload,
    });
  }

  function updateState(updater: (state: TState) => TState) {
    setState((current) => updater(current as TState));
  }

  function applyPatches(patches: GamePatch<TState>[]) {
    updateState((state) => patches.reduce((current, patch) => applyPatch(current, patch), state));
  }

  function defaultValidate(action: GameAction, state: TState): RuleResult {
    if ('pieceId' in action && !state.pieces[action.pieceId]) return reject(`Piece not found: ${action.pieceId}`, 'piece-not-found');

    if (action.type === 'piece.move') {
      if (action.to.type !== 'container') return ok();
      const container = state.containers[action.to.containerId];
      const piece = state.pieces[action.pieceId];
      if (!container) return reject(`Container not found: ${action.to.containerId}`, 'container-not-found');
      if (container.accepts && !container.accepts.includes(piece.kind)) return reject('Container does not accept this piece kind.', 'container-rejects-kind');
      const alreadyInside = container.pieceIds.includes(action.pieceId);
      if (container.capacity !== undefined && container.pieceIds.length >= container.capacity && !alreadyInside) {
        return reject('Container is full.', 'container-full');
      }
      return normalizeRuleResult(rules?.canDrop?.({ state, action, actorId: action.actorId, pieceId: action.pieceId, target: action.to }));
    }

    if (action.type === 'container.add') {
      const container = state.containers[action.containerId];
      const piece = state.pieces[action.pieceId];
      if (!container) return reject(`Container not found: ${action.containerId}`, 'container-not-found');
      if (!piece) return reject(`Piece not found: ${action.pieceId}`, 'piece-not-found');
      if (container.accepts && !container.accepts.includes(piece.kind)) return reject('Container does not accept this piece kind.', 'container-rejects-kind');
      if (container.capacity !== undefined && container.pieceIds.length >= container.capacity && !container.pieceIds.includes(action.pieceId)) {
        return reject('Container is full.', 'container-full');
      }
    }

    if (action.type === 'container.remove' && !state.containers[action.containerId]) return reject(`Container not found: ${action.containerId}`, 'container-not-found');

    if (action.type === 'container.reorder') {
      const container = state.containers[action.containerId];
      if (!container) return reject(`Container not found: ${action.containerId}`, 'container-not-found');
      if (!container.pieceIds.includes(action.pieceId) || !container.pieceIds.includes(action.targetPieceId)) {
        return reject('Both pieces must be in the container.', 'piece-not-in-container');
      }
    }

    if (action.type === 'collection.draw' || action.type === 'collection.shuffle') {
      const collection = state.collections?.[action.collectionId];
      if (!collection) return reject(`Collection not found: ${action.collectionId}`, 'collection-not-found');
    }

    if (action.type === 'resource.pay') {
      const store = state.resources?.[action.storeId];
      if (!store) return reject(`Resource store not found: ${action.storeId}`, 'resource-store-not-found');
      const canPay = Object.entries(action.resources).every(([key, amount]) => (store.values[key] ?? 0) >= amount);
      if (!canPay) return reject('Not enough resources.', 'resource-insufficient');
    }

    if (action.type === 'track.advance') {
      const track = state.tracks?.[action.trackId];
      if (!track) return reject(`Track not found: ${action.trackId}`, 'track-not-found');
      const current = track.markers[action.markerId] ?? track.min ?? 0;
      const next = current + action.amount;
      if (next < (track.min ?? 0) || next > track.max) return reject('Track value is out of range.', 'track-out-of-range');
    }

    if (action.type === 'custom' && !rules?.resolveAction) return reject('Custom actions require rules.resolveAction.', 'custom-action-unhandled');

    return ok();
  }

  function resolveDefault(action: GameAction, state: TState): GamePatch<TState>[] {
    if (action.type === 'piece.move') return [{ type: 'piece.move', pieceId: action.pieceId, to: action.to }];
    if (action.type === 'piece.flip') {
      const piece = state.pieces[action.pieceId];
      return [{ type: 'piece.patch', pieceId: action.pieceId, patch: { faceDown: action.faceDown ?? !piece.faceDown } }];
    }
    if (action.type === 'piece.patch') return [{ type: 'piece.patch', pieceId: action.pieceId, patch: action.patch }];
    if (action.type === 'piece.attach') {
      return [
        {
          type: 'attachment.set',
          attachment: {
            id: nextId('attachment'),
            hostPieceId: action.hostPieceId,
            pieceId: action.pieceId,
            slotId: action.slotId,
          },
        },
      ];
    }
    if (action.type === 'piece.detach') return [{ type: 'attachment.remove', attachmentId: action.attachmentId }];
    if (action.type === 'container.add') {
      return [{ type: 'piece.move', pieceId: action.pieceId, to: { type: 'container', containerId: action.containerId, index: action.index } }];
    }
    if (action.type === 'container.remove') {
      const container = state.containers[action.containerId];
      return [{ type: 'container.set', containerId: action.containerId, pieceIds: container.pieceIds.filter((id) => id !== action.pieceId) }];
    }
    if (action.type === 'container.reorder') {
      const container = state.containers[action.containerId];
      return [
        {
          type: 'container.set',
          containerId: action.containerId,
          pieceIds: reorder(container.pieceIds, action.pieceId, action.targetPieceId, action.position),
        },
      ];
    }
    if (action.type === 'collection.draw') {
      const collection = state.collections?.[action.collectionId];
      if (!collection) return [];
      const count = Math.max(0, action.count ?? 1);
      const nextIds = [...collection.pieceIds];
      const drawn: string[] = [];
      for (let index = 0; index < count && nextIds.length > 0; index += 1) {
        const drawFrom = action.from ?? (collection.mode === 'random' ? 'random' : 'top');
        const drawIndex = drawFrom === 'bottom' ? nextIds.length - 1 : drawFrom === 'random' ? Math.floor(random() * nextIds.length) : 0;
        const [pieceId] = nextIds.splice(drawIndex, 1);
        drawn.push(pieceId);
      }
      const patches: GamePatch<TState>[] = [{ type: 'collection.set', collectionId: action.collectionId, pieceIds: nextIds }];
      drawn.forEach((pieceId) => patches.push({ type: 'piece.move', pieceId, to: action.to }));
      return patches;
    }
    if (action.type === 'collection.shuffle') {
      const collection = state.collections?.[action.collectionId];
      if (!collection) return [];
      const pieceIds = [...collection.pieceIds];
      for (let index = pieceIds.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [pieceIds[index], pieceIds[swapIndex]] = [pieceIds[swapIndex], pieceIds[index]];
      }
      return [{ type: 'collection.set', collectionId: action.collectionId, pieceIds }];
    }
    if (action.type === 'resource.gain' || action.type === 'resource.pay') {
      const store = state.resources?.[action.storeId] ?? { values: {} };
      const sign = action.type === 'resource.pay' ? -1 : 1;
      const values = { ...store.values };
      Object.entries(action.resources).forEach(([key, amount]) => {
        values[key] = (values[key] ?? 0) + amount * sign;
      });
      return [{ type: 'resource.set', storeId: action.storeId, values }];
    }
    if (action.type === 'track.advance') {
      const track = state.tracks?.[action.trackId];
      if (!track) return [];
      return [{ type: 'track.set', trackId: action.trackId, markerId: action.markerId, index: (track.markers[action.markerId] ?? track.min ?? 0) + action.amount }];
    }
    if (action.type === 'phase.set') return [{ type: 'phase.set', phase: action.phase }];
    if (action.type === 'turn.set') return [{ type: 'turn.set', turn: action.turn }];
    return [];
  }

  function validate(action: GameAction): RuleResult {
    const state = getState();
    const base = defaultValidate(action, state);
    const result = base.allowed ? normalizeRuleResult(rules?.validateAction?.(action, state)) : base;
    emit(result.allowed ? 'action.validate' : 'action.reject', { action, result }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) });
    return result;
  }

  function preview(action: GameAction): ActionCommitResult<TState> {
    const result = validate(action);
    const patches = result.allowed ? (rules?.resolveAction?.(action, getState()) ?? resolveDefault(action, getState())) : [];
    emit('action.preview', { action, result, patches }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) });
    return { result, patches };
  }

  function commit(action: GameAction): ActionCommitResult<TState> {
    emit('action.request', { action }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) });
    const result = validate(action);
    if (!result.allowed) return { result, patches: [] };

    const patches = rules?.resolveAction?.(action, getState()) ?? resolveDefault(action, getState());
    applyPatches(patches);
    emit('action.commit', { action, patches }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) });
    emit('action.resolve', { action, patches }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) });
    emit('state.patch', { patches }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) });
    const domainType = eventTypeForAction(action);
    if (domainType) emit(domainType, { action, patches }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) });
    return { result, patches };
  }

  function canDrop(pieceId: string, target: Location, actorId?: string) {
    return validate({ type: 'piece.move', pieceId, to: target, actorId }).allowed;
  }

  return {
    get state() {
      return getState();
    },
    emit,
    action(action: GameAction) {
      return {
        preview: () => preview(action),
        validate: () => validate(action),
        commit: () => commit(action),
        cancel: () => emit('action.cancel', { action }, { actorId: getActorId(action), pieceIds: getActionPieceIds(action) }),
      };
    },
    piece(pieceId: string) {
      return {
        get: () => getState().pieces[pieceId] as GameKitPiece | undefined,
        location: () => getState().locations?.[pieceId],
        moveTo: (to: Location, actorId?: string) => commit({ type: 'piece.move', pieceId, to, actorId }),
        flip: (faceDown?: boolean, actorId?: string) => commit({ type: 'piece.flip', pieceId, faceDown, actorId }),
        patch: (patch: Partial<GameKitPiece>, actorId?: string) => commit({ type: 'piece.patch', pieceId, patch, actorId }),
        attachTo: (hostPieceId: string, slotId?: string, actorId?: string) => commit({ type: 'piece.attach', pieceId, hostPieceId, slotId, actorId }),
        remove: () => {
          const patches: GamePatch<TState>[] = [{ type: 'piece.remove', pieceId }];
          applyPatches(patches);
          emit('state.patch', { patches }, { pieceIds: [pieceId] });
        },
      };
    },
    container(containerId: string) {
      return {
        get: () => getState().containers[containerId] as GameContainer | undefined,
        pieces: () => getState().containers[containerId]?.pieceIds.map((pieceId) => getState().pieces[pieceId]).filter(Boolean) ?? [],
        add: (pieceId: string, index?: number, actorId?: string) => commit({ type: 'container.add', containerId, pieceId, index, actorId }),
        remove: (pieceId: string, actorId?: string) => commit({ type: 'container.remove', containerId, pieceId, actorId }),
        reorder: (pieceId: string, targetPieceId: string, position: 'before' | 'after' = 'before', actorId?: string) =>
          commit({ type: 'container.reorder', containerId, pieceId, targetPieceId, position, actorId }),
        clear: () => {
          const patches: GamePatch<TState>[] = [{ type: 'container.set', containerId, pieceIds: [] }];
          applyPatches(patches);
          emit('state.patch', { patches });
        },
      };
    },
    collection(collectionId: string) {
      return {
        get: () => getState().collections?.[collectionId] as GameCollection | undefined,
        count: () => getState().collections?.[collectionId]?.pieceIds.length ?? 0,
        peek: (count = 1) => getState().collections?.[collectionId]?.pieceIds.slice(0, count).map((pieceId) => getState().pieces[pieceId]).filter(Boolean) ?? [],
        drawTop: (count: number, to: Location, actorId?: string) => commit({ type: 'collection.draw', collectionId, count, from: 'top', to, actorId }),
        drawBottom: (count: number, to: Location, actorId?: string) => commit({ type: 'collection.draw', collectionId, count, from: 'bottom', to, actorId }),
        drawRandom: (count: number, to: Location, actorId?: string) => commit({ type: 'collection.draw', collectionId, count, from: 'random', to, actorId }),
        shuffle: (actorId?: string) => commit({ type: 'collection.shuffle', collectionId, actorId }),
      };
    },
    resources(storeId: string) {
      return {
        get: () => getState().resources?.[storeId]?.values ?? {},
        gain: (resources: ResourceBundle, actorId?: string) => commit({ type: 'resource.gain', storeId, resources, actorId }),
        pay: (resources: ResourceBundle, actorId?: string) => commit({ type: 'resource.pay', storeId, resources, actorId }),
        set: (values: ResourceBundle) => {
          const patches: GamePatch<TState>[] = [{ type: 'resource.set', storeId, values }];
          applyPatches(patches);
          emit('resource.set', { storeId, values });
          emit('state.patch', { patches });
        },
      };
    },
    track(trackId: string) {
      return {
        get: () => getState().tracks?.[trackId],
        advance: (markerId: string, amount: number, actorId?: string) => commit({ type: 'track.advance', trackId, markerId, amount, actorId }),
        set: (markerId: string, index: number) => {
          const patches: GamePatch<TState>[] = [{ type: 'track.set', trackId, markerId, index }];
          applyPatches(patches);
          emit('track.set', { trackId, markerId, index });
          emit('state.patch', { patches });
        },
      };
    },
    animation() {
      return {
        start: (pieceId: string, preset: string, actionId?: string) => emit('animation.start', { preset }, { pieceIds: [pieceId], actionId }),
        end: (pieceId: string, preset: string, actionId?: string) => emit('animation.end', { preset }, { pieceIds: [pieceId], actionId }),
        play: (pieceId: string, preset: string, options: { actionId?: string; durationMs?: number } = {}) => {
          emit('animation.start', { preset }, { pieceIds: [pieceId], actionId: options.actionId });
          if (typeof options.durationMs === 'number') {
            globalThis.setTimeout(() => emit('animation.end', { preset }, { pieceIds: [pieceId], actionId: options.actionId }), options.durationMs);
          }
        },
      };
    },
    phase() {
      return {
        current: () => getState().phase,
        set: (phase: NonNullable<TState['phase']>, actorId?: string) => commit({ type: 'phase.set', phase, actorId }),
      };
    },
    turn() {
      return {
        current: () => getState().turn,
        set: (turn: TurnState, actorId?: string) => commit({ type: 'turn.set', turn, actorId }),
        nextPlayer: (actorId?: string) => {
          const current = getState().turn;
          if (!current?.order?.length) return { result: reject('Turn order is not configured.', 'turn-order-missing'), patches: [] };
          const nextIndex = ((current.index ?? 0) + 1) % current.order.length;
          return commit({
            type: 'turn.set',
            turn: {
              ...current,
              index: nextIndex,
              playerId: current.order[nextIndex],
              round: nextIndex === 0 ? (current.round ?? 1) + 1 : current.round,
            },
            actorId,
          });
        },
      };
    },
    rules() {
      return {
        canSelect: (pieceId: string, actorId?: string) => normalizeRuleResult(rules?.canSelect?.({ state: getState(), pieceId, actorId })).allowed,
        canDrag: (pieceId: string, actorId?: string) => normalizeRuleResult(rules?.canDrag?.({ state: getState(), pieceId, actorId })).allowed,
        canDrop,
        canTarget: (sourceId: string, targetId: string, actorId?: string) => normalizeRuleResult(rules?.canTarget?.({ state: getState(), sourceId, targetId, actorId })).allowed,
        validTargets: (pieceId: string, actorId?: string) => rules?.getValidTargets?.({ state: getState(), pieceId, actorId }) ?? [],
        availableActions: (actorId?: string) => rules?.getAvailableActions?.({ state: getState(), actorId }) ?? [],
        validate,
        resolve: (action: GameAction) => rules?.resolveAction?.(action, getState()) ?? resolveDefault(action, getState()),
        score: () => rules?.score?.(getState()),
        isGameEnd: () => rules?.isGameEnd?.(getState()) ?? false,
      };
    },
  };
}
