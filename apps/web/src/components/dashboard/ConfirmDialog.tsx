'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@aga/ui';

interface Props {
  /** The element that opens the dialog (rendered via asChild). */
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

/**
 * Controlled confirmation dialog around an async action. Stays open while the
 * action is pending and closes in `finally`, so a redirect-with-?error= that
 * lands back on the same page is never hidden behind a stale overlay.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      try {
        await onConfirm();
      } finally {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-deep-ink/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-card-hover">
          {danger && (
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="h-5 w-5" aria-hidden />
            </div>
          )}
          <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={pending}
                className="cursor-pointer rounded-md border px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className={cn(
                'cursor-pointer rounded-md px-4 py-2 text-[14px] font-semibold text-primary-foreground transition-colors disabled:opacity-50',
                danger
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-primary hover:bg-primary-hover',
              )}
            >
              {pending ? `${confirmLabel}…` : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
