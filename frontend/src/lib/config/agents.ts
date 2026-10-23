import { create } from "zustand";

type Revealed = { guid: string; token: string };

type AgentsState = {
  revealed: Revealed | null;
  reveal: (guid: string, token: string) => void;
  hide: () => void;
};

export const useAgentsStore = create<AgentsState>((set) => ({
  revealed: null,
  reveal: (guid, token) => set({ revealed: { guid, token } }),
  hide: () => set({ revealed: null }),
}));
