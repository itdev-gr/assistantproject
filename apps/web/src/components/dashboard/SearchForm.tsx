import { Search } from 'lucide-react';
import { dashInput } from './field-classes';
import { cn } from '@aga/ui';

interface Props {
  /** Route the GET form submits to (same page for shareable URLs). */
  action: string;
  placeholder: string;
  /** Current query value (from searchParams). */
  defaultValue?: string;
  /** Other active filters to preserve across searches. */
  hidden?: Record<string, string>;
  name?: string;
  className?: string;
}

/** GET-form list search — results land in the URL, so they are shareable. */
export function SearchForm({
  action,
  placeholder,
  defaultValue,
  hidden = {},
  name = 'q',
  className,
}: Props) {
  return (
    <form action={action} method="get" className={cn('relative w-full max-w-64', className)}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(dashInput, 'pl-9')}
      />
    </form>
  );
}
