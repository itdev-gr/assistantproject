import { create } from 'zustand';
import { listFavoriteIds } from '@/app/actions/user-library';

type Status = 'idle' | 'loading' | 'ready' | 'anonymous';

interface UserLibraryState {
  status: Status;
  favoriteIds: Set<string>;
  /** Fetch the viewer's favourite ids once per page load. */
  load: () => Promise<void>;
  setFavorite: (businessId: string, on: boolean) => void;
  markAnonymous: () => void;
}

/**
 * Client-side favourites cache shared by every heart button on the page.
 * Public pages are ISR-cached, so per-user state must never be rendered on
 * the server — this store fills it in after hydration.
 */
export const useUserLibrary = create<UserLibraryState>((set, get) => ({
  status: 'idle',
  favoriteIds: new Set(),
  load: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const r = await listFavoriteIds();
      if (r.ok) set({ status: 'ready', favoriteIds: new Set(r.ids) });
      else set({ status: 'anonymous', favoriteIds: new Set() });
    } catch {
      set({ status: 'anonymous', favoriteIds: new Set() });
    }
  },
  setFavorite: (businessId, on) =>
    set((s) => {
      const next = new Set(s.favoriteIds);
      if (on) next.add(businessId);
      else next.delete(businessId);
      return { favoriteIds: next };
    }),
  markAnonymous: () => set({ status: 'anonymous', favoriteIds: new Set() }),
}));
