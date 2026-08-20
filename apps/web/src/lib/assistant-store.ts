import { create } from 'zustand';

interface AssistantState {
  open: boolean;
  /** Text queued by another component to pre-fill the assistant input. */
  draft: string;
  setOpen: (open: boolean) => void;
  openWith: (draft: string) => void;
  clearDraft: () => void;
}

/**
 * Shared assistant state so the promo section and the floating widget
 * (rendered in separate client islands) stay in sync.
 */
export const useAssistant = create<AssistantState>((set) => ({
  open: false,
  draft: '',
  setOpen: (open) => set({ open }),
  openWith: (draft) => set({ open: true, draft }),
  clearDraft: () => set({ draft: '' }),
}));
