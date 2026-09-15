import { Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button, cn } from '@aga/ui';
import { formatEuro } from '@/lib/plans';

interface Props {
  locale: string;
  testId: string;
  name: string;
  tagline: string;
  /** Yearly price in euro cents. */
  cents: number;
  features: Array<{ en: string; el: string }>;
  cta: { href: string; label: string; external?: boolean };
  badge?: string;
  highlight?: boolean;
  /** Small line under the price (e.g. the launch-offer first-year price). */
  priceNote?: string;
  footnote?: string;
}

/** One pricing-page card: yearly price, feature list, single CTA. */
export function PlanCard({
  locale,
  testId,
  name,
  tagline,
  cents,
  features,
  cta,
  badge,
  highlight,
  priceNote,
  footnote,
}: Props) {
  const en = locale === 'en';
  return (
    <li
      data-testid={testId}
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm',
        highlight && 'border-primary shadow-card-hover ring-1 ring-primary/30',
      )}
    >
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
      <h3 className="font-serif text-2xl font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
      <p className="mt-5">
        <span className="text-4xl font-semibold">{formatEuro(cents, locale)}</span>
        <span className="text-sm text-muted-foreground"> / {en ? 'year' : 'έτος'}</span>
      </p>
      {priceNote && <p className="mt-1 text-xs font-medium text-primary">{priceNote}</p>}
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f.en} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{en ? f.en : f.el}</span>
          </li>
        ))}
      </ul>
      <Button asChild size="lg" className="mt-8" variant={highlight ? 'default' : 'outline'}>
        {cta.external ? <a href={cta.href}>{cta.label}</a> : <Link href={cta.href}>{cta.label}</Link>}
      </Button>
      {footnote && <p className="mt-3 text-center text-xs text-muted-foreground">{footnote}</p>}
    </li>
  );
}
