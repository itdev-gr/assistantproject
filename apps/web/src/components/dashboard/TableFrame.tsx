import { cn } from '@aga/ui';

/** Uppercase table/grid header row. */
export const tableHead =
  'bg-background/50 px-4 py-3 text-[12px] uppercase tracking-[0.1em] text-muted-foreground';

/** Standard row: soft divider, hover tint, no divider on the last row. */
export const tableRow = 'border-b border-border/60 last:border-0 hover:bg-primary/5';

interface Props {
  className?: string;
  /** min-width of the inner content so mobile scrolls instead of squashing. */
  minWidth?: string;
  children: React.ReactNode;
}

/** Horizontal-scroll wrapper + bordered surface for tables and grid lists. */
export function TableFrame({ className, minWidth = 'min-w-[680px]', children }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className={cn('overflow-hidden rounded-lg border bg-card', minWidth, className)}>
        {children}
      </div>
    </div>
  );
}
