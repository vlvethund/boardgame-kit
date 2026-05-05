import { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, useRef, useState } from 'react';
import type { CardAnimation, CardDragMove, CardDrop, CardGesture, CardRenderer, CardState, GameCardData, ZoneId } from './types';
import { CardBack, CardFront, DefaultCardFace } from './card-parts';
import { useDragLayer } from './DragLayer';

export type GameCardProps = {
  card: GameCardData;
  zoneId?: ZoneId;
  state?: CardState;
  animation?: CardAnimation;
  selected?: boolean;
  targetable?: boolean;
  playable?: boolean;
  draggable?: boolean;
  compact?: boolean;
  index?: number;
  fan?: boolean;
  renderCard?: CardRenderer;
  cardRef?: (element: HTMLDivElement | null) => void;
  onTap?: (gesture: CardGesture) => void;
  onLongPress?: (gesture: CardGesture) => void;
  onDragMove?: (move: CardDragMove) => void;
  onDrop?: (drop: CardDrop) => void;
  children?: ReactNode;
};

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 8;

export function GameCard({
  card,
  zoneId,
  state = 'idle',
  animation = 'none',
  selected = false,
  targetable = false,
  playable = false,
  draggable = true,
  compact = false,
  index = 0,
  fan = false,
  renderCard,
  cardRef,
  onTap,
  onLongPress,
  onDragMove,
  onDrop,
  children,
}: GameCardProps) {
  const dragLayer = useDragLayer();
  const idleDrag = { active: false, x: 0, y: 0, left: 0, top: 0 };
  const [drag, setDrag] = useState(idleDrag);
  const dragRef = useRef(idleDrag);
  const start = useRef<{ x: number; y: number; at: number; longPressed: boolean; offsetX: number; offsetY: number; rect?: DOMRect }>({
    x: 0,
    y: 0,
    at: 0,
    longPressed: false,
    offsetX: 0,
    offsetY: 0,
  });
  const activePointerId = useRef<number | undefined>(undefined);
  const longPressTimer = useRef<number | undefined>(undefined);
  const windowListeners = useRef<
    { move: (event: PointerEvent) => void; up: (event: PointerEvent) => void; cancel: (event: PointerEvent) => void } | undefined
  >(undefined);
  const ref = useRef<HTMLDivElement>(null);

  const resolvedState: CardState = card.disabled ? 'disabled' : selected ? 'selected' : targetable ? 'targetable' : playable ? 'playable' : state;
  const usesDragLayer = Boolean(dragLayer);

  function clearLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }

  function setCardElement(element: HTMLDivElement | null) {
    ref.current = element;
    cardRef?.(element);
  }

  function setDragState(nextDrag: typeof idleDrag) {
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }

  function removeWindowListeners() {
    if (!windowListeners.current) return;
    window.removeEventListener('pointermove', windowListeners.current.move);
    window.removeEventListener('pointerup', windowListeners.current.up);
    window.removeEventListener('pointercancel', windowListeners.current.cancel);
    windowListeners.current = undefined;
  }

  function setSlotDragging(value: boolean) {
    const slot = ref.current?.closest<HTMLElement>('.gck-card-slot');
    if (!slot) return;
    if (value) {
      slot.dataset.dragging = 'true';
    } else {
      window.requestAnimationFrame(() => {
        delete slot.dataset.dragging;
      });
    }
  }

  function getDropTarget(clientX: number, clientY: number) {
    const previousPointerEvents = ref.current?.style.pointerEvents;
    if (ref.current) ref.current.style.pointerEvents = 'none';
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (ref.current) ref.current.style.pointerEvents = previousPointerEvents ?? '';

    const zone = target?.closest<HTMLElement>('[data-zone-id]');
    const targetCard = target?.closest<HTMLElement>('[data-card-id]');
    const targetRect = targetCard?.getBoundingClientRect();
    const xOffset = targetRect ? clientX - targetRect.left : 0;
    const yOffset = targetRect ? clientY - targetRect.top : 0;
    const targetPosition: 'before' | 'after' =
      targetRect && Math.abs(xOffset - targetRect.width / 2) >= Math.abs(yOffset - targetRect.height / 2)
        ? xOffset > targetRect.width / 2
          ? 'after'
          : 'before'
        : yOffset > (targetRect?.height ?? 0) / 2
          ? 'after'
          : 'before';

    return {
      targetZoneId: zone?.dataset.zoneId,
      targetCardId: targetCard?.dataset.cardId,
      targetPosition,
    };
  }

  function renderDragPreview(dx: number) {
    return (
      <div
        className="gck-card gck-card--drag-preview"
        data-state={resolvedState}
        data-card-id={card.id}
        data-tone={card.tone ?? 'steel'}
        data-animation="none"
        data-compact={compact ? 'true' : 'false'}
        data-dragging="true"
        data-face-down={card.faceDown ? 'true' : 'false'}
        style={{ transform: `rotate(${dx / 28}deg)` }}
      >
        <div className="gck-card__inner">
          <CardFront>
            {renderCard ? renderCard(card) : <DefaultCardFace card={card} />}
            {children}
          </CardFront>
          <CardBack />
        </div>
      </div>
    );
  }

  function updatePointer(clientX: number, clientY: number, pointerId: number) {
    if (activePointerId.current !== pointerId) return;
    if (card.disabled) return;
    const dx = clientX - start.current.x;
    const dy = clientY - start.current.y;
    const moved = Math.hypot(dx, dy);

    if (moved > MOVE_CANCEL_PX) clearLongPress();
    if (draggable && moved > MOVE_CANCEL_PX) {
      setSlotDragging(true);
      const wasDragging = dragRef.current.active;
      const nextDrag = {
        active: true,
        x: dx,
        y: dy,
        left: clientX - start.current.offsetX,
        top: clientY - start.current.offsetY,
      };
      setDragState(nextDrag);
      if (dragLayer && start.current.rect) {
        const layerItem = {
          id: card.id,
          node: renderDragPreview(dx),
          x: nextDrag.left,
          y: nextDrag.top,
          width: start.current.rect.width,
          height: start.current.rect.height,
        };
        if (wasDragging) {
          dragLayer.update(layerItem);
        } else {
          dragLayer.start(layerItem);
        }
      }
      onDragMove?.({
        card,
        originZoneId: zoneId,
        ...getDropTarget(clientX, clientY),
      });
    }
  }

  function finishPointer(clientX: number, clientY: number, pointerId: number, cancelled = false) {
    if (activePointerId.current !== pointerId) return;
    if (card.disabled) return;
    clearLongPress();

    const dx = clientX - start.current.x;
    const dy = clientY - start.current.y;
    const moved = Math.hypot(dx, dy);
    const currentDrag = dragRef.current;

    if (!cancelled && currentDrag.active) {
      onDrop?.({
        card,
        originZoneId: zoneId,
        ...getDropTarget(clientX, clientY),
        moveOrigin: start.current.rect
          ? {
              left: currentDrag.left || start.current.rect.left + dx,
              top: currentDrag.top || start.current.rect.top + dy,
              width: start.current.rect.width,
              height: start.current.rect.height,
            }
          : undefined,
      });
    } else if (!cancelled && !start.current.longPressed && moved <= MOVE_CANCEL_PX) {
      onTap?.({ card, originZoneId: zoneId });
    }

    setDragState(idleDrag);
    setSlotDragging(false);
    dragLayer?.end();
    activePointerId.current = undefined;
    removeWindowListeners();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (card.disabled) return;
    ref.current?.getAnimations().forEach((animation) => animation.cancel());
    activePointerId.current = event.pointerId;
    const rect = ref.current?.getBoundingClientRect();
    start.current = {
      x: event.clientX,
      y: event.clientY,
      at: Date.now(),
      longPressed: false,
      offsetX: rect ? event.clientX - rect.left : 0,
      offsetY: rect ? event.clientY - rect.top : 0,
      rect,
    };
    ref.current?.setPointerCapture(event.pointerId);
    removeWindowListeners();

    const move = (nativeEvent: PointerEvent) => updatePointer(nativeEvent.clientX, nativeEvent.clientY, nativeEvent.pointerId);
    const up = (nativeEvent: PointerEvent) => finishPointer(nativeEvent.clientX, nativeEvent.clientY, nativeEvent.pointerId);
    const cancel = (nativeEvent: PointerEvent) => finishPointer(nativeEvent.clientX, nativeEvent.clientY, nativeEvent.pointerId, true);
    windowListeners.current = { move, up, cancel };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);

    longPressTimer.current = window.setTimeout(() => {
      start.current.longPressed = true;
      onLongPress?.({ card, originZoneId: zoneId });
    }, LONG_PRESS_MS);
  }

  const style = {
    '--card-index': index,
    ...(drag.active && start.current.rect && !usesDragLayer
      ? {
          position: 'fixed',
          left: drag.left,
          top: drag.top,
          width: start.current.rect.width,
          height: start.current.rect.height,
          zIndex: 2147483647,
        }
      : {}),
    transform: drag.active && !usesDragLayer
      ? `rotate(${drag.x / 28}deg)`
      : undefined,
  } as CSSProperties;

  return (
    <div
      ref={setCardElement}
      className="gck-card"
      data-state={resolvedState}
      data-card-id={card.id}
      data-tone={card.tone ?? 'steel'}
      data-animation={animation}
      data-compact={compact ? 'true' : 'false'}
      data-dragging={drag.active ? 'true' : 'false'}
      data-drag-layer={usesDragLayer && drag.active ? 'true' : 'false'}
      data-face-down={card.faceDown ? 'true' : 'false'}
      style={style}
      onPointerDown={onPointerDown}
      onPointerCancel={() => {
        clearLongPress();
        setDragState(idleDrag);
        setSlotDragging(false);
        dragLayer?.end();
        activePointerId.current = undefined;
        removeWindowListeners();
      }}
      role="button"
      tabIndex={card.disabled ? -1 : 0}
      aria-pressed={selected}
    >
      <div className="gck-card__inner">
        <CardFront>
          {renderCard ? renderCard(card) : <DefaultCardFace card={card} />}
          {children}
        </CardFront>
        <CardBack />
      </div>
    </div>
  );
}
