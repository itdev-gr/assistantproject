/**
 * Shared field styling for dashboard forms. Class constants (not components)
 * so react-hook-form `register(...)` spreads keep working unchanged.
 */

export const dashInput =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-[14px] text-foreground ' +
  'placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const dashSelect = dashInput;

export const dashLabel = 'block text-[13px] text-muted-foreground';

export const dashCheckbox = 'h-4 w-4 accent-primary';

/** 32px icon button for table row actions. */
export const iconButton =
  'grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground ' +
  'transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50';

/** Destructive variant of the row-action icon button. */
export const iconButtonDanger =
  'grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground ' +
  'transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50';
