# 범용 보드게임 라이브러리 공통화 설계

작성일: 2026-05-05

상세 API/Event 레퍼런스:

- [GameKit API/Event 상세 레퍼런스](./gamekit-api-events.md)

## 목표

특정 보드게임 전용 컴포넌트를 늘리는 대신, 거의 모든 보드게임에 반복해서 등장하는 개념을 범용 primitive로 제공한다.

게임별 차이는 다음 방식으로 주입한다.

- 데이터 스키마 확장: `meta`, generic type, custom model
- 룰 주입: `rules`, `validators`, `resolvers`
- 렌더링 주입: `renderPiece`, `renderSlot`, `renderOverlay`
- 상호작용 주입: `interactions`, `gestures`, `commands`
- 상태 전이 주입: `ActionResolver`, `PhaseDefinition`

즉, 라이브러리는 게임을 구현하지 않고 "게임을 만들 수 있는 공통 문법"을 제공한다.

## 핵심 구조

```txt
GameKit
  State Model
    Piece
    Container
    Location
    Relation
    Resource
    Action
    Phase

  UI Primitives
    Board
    Zone
    Slot
    Track
    Overlay
    Panel

  Interaction Layer
    DragDrop
    Selection
    Targeting
    Gesture
    Keyboard

  Rule Layer
    RuleAdapter
    ActionResolver
    Validator
    EffectQueue

  Presets
    CardGamePreset
    TileGamePreset
    MapGamePreset
    WorkerPlacementPreset
```

## 1. Piece: 모든 게임 오브젝트의 공통 단위

카드, 토큰, 타일, 말, 주사위, 큐브, 마커를 모두 `Piece`로 통합한다.

```ts
type PieceKind =
  | 'card'
  | 'token'
  | 'dice'
  | 'tile'
  | 'meeple'
  | 'marker'
  | 'cube'
  | 'custom';

type Piece<TMeta = Record<string, unknown>> = {
  id: string;
  kind: PieceKind;
  ownerId?: string;
  visibility?: Visibility;
  state?: PieceVisualState[];
  value?: number | string;
  meta?: TMeta;
};
```

범용 기능:

- 선택 가능/불가능
- 드래그 가능/불가능
- 타겟 가능/불가능
- 앞면/뒷면/숨김
- 활성/비활성
- tapped/exhausted/locked 같은 상태
- 커스텀 렌더링

게임별 커스텀:

```tsx
<PieceView
  piece={piece}
  renderPiece={(piece) => {
    if (piece.kind === 'tile') return <MyTile data={piece.meta} />;
    if (piece.kind === 'meeple') return <MyMeeple color={piece.meta.color} />;
    return <DefaultPiece piece={piece} />;
  }}
/>
```

## 2. Container: 모든 위치/영역의 공통 단위

덱, 핸드, 버림더미, 보드칸, 시장, 점수 트랙, 타일맵의 셀을 모두 `Container`로 본다.

```ts
type ContainerKind =
  | 'zone'
  | 'slot'
  | 'deck'
  | 'pile'
  | 'bag'
  | 'track'
  | 'grid'
  | 'node'
  | 'edge'
  | 'cell'
  | 'custom';

type Container<TMeta = Record<string, unknown>> = {
  id: string;
  kind: ContainerKind;
  ownerId?: string;
  pieces: string[];
  capacity?: number;
  accepts?: PieceKind[];
  visibility?: Visibility;
  meta?: TMeta;
};
```

범용 기능:

- capacity 제한
- accepts 제한
- 정렬: row/grid/fan/stack/free
- 공개/비공개/소유자만 보기
- drop target
- reorder
- overflow 처리

게임별 커스텀:

```ts
const rules = {
  canEnterContainer(piece, container, state) {
    if (container.meta?.requiresColor) {
      return piece.meta?.color === container.meta.requiresColor;
    }

    if (container.capacity && container.pieces.length >= container.capacity) {
      return false;
    }

    return true;
  },
};
```

## 3. Location: 보드 위 좌표를 추상화

보드게임은 결국 "어디에 무엇이 놓이는가"가 중요하다. 그래서 특정 보드 형태보다 먼저 `Location`이 필요하다.

```ts
type Location =
  | { type: 'container'; containerId: string; index?: number }
  | { type: 'grid'; x: number; y: number; layer?: string }
  | { type: 'hex'; q: number; r: number; s?: number; layer?: string }
  | { type: 'graph-node'; nodeId: string }
  | { type: 'graph-edge'; edgeId: string; segment?: number }
  | { type: 'track'; trackId: string; index: number }
  | { type: 'absolute'; x: number; y: number };
```

이렇게 하면 특정 게임 전용 API가 아니라, 여러 보드 형태를 같은 이동/드롭/애니메이션 시스템으로 처리할 수 있다.

커버 가능:

- 격자 배치 게임
- 육각 타일 게임
- 지도 노드/간선 게임
- 점수/라운드/자원 트랙
- 자유 배치 보드

## 4. Topology: 보드의 연결 구조

`HexBoard`, `GraphBoard`, `TileMap`을 각각 독립된 게임별 컴포넌트로 만들기보다, 공통 `Topology` 모델 위에 프리셋으로 제공한다.

```ts
type BoardTopology =
  | GridTopology
  | HexTopology
  | GraphTopology
  | TrackTopology
  | FreeformTopology
  | CustomTopology;
```

공통 기능:

- 인접 위치 조회
- 이동 가능 위치 계산
- 경로 탐색
- 연결 여부 계산
- 영역/구역 계산
- hover/drop 위치 변환
- overlay 렌더링

게임별 커스텀:

```ts
const topology = createGraphTopology({
  nodes,
  edges,
  getNodeMeta: (node) => ({
    suit: node.suit,
    terrain: node.terrain,
  }),
});
```

프리셋:

- `GridBoard`: 바둑판, 개인판, 타일 배치
- `HexBoard`: 육각 맵, 전술맵
- `GraphBoard`: 지도, 도시 연결, 지역 연결
- `TrackBoard`: 점수, 라운드, 자원, 평판 트랙
- `FreeformBoard`: 자유 배치/샌드박스형 보드

## 5. Action: 유저 의도를 표준화

드래그, 클릭, 선택, 카드 사용, 말 이동, 자원 지불을 모두 `Action`으로 표준화한다.

```ts
type GameAction =
  | { type: 'piece.select'; pieceId: string }
  | { type: 'piece.move'; pieceId: string; from: Location; to: Location }
  | { type: 'piece.flip'; pieceId: string; faceUp: boolean }
  | { type: 'piece.attach'; pieceId: string; targetId: string; slot?: string }
  | { type: 'resource.pay'; playerId: string; resources: ResourceBundle }
  | { type: 'deck.draw'; deckId: string; count: number; to: Location }
  | { type: 'dice.roll'; diceIds: string[] }
  | { type: 'custom'; name: string; payload: unknown };
```

범용 기능:

- action validate
- action preview
- action commit
- action undo/redo
- action log
- replay
- optimistic UI

게임별 커스텀:

```ts
const actionResolver = {
  validate(action, state) {
    if (action.type === 'custom' && action.name === 'claim-route') {
      return validateClaimRoute(action.payload, state);
    }

    return defaultValidate(action, state);
  },

  resolve(action, state) {
    if (action.type === 'custom' && action.name === 'claim-route') {
      return claimRoutePatch(action.payload, state);
    }

    return defaultResolve(action, state);
  },
};
```

## 6. Phase: 턴/라운드/단계의 공통 모델

게임마다 턴 구조는 다르지만, 대부분은 phase machine으로 표현할 수 있다.

```ts
type PhaseDefinition = {
  id: string;
  label?: string;
  allowedActions?: string[];
  enter?: PhaseEffect;
  exit?: PhaseEffect;
  next?: (state: GameState) => string;
};
```

범용 기능:

- 현재 플레이어
- 턴 순서
- 라운드
- phase 전환
- action point
- 동시 선택
- interrupt window
- mandatory action
- end condition

게임별 커스텀:

```ts
const phases = [
  { id: 'draft', allowedActions: ['piece.select'] },
  { id: 'reveal', enter: revealCommittedSelections },
  { id: 'resolve', allowedActions: ['custom.resolve-card'] },
  { id: 'cleanup', enter: passHands },
];
```

## 7. Visibility: 공개/비공개/동시 공개

카드게임뿐 아니라 목적 카드, 비밀 선택, 숨겨진 토큰이 있는 게임에서 필요하다.

```ts
type Visibility =
  | 'public'
  | 'hidden'
  | 'owner-only'
  | 'team-only'
  | 'committed'
  | 'revealed';
```

범용 기능:

- owner에게만 앞면 표시
- 다른 플레이어에게 뒷면 표시
- 선택 완료 후 잠금
- 모두 선택하면 동시에 공개
- 관전자/리플레이 모드

게임별 커스텀:

```ts
const visibilityAdapter = {
  canViewPiece(viewerId, piece, state) {
    if (piece.visibility === 'owner-only') {
      return piece.ownerId === viewerId;
    }

    return piece.visibility === 'public';
  },
};
```

## 8. Resource: 자원/점수/카운터 통합

돈, 나무, 기차 수, 액션 수, 승점, 체력, 영향력, 생산량은 전부 resource로 다룬다.

```ts
type ResourceBundle = Record<string, number>;

type ResourceStore = {
  ownerId?: string;
  values: ResourceBundle;
  min?: ResourceBundle;
  max?: ResourceBundle;
};
```

범용 컴포넌트:

- `ResourceCounter`
- `ResourceBar`
- `ResourceTrack`
- `ScoreTrack`
- `PaymentPicker`
- `CostPreview`

게임별 커스텀:

```tsx
<PaymentPicker
  cost={{ wood: 2, coin: 1 }}
  available={player.resources}
  alternatives={paymentRules.getAlternatives(state)}
/>
```

## 9. Collection: 덱/더미/가방/공급처 통합

덱, 버림더미, 공급더미, 타일 가방은 모두 collection이다.

```ts
type CollectionMode =
  | 'ordered'
  | 'unordered'
  | 'random'
  | 'stack'
  | 'supply';

type Collection = {
  id: string;
  mode: CollectionMode;
  pieceIds: string[];
  visibility?: Visibility;
};
```

범용 기능:

- draw top
- draw bottom
- draw random
- peek
- reveal
- shuffle
- search
- gain
- discard
- trash/remove
- refill
- depletion trigger

게임별 커스텀:

```ts
collection('infectionDeck')
  .drawBottom()
  .then((card) => collection('infectionDiscard').add(card))
  .then(() => collection('infectionDiscard').shuffleOntoTop('infectionDeck'));
```

## 10. Attachment: 카드/토큰/타일 위에 붙는 것

알, 피해 토큰, 장착 카드, tucked card, 건물 위 worker 등은 모두 attachment다.

```ts
type Attachment = {
  id: string;
  hostPieceId: string;
  pieceId: string;
  slot?: string;
  visibility?: Visibility;
};
```

범용 기능:

- host piece 내부 slot
- attachment capacity
- attachment ordering
- tucked/stacked/overlay 렌더링
- attachment별 click/drag/drop

게임별 커스텀:

```tsx
<AttachmentLayer
  hostId={birdCard.id}
  slots={[
    { id: 'eggs', accepts: ['token'], layout: 'stack' },
    { id: 'tucked', accepts: ['card'], layout: 'fan' },
  ]}
/>
```

## 11. RulesAdapter: 특정 게임 룰을 끼워 넣는 위치

라이브러리 내부에는 게임별 룰을 넣지 않는다. 대신 모든 판단 지점에 hook을 둔다.

```ts
type GameRulesAdapter<TState = GameState> = {
  canSelect?: (ctx: RuleContext<TState>) => boolean;
  canDrag?: (ctx: RuleContext<TState>) => boolean;
  canDrop?: (ctx: RuleContext<TState>) => boolean;
  canTarget?: (ctx: RuleContext<TState>) => boolean;
  getValidTargets?: (ctx: RuleContext<TState>) => Location[];
  getAvailableActions?: (ctx: RuleContext<TState>) => GameAction[];
  validateAction?: (action: GameAction, state: TState) => RuleResult;
  resolveAction?: (action: GameAction, state: TState) => GamePatch[];
  score?: (state: TState) => ScoreResult;
};
```

이 방식이면 특정 게임은 adapter만 작성하면 된다.

```ts
const puertoRicoRules: GameRulesAdapter<PuertoRicoState> = {
  getAvailableActions(ctx) {
    if (ctx.state.phase === 'role-selection') {
      return getAvailableRoleActions(ctx.state);
    }

    if (ctx.state.phase === 'settler') {
      return getPlantationPlacementActions(ctx.state, ctx.playerId);
    }

    return [];
  },

  validateAction(action, state) {
    return validatePuertoRicoAction(action, state);
  },

  resolveAction(action, state) {
    return resolvePuertoRicoAction(action, state);
  },
};
```

## 12. RendererAdapter: 게임별 외형만 교체

게임마다 카드/토큰/타일 모양은 다르다. 하지만 데이터와 상호작용은 공통이어야 한다.

```ts
type RendererAdapter = {
  renderPiece?: (piece: Piece, ctx: RenderContext) => React.ReactNode;
  renderContainer?: (container: Container, ctx: RenderContext) => React.ReactNode;
  renderLocation?: (location: Location, ctx: RenderContext) => React.ReactNode;
  renderOverlay?: (state: GameState, ctx: RenderContext) => React.ReactNode;
  renderActionMenu?: (actions: GameAction[], ctx: RenderContext) => React.ReactNode;
};
```

예시:

```tsx
<GameKitProvider
  state={state}
  rules={puertoRicoRules}
  renderers={puertoRicoRenderers}
/>
```

## 13. 프리셋은 얇게 제공

특정 게임에 가까운 컴포넌트는 core가 아니라 preset으로 둔다.

좋은 구분:

- Core: `Board`, `Piece`, `Container`, `Location`, `Action`, `Phase`, `Track`
- Topology preset: `GridBoard`, `HexBoard`, `GraphBoard`
- Genre preset: `CardGameLayout`, `TilePlacementLayout`, `MapControlLayout`, `WorkerPlacementLayout`
- Game example: `PuertoRicoExample`, `DominionExample`

피해야 할 방향:

- `CatanRoad`
- `PandemicOutbreakDeck`
- `WingspanBirdSlot`
- `PuertoRicoBuildingBoard`

대신:

- `EdgeSlot`
- `Collection` with custom lifecycle
- `AttachmentZone`
- `GridContainer` with custom renderer

## 14. 이벤트/API 충분성 검토

현재 프로젝트의 이벤트와 API는 카드 중심 게임에는 사용할 수 있지만, 범용 보드게임 라이브러리로는 아직 부족하다.

현재 제공되는 주요 이벤트:

- `GameCard.onTap`
- `GameCard.onLongPress`
- `GameCard.onDragMove`
- `GameCard.onDrop`
- `Zone.onCardTap`
- `Zone.onCardLongPress`
- `Zone.onCardDragMove`
- `Zone.onCardDrop`
- `Token.onClick`
- `TokenCounter.onIncrement`
- `TokenCounter.onDecrement`
- `Dice.onRoll`
- `PieceZone.onPieceClick`
- `SelectionProvider.onChange`
- `CardGameProvider.onCardEvent`

현재 제공되는 주요 controller API:

- `controller.card(id).reveal()`
- `controller.card(id).hide()`
- `controller.card(id).flip()`
- `controller.card(id).enable()`
- `controller.card(id).disable()`
- `controller.card(id).patch()`
- `controller.card(id).moveTo()`
- `controller.card(id).discard()`
- `controller.zone(id).add()`
- `controller.zone(id).remove()`
- `controller.zone(id).clear()`
- `controller.zone(id).reorder()`
- `controller.deck(id).drawTo()`
- `controller.deck(id).revealTo()`
- `controller.deck(id).shuffle()`
- `controller.hand(id).sort()`
- `controller.hand(id).play()`
- `controller.hand(id).discard()`
- `token(id).increment()`
- `token(id).decrement()`
- `die(id).roll()`
- `dice.rollAll()`

판단:

- 카드 조작 API는 기본 수준을 충족한다.
- 토큰/주사위 API는 표시와 값 변경 중심이다.
- 보드게임 공통 action API는 아직 없다.
- 카드/토큰/주사위를 통합하는 piece-level 이벤트가 부족하다.
- 이벤트가 "사용자 입력"과 "게임 액션"을 구분하지 않는다.
- 룰 검증 결과, 거부 사유, preview, commit, undo/redo 이벤트가 없다.
- phase/turn/resource/collection/topology/attachment 이벤트가 없다.

따라서 범용 라이브러리로 확장하려면 이벤트와 API를 아래처럼 재정리해야 한다.

## 15. 이벤트 계층 설계

이벤트는 4단계로 나눈다.

```txt
Input Event
  pointer, keyboard, gesture 같은 원시 입력

Interaction Event
  select, drag, hover, target 같은 UI 상호작용

Action Event
  move, draw, pay, claim, activate 같은 게임 의도

State Event
  action resolved 후 실제 상태 변경 결과
```

이 구분이 필요하다. 예를 들어 "카드를 드래그했다"는 입력/상호작용이고, "이 카드를 보드에 플레이한다"는 게임 action이다. 같은 드래그라도 게임에 따라 play, discard, attach, reorder, pay cost 등으로 해석될 수 있다.

### 공통 이벤트 payload

모든 이벤트는 최소한 아래 정보를 가져야 한다.

```ts
type GameEvent<TType extends string = string, TPayload = unknown> = {
  id: string;
  type: TType;
  at: number;
  actorId?: string;
  source?: Location;
  target?: Location;
  pieceIds?: string[];
  actionId?: string;
  inputType?: 'mouse' | 'touch' | 'pen' | 'keyboard' | 'system';
  payload?: TPayload;
  meta?: Record<string, unknown>;
};
```

### Input 이벤트

```ts
type InputEventType =
  | 'input.pointer-down'
  | 'input.pointer-move'
  | 'input.pointer-up'
  | 'input.key-down'
  | 'input.key-up'
  | 'input.gesture-tap'
  | 'input.gesture-long-press'
  | 'input.gesture-pinch';
```

용도:

- 모바일/데스크톱 입력 통합
- 접근성 keyboard 조작
- long press, double tap, pinch 같은 제스처 확장

### Interaction 이벤트

```ts
type InteractionEventType =
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
  | 'selection.reveal';
```

용도:

- 드래그 중 가능한 위치 표시
- 선택/대상 지정 UI
- 동시 선택 후 공개
- 드롭 preview와 실제 commit 분리

### Action 이벤트

```ts
type ActionEventType =
  | 'action.request'
  | 'action.preview'
  | 'action.validate'
  | 'action.reject'
  | 'action.commit'
  | 'action.resolve'
  | 'action.cancel'
  | 'action.undo'
  | 'action.redo';
```

용도:

- 룰 검증
- invalid action 사유 표시
- optimistic UI
- action log/replay
- undo/redo
- 네트워크 동기화

### State 이벤트

```ts
type StateEventType =
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
  | 'game.end';
```

용도:

- 상태 변경 기록
- phase/turn UI 업데이트
- undo/replay
- 멀티플레이 동기화

### 도메인 이벤트

범용 보드게임에서 자주 쓰이는 도메인 이벤트도 필요하다.

```ts
type DomainEventType =
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
```

이 이벤트들은 특정 게임 전용이 아니다. 대부분의 보드게임에서 반복된다.

## 16. API 계층 설계

API는 3종류로 나눈다.

```txt
Query API
  현재 상태를 읽는다.

Command API
  상태 변경을 요청한다.

Rule API
  가능한 행동과 검증 결과를 계산한다.
```

### Query API

```ts
game.piece(pieceId).get();
game.piece(pieceId).location();
game.container(containerId).pieces();
game.collection(collectionId).count();
game.topology().neighbors(location);
game.topology().reachable(from, options);
game.phase().current();
game.actions().available(actorId);
game.selection().selected(actorId);
game.resources(actorId).get();
```

필요한 이유:

- UI가 특정 상태 구조를 몰라도 된다.
- 게임별 state shape가 달라도 공통 컴포넌트가 동작한다.
- AI/helper/preview 기능을 붙이기 쉽다.

### Command API

```ts
game.action(action).preview();
game.action(action).validate();
game.action(action).commit();
game.action(action).cancel();

game.piece(pieceId).moveTo(location);
game.piece(pieceId).flip();
game.piece(pieceId).attachTo(hostPieceId, slotId);
game.piece(pieceId).detach();
game.piece(pieceId).patch(patch);
game.piece(pieceId).remove();

game.container(containerId).add(pieceId, index);
game.container(containerId).remove(pieceId);
game.container(containerId).reorder(pieceId, targetPieceId, position);
game.container(containerId).clear();

game.collection(collectionId).drawTop(count, target);
game.collection(collectionId).drawBottom(count, target);
game.collection(collectionId).drawRandom(count, target);
game.collection(collectionId).peek(count);
game.collection(collectionId).reveal(count);
game.collection(collectionId).shuffle();
game.collection(collectionId).shuffleInto(targetCollectionId);
game.collection(collectionId).refillFrom(sourceCollectionId);

game.resources(actorId).gain(bundle);
game.resources(actorId).pay(bundle);
game.resources(actorId).set(resourceId, value);

game.track(trackId).advance(markerId, amount);
game.track(trackId).set(markerId, index);

game.phase().next();
game.phase().set(phaseId);
game.turn().nextPlayer();

game.animation().play(pieceId, preset);
```

필요한 이유:

- 앱 코드가 배열을 직접 조작하지 않아도 된다.
- action log와 replay를 만들 수 있다.
- 룰 검증과 상태 변경 경로가 한 곳으로 모인다.

### Rule API

```ts
game.rules().canSelect(pieceId, actorId);
game.rules().canDrag(pieceId, actorId);
game.rules().canDrop(pieceId, target, actorId);
game.rules().canTarget(sourceId, targetId, actorId);
game.rules().validTargets(pieceId, actorId);
game.rules().availableActions(actorId);
game.rules().validate(action);
game.rules().resolve(action);
game.rules().score();
game.rules().isGameEnd();
```

필요한 이유:

- UI에서 playable/targetable/disabled를 자동 표시할 수 있다.
- 특정 게임 룰은 adapter로 갈아끼울 수 있다.
- invalid drop/reject animation을 일관되게 처리할 수 있다.

## 17. 최소 이벤트/API 세트

범용 라이브러리의 첫 구현 범위는 아래 정도면 충분하다.

### P0 이벤트

- `piece.select`
- `piece.deselect`
- `piece.drag-start`
- `piece.drag-move`
- `piece.drag-end`
- `piece.drop`
- `action.request`
- `action.validate`
- `action.reject`
- `action.commit`
- `state.patch`
- `animation.start`
- `animation.end`

### P0 API

- `game.piece(id).get()`
- `game.piece(id).moveTo(location)`
- `game.piece(id).flip()`
- `game.piece(id).patch(patch)`
- `game.container(id).add(pieceId)`
- `game.container(id).remove(pieceId)`
- `game.container(id).reorder(pieceId, targetPieceId, position)`
- `game.action(action).validate()`
- `game.action(action).commit()`
- `game.rules().canSelect(pieceId, actorId)`
- `game.rules().canDrop(pieceId, target, actorId)`
- `game.rules().validTargets(pieceId, actorId)`

### P1 이벤트/API

- `collection.draw`
- `collection.shuffle`
- `collection.reveal`
- `resource.gain`
- `resource.pay`
- `track.advance`
- `phase.enter`
- `phase.exit`
- `turn.start`
- `turn.end`
- `visibility.reveal`
- `selection.commit`
- `selection.reveal`
- `game.collection(id).*`
- `game.resources(playerId).*`
- `game.track(id).*`
- `game.phase().*`

### P2 이벤트/API

- `piece.attach`
- `piece.detach`
- `topology.path-preview`
- `topology.reachable`
- `action.undo`
- `action.redo`
- `state.rollback`
- `state.sync`
- `game.topology().*`
- `game.history().*`
- `game.network().*`

## 18. API 설계 원칙

1. 컴포넌트 prop 이벤트는 "입력"을 알려준다.
2. controller command는 "의도"를 실행한다.
3. rules adapter는 "가능 여부"를 판단한다.
4. resolver는 "상태 변경"을 만든다.
5. animation은 상태 변경 결과에 붙는다.
6. 특정 게임 로직은 core에 넣지 않는다.
7. 모든 이벤트는 action log로 남길 수 있어야 한다.
8. 모든 command는 validation을 우회하지 않아야 한다.
9. 단순한 앱을 위해 uncontrolled helper도 제공하되, core는 controlled state를 우선한다.

## 구현 우선순위

### P0: 이벤트/action API 정리

- 기존 card-only 이벤트를 piece-level 이벤트로 확장
- `GameEvent`, `GameAction`, `RuleResult`, `GamePatch` 타입 추가
- `onGameEvent` 단일 이벤트 스트림 추가
- `game.action(action).validate()` 추가
- `game.action(action).commit()` 추가
- invalid action/reject reason 표준화

### P0: Core model 통합

- `Piece`
- `Container`
- `Location`
- `GameAction`
- `Visibility`
- `ResourceBundle`

### P1: Interaction 통합

- 카드 전용 drag/drop을 piece-level drag/drop으로 승격
- 모든 piece가 같은 drag layer 사용
- drop 결과를 `GameAction`으로 발행
- valid/invalid target highlight

### P1: Rule adapter 실제 연결

- `canDrag`
- `canDrop`
- `canSelect`
- `getValidTargets`
- `getAvailableActions`
- `validateAction`
- `resolveAction`

### P1: Collection 모델

- deck, pile, bag, supply를 하나의 collection으로 통합
- draw/shuffle/reveal/search/refill/deplete 처리

### P2: Topology 모델

- grid
- hex
- graph
- track
- freeform

### P2: Phase/action machine

- phase definition
- turn order
- action queue
- simultaneous commit/reveal
- interrupt window

### P2: Attachment/resource/track

- piece attachment
- resource store
- score/resource track
- payment picker

## 한 줄 결론

라이브러리의 중심을 `Card`에서 `Piece + Location + Action + RulesAdapter`로 옮기면, 카드 게임뿐 아니라 타일 배치, 지도 연결, 워커 배치, 덱빌딩, 협력 게임까지 같은 엔진 위에서 만들 수 있다.
