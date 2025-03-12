import { create } from 'zustand';
import { Preset } from '../types/preset';
import { Tag } from '../types/tag';
import {
  subscribeToPresets,
  addPreset,
  updatePreset,
  deletePreset,
  subscribeToTags,
} from "../services/firebase";

// Presets Slice
interface PresetsState {
  presets: Preset[];
  addPreset: (newPreset: Omit<Preset, 'id'>) => void;
  updatePreset: (id: string, updatedPreset: Partial<Preset>) => void;
  deletePreset: (id: string) => void;
  subscribeToPresets: () => () => void;
}

const createPresetsSlice = (set: any): PresetsState => ({
  presets: [],

  subscribeToPresets: () => {
    return subscribeToPresets((presets) => set({ presets }));
  },

  addPreset: async (newPreset) => {
    await addPreset(newPreset);
  },

  updatePreset: async (id, updatedPreset) => {
    await updatePreset(id, updatedPreset);
  },

  deletePreset: async (id) => {
    await deletePreset(id);
  },
});

// Tags Slice
interface TagsState {
  tags: Tag[];
  subscribeToTags: () => () => void;
}

const createTagsSlice = (set: any): TagsState => ({
  tags: [],

  subscribeToTags: () => {
    return subscribeToTags((tags) => set({ tags }));
  },
});


// Filters Slice
interface FilterState {
  filter: { search: string; selectedTags: Tag[] };
  setFilter: (newFilter: Partial<{ search: string; selectedTags: Tag[] }>) => void;
}

const createFiltersSlice = (set: any): FilterState => ({
  filter: { search: '', selectedTags: [] },

  setFilter: (newFilter) =>
    set((state: FilterState) => ({ filter: { ...state.filter, ...newFilter } })),
});

// Combined store using slice pattern
interface AppState extends PresetsState, TagsState, FilterState { }

const useBoundStore = create<AppState>((set) => ({
  ...createPresetsSlice(set),
  ...createTagsSlice(set),
  ...createFiltersSlice(set),
}));

export default useBoundStore;
