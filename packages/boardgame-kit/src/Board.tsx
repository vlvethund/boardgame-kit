import type { CSSProperties, ReactNode } from 'react';

export type BoardProps = {
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function Board({ children, title, actions, className, style }: BoardProps) {
  return (
    <div className={className ? `gck-board ${className}` : 'gck-board'} style={style}>
      {(title || actions) && (
        <div className="gck-board__header">
          <div className="gck-board__title">{title}</div>
          <div className="gck-board__actions">{actions}</div>
        </div>
      )}
      {children}
    </div>
  );
}

export type BoardSectionProps = {
  children: ReactNode;
  title?: ReactNode;
  aside?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function BoardSection({ children, title, aside, className, style }: BoardSectionProps) {
  return (
    <section className={className ? `gck-board-section ${className}` : 'gck-board-section'} style={style}>
      {(title || aside) && (
        <div className="gck-board-section__header">
          <div className="gck-board-section__title">{title}</div>
          <div className="gck-board-section__aside">{aside}</div>
        </div>
      )}
      <div className="gck-board-section__body">{children}</div>
    </section>
  );
}

export type BoardLayerProps = {
  children: ReactNode;
  name?: string;
  className?: string;
  style?: CSSProperties;
};

export function BoardLayer({ children, name, className, style }: BoardLayerProps) {
  return (
    <div className={className ? `gck-board-layer ${className}` : 'gck-board-layer'} data-layer={name} style={style}>
      {children}
    </div>
  );
}

export type BoardGridProps = {
  children: ReactNode;
  columns?: string;
  gap?: string;
  className?: string;
  style?: CSSProperties;
};

export function BoardGrid({ children, columns = 'repeat(auto-fit, minmax(220px, 1fr))', gap = '12px', className, style }: BoardGridProps) {
  return (
    <div className={className ? `gck-board-grid ${className}` : 'gck-board-grid'} style={{ '--board-columns': columns, '--board-gap': gap, ...style } as CSSProperties}>
      {children}
    </div>
  );
}
