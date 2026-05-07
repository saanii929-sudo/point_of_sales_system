import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BranchOption {
  _id: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
}

interface BranchState {
  selectedBranchId: string | null;
  selectedBranchName: string | null;
  branches: BranchOption[];
  setBranch: (id: string | null, name: string | null) => void;
  setBranches: (branches: BranchOption[]) => void;
  clearBranch: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      selectedBranchName: null,
      branches: [],
      setBranch: (id, name) => set({ selectedBranchId: id, selectedBranchName: name }),
      setBranches: (branches) => set({ branches }),
      clearBranch: () => set({ selectedBranchId: null, selectedBranchName: null }),
    }),
    {
      name: 'sv-branch-storage',
      skipHydration: true,
    }
  )
);
