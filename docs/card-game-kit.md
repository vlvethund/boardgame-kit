# Card Game Kit 공통화 정리

이 문서는 현재 프로젝트의 카드 게임 UI 공통 컴포넌트와 상태 유틸을 정리한다.

라이브러리 패키지는 `packages/boardgame-kit`에 있고, npm 배포 준비 내용은 [패키지 분리 및 npm 배포 준비](./package-publishing.md)에 정리한다.

## 설계 원칙

- 게임 규칙은 라이브러리 내부에 넣지 않는다.
- 라이브러리는 카드 표시, 존 배치, 드래그/드롭, 순서 변경, 애니메이션, 이벤트 payload 표준화를 담당한다.
- 카드와 존 상태는 외부에서 controlled state로 관리한다.
- 드롭 가능 여부, 플레이 가능 여부, 타겟 가능 여부는 외부 hook 또는 props로 주입한다.
- 모바일 터치와 데스크톱 마우스는 같은 pointer event 모델을 사용한다.

## 현재 공통 API

### 타입

위치: `packages/boardgame-kit/src/types.ts`

- `GameCardData`
- `CardZone`
- `ZoneCards`
- `CardGesture`
- `CardDragMove`
- `CardDrop`
- `CardGameEvent`
- `CanDropCard`
- `ZoneKind`

핵심 이벤트 payload:

```ts
type CardDrop = {
  card: GameCardData;
  originZoneId?: string;
  targetZoneId?: string;
  targetCardId?: string;
  targetPosition?: 'before' | 'after';
  moveOrigin?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};
```

## 카드 관점

구현 위치:

- `packages/boardgame-kit/src/GameCard.tsx`
- `packages/boardgame-kit/src/card-parts.tsx`

제공 기능:

- 카드 앞면/뒷면 표시
- `selected`, `targetable`, `playable`, `disabled`, `dragging` 상태 표시
- 커스텀 렌더링: `renderCard(card)`
- compound card parts 조립
- 탭 이벤트
- 롱프레스 이벤트
- 드래그 시작/이동/드롭
- 드래그 중 `window` 레벨 pointer tracking
- 드래그 카드 fixed layer 처리
- 드래그 중 최상위 z-index 처리

남은 개선 후보:

- drag preview를 React portal로 분리
- keyboard drag/drop
- reduced motion 옵션
- 카드 크기 프리셋 정리

### 카드 조립 컴포넌트

카드 내부 UI는 세분화되어 있다.

- `CardShell`
- `CardFront`
- `CardBack`
- `CardHeader`
- `CardCost`
- `CardType`
- `CardArt`
- `CardBody`
- `CardTitle`
- `CardText`
- `CardPower`
- `DefaultCardFace`
- `CardTemplate`

예시:

```tsx
function SpellCardFace(card: GameCardData) {
  return (
    <>
      <CardHeader>
        <CardType>{card.type}</CardType>
        <CardCost>{card.cost}</CardCost>
      </CardHeader>
      <CardArt src={card.art} />
      <CardBody>
        <CardTitle>{card.title}</CardTitle>
        <CardText>{card.text}</CardText>
      </CardBody>
    </>
  );
}

<Zone id="market" cards={cards} renderCard={SpellCardFace} />
```

사용 기준:

- 게임별 카드 모양이 다르면 `renderCard`와 card parts를 사용한다.
- 기본 데모 카드 모양이면 `DefaultCardFace`를 그대로 쓴다.
- 카드 앞면/뒷면 flip 구조는 `GameCard`가 유지한다.

## 이벤트 관점

구현 위치:

- `packages/boardgame-kit/src/types.ts`
- `packages/boardgame-kit/src/GameCard.tsx`

현재 이벤트:

- `onTap`
- `onLongPress`
- `onDragMove`
- `onDrop`

이벤트 정책:

- 클릭과 드래그는 `MOVE_CANCEL_PX` threshold로 구분한다.
- 롱프레스는 `LONG_PRESS_MS`로 구분한다.
- 같은 존에서 자기 자신 위로 drop되는 경우는 상태 변경하지 않는다.
- 드래그 중 live reorder는 `CardDragMove`를 통해 외부 state를 갱신한다.

권장 상위 이벤트 모델:

```ts
type CardGameEvent = {
  type: 'card:tap' | 'card:long-press' | 'card:drag-move' | 'card:drop';
  card: GameCardData;
  originZoneId?: string;
  targetZoneId?: string;
  targetCardId?: string;
  targetPosition?: 'before' | 'after';
};
```

## 보드 관점

구현 위치:

- `packages/boardgame-kit/src/Board.tsx`
- `packages/boardgame-kit/src/Zone.tsx`
- `packages/boardgame-kit/src/CardGameProvider.tsx`

제공 기능:

- `Board`: 보드 컨테이너
- `BoardSection`: 보드 내부 섹션
- `BoardLayer`: 레이어 구분
- `BoardGrid`: 반응형 grid 빌딩블록
- `Zone`: 범용 카드 영역
- `CardGameProvider`: 공통 context 진입점
- `useCardGame`: context 조회 hook
- zone layout:
  - `row`
  - `grid`
  - `fan`
  - `stack`
- live reorder preview
- FLIP 기반 위치 이동 애니메이션
- zone 간 이동 animation origin 지원

현재 `Board`는 얇은 컨테이너다. 게임별 레이아웃은 앱에서 구성한다.

예시:

```tsx
<CardGameProvider zones={zones} canDrop={canDrop}>
  <Board title="Main Board">
    <BoardGrid columns="160px 1fr 160px">
      <Deck cards={zones.deck} />
      <BoardSection title="Play Area">
        <Zone id="board" cards={zones.board} layout="grid" />
      </BoardSection>
      <DiscardPile cards={zones.discard} />
    </BoardGrid>
    <Board title="Player Board">
      <Hand id="hand" cards={zones.hand} />
    </Board>
  </Board>
</CardGameProvider>
```

중첩 보드:

- `Board` 안에 다른 `Board`를 넣을 수 있다.
- 중첩 보드는 플레이어별 개인 보드, 미니맵, 확장판 영역, 전투 서브보드 등에 사용한다.
- 중첩 보드는 별도 state를 강제하지 않는다. 같은 `ZoneCards` state를 공유하거나, 게임별로 분리된 state를 써도 된다.

### PieceZone

카드, 토큰, 주사위를 같은 보드 오브젝트로 다룰 때 사용한다.

```ts
type GamePiece =
  | { id: string; kind: 'card'; data: GameCardData }
  | { id: string; kind: 'token'; data: GameTokenData }
  | { id: string; kind: 'dice'; data: DiceData };
```

```tsx
<PieceZone
  id="battlefield"
  title="Battlefield"
  layout="row"
  pieces={[
    { id: 'card-a', kind: 'card', data: card },
    { id: 'token-a', kind: 'token', data: token },
    { id: 'die-a', kind: 'dice', data: die },
  ]}
/>
```

현재 `PieceZone`은 렌더링/클릭 중심이다. 카드의 기존 drag/drop은 `Zone`이 담당한다. 다음 단계에서 `DragLayer`와 연결해 카드/토큰/주사위 공통 drag로 확장한다.

### Slot

공통 placeholder/drop target 기반 컴포넌트다.

```tsx
<Slot id="battle-slot-1" state="empty" accepts="card">
  {piece}
</Slot>
```

지원 상태:

- `empty`
- `occupied`
- `active`
- `invalid`
- `disabled`

### DragLayer

포털 기반 drag preview 계층이다.

```tsx
<DragLayerProvider>
  <Board />
</DragLayerProvider>
```

제공 hook:

```ts
const dragLayer = useDragLayer();
dragLayer?.start({ id, node, x, y, width, height });
dragLayer?.move({ x, y });
dragLayer?.end();
```

현재는 공통 API만 제공한다. 기존 카드 드래그는 호환성을 위해 그대로 유지했다. 다음 리팩터링에서 `GameCard`의 fixed drag를 `DragLayer`로 이전하는 것이 우선순위다.

현재 데모는 `DragLayerProvider`로 감싸져 있으며, `GameCard`는 provider가 있을 때 portal 기반 drag preview를 우선 사용한다. provider가 없으면 기존 fixed-position drag 방식으로 fallback한다.

### Rules / Selection

룰과 선택 상태를 공통 context로 제공한다.

```tsx
<RulesProvider rules={rulesAdapter}>
  <SelectionProvider mode="multi">
    <Board />
  </SelectionProvider>
</RulesProvider>
```

Rules adapter:

```ts
type RulesAdapter = {
  canDrag?: (event: PieceEvent) => boolean;
  canDrop?: (event: PieceEvent) => boolean;
  canSelect?: (piece: GamePiece) => boolean;
  canTarget?: (source: GamePiece, target: GamePiece) => boolean;
  getValidTargets?: (piece: GamePiece) => string[];
};
```

## 토큰 관점

구현 위치:

- `packages/boardgame-kit/src/Token.tsx`
- `packages/boardgame-kit/src/types.ts`

제공 컴포넌트:

- `GameToken`
- `TokenZone`

토큰 타입:

```ts
type GameTokenData = {
  id: string;
  label?: string;
  value?: number | string;
  shape?: 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'diamond' | 'custom';
  image?: string;
  svg?: ReactNode;
  preserveImageShape?: boolean;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};
```

지원 기능:

- 삼각형, 사각형, 오각형, 육각형, 다이아몬드, 원형 토큰
- 이미지 토큰
- SVG 원형 보존 토큰
- 색상/텍스트 색상 지정
- `sm`, `md`, `lg` 크기
- `TokenZone` 배치:
  - `row`
  - `grid`
  - `stack`

예시:

```tsx
<TokenZone
  id="status-tokens"
  title="Tokens"
  layout="stack"
  tokens={[
    { id: 'wound', shape: 'triangle', value: 1, color: '#be503e', textColor: '#fff' },
    { id: 'guard', shape: 'square', value: 2, color: '#5c6870', textColor: '#fff' },
  ]}
/>
```

이미지 토큰:

```tsx
<GameToken
  token={{
    id: 'hero-marker',
    label: 'Hero',
    shape: 'circle',
    image: '/assets/hero.png',
  }}
/>
```

SVG 토큰:

```tsx
<GameToken
  token={{
    id: 'sigil',
    label: 'Sigil',
    svg: (
      <svg viewBox="0 0 64 64">
        <path d="M32 3 60 32 32 61 4 32Z" fill="#7657a6" />
        <circle cx="32" cy="32" r="8" fill="#17201c" />
      </svg>
    ),
  }}
/>
```

SVG 파일을 이미지 경로로 쓰되 원래 SVG 외곽 형태를 살리고 싶으면 `preserveImageShape`를 사용한다.

```tsx
<GameToken
  token={{
    id: 'svg-file',
    image: '/tokens/sigil.svg',
    preserveImageShape: true,
  }}
/>
```

## 주사위 관점

구현 위치:

- `packages/boardgame-kit/src/Dice.tsx`
- `packages/boardgame-kit/src/types.ts`

제공 컴포넌트:

- `Dice`
- `DiceTray`

주사위 타입:

```ts
type DiceData = {
  id: string;
  sides: number;
  value?: number;
  label?: string;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};
```

지원 기능:

- 정 x면체 주사위 표현: `sides` 값으로 `d4`, `d6`, `d8`, `d10`, `d12`, `d20` 등 표시
- 현재 값 표시
- 클릭 시 `onRoll(die)` 이벤트
- `DiceTray`로 여러 주사위 나열

예시:

```tsx
<DiceTray
  title="Dice"
  dice={[
    { id: 'd6-a', sides: 6, value: 4 },
    { id: 'd20-a', sides: 20, value: 17 },
  ]}
  onRoll={(die) => {
    const nextValue = Math.floor(Math.random() * die.sides) + 1;
  }}
/>
```

주의:

- 주사위 roll 결과는 컴포넌트 내부에서 자동으로 바꾸지 않는다.
- `onRoll` 이벤트를 받은 앱 코드가 외부 state를 갱신한다.
- 재현 가능한 게임에는 seed 기반 random 함수를 사용해야 한다.

## 덱 관점

구현 위치:

- `packages/boardgame-kit/src/presets.tsx`
- `packages/boardgame-kit/src/state.ts`

제공 기능:

- `Deck`
- face-down top card
- 남은 카드 수 badge
- 시각적 stack layer
- top card drag
- top card를 드래그해도 남은 카드 back layer 유지
- `drawCards` 상태 유틸

상태 유틸:

```ts
drawCards(zones, 'deck', 'hand', 1, (card) => ({
  ...card,
  faceDown: false,
}));
```

주의:

- 실제 shuffle, peek, mill 규칙은 라이브러리 내부에 넣지 않는다.
- 덱 순서는 외부 state가 관리한다.

## 핸드 관점

구현 위치:

- `packages/boardgame-kit/src/presets.tsx`
- `packages/boardgame-kit/src/Zone.tsx`
- `packages/boardgame-kit/src/state.ts`

제공 기능:

- `Hand`
- fan layout 기반 손패 표시
- 같은 hand 안 reorder
- 드래그 중 공간 preview
- playable card 표시
- selected/targetable 상태 표시

상태 유틸:

```ts
moveCardInZones(zones, {
  card,
  originZoneId: 'hand',
  targetZoneId: 'hand',
  targetCardId,
  targetPosition: 'before',
});
```

남은 개선 후보:

- hand overflow 압축
- 모바일 long-press preview
- hover 확대
- 정렬 모드: manual, cost, type, custom comparator

## 상태 유틸

구현 위치:

- `packages/boardgame-kit/src/state.ts`

제공 함수:

- `moveCardInZones`
- `drawCards`
- `reorderCards`

사용 목적:

- 앱마다 반복되는 카드 이동 로직 제거
- 드래그/드롭 payload와 상태 갱신 로직 연결
- 데모와 실제 게임 코드가 같은 이동 규칙을 사용하도록 정리

## 현재 컴포넌트 목록

- `Card`
- `GameCard`
- `Zone`
- `Board`
- `Deck`
- `Hand`
- `DiscardPile`
- `MarketRow`
- `CardGameProvider`
- `GameToken`
- `TokenZone`
- `Dice`
- `DiceTray`

## 명령형 컨트롤러 API

구현 위치:

- `packages/boardgame-kit/src/controller.ts`

목적:

- React 컴포넌트 밖에서 카드/덱/핸드/보드를 객체처럼 조작한다.
- 내부 mutable store를 강제하지 않고, 외부 `getZones`/`setZones`를 받아 controlled state와 연결한다.
- React `useState`, Zustand, boardgame.io 등과 함께 사용할 수 있다.

생성:

```ts
const controller = createCardGameController({
  getZones: () => zonesRef.current,
  setZones: (updater) => {
    setZones((current) => (typeof updater === 'function' ? updater(current) : updater));
  },
});
```

### Card API

```ts
controller.card(cardId).get();
controller.card(cardId).reveal();
controller.card(cardId).hide();
controller.card(cardId).flip();
controller.card(cardId).enable();
controller.card(cardId).disable();
controller.card(cardId).patch({ power: 5 });
controller.card(cardId).moveTo('board');
controller.card(cardId).discard('discard');
```

사용 목적:

- 카드 앞면/뒷면 제어
- 카드 disabled 상태 제어
- 카드 데이터 일부 갱신
- 카드 존 이동
- discard pile로 이동

### Zone API

```ts
controller.zone('board').getCards();
controller.zone('board').add(card);
controller.zone('board').remove(cardId);
controller.zone('board').clear();
controller.zone('board').reorder(cardId, targetCardId, 'before');
controller.zone('board').moveCardTo(cardId, 'discard');
```

사용 목적:

- 범용 카드 영역 조작
- zone 내 순서 변경
- zone 간 카드 이동

### Deck API

```ts
controller.deck('deck').getCards();
controller.deck('deck').top();
controller.deck('deck').drawTo('hand', 1);
controller.deck('deck').revealTo('board', 1);
controller.deck('deck').hideTop();
controller.deck('deck').shuffle();
```

사용 목적:

- 덱 맨 위 카드 조회
- 카드 뽑기
- 공개 뽑기
- 덱 셔플
- top card 뒷면 처리

주의:

- `shuffle()`은 기본적으로 `Math.random`을 사용한다.
- 재현 가능한 게임 로그가 필요하면 seed 기반 random 함수를 주입해야 한다.

### Hand API

```ts
controller.hand('hand').getCards();
controller.hand('hand').sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
controller.hand('hand').reorder(cardId, targetCardId, 'after');
controller.hand('hand').play(cardId, 'board');
controller.hand('hand').discard(cardId, 'discard');
```

사용 목적:

- 손패 정렬
- 손패 순서 변경
- 카드 플레이
- 카드 버리기

### Board API

```ts
controller.board('board').getCards();
controller.board('board').clear();
controller.board('board').moveToDiscard(cardId, 'discard');
```

사용 목적:

- 보드 카드 조회
- 보드 정리
- 보드 카드 discard 이동

### Token Controller

```ts
const tokenController = createTokenController({
  getItems: () => tokens,
  setItems: setTokens,
});

tokenController.token('gold').increment();
tokenController.token('damage').decrement();
tokenController.token('poison').patch({ shape: 'triangle' });
tokenController.token('stun').disable();
```

### Dice Controller

```ts
const diceController = createDiceController({
  getItems: () => dice,
  setItems: setDice,
});

diceController.die('d20').roll();
diceController.die('d6').setValue(4);
diceController.rollAll();
```

## 범용 GameKit Controller API

구현 위치:

- `packages/boardgame-kit/src/gamekit-types.ts`
- `packages/boardgame-kit/src/gamekit-controller.ts`
- `packages/boardgame-kit/src/GameKitProvider.tsx`

상세 API/Event 레퍼런스:

- [GameKit API/Event 상세 레퍼런스](./gamekit-api-events.md)

목적:

- 카드 전용 API를 넘어서 카드, 토큰, 주사위, 타일, 말, 큐브를 모두 `piece`로 다룬다.
- 덱, 핸드, 슬롯, 트랙, 맵 노드, 맵 간선을 모두 `container` 또는 `location`으로 다룬다.
- 모든 상태 변경을 `GameAction -> validate -> commit -> GamePatch -> GameEvent` 흐름으로 처리한다.
- 게임별 특수 룰은 `GameRulesAdapter`로 주입한다.

생성:

```ts
const game = createGameKitController({
  getState: () => stateRef.current,
  setState: (updater) => {
    setState((current) => (typeof updater === 'function' ? updater(current) : updater));
  },
  rules,
  onEvent: (event) => {
    console.log(event.type, event.payload);
  },
});
```

React context로 사용:

```tsx
<GameKitProvider state={gameState} setState={setGameState} rules={rules} onEvent={handleGameEvent}>
  <Board />
</GameKitProvider>
```

```ts
const game = useGameKit();
game?.piece('card-1').moveTo({ type: 'container', containerId: 'board' });
```

상태 모델:

```ts
type GameKitState = {
  pieces: Record<string, GameKitPiece>;
  containers: Record<string, GameContainer>;
  collections?: Record<string, GameCollection>;
  locations?: Record<string, Location>;
  resources?: Record<string, ResourceStore>;
  tracks?: Record<string, TrackState>;
  turn?: TurnState;
  phase?: PhaseState;
};
```

### Action API

```ts
const action = {
  type: 'piece.move',
  pieceId: 'card-1',
  to: { type: 'container', containerId: 'board', index: 0 },
} satisfies GameAction;

game.action(action).preview();
game.action(action).validate();
game.action(action).commit();
game.action(action).cancel();
```

발행 이벤트:

- `action.request`
- `action.validate`
- `action.reject`
- `action.commit`
- `action.resolve`
- `state.patch`
- action 종류에 따른 domain event: 예를 들어 `piece.move`, `collection.draw`, `resource.pay`

### Piece API

```ts
game.piece('card-1').get();
game.piece('card-1').location();
game.piece('card-1').moveTo({ type: 'container', containerId: 'board' });
game.piece('card-1').flip();
game.piece('card-1').patch({ disabled: true });
game.piece('egg-1').attachTo('bird-card-1', 'eggs');
game.piece('card-1').remove();
```

### Container API

```ts
game.container('hand').get();
game.container('hand').pieces();
game.container('hand').add('card-1');
game.container('hand').remove('card-1');
game.container('hand').reorder('card-1', 'card-2', 'before');
game.container('hand').clear();
```

### Collection API

```ts
game.collection('deck').count();
game.collection('deck').peek(3);
game.collection('deck').drawTop(1, { type: 'container', containerId: 'hand' });
game.collection('deck').drawBottom(1, { type: 'container', containerId: 'discard' });
game.collection('bag').drawRandom(4, { type: 'container', containerId: 'factory' });
game.collection('deck').shuffle();
```

### Resource/Track/Phase/Turn API

```ts
game.resources('player-1').gain({ coin: 2 });
game.resources('player-1').pay({ wood: 1, coin: 1 });

game.track('score').advance('player-1', 3);
game.track('score').set('player-1', 10);

game.phase().current();
game.phase().set({ id: 'action' });

game.turn().current();
game.turn().nextPlayer();

game.animation().start('card-1', 'move');
game.animation().end('card-1', 'move');
game.animation().play('card-1', 'reveal', { durationMs: 450 });
```

### Rules API

```ts
const rules: GameRulesAdapter = {
  canDrop({ state, pieceId, target }) {
    const piece = state.pieces[pieceId];
    if (target.type === 'container' && target.containerId === 'discard') {
      return piece.kind === 'card';
    }
    return true;
  },

  validateAction(action, state) {
    if (action.type === 'resource.pay') {
      const store = state.resources?.[action.storeId];
      const enough = Object.entries(action.resources).every(([key, amount]) => (store?.values[key] ?? 0) >= amount);
      return enough ? { allowed: true } : { allowed: false, reason: '자원이 부족합니다.' };
    }

    return { allowed: true };
  },
};
```

사용 기준:

- 단순 카드 UI는 기존 `createCardGameController`를 사용한다.
- 타일, 토큰, 자원, 트랙, 턴/페이즈까지 포함하는 게임은 `createGameKitController`를 사용한다.
- 기존 컴포넌트 이벤트는 입력을 받고, 실제 상태 변경은 `game.action(...).commit()`으로 위임하는 구조가 권장된다.

### 데모 적용 상태

현재 데모에서는 다음 액션이 컨트롤러 API를 사용한다.

```ts
controller.deck('deck').drawTo('hand', 1);
controller.deck('deck').drawTo('board', 1, (card) => ({ ...card, faceDown: true }));
controller.card(revealedCardId).reveal();
```

드래그/드롭은 아직 `moveCardInZones` 유틸을 직접 사용한다. 이유는 드래그 중 live reorder preview가 pointer payload와 강하게 연결되어 있어서, 현재는 순수 상태 유틸이 더 단순하다.

## 다음 우선순위

1. `PieceZone`에 공통 drag/drop 연결
2. 드래그/드롭 액션도 controller command로 위임
3. `RulesProvider.canDrop`을 `Zone`/`GameCard` 동작에 실제 연결
4. animation duration/easing을 theme props로 분리
5. mobile viewport별 수동/자동 테스트 추가
6. Storybook 또는 demo scenarios 추가
7. npm package metadata 보강: repository, keywords, author
