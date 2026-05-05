import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { GameTokenData, TokenShape } from './types';

export type GameTokenProps = {
  token: GameTokenData;
  size?: 'sm' | 'md' | 'lg';
  shape?: TokenShape;
  selected?: boolean;
  children?: ReactNode;
  onClick?: (token: GameTokenData) => void;
} & Omit<HTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'>;

export function GameToken({ token, size = 'md', shape, selected = false, children, className, style, onClick, ...props }: GameTokenProps) {
  const usesCustomShape = Boolean(token.svg) || token.preserveImageShape;
  const resolvedShape = usesCustomShape ? 'custom' : (shape ?? token.shape ?? 'circle');

  return (
    <button
      type="button"
      className={className ? `gck-token ${className}` : 'gck-token'}
      data-shape={resolvedShape}
      data-size={size}
      data-selected={selected ? 'true' : 'false'}
      data-custom-shape={usesCustomShape ? 'true' : 'false'}
      disabled={token.disabled}
      style={
        {
          '--token-color': token.color,
          '--token-text-color': token.textColor,
          ...style,
        } as CSSProperties
      }
      onClick={() => onClick?.(token)}
      {...props}
    >
      {token.svg ?? (token.image ? <img src={token.image} alt={token.label ?? ''} /> : <span>{children ?? token.value ?? token.label}</span>)}
    </button>
  );
}

export type TokenZoneLayout = 'stack' | 'row' | 'grid';

export type TokenZoneProps = {
  id?: string;
  title?: ReactNode;
  tokens: GameTokenData[];
  layout?: TokenZoneLayout;
  size?: GameTokenProps['size'];
  renderToken?: (token: GameTokenData) => ReactNode;
  onTokenClick?: (token: GameTokenData) => void;
  className?: string;
  style?: CSSProperties;
};

export function TokenZone({ id, title, tokens, layout = 'row', size = 'md', renderToken, onTokenClick, className, style }: TokenZoneProps) {
  return (
    <section className={className ? `gck-token-zone ${className}` : 'gck-token-zone'} data-token-zone-id={id} data-layout={layout} style={style}>
      {title && (
        <div className="gck-token-zone__header">
          <span>{title}</span>
          <small>{tokens.length}</small>
        </div>
      )}
      <div className="gck-token-zone__items">
        {tokens.map((token, tokenIndex) => (
          <div key={token.id} className="gck-token-slot" style={{ '--token-index': tokenIndex } as CSSProperties}>
            {renderToken ? renderToken(token) : <GameToken token={token} size={size} onClick={onTokenClick} />}
          </div>
        ))}
      </div>
    </section>
  );
}

export type TokenCounterProps = {
  token: GameTokenData;
  value: number;
  size?: GameTokenProps['size'];
  onIncrement?: (token: GameTokenData) => void;
  onDecrement?: (token: GameTokenData) => void;
};

export function TokenCounter({ token, value, size = 'md', onIncrement, onDecrement }: TokenCounterProps) {
  return (
    <div className="gck-token-counter">
      <button type="button" className="gck-token-counter__step" onClick={() => onDecrement?.(token)} aria-label="Decrease token">
        -
      </button>
      <GameToken token={{ ...token, value }} size={size} />
      <button type="button" className="gck-token-counter__step" onClick={() => onIncrement?.(token)} aria-label="Increase token">
        +
      </button>
    </div>
  );
}

export type TokenStackProps = {
  tokens: GameTokenData[];
  maxVisible?: number;
  size?: GameTokenProps['size'];
  onTokenClick?: (token: GameTokenData) => void;
};

export function TokenStack({ tokens, maxVisible = 4, size = 'md', onTokenClick }: TokenStackProps) {
  const visibleTokens = tokens.slice(0, maxVisible);
  return <TokenZone tokens={visibleTokens} layout="stack" size={size} onTokenClick={onTokenClick} />;
}
