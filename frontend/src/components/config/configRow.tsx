import { memo, useCallback, useEffect, useRef, type ReactNode } from "react";
import TextField from "../textField/textField";
import { usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { useConfigEdit } from "../../hooks/useConfigEdit";
import { useUiStore } from "../../stores/ui";
import { isColor, normalizeName, useConfigStore } from "../../lib/config/store";
import { themeRowId } from "../../lib/config/rowId";
import type {
  ColorRow,
  ConfigRow,
  KeyRow,
  ThemeRow,
} from "../../lib/config/rows";

const KEYS_HELP =
  "comma between alternatives, space for a sequence: j, ctrl+d, g g · empty resets";
const COLOR_HELP = "hex color, e.g. #282828";
const NAME_HELP = "a-z, 0-9 and dashes";

interface IRowShell {
  paneId: string;
  rowId: string;
  help?: string | false;
  error?: string | null;
  onDoubleClick?: () => void;
  children: ReactNode;
}

function RowShell({
  paneId,
  rowId,
  help,
  error,
  onDoubleClick,
  children,
}: IRowShell) {
  const ref = useRef<HTMLLIElement>(null);
  const selectRow = useUiStore((s) => s.selectRow);
  const select = useCallback<PaneSelector<boolean>>(
    (pane) => pane?.type === "config" && pane.selectedRow === rowId,
    [rowId],
  );
  const isSelected = usePaneValue(paneId, select);

  useEffect(() => {
    if (isSelected) ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [isSelected]);

  return (
    <li
      ref={ref}
      data-row-id={rowId}
      aria-selected={isSelected}
      onClick={() => selectRow(paneId, rowId)}
      onDoubleClick={onDoubleClick}
      className={`flex flex-col px-4 py-0.5 ${isSelected ? "bg-bg-lighter" : "hover:bg-bg-soft"}`}
    >
      <div className="flex min-w-0 items-center gap-3">{children}</div>
      {error ? (
        <span className="text-xs text-danger">● {error}</span>
      ) : (
        help && <span className="text-xs text-fg-muted">{help}</span>
      )}
    </li>
  );
}

function ThemeRowView({ paneId, row }: { paneId: string; row: ThemeRow }) {
  const selectRow = useUiStore((s) => s.selectRow);
  const commit = useCallback(
    (draft: string) => {
      const error = useConfigStore.getState().renameTheme(row.name, draft);
      if (!error) selectRow(paneId, themeRowId(normalizeName(draft)));
      return error;
    },
    [paneId, row.name, selectRow],
  );
  const edit = useConfigEdit({
    paneId,
    rowId: row.id,
    value: row.name,
    commit,
  });
  const editing = edit.editing && !row.builtin;

  return (
    <RowShell
      paneId={paneId}
      rowId={row.id}
      help={editing && NAME_HELP}
      error={edit.error}
      onDoubleClick={() => useConfigStore.getState().setTheme(row.name)}
    >
      <span
        className={`w-4 shrink-0 ${row.active ? "text-accent" : "text-transparent"}`}
      >
        ●
      </span>
      {editing ? (
        <TextField
          singleLine
          value={edit.draft}
          onChange={edit.setDraft}
          editing
          onKeyDown={edit.onKeyDown}
          onBlur={edit.onBlur}
          wrapperClassName="flex-1 min-w-0"
        />
      ) : (
        <span
          className={`flex-1 truncate text-lg leading-normal ${row.active ? "text-fg" : "text-fg-dim"}`}
        >
          {row.name}
        </span>
      )}
      {!row.builtin && (
        <span className="shrink-0 text-xs text-fg-muted">custom</span>
      )}
    </RowShell>
  );
}

function ColorRowView({ paneId, row }: { paneId: string; row: ColorRow }) {
  const commit = useCallback(
    (draft: string) =>
      useConfigStore.getState().setThemeColor(row.theme, row.token, draft),
    [row.theme, row.token],
  );
  const edit = useConfigEdit({
    paneId,
    rowId: row.id,
    value: row.value,
    commit,
  });
  const preview =
    edit.editing && isColor(edit.draft.trim()) ? edit.draft.trim() : row.value;

  return (
    <RowShell
      paneId={paneId}
      rowId={row.id}
      help={edit.editing && COLOR_HELP}
      error={edit.error}
    >
      <span className="w-28 shrink-0 text-sm text-fg-dim">{row.token}</span>
      <span
        className="size-4 shrink-0 rounded-sm border border-border"
        style={{ backgroundColor: preview }}
      />
      {edit.editing ? (
        <TextField
          singleLine
          value={edit.draft}
          onChange={edit.setDraft}
          editing
          onKeyDown={edit.onKeyDown}
          onBlur={edit.onBlur}
          wrapperClassName="flex-1 min-w-0"
        />
      ) : (
        <span
          className="flex-1 truncate text-lg leading-normal"
          onClick={edit.requestEdit}
        >
          {row.value}
        </span>
      )}
    </RowShell>
  );
}

function KeyRowView({ paneId, row }: { paneId: string; row: KeyRow }) {
  const commit = useCallback(
    (draft: string) => useConfigStore.getState().setKeys(row.binding.id, draft),
    [row.binding.id],
  );
  const value = row.keys.join(", ");
  const edit = useConfigEdit({ paneId, rowId: row.id, value, commit });

  return (
    <RowShell
      paneId={paneId}
      rowId={row.id}
      help={edit.editing && KEYS_HELP}
      error={edit.error}
    >
      <span className="w-14 shrink-0 text-xs text-fg-muted">
        {row.binding.scope}
      </span>
      <span
        className="w-48 shrink-0 truncate text-sm text-fg-dim"
        title={row.binding.id}
      >
        {row.binding.description}
      </span>
      {edit.editing ? (
        <TextField
          singleLine
          value={edit.draft}
          onChange={edit.setDraft}
          editing
          onKeyDown={edit.onKeyDown}
          onBlur={edit.onBlur}
          wrapperClassName="flex-1 min-w-0"
        />
      ) : (
        <span
          className={`flex-1 truncate text-lg leading-normal ${row.isDefault ? "text-fg" : "text-accent"}`}
          onClick={edit.requestEdit}
        >
          {value}
        </span>
      )}
      <span className="shrink-0 text-xs text-fg-muted">
        {row.isDefault ? "" : "custom"}
      </span>
    </RowShell>
  );
}

function ConfigRowComponent({
  paneId,
  row,
}: {
  paneId: string;
  row: ConfigRow;
}) {
  switch (row.kind) {
    case "theme":
      return <ThemeRowView paneId={paneId} row={row} />;
    case "color":
      return <ColorRowView paneId={paneId} row={row} />;
    case "key":
      return <KeyRowView paneId={paneId} row={row} />;
  }
}

const ConfigRowView = memo(ConfigRowComponent);
export default ConfigRowView;
