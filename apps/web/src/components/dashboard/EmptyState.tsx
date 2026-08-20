interface Props {
  /** Message when the collection is empty. */
  message: string;
  /** Active search query, if any — shown as "no results for «q»". */
  query?: string;
  /** Message template when a query yields nothing; defaults per locale. */
  noResultsMessage?: string;
  className?: string;
}

/** One muted, query-aware sentence rendered inside a table/card frame. */
export function EmptyState({ message, query, noResultsMessage, className }: Props) {
  const text = query?.trim() ? (noResultsMessage ?? message) : message;
  return <p className={className ?? 'px-4 py-6 text-[14px] text-muted-foreground'}>{text}</p>;
}
