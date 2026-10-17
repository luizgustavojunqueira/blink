import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { getItemActions } from "../lib/appContext";
import { useUiStore } from "../stores/ui";
import { usePaneValue, type PaneSelector } from "./usePane";
import type { DetailField } from "../lib/pane/types";

interface UseDetailFieldOptions {
  paneId: string;
  itemGuid: string;
  field: DetailField;
  value: string;
  parse?: (draft: string) => string | string[];
  rejectEmpty?: boolean;
  allowNewline?: boolean;
}

export function useDetailField({
  paneId,
  itemGuid,
  field,
  value,
  parse,
  rejectEmpty = false,
  allowNewline = false,
}: UseDetailFieldOptions) {
  const selectPane = useUiStore((s) => s.selectPane);
  const selectField = useUiStore((s) => s.selectField);
  const setMode = useUiStore((s) => s.setMode);
  const selectEditing = useCallback<PaneSelector<boolean>>(
    (pane, ui) =>
      pane?.id === ui.activePaneId &&
      ui.mode === "insert" &&
      pane.type === "detail" &&
      pane.selectedField === field,
    [field],
  );

  const editing = usePaneValue(paneId, selectEditing);
  const [draft, setDraft] = useState(value);
  const sentDraft = useRef<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    sentDraft.current = null;
  }, [value]);

  useEffect(() => {
    if (editing) sentDraft.current = null;
  }, [editing]);

  const commit = useCallback(() => {
    if (rejectEmpty && draft.trim() === "") {
      setDraft(value);
      return;
    }
    if (draft === value || sentDraft.current === draft) return;

    sentDraft.current = draft;
    getItemActions().setField(itemGuid, field, parse ? parse(draft) : draft);
  }, [draft, value, field, itemGuid, parse, rejectEmpty]);

  const requestEdit = useCallback(() => {
    setDraft(value);
    selectPane(paneId, "insert");
    selectField(paneId, field);
  }, [paneId, field, value, selectPane, selectField]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") setDraft(value);
      if (e.key !== "Enter") return;

      e.stopPropagation();

      if (allowNewline && (e.ctrlKey || e.metaKey || e.altKey)) {
        e.preventDefault();
        const el = e.currentTarget;
        const pos = el.selectionStart ?? draft.length;
        setDraft(`${draft.slice(0, pos)}\n${draft.slice(pos)}`);
        requestAnimationFrame(() => el.setSelectionRange(pos + 1, pos + 1));
        return;
      }

      e.preventDefault();
      commit();
      setMode("normal");
    },
    [allowNewline, commit, draft, value, setMode],
  );

  return { draft, setDraft, editing, commit, requestEdit, onKeyDown };
}
