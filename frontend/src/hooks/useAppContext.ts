import { useMemo } from "react";
import type { GetItemRequest } from "../types/backend";
import { createItem } from "../api/items";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setTheme } from "../lib/theme";

interface IAppContext {
  setFilter: (filter: GetItemRequest) => void;
}

export function useAppContext({ setFilter }: IAppContext) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  return useMemo(
    () => ({
      setFilter,
      setTheme,
      items: { create: createMutation.mutateAsync },
    }),
    [setFilter, createMutation.mutateAsync],
  );
}
