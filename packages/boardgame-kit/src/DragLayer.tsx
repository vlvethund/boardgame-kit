import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export type DragLayerItem = {
  id: string;
  node: ReactNode;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type DragLayerContextValue = {
  item?: DragLayerItem;
  start: (item: DragLayerItem) => void;
  update: (item: Partial<DragLayerItem> & Pick<DragLayerItem, 'x' | 'y'>) => void;
  move: (point: Pick<DragLayerItem, 'x' | 'y'>) => void;
  end: () => void;
};

const DragLayerContext = createContext<DragLayerContextValue | undefined>(undefined);

export function DragLayerProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<DragLayerItem | undefined>();
  const value = useMemo<DragLayerContextValue>(
    () => ({
      item,
      start: setItem,
      update: (nextItem) => setItem((current) => (current ? { ...current, ...nextItem } : undefined)),
      move: (point) => setItem((current) => (current ? { ...current, ...point } : current)),
      end: () => setItem(undefined),
    }),
    [item],
  );

  return (
    <DragLayerContext.Provider value={value}>
      {children}
      <DragLayer />
    </DragLayerContext.Provider>
  );
}

export function useDragLayer() {
  return useContext(DragLayerContext);
}

export function DragLayer() {
  const context = useContext(DragLayerContext);
  if (!context?.item || typeof document === 'undefined') return null;
  const { item } = context;

  return createPortal(
    <div className="gck-drag-layer" style={{ left: item.x, top: item.y, width: item.width, height: item.height }}>
      {item.node}
    </div>,
    document.body,
  );
}
