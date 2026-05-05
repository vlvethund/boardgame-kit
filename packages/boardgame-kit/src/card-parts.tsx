import type { HTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { Grip, Sparkles } from 'lucide-react';
import type { GameCardData } from './types';

type DivProps = HTMLAttributes<HTMLDivElement>;
type SpanProps = HTMLAttributes<HTMLSpanElement>;

export function CardShell({ children, className, ...props }: DivProps) {
  return (
    <div className={className ? `gck-card-shell ${className}` : 'gck-card-shell'} {...props}>
      {children}
    </div>
  );
}

export function CardFront({ children, className, ...props }: DivProps) {
  return (
    <div className={className ? `gck-card__face gck-card__front ${className}` : 'gck-card__face gck-card__front'} {...props}>
      {children}
    </div>
  );
}

export function CardBack({ children, className, ...props }: DivProps) {
  return (
    <div className={className ? `gck-card__face gck-card__back ${className}` : 'gck-card__face gck-card__back'} {...props}>
      {children ?? <Grip size={38} />}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: DivProps) {
  return (
    <div className={className ? `gck-card__top ${className}` : 'gck-card__top'} {...props}>
      {children}
    </div>
  );
}

export function CardCost({ children, className, ...props }: SpanProps) {
  return (
    <span className={className ? `gck-card__cost ${className}` : 'gck-card__cost'} {...props}>
      {children}
    </span>
  );
}

export function CardType({ children, className, ...props }: SpanProps) {
  return (
    <span className={className ? `gck-card__type ${className}` : 'gck-card__type'} {...props}>
      {children}
    </span>
  );
}

export function CardArt({
  src,
  alt = '',
  children,
  className,
  imageProps,
  ...props
}: DivProps & { src?: string; alt?: string; imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> }) {
  return (
    <div className={className ? `gck-card__art ${className}` : 'gck-card__art'} {...props}>
      {src ? <img src={src} alt={alt} {...imageProps} /> : (children ?? <Sparkles size={34} />)}
    </div>
  );
}

export function CardBody({ children, className, ...props }: DivProps) {
  return (
    <div className={className ? `gck-card__body ${className}` : 'gck-card__body'} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, ...props }: HTMLAttributes<HTMLElement>) {
  return <strong {...props}>{children}</strong>;
}

export function CardText({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props}>{children}</p>;
}

export function CardPower({ children, className, ...props }: DivProps) {
  return (
    <div className={className ? `gck-card__power ${className}` : 'gck-card__power'} {...props}>
      {children}
    </div>
  );
}

export function DefaultCardFace({ card }: { card: GameCardData }) {
  return (
    <>
      <CardHeader>
        <CardCost>{card.cost ?? '-'}</CardCost>
        <CardType>{card.type ?? 'Action'}</CardType>
      </CardHeader>
      <CardArt src={card.art} />
      <CardBody>
        <CardTitle>{card.title}</CardTitle>
        <CardText>{card.text}</CardText>
      </CardBody>
      {typeof card.power === 'number' && <CardPower>{card.power}</CardPower>}
    </>
  );
}

export function CardTemplate({ card, children }: { card: GameCardData; children?: ReactNode }) {
  return (
    <>
      <CardFront>{children ?? <DefaultCardFace card={card} />}</CardFront>
      <CardBack />
    </>
  );
}
