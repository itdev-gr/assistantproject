import { create } from 'zustand';

/** Sentinel meaning "no category filter". */
export const ALL_CATEGORIES = '__all';

interface DirectorySearchState {
  query: string;
  category: string;
  setQuery: (query: string) => void;
  setCategory: (category: string) => void;
  reset: () => void;
}

/**
 * Shared search state so the hero search bar and the directory results
 * section (rendered in separate client islands) stay in sync.
 */
export const useDirectorySearch = create<DirectorySearchState>((set) => ({
  query: '',
  category: ALL_CATEGORIES,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  reset: () => set({ query: '', category: ALL_CATEGORIES }),
}));

/** Smooth-scroll to the directory results section. */
export function scrollToDirectory() {
  document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
