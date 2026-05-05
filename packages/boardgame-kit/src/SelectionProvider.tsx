import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import type { PieceId, SelectionMode } from './types';

export type SelectionContextValue = {
  mode: SelectionMode;
  selectedIds: PieceId[];
  isSelected: (id: PieceId) => boolean;
  select: (id: PieceId) => void;
  toggle: (id: PieceId) => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({
  mode = 'single',
  selectedIds: controlledSelectedIds,
  onChange,
  children,
}: {
  mode?: SelectionMode;
  selectedIds?: PieceId[];
  onChange?: (selectedIds: PieceId[]) => void;
  children: ReactNode;
}) {
  const [uncontrolledSelectedIds, setUncontrolledSelectedIds] = useState<PieceId[]>([]);
  const selectedIds = controlledSelectedIds ?? uncontrolledSelectedIds;

  function commit(next: PieceId[]) {
    if (!controlledSelectedIds) setUncontrolledSelectedIds(next);
    onChange?.(next);
  }

  const value = useMemo<SelectionContextValue>(
    () => ({
      mode,
      selectedIds,
      isSelected: (id) => selectedIds.includes(id),
      select: (id) => {
        if (mode === 'none') return;
        commit(mode === 'single' ? [id] : Array.from(new Set([...selectedIds, id])));
      },
      toggle: (id) => {
        if (mode === 'none') return;
        if (selectedIds.includes(id)) {
          commit(selectedIds.filter((selectedId) => selectedId !== id));
          return;
        }
        commit(mode === 'single' ? [id] : [...selectedIds, id]);
      },
      clear: () => commit([]),
    }),
    [mode, selectedIds],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  return useContext(SelectionContext);
}
