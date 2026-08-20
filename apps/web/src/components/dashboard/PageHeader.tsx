import { Link } from '@/i18n/routing';

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, backLabel, actions }: Props) {
  return (
    <div className="mb-8">
      {backHref && (
        <p className="mb-2 text-[13px]">
          <Link
            href={backHref}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            ← {backLabel}
          </Link>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-primary sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-[14px] text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
