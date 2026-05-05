import type { CSSProperties, HTMLAttributes } from 'react';
import type { DiceData } from './types';

export type DiceProps = {
  die: DiceData;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onRoll?: (die: DiceData) => void;
} & Omit<HTMLAttributes<HTMLButtonElement>, 'onClick'>;

export function Dice({ die, size = 'md', selected = false, className, style, onRoll, ...props }: DiceProps) {
  const label = die.value ?? `d${die.sides}`;

  return (
    <button
      type="button"
      className={className ? `gck-die ${className}` : 'gck-die'}
      data-size={size}
      data-selected={selected ? 'true' : 'false'}
      disabled={die.disabled}
      title={die.label ?? `d${die.sides}`}
      style={
        {
          '--die-color': die.color,
          '--die-text-color': die.textColor,
          ...style,
        } as CSSProperties
      }
      onClick={() => onRoll?.(die)}
      {...props}
    >
      <span>{label}</span>
      <small>d{die.sides}</small>
    </button>
  );
}

export type DiceTrayProps = {
  dice: DiceData[];
  title?: string;
  size?: DiceProps['size'];
  onRoll?: (die: DiceData) => void;
};

export function DiceTray({ dice, title, size = 'md', onRoll }: DiceTrayProps) {
  return (
    <section className="gck-dice-tray">
      {title && (
        <div className="gck-dice-tray__header">
          <span>{title}</span>
          <small>{dice.length}</small>
        </div>
      )}
      <div className="gck-dice-tray__items">
        {dice.map((die) => (
          <Dice key={die.id} die={die} size={size} onRoll={onRoll} />
        ))}
      </div>
    </section>
  );
}

export function rollDie(sides: number, random = Math.random) {
  return Math.floor(random() * sides) + 1;
}

export function rollDice(dice: DiceData[], random = Math.random) {
  return dice.map((die) => ({ ...die, value: rollDie(die.sides, random) }));
}
