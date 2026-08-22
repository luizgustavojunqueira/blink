import { useMemo } from "react";
import { createItem } from "../api/items";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setTheme } from "../lib/theme";
import { useUiStore } from "../stores/ui";

export function useAppContext() {
  const queryClient = useQueryClient();
  const ui = useUiStore();

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  return useMemo(
    () => ({
      ui,
      setTheme,
      items: { create: createMutation.mutateAsync },
    }),
    [ui, createMutation.mutateAsync],
  );
}
