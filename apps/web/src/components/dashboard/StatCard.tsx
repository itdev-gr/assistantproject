import { Link } from '@/i18n/routing';
import { cn } from '@aga/ui';

interface Props {
  label: string;
  value: React.ReactNode;
  /** Optional drill-down: renders the tile as a link into a filtered list. */
  href?: string;
  className?: string;
}

const tile =
  'block rounded-lg border bg-card p-6 shadow-card transition-shadow duration-200';

export function StatCard({ label, value, href, className }: Props) {
  const body = (
    <>
      <div className="text-4xl font-bold tabular-nums text-primary">{value}</div>
      <div className="mt-1 text-[13px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn(tile, 'hover:shadow-card-hover', className)}>
        {body}
      </Link>
    );
  }
  return <div className={cn(tile, className)}>{body}</div>;
}
