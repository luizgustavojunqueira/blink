import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useAppContext } from "./useAppContext";
import { useDetailFieldEditing } from "./usePane";
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
  const app = useAppContext();
  const editing = useDetailFieldEditing(paneId, field);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = useCallback(() => {
    if (rejectEmpty && draft.trim() === "") {
      setDraft(value);
      return;
    }
    if (draft === value) return;

    app.items.setField(itemGuid, field, parse ? parse(draft) : draft);
  }, [app, draft, value, field, itemGuid, parse, rejectEmpty]);

  const requestEdit = useCallback(() => {
    setDraft(value);
    app.ui.selectPane(paneId, "insert");
    app.ui.selectField(paneId, field);
  }, [app, paneId, field, value]);

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
      app.ui.setMode("normal");
    },
    [allowNewline, app, commit, draft, value],
  );

  return { draft, setDraft, editing, commit, requestEdit, onKeyDown };
}
