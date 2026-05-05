# 유명 보드게임 기준 라이브러리 확장 검토

작성일: 2026-05-05

관련 설계 문서:

- [범용 보드게임 라이브러리 공통화 설계](./generic-boardgame-architecture.md)

## 현재 라이브러리 상태

현재 구현된 기반:

- `GameCard`, `Deck`, `Hand`, `DiscardPile`, `MarketRow`
- 카드 compound parts: `CardHeader`, `CardArt`, `CardBody`, `CardCost` 등
- `GameToken`, `TokenZone`, `TokenCounter`, `TokenStack`
- `Dice`, `DiceTray`, `rollDie`, `rollDice`
- `Board`, `BoardSection`, `BoardGrid`, `BoardLayer`
- `Slot`, `PieceZone`, `GamePiece`
- `DragLayerProvider`, `DragLayer`
- `RulesProvider`, `SelectionProvider`
- 카드/토큰/주사위 controller 계층

현재 강점:

- 카드/토큰/주사위 같은 보드 피스 표현
- 일반적인 존, 손패, 덱, 버림더미
- 드래그 preview 계층
- 커스텀 카드 UI 조립
- controlled state 기반으로 게임별 룰 주입 가능

현재 약점:

- 맵/그래프/타일 기반 게임을 위한 보드 topology가 없다.
- 동시 선택/비밀 선택/단계별 액션 큐가 약하다.
- 카드/토큰/주사위 공통 drag/drop은 아직 `PieceZone`까지 완전히 연결되지 않았다.
- scoring/track/resource/bag/deck lifecycle이 게임별 유틸 수준으로 정리되어 있지 않다.
- 룰 엔진은 provider 타입만 있고 실제 phase/turn/action state machine은 없다.

## 게임별 검토

### 1. CATAN

참고: https://www.catan.com/understand-catan/game-rules

핵심 룰/컴포넌트:

- 육각 타일 맵
- 꼭짓점의 settlement/city
- 변의 road
- 숫자 토큰과 주사위 생산
- robber가 특정 hex 생산을 막음
- resource card, development card
- trading
- longest road / largest army

현재 커버:

- 카드, 토큰, 주사위, 보드 피스는 표현 가능
- resource/development card는 `GameCard`
- robber는 `GameToken`

부족한 기능:

- `HexBoard`
- `HexTile`, `HexVertex`, `HexEdge`
- edge/corner occupancy 모델
- route graph 계산
- `LongestPathCalculator`
- dice roll -> adjacent vertices 생산 이벤트
- robber blocking state
- player trade modal / bank trade UI

필요 API 예시:

```ts
type HexCoord = { q: number; r: number };

type HexBoardState = {
  tiles: HexTileState[];
  vertices: VertexState[];
  edges: EdgeState[];
};
```

```tsx
<HexBoard tiles={tiles}>
  <HexTile coord={{ q: 0, r: 0 }} />
  <HexVertex id="v1" piece={settlement} />
  <HexEdge id="e1" piece={road} />
</HexBoard>
```

### 2. Ticket to Ride

참고: https://cdn.svc.asmodee.net/staging-daysofwonder/uploads/2024/07/7201-T2R-Rules-EN-20240423_LOWRES.pdf

핵심 룰/컴포넌트:

- 도시 노드와 route edge
- route 길이/색상
- train cards set collection
- destination ticket hidden goals
- route claiming
- longest continuous path bonus
- 플레이어별 train car 수 제한

현재 커버:

- train card, destination card 표현 가능
- train car token 표현 가능
- 점수 토큰/트랙 표현 가능

부족한 기능:

- `GraphBoard`
- city node / route edge 렌더링
- edge에 여러 segment slot 표시
- route claim validation
- hidden objective card zone
- connected path / longest path 계산
- map background + interactive overlay

필요 API 예시:

```tsx
<GraphBoard nodes={cities} edges={routes}>
  <RouteEdge id="denver-kansas" slots={4} color="orange" />
</GraphBoard>
```

### 3. Carcassonne

참고: https://images-cdn.zmangames.com/us-east-1/filer_public/d5/20/d5208d61-8583-478b-a06d-b49fc9cd7aaa/zm7810_carcassonne_rules.pdf

핵심 룰/컴포넌트:

- 타일 드로우 후 격자에 배치
- 타일 edge compatibility: road/city/field 등
- meeple을 타일 내부 feature에 배치
- 완성된 road/city/monastery scoring
- feature graph ownership 계산
- scoring 후 meeple 반환

현재 커버:

- 타일을 `GamePiece`나 token/card로 표현은 가능
- meeple token 표현 가능

부족한 기능:

- `TileMap`
- square grid placement
- tile rotation
- edge matching validation
- tile internal feature regions
- meeple anchor points
- feature graph merge/scoring
- completed feature detection

필요 API 예시:

```ts
type TileEdge = 'road' | 'city' | 'field' | 'river';

type TileDefinition = {
  id: string;
  edges: [TileEdge, TileEdge, TileEdge, TileEdge];
  meepleSpots: MeepleSpot[];
};
```

```tsx
<TileMap tiles={placedTiles} onPlaceTile={placeTile} />
```

### 4. Dominion

참고: https://www.riograndegames.com/wp-content/uploads/2016/09/Dominion2E.pdf

핵심 룰/컴포넌트:

- 개인 draw deck / hand / discard pile
- supply piles
- trash zone
- action phase / buy phase / cleanup phase
- actions, buys, coins counters
- card effect resolution stack
- deck empty 시 discard shuffle
- supply pile depletion end condition

현재 커버:

- deck/hand/discard/supply piles 표현 가능
- 카드 조립 UI 적합

부족한 기능:

- deck lifecycle utility: draw, discard, shuffle discard into deck
- supply pile component with count
- trash pile
- phase/action/buy counters
- effect stack / prompt queue
- card resolver interface

필요 API 예시:

```ts
controller.deck('playerDeck').drawTo('hand', 5);
controller.deck('discard').shuffleInto('playerDeck');
controller.supply('village').gainTo('discard');
```

### 5. Pandemic

참고: https://www.rulespal.com/pandemic/rulebook

핵심 룰/컴포넌트:

- 세계 지도 graph
- city nodes with disease cube stacks
- player pawns
- player deck / infection deck
- infection discard를 섞어 infection deck 위에 올리는 epidemic 절차
- outbreak chain reaction
- cure markers / infection rate / outbreak track
- cooperative shared loss conditions

현재 커버:

- cube/token, card deck, pawn token 표현 가능
- track을 간단한 token zone으로 표현 가능

부족한 기능:

- `GraphBoard` with nodes/edges
- cube stack with color/count cap
- infection deck special lifecycle: bottom draw, discard shuffle onto top
- chain reaction resolver
- global lose/win condition monitor
- cooperative shared state panel
- action point tracker

필요 API 예시:

```ts
infectionDeck.drawBottom();
infectionDeck.shuffleDiscardOntoTop();
graph.spreadFrom(cityId, { maxPerColor: 3 });
```

### 6. Azul

참고: https://cdn.svc.asmodee.net/production-unboxnowcom/uploads/2022/04/en-azul-rules.pdf

핵심 룰/컴포넌트:

- bag에서 타일을 뽑아 factory display에 배치
- 같은 색 타일 묶음 선택
- 남은 타일은 center로 이동
- pattern line 제약
- floor line penalty
- wall 5x5 scoring
- round cleanup

현재 커버:

- 토큰, 토큰존, 보드그리드로 시각화 가능

부족한 기능:

- `Bag`/random draw utility
- factory display component
- group selection interaction
- pattern line component with capacity
- wall grid with row/color constraints
- scoring adjacency calculator
- overflow-to-floor rule support

필요 API 예시:

```tsx
<FactoryDisplay tiles={tiles} onTakeColor={takeColorGroup} />
<PatternLine capacity={3} acceptsColor="blue" />
<WallGrid size={5} />
```

### 7. 7 Wonders

참고: https://www.rulespal.com/7-wonders/rulebook

핵심 룰/컴포넌트:

- 3 Ages
- 동시 카드 선택
- 선택 후 hand passing direction
- 자원 비용 지불, 이웃 자원 구매
- wonder stage에 카드 face-down tuck
- military conflict with neighbors
- science symbol set scoring

현재 커버:

- 카드/손패/플레이영역 표현 가능
- 토큰/코인 표현 가능

부족한 기능:

- simultaneous selection / commit reveal
- hand passing utility
- neighbor relation model
- resource payment solver
- card tuck under wonder stage
- science set scoring helper
- military comparison phase UI

필요 API 예시:

```ts
simultaneous.select(playerId, cardId);
simultaneous.revealWhenAllReady();
hands.pass(direction);
```

### 8. Wingspan

참고: https://meepletron-storage.s3.us-east-2.amazonaws.com/resources/wingspan-rulebook.pdf

핵심 룰/컴포넌트:

- 3 habitat rows
- bird cards placed into habitat slots
- food dice in birdfeeder
- eggs on birds
- cached food / tucked cards on birds
- action cube moves along row and activates cards right-to-left
- round goals and bonus cards

현재 커버:

- 카드, 토큰, 주사위 모두 표현 가능
- 중첩 보드/보드그리드 사용 가능

부족한 기능:

- row activation engine
- card attachment slots: egg, cached food, tucked card
- dice tray with reroll/available face rules
- habitat slot cost progression
- action cube track
- round goal scoring component

필요 API 예시:

```tsx
<HabitatRow id="forest" cards={birds} activationDirection="rtl" />
<AttachmentZone targetId={birdId} accepts={['egg', 'food', 'card']} />
```

### 9. Brass: Birmingham

참고: https://www.rulespal.com/brass-birmingham/rulebook

핵심 룰/컴포넌트:

- location graph
- industry tiles on city slots
- canal/rail link tiles on edges
- coal/iron/beer resource consumption
- market/link network rule
- era transition
- flipped industry tiles scoring
- income and VP tracks

현재 커버:

- 토큰/타일 표현은 가능
- 보드레이어로 지도 overlay 가능

부족한 기능:

- multi-layer graph board
- location slots by industry type
- edge link slots
- resource market tracks
- network reachability validation
- era lifecycle
- flip-state tile component
- track marker component

필요 API 예시:

```tsx
<NetworkBoard nodes={locations} edges={links}>
  <IndustrySlot location="Birmingham" type="cotton" />
  <LinkSlot from="A" to="B" mode="rail" />
</NetworkBoard>
```

### 10. Gloomhaven

참고: https://github.com/m-ender/gloomhaven-rules

핵심 룰/컴포넌트:

- hex dungeon map
- character/monster standees
- simultaneous two-card selection
- initiative reveal and sorting
- top/bottom card action selection
- monster AI movement
- conditions/status tokens
- modifier decks
- scenario state

현재 커버:

- 카드, 토큰, 주사위, 보드피스 표현 가능

부족한 기능:

- `HexBoard`
- initiative queue
- simultaneous hidden selection
- dual-card action picker
- character sheet/resource panel
- status effect stack
- attack modifier deck lifecycle
- pathfinding / line of sight / range overlays
- monster AI hooks

필요 API 예시:

```tsx
<InitiativeQueue entries={entries} />
<HexBoard obstacles={obstacles} pieces={pieces} />
<ActionCardPairPicker hand={cards} />
```

### 11. Root

참고: https://officialgamerules.org/game-rules/root/

핵심 룰/컴포넌트:

- clearing graph
- asymmetric faction boards
- warriors/buildings/tokens
- card suit matching clearing suits
- battle dice
- crafting slots
- faction-specific action economy
- hidden plot tokens in expansions

현재 커버:

- 토큰/주사위/카드/PieceZone 표현 가능

부족한 기능:

- asymmetric faction board framework
- clearing graph with suit metadata
- rule ownership/control helper
- battle resolver
- hidden/revealed token state
- faction adapter architecture
- crafting requirement checker

필요 API 예시:

```ts
type FactionAdapter = {
  getAvailableActions(state, playerId): ActionDescriptor[];
  resolveAction(action): GamePatch[];
};
```

### 12. Terraforming Mars

참고: https://en.wikipedia.org/wiki/Terraforming_Mars_%28board_game%29

핵심 룰/컴포넌트:

- project cards
- shared Mars hex map
- ocean/greenery/city/special tiles
- global parameter tracks: oxygen, temperature, oceans
- production/resource tracks per player
- milestones/awards
- generation structure
- card tags and ongoing effects

현재 커버:

- 카드/토큰/보드그리드 표현 가능

부족한 기능:

- hex placement with adjacency bonuses
- shared global parameter tracks
- player resource production board
- card tag aggregation
- milestones/awards tracker
- generation lifecycle
- effect modifiers and passive abilities

필요 API 예시:

```tsx
<Track id="oxygen" min={0} max={14} value={oxygen} />
<HexBoard tiles={marsTiles} />
<TagSummary cards={playedCards} />
```

## 라이브러리에 추가할 우선 기능

게임별 이름이 붙은 컴포넌트를 바로 core에 넣기보다는, 아래 기능들을 범용 primitive로 먼저 만든다.

예를 들어 `HexBoard`, `GraphBoard`, `TileMap`은 core의 `Topology` 프리셋이고, `Deck`, `Bag`, `SupplyPile`은 core의 `Collection` 프리셋이다. 게임별 특수 룰은 `RulesAdapter`, `ActionResolver`, `RendererAdapter`로 주입한다.

### P0: 보드 topology 계층

가장 큰 빈틈이다.

추가할 것:

- `GraphBoard`
- `HexBoard`
- `TileMap`
- `Track`
- `MapOverlay`

커버 게임:

- CATAN
- Ticket to Ride
- Pandemic
- Brass
- Root
- Terraforming Mars
- Gloomhaven
- Carcassonne

### P1: 공통 Piece drag/drop 완성

현재 `PieceZone`은 렌더링 중심이다.

추가할 것:

- `usePieceDrag`
- `usePieceDrop`
- `PieceDragLayer`
- `PieceDropEvent`
- token/dice drag
- slot-based reorder
- board coordinate drop

커버 게임:

- 거의 모든 게임
- 특히 Carcassonne, Azul, Gloomhaven, Root, Terraforming Mars

### P1: 턴/페이즈/액션 상태머신

추가할 것:

- `createTurnMachine`
- `PhaseProvider`
- `ActionQueue`
- `PromptQueue`
- simultaneous action support
- interrupt/event window support

커버 게임:

- Dominion
- 7 Wonders
- Pandemic
- Puerto Rico
- Gloomhaven
- Wingspan

### P1: Deck/Bag/Pile lifecycle

현재 deck 유틸은 기본형이다.

추가할 것:

- `DeckModel`
- `BagModel`
- `PileModel`
- bottom draw
- shuffle discard onto top
- reveal market
- supply pile count
- trash/exile/archive

커버 게임:

- Dominion
- Pandemic
- Azul
- 7 Wonders
- Wingspan
- Gloomhaven

### P2: scoring/track/resource primitives

추가할 것:

- `Track`
- `ScoreTrack`
- `ResourceTrack`
- `Counter`
- `MarketTrack`
- `RoundGoal`
- `Milestone`
- `Award`

커버 게임:

- Wingspan
- Terraforming Mars
- Brass
- Azul
- Ticket to Ride
- 7 Wonders

### P2: attachment/tuck/stack system

추가할 것:

- `AttachmentZone`
- `CardTuckZone`
- `TokenAttachment`
- `StackedPiece`
- target piece 내부 slot

커버 게임:

- Wingspan
- 7 Wonders
- Gloomhaven
- Terraforming Mars

### P2: hidden/simultaneous info

추가할 것:

- hidden hand
- committed face-down selection
- reveal barrier
- player visibility model
- private/public/owner-only piece state

커버 게임:

- 7 Wonders
- Gloomhaven
- Ticket to Ride
- Dominion
- Root

### P3: rules adapter 실행 연결

현재 `RulesProvider`는 타입 중심이다.

추가할 것:

- `rules.canDrag` 실제 적용
- `rules.canDrop` 실제 적용
- invalid drop preview
- valid target highlight
- rules-driven action menu

커버 게임:

- 전체

## 결론

현재 라이브러리는 카드/토큰/주사위 UI 키트로는 출발점이 좋다. 하지만 유명 보드게임을 넓게 커버하려면 다음 추상화가 반드시 필요하다.

1. 보드 topology: graph/hex/tile/grid/track
2. piece-level drag/drop
3. phase/action state machine
4. deck/bag/pile lifecycle
5. scoring/resource/track primitives
6. hidden/simultaneous selection
7. rules adapter의 실제 UI 연결

푸에르토리코 구현 관점에서도 즉시 필요한 것은 `Track`, `ResourceCounter`, `PlayerBoardGrid`, `BuildingTile`, `PlantationTile`, `WorkerSlot`, `RoleSelector`, `PhaseMachine`이다. 즉, 다음 개발은 `보드 topology + phase machine + resource/track`부터 시작하는 것이 맞다.

## 참고 링크

- CATAN rules: https://www.catan.com/understand-catan/game-rules
- Ticket to Ride rules PDF: https://cdn.svc.asmodee.net/staging-daysofwonder/uploads/2024/07/7201-T2R-Rules-EN-20240423_LOWRES.pdf
- Carcassonne rules PDF: https://images-cdn.zmangames.com/us-east-1/filer_public/d5/20/d5208d61-8583-478b-a06d-b49fc9cd7aaa/zm7810_carcassonne_rules.pdf
- Dominion rules PDF: https://www.riograndegames.com/wp-content/uploads/2016/09/Dominion2E.pdf
- Pandemic rules: https://www.rulespal.com/pandemic/rulebook
- Azul rules PDF: https://cdn.svc.asmodee.net/production-unboxnowcom/uploads/2022/04/en-azul-rules.pdf
- 7 Wonders rules: https://www.rulespal.com/7-wonders/rulebook
- Wingspan rules PDF: https://meepletron-storage.s3.us-east-2.amazonaws.com/resources/wingspan-rulebook.pdf
- Brass Birmingham rules: https://www.rulespal.com/brass-birmingham/rulebook
- Gloomhaven rules reference: https://github.com/m-ender/gloomhaven-rules
- Root rules summary: https://officialgamerules.org/game-rules/root/
- Terraforming Mars overview: https://en.wikipedia.org/wiki/Terraforming_Mars_%28board_game%29
