import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type SlotState = 'empty' | 'occupied' | 'active' | 'invalid' | 'disabled';

export type SlotProps = {
  id?: string;
  state?: SlotState;
  accepts?: string;
  children?: ReactNode;
  placeholder?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function Slot({ id, state = 'empty', accepts, children, placeholder, className, ...props }: SlotProps) {
  return (
    <div
      className={className ? `gck-slot ${className}` : 'gck-slot'}
      data-slot-id={id}
      data-slot-state={children ? state === 'empty' ? 'occupied' : state : state}
      data-accepts={accepts}
      {...props}
    >
      {children ?? <div className="gck-slot__placeholder">{placeholder}</div>}
    </div>
  );
}

export type SlotGroupProps = {
  children: ReactNode;
  layout?: 'row' | 'grid' | 'stack';
  className?: string;
  style?: CSSProperties;
};

export function SlotGroup({ children, layout = 'row', className, style }: SlotGroupProps) {
  return (
    <div className={className ? `gck-slot-group ${className}` : 'gck-slot-group'} data-layout={layout} style={style}>
      {children}
    </div>
  );
}
