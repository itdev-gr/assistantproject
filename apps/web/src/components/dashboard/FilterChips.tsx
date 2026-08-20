import { Link } from '@/i18n/routing';
import { cn } from '@aga/ui';

export interface FilterChip {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}

/** Server-rendered pill filters — each chip is a shareable URL. */
export function FilterChips({ chips, className }: { chips: FilterChip[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors',
            chip.active
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-foreground hover:bg-primary/10',
          )}
        >
          {chip.label}
          {chip.count != null && (
            <span className={cn('text-[12px]', chip.active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
              {chip.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
