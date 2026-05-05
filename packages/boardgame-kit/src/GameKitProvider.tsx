import { createContext, ReactNode, useContext, useMemo, useRef } from 'react';
import { createGameKitController } from './gamekit-controller';
import type { GameEvent, GameKitState, GameRulesAdapter } from './gamekit-types';

export type GameKitController = ReturnType<typeof createGameKitController>;

export type GameKitProviderProps<TState extends GameKitState = GameKitState> = {
  state: TState;
  setState: (updater: TState | ((state: TState) => TState)) => void;
  rules?: GameRulesAdapter<TState>;
  onEvent?: (event: GameEvent) => void;
  children: ReactNode;
};

const GameKitContext = createContext<GameKitController | undefined>(undefined);

export function GameKitProvider<TState extends GameKitState = GameKitState>({ state, setState, rules, onEvent, children }: GameKitProviderProps<TState>) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const controller = useMemo(
    () =>
      createGameKitController<TState>({
        getState: () => stateRef.current,
        setState,
        rules,
        onEvent,
      }),
    [onEvent, rules, setState],
  );

  return <GameKitContext.Provider value={controller as unknown as GameKitController}>{children}</GameKitContext.Provider>;
}

export function useGameKit() {
  return useContext(GameKitContext);
}
