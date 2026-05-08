'use client';

import { useMemo, useState } from 'react';
import type { DirectoryBusiness, DirectoryCategory } from '@/lib/public-directory';
import { Input, cn } from '@aga/ui';
import { Search } from 'lucide-react';
import { BusinessCard } from './BusinessCard';

interface Props {
  locale: string;
  businesses: DirectoryBusiness[];
  categories: DirectoryCategory[];
}

const ALL = '__all';

export function DirectoryBrowser({ locale, businesses, categories }: Props) {
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (category !== ALL && b.categorySlug !== category) return false;
      if (!q) return true;
      const haystack = [b.name, b.description ?? '', b.address, b.tags.join(' ')]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [businesses, category, query]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex flex-wrap gap-1.5">
          <CategoryChip
            label={locale === 'en' ? 'All' : 'Όλα'}
            count={businesses.length}
            active={category === ALL}
            onClick={() => setCategory(ALL)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.slug}
              label={c.name}
              count={c.count}
              active={category === c.slug}
              onClick={() => setCategory(c.slug)}
            />
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === 'en' ? 'Search by name, tag…' : 'Αναζήτηση…'}
            className="pl-9"
            aria-label={locale === 'en' ? 'Search businesses' : 'Αναζήτηση επιχειρήσεων'}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          {locale === 'en'
            ? 'No results. Try a different search or category.'
            : 'Καμία εγγραφή. Δοκιμάστε άλλη αναζήτηση ή κατηγορία.'}
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <li key={b.id}>
              <BusinessCard locale={locale} business={b} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background text-foreground hover:bg-accent/40',
      )}
    >
      {label}
      <span className={cn('text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        {count}
      </span>
    </button>
  );
}
