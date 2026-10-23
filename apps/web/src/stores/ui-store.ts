import { create } from "zustand";

/** Shell UI state that isn't a sheet. */
interface UiState {
  /** The keyboard shortcuts cheat sheet ("?"). */
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  shortcutsOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
}));
