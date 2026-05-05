# GameKit API/Event 상세 레퍼런스

작성일: 2026-05-05

대상 파일:

- `packages/boardgame-kit/src/gamekit-types.ts`
- `packages/boardgame-kit/src/gamekit-controller.ts`
- `packages/boardgame-kit/src/GameKitProvider.tsx`

## 기본 흐름

모든 상태 변경은 아래 흐름을 권장한다.

```txt
UI input
  -> GameAction 생성
  -> game.action(action).validate()
  -> game.action(action).commit()
  -> GamePatch 적용
  -> GameEvent 발행
  -> UI animation/render 반영
```

즉, 컴포넌트의 `onClick`, `onDrop`, `onPointerUp` 같은 이벤트는 직접 state를 바꾸기보다 `GameAction`으로 변환해서 controller에 넘긴다.

## 핵심 타입

### Location

`Location`은 피스가 어디에 있는지 표현한다.

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

입력 설명:

- `container`: 핸드, 보드존, 슬롯, 덱 같은 컨테이너 내부 위치
- `grid`: 사각 격자 좌표
- `hex`: 육각 좌표
- `graph-node`: 지도 노드
- `graph-edge`: 지도 간선
- `track`: 점수/자원/라운드 트랙
- `absolute`: 자유 배치 좌표

현재 구현에서 실제 컨테이너 배열까지 자동 갱신되는 위치 타입은 `container`다. 다른 위치 타입은 `locations[pieceId]` 갱신에 사용된다.

### GameAction

`GameAction`은 사용자의 의도를 표현한다.

주요 action:

```ts
{ type: 'piece.move'; pieceId: string; to: Location; actorId?: string }
{ type: 'piece.flip'; pieceId: string; faceDown?: boolean; actorId?: string }
{ type: 'piece.patch'; pieceId: string; patch: Partial<GameKitPiece>; actorId?: string }
{ type: 'piece.attach'; pieceId: string; hostPieceId: string; slotId?: string; actorId?: string }
{ type: 'container.add'; containerId: string; pieceId: string; index?: number; actorId?: string }
{ type: 'container.reorder'; containerId: string; pieceId: string; targetPieceId: string; position?: 'before' | 'after'; actorId?: string }
{ type: 'collection.draw'; collectionId: string; count?: number; from?: 'top' | 'bottom' | 'random'; to: Location; actorId?: string }
{ type: 'collection.shuffle'; collectionId: string; actorId?: string }
{ type: 'resource.gain'; storeId: string; resources: ResourceBundle; actorId?: string }
{ type: 'resource.pay'; storeId: string; resources: ResourceBundle; actorId?: string }
{ type: 'track.advance'; trackId: string; markerId: string; amount: number; actorId?: string }
{ type: 'phase.set'; phase: PhaseState; actorId?: string }
{ type: 'turn.set'; turn: TurnState; actorId?: string }
{ type: 'custom'; name: string; payload?: unknown; actorId?: string }
```

공통 입력:

- `actorId`: 행동을 수행한 플레이어 id
- `pieceId`: 대상 피스 id
- `to`: 이동 대상 위치
- `resources`: 증감할 자원 묶음
- `payload`: 게임별 커스텀 데이터

### RuleResult

룰 검증 결과다.

```ts
type RuleResult = {
  allowed: boolean;
  reason?: string;
  code?: string;
  meta?: Record<string, unknown>;
};
```

반환값 설명:

- `allowed: true`: action 가능
- `allowed: false`: action 거부
- `reason`: 사용자에게 보여줄 수 있는 설명
- `code`: 프로그램에서 분기하기 위한 에러 코드
- `meta`: 게임별 추가 정보

### ActionCommitResult

`preview()`, `commit()`의 반환값이다.

```ts
type ActionCommitResult<TState> = {
  result: RuleResult;
  patches: GamePatch<TState>[];
};
```

반환값 설명:

- `result`: validate 결과
- `patches`: 적용 예정이거나 실제 적용된 patch 목록

`validate()`는 `RuleResult`만 반환한다.

## createGameKitController

```ts
const game = createGameKitController({
  getState,
  setState,
  rules,
  onEvent,
  now,
  createId,
  random,
});
```

입력:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `getState` | `() => TState` | 예 | 최신 게임 상태를 반환 |
| `setState` | `(updater) => void` | 예 | 상태를 교체하거나 updater로 갱신 |
| `rules` | `GameRulesAdapter<TState>` | 아니오 | 게임별 룰 검증/해결 adapter |
| `onEvent` | `(event: GameEvent) => void` | 아니오 | 모든 이벤트를 받는 단일 이벤트 스트림 |
| `now` | `() => number` | 아니오 | 이벤트 timestamp 생성 |
| `createId` | `(prefix: string) => string` | 아니오 | 이벤트/attachment id 생성 |
| `random` | `() => number` | 아니오 | shuffle/random draw에 사용할 난수 함수 |

반환:

- `state`
- `emit`
- `action(action)`
- `piece(pieceId)`
- `container(containerId)`
- `collection(collectionId)`
- `resources(storeId)`
- `track(trackId)`
- `animation()`
- `phase()`
- `turn()`
- `rules()`

## GameKitProvider

```tsx
<GameKitProvider
  state={gameState}
  setState={setGameState}
  rules={rules}
  onEvent={handleEvent}
>
  <Board />
</GameKitProvider>
```

입력:

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `state` | `GameKitState` | 예 | controlled game state |
| `setState` | `(updater) => void` | 예 | controlled state setter |
| `rules` | `GameRulesAdapter` | 아니오 | 게임별 룰 |
| `onEvent` | `(event) => void` | 아니오 | 이벤트 구독 |
| `children` | `ReactNode` | 예 | 하위 UI |

사용:

```ts
const game = useGameKit();
game?.piece('card-1').moveTo({ type: 'container', containerId: 'board' });
```

반환:

- `useGameKit()`은 controller 또는 `undefined`를 반환한다.

## Action API

### `game.action(action).preview()`

입력:

- `action: GameAction`

동작:

1. `validate(action)` 실행
2. 가능하면 적용될 `GamePatch[]` 계산
3. 실제 state는 변경하지 않음
4. `action.preview` 이벤트 발행

반환:

```ts
ActionCommitResult
```

사용:

```ts
const preview = game.action({
  type: 'piece.move',
  pieceId: 'card-1',
  to: { type: 'container', containerId: 'board' },
}).preview();

if (!preview.result.allowed) {
  showMessage(preview.result.reason);
}
```

### `game.action(action).validate()`

입력:

- `action: GameAction`

동작:

1. 기본 검증 실행
2. `rules.validateAction` 실행
3. 성공 시 `action.validate` 이벤트 발행
4. 실패 시 `action.reject` 이벤트 발행

반환:

```ts
RuleResult
```

기본 검증 항목:

- piece 존재 여부
- container 존재 여부
- container capacity
- container accepts
- collection 존재 여부
- resource pay 가능 여부
- track 범위
- custom action resolver 존재 여부

### `game.action(action).commit()`

입력:

- `action: GameAction`

동작:

1. `action.request` 이벤트 발행
2. `validate(action)` 실행
3. 실패하면 patch 없이 반환
4. 성공하면 `rules.resolveAction` 또는 기본 resolver 실행
5. patch를 state에 적용
6. `action.commit`, `action.resolve`, `state.patch` 이벤트 발행
7. action 종류에 맞는 domain event 발행

반환:

```ts
ActionCommitResult
```

실패 예:

```ts
const result = game.action({
  type: 'resource.pay',
  storeId: 'player-1',
  resources: { coin: 10 },
}).commit();

// result.result.allowed === false
// result.result.code === 'resource-insufficient'
```

### `game.action(action).cancel()`

입력:

- `action: GameAction`

동작:

- `action.cancel` 이벤트 발행
- state 변경 없음

반환:

- `void`

## Piece API

### `game.piece(pieceId).get()`

입력:

- `pieceId: string`

반환:

```ts
GameKitPiece | undefined
```

### `game.piece(pieceId).location()`

입력:

- `pieceId: string`

반환:

```ts
Location | undefined
```

### `game.piece(pieceId).moveTo(to, actorId?)`

입력:

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `to` | `Location` | 이동할 위치 |
| `actorId` | `string` | 행동 플레이어 |

동작:

- 내부적으로 `piece.move` action commit
- `to.type === 'container'`이면 기존 container에서 제거 후 새 container에 삽입
- 다른 location 타입이면 `locations[pieceId]`만 갱신

반환:

```ts
ActionCommitResult
```

발행 이벤트:

- `action.request`
- `action.validate` 또는 `action.reject`
- `action.commit`
- `action.resolve`
- `state.patch`
- `piece.move`

### `game.piece(pieceId).flip(faceDown?, actorId?)`

입력:

- `faceDown?: boolean`
- `actorId?: string`

동작:

- `faceDown`이 있으면 해당 값으로 설정
- 없으면 현재 `faceDown`을 반전

반환:

```ts
ActionCommitResult
```

발행 이벤트:

- `piece.flip`

### `game.piece(pieceId).patch(patch, actorId?)`

입력:

- `patch: Partial<GameKitPiece>`
- `actorId?: string`

동작:

- piece 데이터를 부분 갱신

반환:

```ts
ActionCommitResult
```

### `game.piece(pieceId).attachTo(hostPieceId, slotId?, actorId?)`

입력:

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `hostPieceId` | `string` | 붙을 대상 피스 |
| `slotId` | `string` | host 내부 slot |
| `actorId` | `string` | 행동 플레이어 |

동작:

- attachment 생성

반환:

```ts
ActionCommitResult
```

발행 이벤트:

- `piece.attach`

### `game.piece(pieceId).remove()`

입력:

- 없음

동작:

- `pieces`에서 제거
- 모든 container에서 제거
- `locations`에서 제거
- `state.patch` 이벤트 발행

반환:

- `void`

## Container API

### `game.container(containerId).get()`

반환:

```ts
GameContainer | undefined
```

### `game.container(containerId).pieces()`

반환:

```ts
GameKitPiece[]
```

동작:

- `container.pieceIds`를 실제 piece 객체 배열로 변환
- 존재하지 않는 piece id는 제외

### `game.container(containerId).add(pieceId, index?, actorId?)`

동작:

- 내부적으로 `container.add` action commit
- 실제 patch는 `piece.move`로 처리

반환:

```ts
ActionCommitResult
```

검증:

- container 존재 여부
- piece 존재 여부
- accepts 조건
- capacity 조건

### `game.container(containerId).remove(pieceId, actorId?)`

동작:

- container에서 piece id 제거

반환:

```ts
ActionCommitResult
```

### `game.container(containerId).reorder(pieceId, targetPieceId, position?, actorId?)`

입력:

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `pieceId` | 없음 | 이동할 피스 |
| `targetPieceId` | 없음 | 기준 피스 |
| `position` | `'before'` | 기준 피스 앞/뒤 |
| `actorId` | 없음 | 행동 플레이어 |

반환:

```ts
ActionCommitResult
```

검증:

- 두 piece가 같은 container 안에 있어야 함

### `game.container(containerId).clear()`

동작:

- container를 빈 배열로 설정
- validation 없이 즉시 patch 적용

반환:

- `void`

## Collection API

collection은 deck, bag, supply, pile을 통합한다.

### `game.collection(collectionId).get()`

반환:

```ts
GameCollection | undefined
```

### `game.collection(collectionId).count()`

반환:

```ts
number
```

### `game.collection(collectionId).peek(count?)`

입력:

- `count = 1`

반환:

```ts
GameKitPiece[]
```

동작:

- collection 앞쪽 piece를 조회
- state 변경 없음

### `game.collection(collectionId).drawTop(count, to, actorId?)`

동작:

- collection 앞에서 `count`개 제거
- 각 piece를 `to` 위치로 이동

반환:

```ts
ActionCommitResult
```

발행 이벤트:

- `collection.draw`

### `game.collection(collectionId).drawBottom(count, to, actorId?)`

동작:

- collection 뒤에서 `count`개 제거
- 각 piece를 `to` 위치로 이동

반환:

```ts
ActionCommitResult
```

### `game.collection(collectionId).drawRandom(count, to, actorId?)`

동작:

- random 함수를 사용해서 collection에서 무작위 제거
- 각 piece를 `to` 위치로 이동

반환:

```ts
ActionCommitResult
```

### `game.collection(collectionId).shuffle(actorId?)`

동작:

- collection 내부 `pieceIds` 순서 셔플
- `random` 옵션을 사용

반환:

```ts
ActionCommitResult
```

발행 이벤트:

- `collection.shuffle`

## Resource API

### `game.resources(storeId).get()`

반환:

```ts
ResourceBundle
```

### `game.resources(storeId).gain(resources, actorId?)`

입력:

- `resources: ResourceBundle`

동작:

- 해당 resource 값을 증가

반환:

```ts
ActionCommitResult
```

발행 이벤트:

- `resource.gain`

### `game.resources(storeId).pay(resources, actorId?)`

동작:

- 해당 resource 값을 감소

검증:

- 보유량이 부족하면 거부

반환:

```ts
ActionCommitResult
```

실패 코드:

- `resource-insufficient`

### `game.resources(storeId).set(values)`

동작:

- resource store 값을 직접 설정
- validation 없이 즉시 patch 적용

반환:

- `void`

발행 이벤트:

- `resource.set`
- `state.patch`

## Track API

### `game.track(trackId).get()`

반환:

```ts
TrackState | undefined
```

### `game.track(trackId).advance(markerId, amount, actorId?)`

동작:

- 현재 marker 위치에 amount를 더함

검증:

- track 존재 여부
- min/max 범위

반환:

```ts
ActionCommitResult
```

발행 이벤트:

- `track.advance`

### `game.track(trackId).set(markerId, index)`

동작:

- marker 위치 직접 설정
- validation 없이 즉시 patch 적용

반환:

- `void`

발행 이벤트:

- `track.set`
- `state.patch`

## Phase/Turn API

### `game.phase().current()`

반환:

```ts
PhaseState | undefined
```

### `game.phase().set(phase, actorId?)`

동작:

- phase 변경 action commit

반환:

```ts
ActionCommitResult
```

### `game.turn().current()`

반환:

```ts
TurnState | undefined
```

### `game.turn().set(turn, actorId?)`

동작:

- turn 상태 직접 설정 action commit

반환:

```ts
ActionCommitResult
```

### `game.turn().nextPlayer(actorId?)`

동작:

- `turn.order` 기준으로 다음 플레이어로 이동
- index가 0으로 돌아오면 round 증가

반환:

```ts
ActionCommitResult
```

실패:

- `turn.order`가 없거나 비어 있으면 `turn-order-missing`

## Animation API

### `game.animation().start(pieceId, preset, actionId?)`

동작:

- `animation.start` 이벤트 발행
- 실제 CSS animation은 앱/컴포넌트가 이벤트를 받아 처리

반환:

- `void`

### `game.animation().end(pieceId, preset, actionId?)`

동작:

- `animation.end` 이벤트 발행

반환:

- `void`

### `game.animation().play(pieceId, preset, options?)`

입력:

```ts
{
  actionId?: string;
  durationMs?: number;
}
```

동작:

- 즉시 `animation.start` 발행
- `durationMs`가 있으면 해당 시간 후 `animation.end` 발행

반환:

- `void`

## Rules API

### `game.rules().canSelect(pieceId, actorId?)`

반환:

```ts
boolean
```

### `game.rules().canDrag(pieceId, actorId?)`

반환:

```ts
boolean
```

### `game.rules().canDrop(pieceId, target, actorId?)`

반환:

```ts
boolean
```

주의:

- 내부적으로 `piece.move` action validate를 사용한다.
- validate 이벤트가 발생한다.

### `game.rules().canTarget(sourceId, targetId, actorId?)`

반환:

```ts
boolean
```

### `game.rules().validTargets(pieceId, actorId?)`

반환:

```ts
Location[]
```

### `game.rules().availableActions(actorId?)`

반환:

```ts
GameAction[]
```

### `game.rules().validate(action)`

반환:

```ts
RuleResult
```

### `game.rules().resolve(action)`

반환:

```ts
GamePatch[]
```

### `game.rules().score()`

반환:

```ts
unknown
```

게임별 `rules.score` 반환값을 그대로 돌려준다.

### `game.rules().isGameEnd()`

반환:

```ts
boolean
```

## 이벤트 상세

### GameEvent

```ts
type GameEvent = {
  id: string;
  type: GameEventType;
  at: number;
  actorId?: string;
  source?: Location;
  target?: Location;
  pieceIds?: string[];
  actionId?: string;
  inputType?: InputType;
  payload?: unknown;
  meta?: Record<string, unknown>;
};
```

필드 설명:

| 이름 | 설명 |
| --- | --- |
| `id` | 이벤트 id |
| `type` | 이벤트 타입 |
| `at` | timestamp |
| `actorId` | 행동 플레이어 |
| `source` | 출발 위치 |
| `target` | 대상 위치 |
| `pieceIds` | 관련 피스 목록 |
| `actionId` | 연결된 action id |
| `inputType` | mouse/touch/pen/keyboard/system |
| `payload` | 이벤트별 데이터 |
| `meta` | 확장 데이터 |

### Action 이벤트

| 이벤트 | 발생 시점 | payload |
| --- | --- | --- |
| `action.request` | commit 시작 | `{ action }` |
| `action.preview` | preview 계산 | `{ action, result, patches }` |
| `action.validate` | validate 성공 | `{ action, result }` |
| `action.reject` | validate 실패 | `{ action, result }` |
| `action.commit` | patch 적용 직후 | `{ action, patches }` |
| `action.resolve` | action 해결 완료 | `{ action, patches }` |
| `action.cancel` | action 취소 | `{ action }` |

### State 이벤트

| 이벤트 | 발생 시점 | payload |
| --- | --- | --- |
| `state.patch` | patch 적용 후 | `{ patches }` |
| `state.replace` | 전체 상태 교체 시 사용 예정 | 미구현 |
| `state.rollback` | rollback 시 사용 예정 | 미구현 |
| `state.sync` | 외부 동기화 시 사용 예정 | 미구현 |

### Domain 이벤트

| 이벤트 | 발생 action |
| --- | --- |
| `piece.select` | `piece.select` |
| `piece.move` | `piece.move` |
| `piece.flip` | `piece.flip` |
| `piece.attach` | `piece.attach` |
| `piece.detach` | `piece.detach` |
| `collection.draw` | `collection.draw` |
| `collection.shuffle` | `collection.shuffle` |
| `resource.gain` | `resource.gain` |
| `resource.pay` | `resource.pay` |
| `track.advance` | `track.advance` |
| `animation.start` | `game.animation().start/play` |
| `animation.end` | `game.animation().end/play` |

### Input/Interaction 이벤트

아래 이벤트 타입은 타입으로 정의되어 있지만, 현재 controller가 자동 생성하지 않는다. UI 컴포넌트나 앱 코드에서 `game.emit(...)`으로 발행한다.

- `input.pointer-down`
- `input.pointer-move`
- `input.pointer-up`
- `input.key-down`
- `input.key-up`
- `input.gesture-tap`
- `input.gesture-long-press`
- `input.gesture-pinch`
- `piece.hover`
- `piece.unhover`
- `piece.drag-start`
- `piece.drag-move`
- `piece.drag-end`
- `piece.drop`
- `target.enter`
- `target.leave`
- `target.preview`
- `target.confirm`
- `selection.change`
- `selection.commit`
- `selection.reveal`

예시:

```ts
game.emit('piece.drag-start', {
  pieceId: 'card-1',
  pointer: { x: 120, y: 300 },
});
```

## 실패/거부 처리

`commit()`은 실패 시 throw하지 않는다.

```ts
const { result } = game.piece('card-1').moveTo({ type: 'container', containerId: 'locked-zone' });

if (!result.allowed) {
  showToast(result.reason);
}
```

기본 실패 코드:

| 코드 | 의미 |
| --- | --- |
| `piece-not-found` | 대상 piece 없음 |
| `container-not-found` | 대상 container 없음 |
| `container-rejects-kind` | container가 piece kind를 받지 않음 |
| `container-full` | container capacity 초과 |
| `piece-not-in-container` | reorder 대상이 같은 container에 없음 |
| `collection-not-found` | collection 없음 |
| `resource-store-not-found` | resource store 없음 |
| `resource-insufficient` | 자원 부족 |
| `track-not-found` | track 없음 |
| `track-out-of-range` | track 범위 초과 |
| `custom-action-unhandled` | custom action resolver 없음 |
| `turn-order-missing` | turn order 없음 |

## 커스텀 게임 룰 연결

```ts
const rules: GameRulesAdapter<MyGameState> = {
  canDrop({ state, pieceId, target }) {
    const piece = state.pieces[pieceId];

    if (target.type === 'container') {
      const container = state.containers[target.containerId];
      if (container.meta?.onlyOwner && container.ownerId !== piece.ownerId) {
        return { allowed: false, reason: '자기 영역에만 놓을 수 있습니다.' };
      }
    }

    return { allowed: true };
  },

  validateAction(action, state) {
    if (action.type === 'custom' && action.name === 'claim-route') {
      return validateClaimRoute(action.payload, state);
    }

    return { allowed: true };
  },

  resolveAction(action, state) {
    if (action.type === 'custom' && action.name === 'claim-route') {
      return resolveClaimRoute(action.payload, state);
    }

    return [];
  },
};
```

주의:

- `validateAction`은 가능 여부만 판단한다.
- `resolveAction`은 실제 `GamePatch[]`를 반환한다.
- `custom` action은 `resolveAction`이 없으면 기본적으로 거부된다.

## 권장 사용 패턴

### 드래그 드롭

```ts
function handleDrop(pieceId: string, containerId: string, index?: number) {
  return game.action({
    type: 'piece.move',
    pieceId,
    to: { type: 'container', containerId, index },
  }).commit();
}
```

### 카드 뒤집기

```ts
game.piece('event-card-1').flip(false);
game.animation().play('event-card-1', 'reveal', { durationMs: 450 });
```

### 자원 지불 후 액션

```ts
const payment = game.resources('player-1').pay({ coin: 3 });

if (payment.result.allowed) {
  game.action({ type: 'custom', name: 'buy-building', payload: { buildingId: 'harbor' } }).commit();
}
```

### 동시 선택 공개

현재는 직접 state/rules로 구현한다. 표준 이벤트는 준비되어 있다.

```ts
game.emit('selection.commit', { playerId: 'p1', pieceIds: ['card-1'] });
game.emit('selection.reveal', { pieceIds: ['card-1', 'card-8'] });
```

## 현재 한계

- 기존 `GameCard`/`Zone` 드래그 이벤트가 아직 자동으로 `GameAction`을 만들지는 않는다.
- `grid`, `hex`, `graph` location은 좌표 기록까지만 담당한다.
- topology pathfinding은 아직 없다.
- undo/redo/history API는 타입 방향만 있고 구현은 아직 없다.
- `state.replace`, `state.rollback`, `state.sync` 이벤트는 예약 타입이다.
- `phase.enter`, `phase.exit`, `turn.start`, `turn.end`는 phase/turn machine 구현 후 자동 발행해야 한다.
