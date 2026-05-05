import { createContext, ReactNode, useContext } from 'react';
import type { RulesAdapter } from './types';

const RulesContext = createContext<RulesAdapter | undefined>(undefined);

export function RulesProvider({ rules, children }: { rules?: RulesAdapter; children: ReactNode }) {
  return <RulesContext.Provider value={rules}>{children}</RulesContext.Provider>;
}

export function useRules() {
  return useContext(RulesContext);
}
