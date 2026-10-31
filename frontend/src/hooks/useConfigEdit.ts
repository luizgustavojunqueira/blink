import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useUiStore } from "../stores/ui";
import { usePaneValue, type PaneSelector } from "./usePane";

interface UseConfigEditOptions {
  paneId: string;
  rowId: string;
  value: string;
  commit: (draft: string) => string | null;
}

export function useConfigEdit({
  paneId,
  rowId,
  value,
  commit,
}: UseConfigEditOptions) {
  const selectPane = useUiStore((s) => s.selectPane);
  const selectRow = useUiStore((s) => s.selectRow);
  const setMode = useUiStore((s) => s.setMode);

  const selectEditing = useCallback<PaneSelector<boolean>>(
    (pane, ui) =>
      pane?.id === ui.activePaneId &&
      ui.mode === "insert" &&
      pane.type === "config" &&
      pane.selectedRow === rowId,
    [rowId],
  );

  const editing = usePaneValue(paneId, selectEditing);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) setError(null);
  }, [editing]);

  const submit = useCallback(
    () => (draft === value ? null : commit(draft)),
    [draft, value, commit],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        setDraft(value);
        setError(null);
        return;
      }
      if (e.key !== "Enter") return;

      e.preventDefault();
      e.stopPropagation();

      const err = submit();
      setError(err);
      if (err) return;
      setMode("normal");
    },
    [submit, value, setMode],
  );

  const onBlur = useCallback(() => {
    if (submit()) setDraft(value);
    setError(null);
  }, [submit, value]);

  const requestEdit = useCallback(() => {
    setDraft(value);
    selectRow(paneId, rowId);
    selectPane(paneId, "insert");
  }, [paneId, rowId, value, selectRow, selectPane]);

  return { draft, setDraft, editing, error, onKeyDown, onBlur, requestEdit };
}
