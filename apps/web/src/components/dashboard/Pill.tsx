import { cn } from '@aga/ui';

export type PillTone = 'ok' | 'warn' | 'danger' | 'muted' | 'info';

const TONES: Record<PillTone, string> = {
  ok: 'bg-olive/15 text-olive',
  warn: 'bg-gold/20 text-deep-ink',
  danger: 'bg-destructive/10 text-destructive',
  muted: 'bg-background text-muted-foreground',
  info: 'bg-primary/10 text-primary',
};

interface Props {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}

export function Pill({ tone = 'muted', className, children }: Props) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
