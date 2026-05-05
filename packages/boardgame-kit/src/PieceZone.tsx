import type { CSSProperties, ReactNode } from 'react';
import type { GamePiece } from './types';
import { GameCard } from './GameCard';
import { GameToken } from './Token';
import { Dice } from './Dice';
import { Slot } from './Slot';

export type PieceZoneLayout = 'row' | 'grid' | 'stack' | 'freeform';

export type PieceZoneProps = {
  id: string;
  title?: ReactNode;
  pieces: GamePiece[];
  layout?: PieceZoneLayout;
  renderPiece?: (piece: GamePiece) => ReactNode;
  onPieceClick?: (piece: GamePiece) => void;
  className?: string;
  style?: CSSProperties;
};

export function renderDefaultPiece(piece: GamePiece, onPieceClick?: (piece: GamePiece) => void) {
  if (piece.kind === 'card') {
    return <GameCard card={piece.data} draggable={false} onTap={() => onPieceClick?.(piece)} />;
  }
  if (piece.kind === 'token') {
    return <GameToken token={piece.data} onClick={() => onPieceClick?.(piece)} />;
  }
  return <Dice die={piece.data} onRoll={() => onPieceClick?.(piece)} />;
}

export function PieceZone({ id, title, pieces, layout = 'row', renderPiece, onPieceClick, className, style }: PieceZoneProps) {
  return (
    <section className={className ? `gck-piece-zone ${className}` : 'gck-piece-zone'} data-piece-zone-id={id} data-layout={layout} style={style}>
      {title && (
        <div className="gck-piece-zone__header">
          <span>{title}</span>
          <small>{pieces.length}</small>
        </div>
      )}
      <div className="gck-piece-zone__items">
        {pieces.map((piece) => (
          <Slot key={piece.id} id={piece.id} state="occupied" className="gck-piece-zone__slot">
            {renderPiece ? renderPiece(piece) : renderDefaultPiece(piece, onPieceClick)}
          </Slot>
        ))}
      </div>
    </section>
  );
}
